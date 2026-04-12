import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, AlertCircle, ChevronRight, MapPin, Eye, Store, User, Phone, ShieldCheck, X, MessageSquare, ShieldAlert, Clock, CreditCard, Tag, Loader2, Activity, Trophy } from 'lucide-react';
import { APIProvider, useMap, AdvancedMarker, InfoWindow, Map } from '@vis.gl/react-google-maps';
import ModernModal from '../../components/ModernModal';
import QrCodeModal from '../../components/QrCodeModal';

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



const MapBoundsHandler = ({ points, id, padding }: { points: { lat: number; lng: number }[], id?: string, padding?: number | google.maps.Padding }) => {
    const map = useMap(id);
    useEffect(() => {
        if (!map || points.length < 1 || !window.google) return;
        const bounds = new window.google.maps.LatLngBounds();
        let validPoints = 0;
        points.forEach(p => {
            if (p.lat !== undefined && p.lng !== undefined && !isNaN(p.lat) && !isNaN(p.lng)) {
                bounds.extend(p);
                validPoints++;
            }
        });
        if (validPoints > 0) {
            map.fitBounds(bounds, padding || { top: 120, right: 80, bottom: 120, left: 80 });
        }
    }, [map, points, padding]);
    return null;
};

const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng, id }: { userLat: number | null, userLng: number | null, clinicLat: number, clinicLng: number, id?: string }) => {
    const map = useMap(id);
    useEffect(() => {
        const maps = (window as any).google?.maps;
        if (!maps || !map || !userLat || !userLng) return;

        const renderer = new maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#F58634',
                strokeWeight: 5,
                strokeOpacity: 0.7
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
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [fulfillmentFilter, setFulfillmentFilter] = useState<'All' | 'delivery' | 'pickup'>('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ordersPerPage = 6;
    const [showStreetView, setShowStreetView] = useState(false);
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);
    const [activeMarker, setActiveMarker] = useState<'branch' | 'delivery' | null>(null);
    const [panoPosition, setPanoPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState<{ heading: number, pitch: number }>({ heading: 0, pitch: 0 });
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Cleanup street view on unmount
    useEffect(() => {
        return () => {
            streetViewInstance.current = null;
        };
    }, []);

    const [payNowLoading, setPayNowLoading] = useState<number | null>(null);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrData, setQrData] = useState('');
    const [qrStatus, setQrStatus] = useState<'pending' | 'succeeded' | 'expired' | 'processing'>('pending');
    const pollingInterval = useRef<any>(null);

    const startPolling = (intentId: string) => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setQrStatus('processing');
        pollingInterval.current = setInterval(async () => {
            try {
                const token = localStorage.getItem('hivet_token');
                const res = await fetch(`http://localhost:8000/api/payments/paymongo/status/${intentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'succeeded') {
                        setQrStatus('succeeded');
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                        setTimeout(() => {
                            setQrModalOpen(false);
                            fetchOrders();
                        }, 2000);
                    } else if (data.status === 'expired') {
                        setQrStatus('expired');
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                    }
                }
            } catch (err) { console.error('Polling error:', err); }
        }, 5000);
    };
    const tabs = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Payment Pending'];

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
            
            // Sanity check: Ensure coordinates are valid numbers before setting
            if (pos.lat && pos.lng && !isNaN(pos.lat) && !isNaN(pos.lng)) {
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

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, fulfillmentFilter]);

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
            setModal({
                isOpen: true,
                title: 'Error',
                message: 'Could not remove this order. Please try again.',
                type: 'error'
            });
        }
    };

    const handlePayExistingOrder = (order: Order) => {
        // Prepare items for Checkout
        const checkoutItems = order.items.map(item => ({
            ...item,
            price: item.price, // Ensure consistency
            quantity: item.quantity
        }));
        
        localStorage.setItem('hivet_checkout_filtered', JSON.stringify(checkoutItems));
        localStorage.setItem('hivet_checkout_paying_order', JSON.stringify(order));
        
        // Navigate to checkout at the payment step
        navigate('/dashboard/customer/checkout?step=3');
    };

    const filteredOrders = orders.filter(o => {
        const matchesStatus = activeTab === 'All' || o.status === activeTab;
        const matchesFulfillment = fulfillmentFilter === 'All' || o.fulfillment_method === fulfillmentFilter;
        return matchesStatus && matchesFulfillment;
    });

    // Architecture Noir: Dashboard Stats Calculation
    const totalOrders = orders.length;
    const inTransitCount = orders.filter(o => o.status === 'Processing' || o.status === 'In Transit').length;
    const deliveredCount = orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const paginatedOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending': return <Package className="w-5 h-5 text-amber-500" />;
            case 'Processing': return <Truck className="w-5 h-5 text-blue-500" />;
            case 'Completed': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'Cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'Payment Pending': return <CreditCard className="w-5 h-5 text-blue-500" />;
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
        <DashboardLayout title="My Orders" hideHeader={isDetailsModalOpen || isCancelModalOpen}>
            <div className="space-y-12">
                {/* HI-VET ARCHITECTURE NOIR: CINEMATIC HERO */}
                <div className="relative pt-8 pb-12 overflow-hidden">
                    <div className="relative z-10">
                        <motion.h1 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-7xl font-black text-accent-brown tracking-tighter leading-none mb-4"
                        >
                            Logistics <span className="text-brand">Hub</span>
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-[11px] font-black text-accent-brown/40 uppercase tracking-[0.4em] mb-12"
                        >
                            Track & Manage Your High-Performance Deliveries
                        </motion.p>

                        {/* Quick Stats Bar */}
                        <div className="flex flex-wrap gap-4">
                            {[
                                { label: 'Total Volume', value: totalOrders, icon: <ShoppingBag className="w-4 h-4" />, color: 'bg-white' },
                                { label: 'In Transit', value: inTransitCount, icon: <Truck className="w-4 h-4" />, color: 'bg-blue-50 text-blue-600' },
                                { label: 'Delivered', value: deliveredCount, icon: <Trophy className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600' }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className={`${stat.color} px-8 py-5 rounded-[2rem] border border-accent-brown/5 shadow-xl shadow-accent-brown/5 flex items-center gap-6 min-w-[240px] group hover:scale-105 transition-transform cursor-default`}
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-inner flex items-center justify-center border border-accent-brown/5 group-hover:rotate-12 transition-transform">
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
                                        <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none">{stat.value.toString().padStart(2, '0')}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Background Atmosphere */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[120px] -mr-32 -mt-32 opacity-50 pointer-events-none" />
                </div>

                {/* HI-VET ARCHITECTURE NOIR: CONTROL HUB */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Fulfillment Filter */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-3xl border border-accent-brown/5 shadow-inner">
                            {[
                                { id: 'All', label: 'All', icon: <Activity className="w-3 h-3" /> },
                                { id: 'delivery', label: 'Home Delivery', icon: <Truck className="w-3 h-3" /> },
                                { id: 'pickup', label: 'Clinic Pickup', icon: <Store className="w-3 h-3" /> }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setFulfillmentFilter(m.id as any)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        fulfillmentFilter === m.id 
                                            ? 'bg-white text-accent-brown shadow-xl border border-accent-brown/5' 
                                            : 'text-accent-brown/30 hover:text-accent-brown'
                                    }`}
                                >
                                    {m.icon}
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="w-[1px] h-8 bg-accent-brown/10 mx-2 hidden sm:block" />

                        {/* Status Tabs */}
                        <div className="flex flex-wrap items-center gap-2">
                            {tabs.map((tab, i) => {
                                const count = tab === 'All' ? orders.length : orders.filter(o => o.status === tab).length;
                                return (
                                    <motion.button
                                        key={tab}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 cursor-pointer ${
                                            activeTab === tab 
                                                ? 'bg-brand text-white shadow-xl shadow-brand/20 border border-brand/10' 
                                                : 'bg-white text-accent-brown/40 border border-accent-brown/5 hover:border-brand/20'
                                        }`}
                                    >
                                        {tab}
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-50 text-accent-brown/40 border border-accent-brown/5'}`}>
                                            {count}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* HI-VET ARCHITECTURE NOIR: ORDER LIST */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 bg-white/50 animate-pulse rounded-[3rem] border border-accent-brown/5"></div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[3rem] p-24 flex flex-col items-center gap-6 text-center shadow-2xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="w-20 h-20 bg-accent-peach/10 rounded-full flex items-center justify-center text-accent-brown/20 stroke-[1]">
                            <ShoppingBag className="w-10 h-10" />
                        </div>
                        <div>
                            <h4 className="font-black text-accent-brown text-2xl tracking-tighter mb-2">Empty Records</h4>
                            <p className="text-accent-brown/40 text-sm font-medium max-w-xs mx-auto">We couldn't find any orders matching your current filter selection.</p>
                        </div>
                        <button onClick={() => { setActiveTab('All'); setFulfillmentFilter('All'); }} className="px-8 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-accent-brown rounded-full hover:bg-accent-peach/20 transition-all cursor-pointer">Reset Filters</button>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {paginatedOrders.map((order, i) => (
                                    <motion.div
                                        key={order.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        whileHover={{ y: -4 }}
                                        className="group bg-white rounded-[2.5rem] p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all flex flex-col relative overflow-hidden"
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setIsDetailsModalOpen(true);
                                        }}
                                    >
                                        <div className="flex items-start gap-6">
                                            {/* Date Badge */}
                                            <div className="w-24 h-[100px] bg-slate-50 rounded-[2rem] flex flex-col items-center justify-center border border-accent-brown/5 group-hover:bg-brand/5 group-hover:border-brand/10 transition-colors shrink-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 group-hover:text-brand/40 transition-colors mb-1">
                                                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short' })}
                                                </p>
                                                <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none group-hover:text-brand transition-colors">
                                                    {new Date(order.created_at).getDate()}
                                                </p>
                                                <p className="text-[9px] font-black uppercase tracking-tighter text-accent-brown/40 mt-1">
                                                    {new Date(order.created_at).getFullYear()}
                                                </p>
                                            </div>

                                            {/* Core Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/20 truncate pr-4">#HV-2026-{order.id.toString().padStart(6, '0')}</span>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                        order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                        order.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                                                        order.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                                        order.status === 'Payment Pending' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-black text-accent-brown tracking-tight mb-4 group-hover:translate-x-1 transition-transform">
                                                    {order.items.length} {order.items.length === 1 ? 'Product' : 'Products'} <span className="text-accent-brown/30 font-bold mx-2">·</span> <span className="text-brand">₱{order.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                </h3>

                                                {/* Mini Stepper / Method */}
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-accent-brown/5">
                                                        {order.fulfillment_method === 'delivery' ? <Truck className="w-3.5 h-3.5 text-brand" /> : <Store className="w-3.5 h-3.5 text-brand" />}
                                                        <span className="text-[9px] font-black text-accent-brown/40 uppercase tracking-widest">{order.fulfillment_method}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3].map((s) => (
                                                            <div key={s} className={`w-3 h-1 rounded-full ${
                                                                (order.status === 'Completed' ? s <= 3 :
                                                                 order.status === 'Processing' ? s <= 2 :
                                                                 s <= 1) ? 'bg-brand' : 'bg-accent-brown/10'
                                                            }`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Action */}
                                            <div className="flex flex-col items-center gap-2 border-l border-accent-brown/5 pl-4 ml-2">
                                                {order.status === 'Payment Pending' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => { e.stopPropagation(); handlePayExistingOrder(order); }}
                                                        className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20"
                                                    >
                                                        <CreditCard className="w-4 h-4" />
                                                    </motion.button>
                                                )}
                                                {(order.status === 'Pending' || order.status === 'Payment Pending') && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOrder(order);
                                                            setIsCancelModalOpen(true);
                                                        }}
                                                        className="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </motion.button>
                                                )}
                                                {order.status === 'Cancelled' ? (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleHideOrder(order.id);
                                                        }}
                                                        className="w-10 h-10 bg-accent-brown text-white rounded-xl flex items-center justify-center hover:bg-black transition-all shadow-xl"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </motion.button>
                                                ) : (
                                                    <motion.button
                                                        whileHover={{ x: 4 }}
                                                        className="w-10 h-10 bg-slate-50 text-accent-brown/30 group-hover:bg-brand/10 group-hover:text-brand rounded-xl flex items-center justify-center transition-all"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Background Glow */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand/10 transition-colors opacity-0 group-hover:opacity-100" />
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-12 border-t border-accent-brown/5">
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/20 mb-1">Logistics Summary</p>
                                    <p className="text-[11px] font-black text-accent-brown/40 uppercase tracking-widest">
                                        Showing Records <span className="text-accent-brown">{(currentPage - 1) * ordersPerPage + 1} – {Math.min(currentPage * ordersPerPage, filteredOrders.length)}</span> of {filteredOrders.length}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        whileHover={currentPage > 1 ? { scale: 1.05 } : {}}
                                        whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white text-accent-brown/50 border border-accent-brown/5 hover:bg-white hover:text-brand transition-all shadow-sm disabled:opacity-30 cursor-pointer"
                                    >
                                        Prev
                                    </motion.button>
                                    
                                    <div className="flex items-center gap-2">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <motion.button
                                                key={i + 1}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-12 h-12 rounded-2xl text-[11px] font-black transition-all ${currentPage === i + 1 ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'bg-white text-accent-brown/40 border border-accent-brown/5 hover:bg-slate-50'}`}
                                            >
                                                {i + 1}
                                            </motion.button>
                                        ))}
                                    </div>

                                    <motion.button
                                        whileHover={currentPage < totalPages ? { scale: 1.05 } : {}}
                                        whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-brand text-white shadow-xl shadow-brand/20 transition-all disabled:opacity-30 cursor-pointer"
                                    >
                                        Next
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isDetailsModalOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailsModalOpen(false)}
                            className="absolute inset-0 bg-accent-brown/20 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-white w-full max-w-7xl h-full lg:h-[85vh] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] relative z-10 overflow-hidden flex flex-col lg:flex-row transition-all border border-white"
                        >
                            {/* Left Pane: Logistics Intelligence (42%) */}
                            <div className="lg:w-[42%] bg-accent-peach/5 border-r border-accent-brown/5 flex flex-col relative overflow-hidden group/pane">
                                <div className="flex-1 relative min-h-[350px] lg:min-h-0">
                                    <AnimatePresence>
                                        {!showStreetView ? (
                                            <motion.div 
                                                key="map-view"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-10 pointer-events-auto"
                                            >
                                                <div className="w-full h-full outline-none" style={{ pointerEvents: 'auto', touchAction: 'none' }}>
                                                    <Map
                                                        id="main-map"
                                                        mapId="4c730709b30c1be1"
                                                        defaultCenter={{ lat: 14.5995, lng: 120.9842 }}
                                                        defaultZoom={15}
                                                        gestureHandling={'greedy'}
                                                        disableDefaultUI={false}
                                                        draggable={true}
                                                        scrollwheel={true}
                                                        zoomControl={true}
                                                        streetViewControl={false}
                                                        mapTypeControl={false}
                                                        fullscreenControl={false}
                                                        className="w-full h-full"
                                                    >
                                                        <MapBoundsHandler 
                                                            id="main-map"
                                                            points={[
                                                                { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) },
                                                                { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }
                                                            ]} 
                                                        />
                                                        {selectedOrder.delivery_lat && (
                                                            <AdvancedMarker 
                                                                onClick={() => setActiveMarker('delivery')}
                                                                position={{ lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }}
                                                            >
                                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-brand ring-4 ring-brand/10 hover:scale-110 transition-transform">
                                                                    <User className="w-5 h-5 text-accent-brown" />
                                                                </div>
                                                            </AdvancedMarker>
                                                        )}
                                                        {selectedOrder.branch_lat && (
                                                            <AdvancedMarker 
                                                                onClick={() => setActiveMarker('branch')}
                                                                position={{ lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }}
                                                            >
                                                                <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white ring-8 ring-brand/5 hover:scale-110 transition-transform">
                                                                    <Store className="w-5 h-5 text-accent-brown" />
                                                                </div>
                                                            </AdvancedMarker>
                                                        )}
                                                        {activeMarker === 'delivery' && selectedOrder.delivery_lat && (
                                                            <InfoWindow
                                                                position={{ lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }}
                                                                onCloseClick={() => setActiveMarker(null)}
                                                                headerDisabled={true}
                                                            >
                                                                <div className="p-4 w-[240px] font-sans flex flex-col gap-4 relative">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                                                                            <User className="w-5 h-5 text-brand" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-xs font-black text-accent-brown leading-tight">Delivery Node</h3>
                                                                            <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Verified Recipient</p>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => setShowStreetView(true)}
                                                                        className="w-full bg-accent-brown text-white text-[9px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        Open Street View
                                                                    </button>
                                                                </div>
                                                            </InfoWindow>
                                                        )}
                                                        {activeMarker === 'branch' && selectedOrder.branch_lat && (
                                                            <InfoWindow
                                                                position={{ lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }}
                                                                onCloseClick={() => setActiveMarker(null)}
                                                                headerDisabled={true}
                                                            >
                                                                <div className="p-4 w-[240px] font-sans flex flex-col gap-4 relative">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                                                                            <Store className="w-5 h-5 text-brand" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-xs font-black text-accent-brown leading-tight">{selectedOrder.branch_name || 'Hi-Vet Clinic'}</h3>
                                                                            <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Logistics Hub</p>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => setShowStreetView(true)}
                                                                        className="w-full bg-brand text-accent-brown text-[9px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl hover:bg-brand-dark hover:text-white transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        Open Street View
                                                                    </button>
                                                                </div>
                                                            </InfoWindow>
                                                        )}
                                                        <DirectionsLine 
                                                            id="main-map"
                                                            userLat={Number(selectedOrder.delivery_lat)} 
                                                            userLng={Number(selectedOrder.delivery_lng)} 
                                                            clinicLat={Number(selectedOrder.branch_lat)} 
                                                            clinicLng={Number(selectedOrder.branch_lng)} 
                                                        />
                                                    </Map>
                                                </div>

                                                <div className="absolute top-8 left-8 z-20 pointer-events-none">
                                                    <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/50 pointer-events-auto">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">HV Reference ID</p>
                                                        <p className="text-sm font-black text-accent-brown">
                                                            HV-2026-{selectedOrder.id.toString().padStart(6, '0')}-{new Date(selectedOrder.created_at).getTime().toString().slice(-4)}
                                                        </p>
                                                    </div>
                                                </div>


                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="street-view"
                                                initial={{ opacity: 0, scale: 1.1 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="absolute inset-0 z-50 bg-black flex flex-col"
                                            >
                                                <div className="absolute top-8 right-8 z-50">
                                                    <button 
                                                        onClick={() => {
                                                            setShowStreetView(false);
                                                            streetViewInstance.current = null;
                                                        }}
                                                        className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white hover:bg-red-500 transition-all flex items-center justify-center"
                                                    >
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                </div>
                                                <div 
                                                    ref={(el) => {
                                                        if (el && !streetViewInstance.current && window.google) {
                                                            const pos = activeMarker === 'branch' 
                                                                ? { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) } 
                                                                : { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) };
                                                            
                                                            if (!isNaN(pos.lat) && !isNaN(pos.lng)) {
                                                                try {
                                                                    streetViewInstance.current = new window.google.maps.StreetViewPanorama(el, {
                                                                        position: pos,
                                                                        pov: { heading: 0, pitch: 0 },
                                                                        zoom: 1,
                                                                        addressControl: false,
                                                                        fullscreenControl: false,
                                                                    });
                                                                } catch (err) {
                                                                    console.error("Failed to init StreetView:", err);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className="w-full h-full"
                                                />
                                                
                                                {/* CINEMATIC MINI-MAP WIDGET */}
                                                <motion.div 
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="absolute bottom-8 right-8 w-52 h-36 bg-white/20 backdrop-blur-3xl rounded-[2rem] border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-[100] pointer-events-none"
                                                >
                                                    <div className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                                        <Map
                                                            id="mini-map"
                                                            mapId="4c730709b30c1be1"
                                                            defaultZoom={12}
                                                            gestureHandling={'none'}
                                                            disableDefaultUI={true}
                                                            className="w-full h-full"
                                                        >
                                                            <MapBoundsHandler 
                                                                id="mini-map"
                                                                padding={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                                                points={[
                                                                    { lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) },
                                                                    { lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }
                                                                ]} 
                                                            />
                                                            {selectedOrder.delivery_lat && (
                                                                <AdvancedMarker position={{ lat: Number(selectedOrder.delivery_lat), lng: Number(selectedOrder.delivery_lng) }}>
                                                                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center border border-brand text-[8px] font-black shadow-sm">
                                                                        <User className="w-3 h-3 text-accent-brown" />
                                                                    </div>
                                                                </AdvancedMarker>
                                                            )}
                                                            {selectedOrder.branch_lat && (
                                                                <AdvancedMarker position={{ lat: Number(selectedOrder.branch_lat), lng: Number(selectedOrder.branch_lng) }}>
                                                                    <div className="w-6 h-6 bg-brand rounded-lg flex items-center justify-center border border-white shadow-sm">
                                                                        <Store className="w-3 h-3 text-accent-brown" />
                                                                    </div>
                                                                </AdvancedMarker>
                                                            )}
                                                            {selectedOrder.delivery_lat && selectedOrder.branch_lat && (
                                                                <DirectionsLine 
                                                                    id="mini-map"
                                                                    userLat={Number(selectedOrder.delivery_lat)} 
                                                                    userLng={Number(selectedOrder.delivery_lng)} 
                                                                    clinicLat={Number(selectedOrder.branch_lat)} 
                                                                    clinicLng={Number(selectedOrder.branch_lng)} 
                                                                />
                                                            )}
                                                        </Map>
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                                                        <span className="text-[7px] font-black uppercase tracking-widest text-white drop-shadow-md">Logistics Hub</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="p-8 pb-12">
                                    <div className="bg-white/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-accent-brown/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Logistics Identity</h4>
                                            <span className="px-3 py-1 bg-brand text-[9px] font-black uppercase tracking-widest rounded-full">{selectedOrder.fulfillment_method}</span>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-accent-brown/5">
                                                    <User className="w-5 h-5 text-accent-brown" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Primary Contact</p>
                                                    <p className="text-sm font-black text-accent-brown">{selectedOrder.contact_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-accent-brown/5">
                                                    <MapPin className="w-5 h-5 text-accent-brown" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Target Address</p>
                                                    <p className="text-xs font-bold text-accent-brown/60 leading-relaxed pr-4">{selectedOrder.delivery_address || selectedOrder.branch_address}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                <div className="p-10 pb-6 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-accent-peach/10 flex items-center justify-center border border-accent-brown/5 group">
                                            <ShoppingBag className="w-8 h-8 text-brand group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-black text-accent-brown tracking-tighter">Receipt Summary</h2>
                                            <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Transaction Verified & Synchronized</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsDetailsModalOpen(false)}
                                        className="w-14 h-14 rounded-2xl bg-accent-peach/5 border border-accent-brown/5 text-accent-brown/30 hover:bg-black hover:text-white transition-all flex items-center justify-center"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                                    {[
                                        { label: 'Status', value: selectedOrder.status, icon: getStatusIcon(selectedOrder.status) },
                                        { label: 'Method', value: selectedOrder.payment_method, icon: <CreditCard className="w-4 h-4" /> },
                                        { label: 'Date', value: new Date(selectedOrder.created_at).toLocaleDateString(), icon: <Clock className="w-4 h-4" /> },
                                        { label: 'Volume', value: `${selectedOrder.items.length} Units`, icon: <Package className="w-4 h-4" /> }
                                    ].map((stat, i) => (
                                        <div key={i} className="p-5 bg-accent-peach/5 rounded-[2rem] border border-accent-brown/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-3">{stat.label}</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-accent-brown shadow-sm border border-accent-brown/5">
                                                    {stat.icon}
                                                </div>
                                                <span className="text-[10px] font-black text-accent-brown uppercase truncate">{stat.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto px-10 py-4 no-scrollbar">
                                    <div className="space-y-1">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-brown/20 mb-6 pl-1">Basket Portfolio Content</h4>
                                        <div className="space-y-4">
                                            {selectedOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-6 p-5 bg-white rounded-[2.5rem] border border-accent-brown/5 hover:border-brand/20 transition-all group shadow-sm hover:shadow-xl hover:shadow-accent-brown/5">
                                                    <div className="w-20 h-20 bg-accent-peach/5 rounded-[1.5rem] p-3 shrink-0 flex items-center justify-center border border-accent-brown/5">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-black text-base text-accent-brown truncate">{item.name}</h5>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="px-2 py-0.5 bg-slate-50 rounded text-[9px] font-black text-accent-brown/40 uppercase tracking-widest">{item.variant}</span>
                                                            <span className="text-[9px] font-bold text-accent-brown/20 uppercase tracking-widest">Size: {item.size}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-lg font-black text-accent-brown tracking-tighter leading-none">₱{(item.price * item.quantity).toFixed(2)}</p>
                                                        <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1.5">Qty {item.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-accent-peach/10 border-t border-accent-brown/5 shrink-0">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                                        <div className="flex gap-12">
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Portfolio Subtotal</p>
                                                <p className="text-xl font-bold text-accent-brown/40">₱{(selectedOrder.total_amount * 0.9).toFixed(2)}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Fulfilment Fee</p>
                                                <p className="text-xl font-bold text-accent-brown/40">₱{(selectedOrder.total_amount * 0.1).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-10">
                                            <div className="text-right">
                                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-accent-brown/20 mb-1">Total Bill</p>
                                                <p className="text-6xl font-black text-accent-brown tracking-[-0.05em] leading-none">₱{selectedOrder.total_amount.toFixed(2)}</p>
                                            </div>
                                            <button 
                                                onClick={() => setIsDetailsModalOpen(false)}
                                                className="px-12 py-6 bg-brand text-accent-brown font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-black hover:text-white transition-all shadow-2xl shadow-brand/20 active:scale-95"
                                            >
                                                Dismiss Summary
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* HI-VET ARCHITECTURE NOIR: CANCEL MODAL */}
            <AnimatePresence>
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCancelModalOpen(false)}
                            className="absolute inset-0 bg-accent-brown/40 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white"
                        >
                            <div className="p-10 border-b border-accent-brown/5 bg-red-50/30">
                                <div className="flex items-center gap-6 mb-4">
                                    <div className="w-16 h-16 bg-red-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-red-500/20">
                                        <ShieldAlert className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-accent-brown tracking-tighter">Cancel Order</h3>
                                        <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest mt-1">Transaction Identity Revocation</p>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-accent-brown/60 leading-relaxed">
                                    Warning: Revoking this transaction is permanent. Please specify the intelligence mismatch for our logistics optimization.
                                </p>
                            </div>

                            <div className="p-10 space-y-3">
                                {cancelReasons.map(reason => (
                                    <button
                                        key={reason}
                                        onClick={() => setCancelReason(reason)}
                                        className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                                            cancelReason === reason
                                                ? 'border-red-500 bg-red-50/50 text-red-600'
                                                : 'border-accent-brown/5 hover:border-accent-brown/10 text-accent-brown/40 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="text-[11px] font-black uppercase tracking-widest">{reason}</span>
                                        {cancelReason === reason && <CheckCircle className="w-5 h-5" />}
                                    </button>
                                ))}
                                {cancelReason === 'Other' && (
                                    <textarea
                                        placeholder="Intelligence insight..."
                                        className="w-full bg-slate-50 border-2 border-accent-brown/5 rounded-2xl p-5 text-sm font-bold outline-none focus:border-red-500 transition-colors"
                                        rows={3}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="p-10 bg-slate-50 flex gap-4">
                                <button
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="flex-1 py-5 bg-white border border-accent-brown/5 text-accent-brown rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-accent-peach/10 transition-all cursor-pointer shadow-sm"
                                >
                                    Abort Cancellation
                                </button>
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={!cancelReason || isCancelling}
                                    className="flex-1 py-5 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-30 shadow-xl shadow-red-500/20 cursor-pointer"
                                >
                                    {isCancelling ? 'Revoking...' : 'Confirm Revocation'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Global Modal */}
            <ModernModal
                isOpen={modal.isOpen}
                onClose={() => setModal(m => ({ ...m, isOpen: false }))}
                onConfirm={modal.onConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
            <QrCodeModal 
                isOpen={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                qrData={qrData}
                amount={selectedOrder?.total_amount || 0}
                reference={`HV-2026-${(selectedOrder?.id || 0).toString().padStart(6, '0')}-${selectedOrder ? new Date(selectedOrder.created_at).getTime().toString().slice(-4) : '0000'}`}
                status={qrStatus}
            />
        </DashboardLayout>
    );
};

export default CustomerOrders;
