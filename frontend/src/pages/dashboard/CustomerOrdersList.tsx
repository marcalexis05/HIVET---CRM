import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, AlertCircle, ChevronRight, MapPin, Eye, Store, User, Phone, ShieldCheck, X, MessageSquare, ShieldAlert, Clock, CreditCard, Tag } from 'lucide-react';
import { Map, AdvancedMarker, InfoWindow, useMap, APIProvider } from '@vis.gl/react-google-maps';

interface OrderItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    size?: string;
    image?: string;
}

interface Order {
    id: number;
    status: string;
    total_amount: number;
    fulfillment_method: string;
    payment_method: string;
    cancellation_reason?: string;
    delivery_address?: string;
    delivery_lat?: number;
    delivery_lng?: number;
    branch_id?: number;
    branch_lat?: number;
    branch_lng?: number;
    branch_name?: string;
    branch_address?: string;
    contact_name?: string;
    contact_phone?: string;
    created_at: string;
    items: OrderItem[];
    voucher_code?: string;
    discount_amount?: number;
}



const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng }: { userLat: number | null, userLng: number | null, clinicLat: number, clinicLng: number }) => {
    const map = useMap();
    useEffect(() => {
        const maps = (window as any).google.maps;
        if (!maps || !map || !userLat || !userLng) return;

        const renderer = new maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#F58634',
                strokeWeight: 6,
                strokeOpacity: 0.8
            }
        });

        const service = new maps.DirectionsService();
        service.route(
            {
                origin: { lat: userLat, lng: userLng },
                destination: { lat: clinicLat, lng: clinicLng },
                travelMode: maps.TravelMode.DRIVING
            },
            (result: any, status: any) => {
                if (status === 'OK') {
                    renderer.setDirections(result);
                }
            }
        );

        return () => {
            renderer.setMap(null);
        };
    }, [map, userLat, userLng, clinicLat, clinicLng]);

    return null;
};

const CustomerOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [fulfillmentFilter, setFulfillmentFilter] = useState<'All' | 'delivery' | 'pickup'>('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [showStreetView, setShowStreetView] = useState(false);
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);
    const [activeMarker, setActiveMarker] = useState<'branch' | 'delivery' | null>(null);
    const [panoPosition, setPanoPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState<{ heading: number, pitch: number }>({ heading: 0, pitch: 0 });

    // Cleanup street view on unmount
    useEffect(() => {
        return () => {
            streetViewInstance.current = null;
        };
    }, []);

    const tabs = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled'];

    // Update Street View Position when target changes (Consistent with Checkout)
    useEffect(() => {
        if (streetViewInstance.current && showStreetView && selectedOrder) {
            let pos;
            if (activeMarker) {
                pos = activeMarker === 'branch' 
                    ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) } 
                    : { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) };
            } else {
                pos = selectedOrder.fulfillment_method === 'pickup'
                    ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }
                    : { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) };
            }
            if (pos.lat && pos.lng) {
                streetViewInstance.current.setPosition(pos);
                setPanoPosition(pos as { lat: number, lng: number });
            }
        }
    }, [activeMarker, showStreetView, selectedOrder?.delivery_lat, selectedOrder?.branch_lat, selectedOrder?.fulfillment_method]);

    const calculateDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        if (!lat1 || !lng1 || !lat2 || !lng2) return '...';
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        if (d < 1) return `${Math.round(d * 1000)}m`;
        return `${d.toFixed(1)}km`;
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch('http://localhost:8000/api/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (isDetailsModalOpen || isCancelModalOpen) {
            document.body.classList.add('map-modal-active');
        } else {
            document.body.classList.remove('map-modal-active');
        }
        return () => document.body.classList.remove('map-modal-active');
    }, [isDetailsModalOpen, isCancelModalOpen]);

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason) return;
        setIsCancelling(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`http://localhost:8000/api/orders/${selectedOrder.id}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: cancelReason })
            });

            if (response.ok) {
                setIsCancelModalOpen(false);
                setCancelReason('');
                setSelectedOrder(null);
                fetchOrders();
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleHideOrder = async (id: number) => {
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`http://localhost:8000/api/orders/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setOrders(prev => prev.filter(o => o.id !== id));
            } else {
                const data = await response.json();
                console.error('Failed to delete order:', data.detail);
            }
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesStatus = activeTab === 'All' || o.status === activeTab;
        const matchesFulfillment = fulfillmentFilter === 'All' || o.fulfillment_method === fulfillmentFilter;
        return matchesStatus && matchesFulfillment;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending': return <Package className="w-5 h-5 text-amber-500" />;
            case 'Processing': return <Truck className="w-5 h-5 text-blue-500" />;
            case 'Completed': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'Cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const cancelReasons = [
        "Change of mind",
        "Found a better price elsewhere",
        "Ordered by mistake",
        "Shipping time is too long",
        "Duplicate order",
        "Other"
    ];

    return (
        <DashboardLayout title="My Orders">
            <div className="space-y-8">
                {/* Status Tabs */}
                <div className="flex flex-col gap-6">
                    {/* Fulfillment Method Filter */}
                    <div className="flex items-center gap-1 bg-brand-dark/5 p-1.5 rounded-2xl w-fit border border-brand-dark/5 shadow-inner">
                        {[
                            { id: 'All', label: 'All Methods', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                            { id: 'delivery', label: 'Home Delivery', icon: <Truck className="w-3.5 h-3.5" /> },
                            { id: 'pickup', label: 'Clinic Pickup', icon: <Store className="w-3.5 h-3.5" /> }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setFulfillmentFilter(m.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                    fulfillmentFilter === m.id 
                                        ? 'bg-white text-brand-dark shadow-md border border-brand-dark/5' 
                                        : 'text-brand-dark/40 hover:text-brand-dark hover:bg-white/50'
                                }`}
                            >
                                {m.icon}
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Status Tabs */}
                    <div className="relative">
                        <div className="flex items-center gap-1.5 xs:gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                            {tabs.map(tab => (
                                <motion.button
                                    key={tab}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-2.5 xs:px-6 py-2.5 xs:py-3 rounded-full font-black text-[8px] xs:text-[10px] uppercase tracking-wider xs:tracking-widest transition-all whitespace-nowrap cursor-pointer transform hover:scale-110 active:scale-95 ${activeTab === tab
                                        ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/30 border-2 border-brand-dark'
                                        : 'bg-brand-dark/70 text-white hover:bg-brand-dark shadow-sm border-2 border-brand-dark/10'
                                        }`}
                                >
                                    {tab}
                                </motion.button>
                            ))}
                        </div>
                        {/* Visual Scroll Indicator for mobile */}
                        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#FAF3E0] to-transparent pointer-events-none sm:hidden" />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-64 bg-white/50 animate-pulse rounded-[2rem]"></div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-8 xs:p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm border border-accent-brown/5">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-accent-peach/30 rounded-[2rem] flex items-center justify-center mb-6">
                            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-brand" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tighter mb-2">No orders found</h3>
                        <p className="text-[10px] sm:text-base text-accent-brown/50 font-medium">You haven't placed any orders in this category yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredOrders.map(order => (
                            <motion.div
                                key={order.id}
                                layout
                                whileHover={{ scale: 1.01, borderColor: '#ff9f1c', boxShadow: '0 20px 25px -5px rgba(61, 43, 31, 0.05)' }}
                                whileTap={{ scale: 0.99 }}
                                className="bg-white rounded-[2rem] shadow-sm border border-accent-brown/5 overflow-hidden group cursor-pointer"
                            >
                                {/* Order Header */}
                                <div className="p-4 xs:p-6 sm:p-8 flex items-center justify-between border-b border-accent-brown/5 bg-accent-peach/5">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                            {getStatusIcon(order.status)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Order</span>
                                                <span className="text-xs sm:text-sm font-black text-accent-brown truncate">#HV-{order.id.toString().padStart(4, '0')}</span>
                                            </div>
                                            <p className="text-[8px] sm:text-[10px] font-bold text-accent-brown/40 uppercase mt-0.5">
                                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-600' :
                                                order.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-blue-100 text-blue-600'
                                            }`}>
                                            {order.status}
                                        </span>
                                        {order.status === 'Cancelled' && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1, rotate: 90 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleHideOrder(order.id);
                                                }}
                                                className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-dark text-white rounded-full flex items-center justify-center hover:bg-black transition-all shadow-md cursor-pointer hover:rotate-90 active:scale-90"
                                                title="Remove order"
                                            >
                                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </motion.button>
                                        )}
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="p-4 xs:p-6 sm:p-8 space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent-peach/10 rounded-xl p-2 shrink-0 flex items-center justify-center">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm text-accent-brown truncate">{item.name}</h4>
                                                <p className="text-[8px] sm:text-[10px] text-accent-brown/40 font-black uppercase tracking-widest">
                                                    {item.variant} • {item.size}
                                                </p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-brand-dark tracking-widest uppercase">Qty: {item.quantity}</span>
                                                    <span className="font-black text-xs sm:text-sm text-accent-brown tracking-tight">₱{item.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Order Footer */}
                                <div className="p-4 xs:p-6 sm:p-8 bg-accent-peach/10 flex flex-col sm:flex-row items-center justify-between border-t border-accent-brown/5 gap-6 sm:gap-4">
                                    <div className="w-full sm:w-auto text-center sm:text-left">
                                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-1">Total Amount</p>
                                        <div className="flex flex-col sm:items-start items-center">
                                            <p className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter leading-none">₱{order.total_amount.toFixed(2)}</p>
                                            {order.discount_amount && order.discount_amount > 0 && (
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <Tag className="w-2.5 h-2.5 text-brand" />
                                                    <p className="text-[9px] font-black text-brand uppercase tracking-widest">Saved ₱{order.discount_amount.toFixed(2)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                        {order.status === 'Pending' && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setIsCancelModalOpen(true);
                                                }}
                                                className="w-full xs:w-auto px-6 py-3 bg-white border-2 border-red-50 text-red-500 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm cursor-pointer"
                                            >
                                                Cancel Order
                                            </motion.button>
                                        )}
                                        <motion.button 
                                            whileHover={{ scale: 1.05, x: 5 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setIsDetailsModalOpen(true);
                                            }}
                                            className="w-full xs:w-auto px-6 py-3 bg-brand-dark hover:bg-black text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand-dark/10 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            Order Details <ChevronRight className="w-3 h-3" />
                                        </motion.button>
                                    </div>
                                </div>

                                {order.status === 'Cancelled' && order.cancellation_reason && (
                                    <div className="px-8 pb-8 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Reason for cancellation</p>
                                            <p className="text-xs font-semibold text-accent-brown mt-0.5">{order.cancellation_reason}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            <AnimatePresence>
                {isDetailsModalOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white w-full max-w-7xl h-full lg:h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden flex flex-col lg:flex-row transition-all"
                        >
                            {/* Left Pane: Logistics & Map (42%) */}
                            <div className="lg:w-[42%] bg-accent-peach/5 border-r border-accent-brown/5 flex flex-col relative overflow-hidden group/pane">
                                {/* Map Area */}
                                <div className="flex-1 relative min-h-[300px] lg:min-h-0">
                                    <AnimatePresence mode="wait">
                                        {!showStreetView ? (
                                            <motion.div 
                                                key="map-view"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0"
                                            >
                                                <div className="w-full h-full relative">
                                                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                                                    <Map
                                                        mapId="4c730709b30c1be1"
                                                        center={(selectedOrder.fulfillment_method === 'delivery' && selectedOrder.delivery_lat !== null) 
                                                            ? { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }
                                                            : (selectedOrder.delivery_lat !== null && selectedOrder.branch_lat !== null) 
                                                                ? { lat: (Number(selectedOrder.delivery_lat) + Number(selectedOrder.branch_lat)) / 2, lng: (Number(selectedOrder.delivery_lng) + Number(selectedOrder.branch_lng)) / 2 } 
                                                                : (selectedOrder.delivery_lat !== null) 
                                                                    ? { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) } 
                                                                    : (selectedOrder.branch_lat !== null) 
                                                                        ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) } 
                                                                        : { lat: 14.5995, lng: 120.9842 }}
                                                        zoom={(selectedOrder.fulfillment_method === 'delivery') ? 16 : 14}
                                                        gestureHandling={'greedy'}
                                                        disableDefaultUI={false}
                                                        mapTypeControl={false}
                                                        streetViewControl={false}
                                                        fullscreenControl={false}
                                                        scrollwheel={true}
                                                        className="w-full h-full"
                                                    >
                                                        {selectedOrder.delivery_lat !== null && (
                                                            <AdvancedMarker 
                                                                onClick={() => setActiveMarker('delivery')}
                                                                position={{ lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }}
                                                            >
                                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg ring-4 ring-blue-500/20 cursor-pointer hover:scale-110 transition-transform">
                                                                    <User className="w-4 h-4" />
                                                                </div>
                                                            </AdvancedMarker>
                                                        )}
                                                        {selectedOrder.fulfillment_method !== 'delivery' && selectedOrder.branch_lat !== null && (
                                                            <AdvancedMarker 
                                                                onClick={() => setActiveMarker('branch')}
                                                                position={{ lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }} 
                                                            >
                                                                <div className="w-10 h-10 bg-brand-dark rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl ring-4 ring-brand/20 cursor-pointer hover:scale-110 transition-transform">
                                                                    <Store className="w-5 h-5" />
                                                                </div>
                                                            </AdvancedMarker>
                                                        )}
                                                        {activeMarker === 'delivery' && selectedOrder.delivery_lat !== null && (
                                                            <InfoWindow
                                                                position={{ lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }}
                                                                onCloseClick={() => setActiveMarker(null)}
                                                                headerDisabled={true}
                                                            >
                                                                <div className="p-4 w-[280px] font-sans flex flex-col gap-3 relative">
                                                                    <button 
                                                                        onClick={() => setActiveMarker(null)}
                                                                        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                                                            <User className="w-5 h-5 text-blue-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-sm font-black text-brand-dark leading-tight">{selectedOrder.contact_name || 'Customer'}</h3>
                                                                            <p className="text-[10px] font-bold text-accent-brown/50 uppercase tracking-widest mt-0.5">Delivery Destination</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-col gap-2">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setShowStreetView(true);
                                                                            }}
                                                                            className="w-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 group/svb shadow-sm"
                                                                        >
                                                                            <Eye className="w-4 h-4 group-hover/svb:scale-110 transition-transform" /> 
                                                                            Street View
                                                                        </button>
                                                                        <div className="w-full bg-brand-dark/5 border border-brand-dark/10 p-3 rounded-xl flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-lg bg-brand-dark/10 flex items-center justify-center text-brand-dark">
                                                                                    <Truck className="w-3 h-3" />
                                                                                </div>
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/50">Distance</span>
                                                                            </div>
                                                                            <span className="text-xs font-black text-brand-dark">
                                                                                {selectedOrder.delivery_lat && selectedOrder.branch_lat 
                                                                                    ? calculateDist(Number(selectedOrder.delivery_lat), Number(selectedOrder.delivery_lng), Number(selectedOrder.branch_lat), Number(selectedOrder.branch_lng))
                                                                                    : '...'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </InfoWindow>
                                                        )}
                                                        {activeMarker === 'branch' && selectedOrder.branch_lat !== null && (
                                                            <InfoWindow
                                                                position={{ lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }}
                                                                onCloseClick={() => setActiveMarker(null)}
                                                                headerDisabled={true}
                                                            >
                                                                <div className="p-4 w-[280px] font-sans flex flex-col gap-3 relative">
                                                                    <button 
                                                                        onClick={() => setActiveMarker(null)}
                                                                        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                                                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                                                                            <Store className="w-5 h-5 text-brand" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-sm font-black text-brand-dark leading-tight">{selectedOrder.branch_name || 'Clinic Profile'}</h3>
                                                                            <p className="text-[10px] font-bold text-accent-brown/50 uppercase tracking-widest mt-0.5">Verified Location</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-col gap-2">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setShowStreetView(true);
                                                                            }}
                                                                            className="w-full bg-brand/10 text-brand-dark text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-2 group/svb shadow-sm"
                                                                        >
                                                                            <Eye className="w-4 h-4 group-hover/svb:scale-110 transition-transform" /> 
                                                                            Street View
                                                                        </button>
                                                                        <div className="w-full bg-brand-dark/5 border border-brand-dark/10 p-3 rounded-xl flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-lg bg-brand-dark/10 flex items-center justify-center text-brand-dark">
                                                                                    <Truck className="w-3 h-3" />
                                                                                </div>
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/50">Distance</span>
                                                                            </div>
                                                                            <span className="text-xs font-black text-brand-dark">
                                                                                {selectedOrder.delivery_lat && selectedOrder.branch_lat 
                                                                                    ? calculateDist(Number(selectedOrder.delivery_lat), Number(selectedOrder.delivery_lng), Number(selectedOrder.branch_lat), Number(selectedOrder.branch_lng))
                                                                                    : 'Calculating...'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </InfoWindow>
                                                        )}
                                                        {selectedOrder.fulfillment_method !== 'delivery' && selectedOrder.delivery_lat !== null && selectedOrder.branch_lat !== null && (
                                                            <DirectionsLine 
                                                                userLat={Number(selectedOrder.delivery_lat)} 
                                                                userLng={Number(selectedOrder.delivery_lng)} 
                                                                clinicLat={Number(selectedOrder.branch_lat)} 
                                                                clinicLng={Number(selectedOrder.branch_lng)} 
                                                            />
                                                        )}
                                                    </Map>
                                                </APIProvider>

                                                {/* Directional Guidance Overlay */}
                                                {selectedOrder.fulfillment_method === 'pickup' && selectedOrder.branch_lat === null && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px] pointer-events-none z-10">
                                                        <div className="bg-white/95 px-6 py-4 rounded-[2rem] shadow-2xl border border-brand/10 flex flex-col items-center gap-2">
                                                            <div className="w-1.5 h-1.5 bg-brand rounded-full animate-ping" />
                                                            <div className="flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-brand" />
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark">Precision Identity Conflict</p>
                                                            </div>
                                                            <p className="text-[8px] font-bold text-accent-brown/40 uppercase">Clinic pin missing from High-Precision Registry</p>
                                                        </div>
                                                    </div>
                                                )}
                                                </div>


                                                <div className="absolute bottom-8 left-8 right-8 z-30 pointer-events-none translate-y-2 group-hover/pane:translate-y-0 opacity-0 group-hover/pane:opacity-100 transition-all duration-500">
                                                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 flex items-center justify-between pointer-events-auto">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand-dark">
                                                                <Truck className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 leading-none">Travel Distance</p>
                                                                <p className="text-xs font-black text-brand-dark mt-0.5">
                                                                    {selectedOrder.fulfillment_method === 'pickup' 
                                                                        ? 'Store Pickup' 
                                                                        : (selectedOrder.delivery_lat && selectedOrder.branch_lat 
                                                                            ? calculateDist(Number(selectedOrder.delivery_lat), Number(selectedOrder.delivery_lng), Number(selectedOrder.branch_lat), Number(selectedOrder.branch_lng))
                                                                            : 'Pending Location Sync')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Real-time Data Active</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="street-view"
                                                initial={{ opacity: 0, scale: 1.1 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute inset-0 z-[100] flex flex-col"
                                            >
                                                <div className="absolute top-8 left-8 right-8 z-[110] flex items-center justify-end pointer-events-none">
                                                    <button 
                                                        onClick={() => {
                                                            setShowStreetView(false);
                                                            streetViewInstance.current = null;
                                                        }}
                                                        className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-600 hover:scale-110 active:scale-95 transition-all pointer-events-auto shadow-2xl"
                                                    >
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                </div>

                                                {/* Split View Container */}
                                                <div className="flex-1 flex flex-col relative">
                                                    {/* Top 70%: Street View */}
                                                    <div className="flex-[0.7] relative bg-black">
                                                        <div 
                                                            ref={(el) => {
                                                                    if (el && !streetViewInstance.current) {
                                                                        let pos;
                                                                        if (activeMarker) {
                                                                            pos = activeMarker === 'branch' 
                                                                                ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) } 
                                                                                : { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) };
                                                                        } else {
                                                                            pos = selectedOrder.fulfillment_method === 'pickup'
                                                                                ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }
                                                                                : { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) };
                                                                        }
                                                                    
                                                                    const pano = new google.maps.StreetViewPanorama(el, {
                                                                        position: pos,
                                                                        pov: { heading: 0, pitch: 0 },
                                                                        zoom: 1,
                                                                        addressControl: false,
                                                                        fullscreenControl: false,
                                                                        zoomControl: false,
                                                                        linksControl: true,
                                                                        panControl: false,
                                                                        enableCloseButton: false,
                                                                    });

                                                                    pano.addListener('position_changed', () => {
                                                                        const p = pano.getPosition();
                                                                        if (p) setPanoPosition({ lat: p.lat(), lng: p.lng() });
                                                                    });

                                                                    pano.addListener('pov_changed', () => {
                                                                        const pov = pano.getPov();
                                                                        setPanoPov({ heading: pov.heading, pitch: pov.pitch });
                                                                    });

                                                                    streetViewInstance.current = pano;
                                                                    setPanoPosition(pos);
                                                                }
                                                            }} 
                                                            className="w-full h-full" 
                                                        />
                                                        <div className="absolute inset-0 pointer-events-none border-b-4 border-brand/20 shadow-[inset_0_-50px_100px_rgba(0,0,0,0.5)]" />
                                                    </div>

                                                    {/* Bottom 30%: Mini-Map Context (The "Map Widget on Street View") */}
                                                    <div className="flex-[0.3] relative overflow-hidden group/mini shadow-2xl border-t-2 border-brand/5">
                                                        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/20 to-transparent" />
                                                        <Map
                                                            mapId="46537618861d8583"
                                                            center={panoPosition || (activeMarker === 'branch' ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) } : { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) })}
                                                            zoom={17}
                                                            disableDefaultUI={true}
                                                            gestureHandling={'greedy'}
                                                            className="w-full h-full grayscale-[0.2] contrast-[1.1]"
                                                        >
                                                            {/* User Street View Position & Direction Arrow */}
                                                            {panoPosition && (
                                                                <AdvancedMarker position={panoPosition}>
                                                                    <div 
                                                                        className="w-10 h-10 flex items-center justify-center transition-transform duration-300"
                                                                        style={{ transform: `rotate(${panoPov.heading}deg)` }}
                                                                    >
                                                                        <div className="w-5 h-5 bg-blue-500 rounded-full border-[3px] border-white shadow-2xl relative">
                                                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-blue-500 drop-shadow-lg" />
                                                                        </div>
                                                                    </div>
                                                                </AdvancedMarker>
                                                            )}

                                                            {/* Pickup/Destination Markers in Mini-Map */}
                                                            {selectedOrder.branch_lat && (
                                                                <AdvancedMarker position={{ lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }}>
                                                                    <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl">
                                                                        <Store className="w-4 h-4" />
                                                                    </div>
                                                                </AdvancedMarker>
                                                            )}
                                                            {selectedOrder.delivery_lat && (
                                                                <AdvancedMarker position={{ lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }}>
                                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                                                                        <User className="w-3 h-3" />
                                                                    </div>
                                                                </AdvancedMarker>
                                                            )}

                                                            {/* Directions Line in Mini-Map */}
                                                            {selectedOrder.delivery_lat && selectedOrder.branch_lat && (
                                                                <DirectionsLine 
                                                                    userLat={Number(selectedOrder.delivery_lat)} 
                                                                    userLng={Number(selectedOrder.delivery_lng)} 
                                                                    clinicLat={Number(selectedOrder.branch_lat)} 
                                                                    clinicLng={Number(selectedOrder.branch_lng)} 
                                                                />
                                                            )}
                                                        </Map>

                                                        {/* Dynamic Direction HUD */}
                                                        <div className="absolute top-4 left-4 z-20 pointer-events-none">
                                                            <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/50 shadow-lg flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                                                                    <MapPin className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40">Immersive HUD</p>
                                                                    <p className="text-[10px] font-black text-brand-dark">Heading: {Math.round(panoPov.heading)}°</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>


                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                        
                                        {/* Precision State Indicator & Fallback Overlay */}
                                        {((selectedOrder.fulfillment_method === 'delivery' && !selectedOrder.delivery_lat) || 
                                          (selectedOrder.fulfillment_method === 'pickup' && !selectedOrder.branch_lat)) && !showStreetView && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] z-10 pointer-events-none">
                                                <div className="bg-white/90 px-5 py-3 rounded-2xl shadow-xl border border-accent-brown/5 flex flex-col items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Geographic Context Only</p>
                                                    <p className="text-[7px] font-bold text-accent-brown/20 uppercase">High-Precision Mapping Unavailable</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Overlay Reference & Precision Badges */}
                                        <div className="absolute top-8 left-8 flex flex-col gap-3 z-20">
                                            {!showStreetView && (
                                                <>
                                                    <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-white/50">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 leading-none mb-1 text-center">Reference</p>
                                                        <p className="text-sm font-black text-brand-dark leading-none">#HV-{selectedOrder.id.toString().padStart(4, '0')}</p>
                                                    </div>

                                                </>
                                            )}
                                        </div>
                                </div>

                                {/* Delivery Details Card (Floating Effect) */}
                                <div className="p-8 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 z-30">
                                    <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-brown/30">
                                                {selectedOrder.fulfillment_method === 'pickup' ? 'Clinic Pickup Location' : 'Delivery Destination'}
                                            </h4>
                                            <div className="bg-brand/10 text-brand-dark px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {selectedOrder.fulfillment_method}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent-peach/20 flex items-center justify-center shrink-0">
                                                    <User className="w-5 h-5 text-brand" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">
                                                        {selectedOrder.fulfillment_method === 'pickup' ? 'Clinic Representative' : 'Recipient'}
                                                    </p>
                                                    <p className="text-sm font-bold text-accent-brown capitalize">{selectedOrder.contact_name || 'Valued Customer'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent-peach/20 flex items-center justify-center shrink-0">
                                                    <Phone className="w-5 h-5 text-brand" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Contact Number</p>
                                                    <p className="text-sm font-bold text-accent-brown">{selectedOrder.contact_phone || 'Not provided'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent-peach/20 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-5 h-5 text-brand" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Address</p>
                                                    <p className="text-xs font-bold text-accent-brown leading-relaxed pr-4">
                                                        {selectedOrder.fulfillment_method === 'pickup' 
                                                            ? (selectedOrder.branch_address ? `${selectedOrder.branch_name} - ${selectedOrder.branch_address}` : (selectedOrder.branch_name || 'Clinic Branch Address'))
                                                            : (selectedOrder.delivery_address || 'No address details provided.')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Pane: Order Summary (58%) */}
                            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                                {/* Header Actions */}
                                <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-accent-peach/10 flex items-center justify-center shadow-inner">
                                            <ShoppingBag className="w-7 h-7 text-brand" />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-accent-brown tracking-tighter">Order Details</h3>
                                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Manage and track your order summary</p>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setIsDetailsModalOpen(false)}
                                        className="w-14 h-14 rounded-2xl bg-accent-peach/5 border border-accent-brown/5 flex items-center justify-center text-accent-brown/40 hover:bg-brand-dark hover:text-white transition-all duration-500 shadow-sm"
                                    >
                                        <X className="w-6 h-6" />
                                    </motion.button>
                                </div>

                                {/* Status Dashboard Grid */}
                                <div className="px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                                    <div className="p-5 bg-accent-peach/5 rounded-3xl border border-accent-brown/5 group hover:bg-white hover:shadow-xl hover:shadow-accent-brown/5 transition-all">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-3 group-hover:text-brand transition-colors">Current Status</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                                {getStatusIcon(selectedOrder.status)}
                                            </div>
                                            <span className="text-xs font-black text-accent-brown uppercase">{selectedOrder.status}</span>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-accent-peach/5 rounded-3xl border border-accent-brown/5 group hover:bg-white hover:shadow-xl hover:shadow-accent-brown/5 transition-all">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-3 group-hover:text-brand transition-colors">Payment Method</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                                <CreditCard className="w-4 h-4 text-brand-dark" />
                                            </div>
                                            <span className="text-xs font-black text-accent-brown uppercase tracking-tighter">{selectedOrder.payment_method}</span>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-accent-peach/5 rounded-3xl border border-accent-brown/5 group hover:bg-white hover:shadow-xl hover:shadow-accent-brown/5 transition-all">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-3 group-hover:text-brand transition-colors">Ordered At</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-brand-dark" />
                                            </div>
                                            <span className="text-xs font-black text-accent-brown">
                                                {new Date(selectedOrder.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-accent-peach/5 rounded-3xl border border-accent-brown/5 group hover:bg-white hover:shadow-xl hover:shadow-accent-brown/5 transition-all">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-3 group-hover:text-brand transition-colors">Order Weight</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand-dark">
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-black text-accent-brown uppercase">{selectedOrder.items.length} Items</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Summary Items - Scrollable */}
                                <div className="flex-1 overflow-y-auto px-8 py-2 no-scrollbar">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pl-1">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Basket Content</h4>
                                            <p className="text-[10px] font-bold text-accent-brown/40">{selectedOrder.items.length} units total</p>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {selectedOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-5 p-4 bg-white rounded-[2rem] border border-accent-brown/5 hover:border-brand/20 transition-all group/item shadow-sm hover:shadow-md">
                                                    <div className="w-16 h-16 bg-accent-peach/10 rounded-2xl p-2 shrink-0 group-hover/item:scale-105 transition-transform duration-300">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm text-accent-brown group-hover/item:text-brand-dark transition-colors">{item.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-2 py-0.5 bg-accent-peach/20 rounded text-[8px] font-black text-accent-brown/60 uppercase tracking-widest">
                                                                {item.variant}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-accent-brown/30 uppercase tracking-widest">
                                                                Size: {item.size}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 pr-2">
                                                        <p className="text-sm font-black text-accent-brown tracking-tight">₱{(item.price * item.quantity).toFixed(2)}</p>
                                                        <p className="text-[9px] font-black text-brand uppercase tracking-widest mt-0.5">Qty {item.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Billing and Total */}
                                <div className="p-8 pt-6 border-t border-accent-brown/5 bg-accent-peach/5 shrink-0">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex gap-12">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Subtotal</p>
                                                <p className="text-base font-bold text-accent-brown/60 tracking-tight">₱{(selectedOrder.total_amount * 0.9).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Fee (Fulfillment)</p>
                                                <p className="text-base font-bold text-accent-brown/60 tracking-tight">₱{(selectedOrder.total_amount * 0.1).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-1">Total Bill</p>
                                                <p className="text-4xl font-black text-brand-dark tracking-tighter leading-none">₱{selectedOrder.total_amount.toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsDetailsModalOpen(false);
                                                    setShowStreetView(false);
                                                }}
                                                className="px-10 py-5 bg-brand text-brand-dark rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-dark hover:text-white transition-all shadow-xl shadow-brand/20 active:scale-95 duration-300"
                                            >
                                                Close Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cancel Order Modal */}
            <AnimatePresence>
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCancelModalOpen(false)}
                            className="absolute inset-0 bg-accent-brown/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 100 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 100 }}
                            className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
                        >
                            <div className="p-5 xs:p-6 sm:p-10 border-b border-accent-brown/5 bg-accent-peach/10 shrink-0">
                                <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                                        <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg xs:text-xl sm:text-2xl font-black text-accent-brown tracking-tighter">Cancel Order</h3>
                                        <p className="text-[9px] sm:text-xs font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Order #HV-{selectedOrder?.id.toString().padStart(4, '0')}</p>
                                    </div>
                                </div>
                                <p className="text-[11px] sm:text-sm font-medium text-accent-brown/60 leading-tight sm:leading-relaxed max-w-sm">
                                    Please select a reason for cancelling your order.
                                </p>
                            </div>

                            <div className="p-5 xs:p-6 sm:p-10 space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar flex-1">
                                <div className="grid grid-cols-1 gap-2">
                                    {cancelReasons.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setCancelReason(reason)}
                                            className={`flex items-center justify-between p-3.5 xs:p-4 rounded-xl border-2 transition-all ${cancelReason === reason
                                                ? 'border-red-500 bg-red-50/50 text-red-600'
                                                : 'border-accent-brown/5 hover:border-accent-brown/10 text-accent-brown/60 hover:bg-accent-peach/10'
                                                }`}
                                        >
                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">{reason}</span>
                                            {cancelReason === reason && <CheckCircle className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>

                                {cancelReason === 'Other' && (
                                    <textarea
                                        placeholder="Please tell us more..."
                                        className="w-full bg-accent-peach/10 border-2 border-accent-brown/5 rounded-xl p-3 sm:p-4 text-xs sm:text-sm font-medium outline-none focus:border-red-500 transition-colors"
                                        rows={2}
                                        value={cancelReason === 'Other' ? (cancelReason === cancelReasons[cancelReasons.length - 1] ? '' : cancelReason) : ''}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="p-5 xs:p-6 sm:p-10 bg-accent-peach/5 border-t border-accent-brown/5 shrink-0 flex gap-3 sm:gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="flex-1 px-4 sm:px-8 py-3.5 xs:py-4 bg-white border border-accent-brown/5 text-accent-brown rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-accent-peach/20 transition-all shadow-sm"
                                >
                                    Keep
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleCancelOrder}
                                    disabled={!cancelReason || isCancelling}
                                    className="flex-1 px-4 sm:px-8 py-3.5 xs:py-4 bg-red-500 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 shadow-xl shadow-red-500/20"
                                >
                                    {isCancelling ? '...' : 'Confirm'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default CustomerOrders;
