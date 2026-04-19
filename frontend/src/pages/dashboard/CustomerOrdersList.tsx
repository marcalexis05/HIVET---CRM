import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import {
    ShoppingBag, Package, Truck, CheckCircle, XCircle,
    AlertCircle, ChevronRight, MapPin, Eye, Store,
    User, Phone, ShieldCheck, X, MessageSquare,
    ShieldAlert, Clock, CreditCard, Tag, Loader2,
    Activity, Trophy, Search, Filter, ArrowRight,
    Map as MapIcon, Navigation, Trash2, RotateCcw, Image as ImageIcon, Upload, Send
} from 'lucide-react';
import { APIProvider, useMap, AdvancedMarker, InfoWindow, Map } from '@vis.gl/react-google-maps';
import ModernModal from '../../components/ModernModal';
import QrCodeModal from '../../components/QrCodeModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface OrderItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    size?: string;
    image?: string;
    serial_number?: string;
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
    shipping_fee?: number;
    return_status?: string;
    return_reason?: string;
    return_photos?: string;
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
            map.fitBounds(bounds, padding || { top: 100, right: 100, bottom: 100, left: 100 });
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
                strokeColor: '#FF9F1C',
                strokeWeight: 4,
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
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [fulfillmentFilter, setFulfillmentFilter] = useState<'All' | 'delivery' | 'pickup'>('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await fetch(`${API}/api/orders/refund/upload`, {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                const data = await resp.json();
                setReturnPhotos(prev => [...prev, data.url]);
            }
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const submitReturnRequest = async () => {
        if (!selectedOrder || !returnReason) return;
        setSubmittingReturn(true);
        try {
            const resp = await fetch(`${API}/api/orders/${selectedOrder.id}/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('hivet_token')}`
                },
                body: JSON.stringify({
                    reason: returnReason,
                    photos: returnPhotos
                })
            });
            if (resp.ok) {
                setShowReturnModal(false);
                setReturnReason('');
                setReturnPhotos([]);
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to submit return', err);
        } finally {
            setSubmittingReturn(false);
        }
    };

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ordersPerPage = 6;
    const [showStreetView, setShowStreetView] = useState(false);
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);
    const [activeMarker, setActiveMarker] = useState<'branch' | 'delivery' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrData, setQrData] = useState('');
    const [qrStatus, setQrStatus] = useState<'pending' | 'succeeded' | 'expired' | 'processing'>('pending');

    const tabs = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Payment Pending', 'Returns'];

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`${API}/api/orders`, {
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

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason) return;
        setIsCancelling(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`${API}/api/orders/${selectedOrder.id}/cancel`, {
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
            const response = await fetch(`${API}/api/orders/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setOrders(prev => prev.filter(o => o.id !== id));
            }
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const handlePayExistingOrder = (order: Order) => {
        const checkoutItems = order.items.map(item => ({
            ...item,
            price: item.price,
            quantity: item.quantity
        }));

        localStorage.setItem('hivet_checkout_filtered', JSON.stringify(checkoutItems));
        localStorage.setItem('hivet_checkout_paying_order', JSON.stringify(order));
        navigate('/dashboard/customer/checkout?step=3');
    };

    const filteredOrders = orders.filter(o => {
        let matchesStatus = activeTab === 'All' || o.status === activeTab;
        if (activeTab === 'Returns') {
            matchesStatus = !!o.return_status;
        }

        const matchesFulfillment = fulfillmentFilter === 'All' || o.fulfillment_method === fulfillmentFilter;
        const matchesSearch = searchQuery === '' ||
            `HV-2026-${o.id.toString().padStart(6, '0')}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesFulfillment && matchesSearch;
    });

    const totalOrders = orders.length;
    const inTransitCount = orders.filter(o => o.status === 'Processing' || o.status === 'In Transit').length;
    const deliveredCount = orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const paginatedOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'Cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'Payment Pending': return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
            case 'Processing': return 'bg-brand/10 text-brand border-brand/20';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed': return <CheckCircle className="w-4 h-4" />;
            case 'Cancelled': return <XCircle className="w-4 h-4" />;
            case 'Pending': return <Package className="w-4 h-4" />;
            case 'Payment Pending': return <CreditCard className="w-4 h-4" />;
            case 'Processing': return <Activity className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <APIProvider apiKey={MAPS_API_KEY}>
            <DashboardLayout title="" hideHeader={isDetailsModalOpen || isCancelModalOpen} hideFooter={isDetailsModalOpen || isCancelModalOpen}>
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">


                    {/* CONTROL HUB: FILTERS & SEARCH */}
                    <div className="bg-white/50 backdrop-blur-3xl rounded-[3rem] p-6 border border-white shadow-2xl shadow-accent-brown/5">
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            {/* Search Bar */}
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by Order ID or Product Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white h-20 pl-16 pr-8 rounded-[2rem] text-sm font-black text-accent-brown placeholder:text-black/30 outline-none border border-accent-brown/5 focus:border-brand/40 transition-all shadow-inner"
                                />
                            </div>

                            {/* Fulfillment Filter */}
                            <div className="flex items-center gap-3 p-1.5 bg-slate-100/50 rounded-[2rem] border border-accent-brown/5 self-stretch lg:self-auto">
                                {['All', 'delivery', 'pickup'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFulfillmentFilter(f as any)}
                                        className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${fulfillmentFilter === f
                                            ? 'bg-white text-accent-brown shadow-xl'
                                            : 'text-black hover:text-accent-brown'
                                            }`}
                                    >
                                        {f === 'delivery' ? 'Delivery' : f === 'pickup' ? 'Pickup' : 'All Methods'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-accent-brown/5 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black mr-4">Filter by Status:</span>
                            {tabs.map((tab) => {
                                const count = tab === 'All'
                                    ? orders.length
                                    : tab === 'Returns'
                                        ? orders.filter(o => !!o.return_status).length
                                        : orders.filter(o => o.status === tab).length;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            setCurrentPage(1);
                                        }}
                                        className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab
                                            ? 'bg-brand text-white shadow-md shadow-brand/20'
                                            : 'bg-white text-black border border-accent-brown/5 hover:border-brand/20 hover:text-brand'
                                            }`}
                                    >
                                        {tab}
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-50 text-accent-brown/30'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ORDER GRID */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-72 bg-white/50 animate-pulse rounded-[3rem] border border-white shadow-xl"></div>
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/50 py-10 rounded-[4rem] flex flex-col items-center gap-8 text-center border-2 border-dashed border-accent-brown/10"
                        >
                            <div className="w-24 h-24 bg-accent-peach/20 rounded-full flex items-center justify-center text-accent-brown/20">
                                <ShoppingBag className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-accent-brown tracking-tighter mb-2">No Records Found</h3>
                                <p className="text-sm font-medium text-black max-w-xs mx-auto">Try adjusting your filters or search query to find specific orders.</p>
                            </div>
                            <button
                                onClick={() => { setSearchQuery(''); setActiveTab('All'); setFulfillmentFilter('All'); }}
                                className="px-10 py-4 bg-brand text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-xl shadow-brand/20"
                            >
                                Reset Control Hub
                            </button>
                        </motion.div>
                    ) : (
                        <div className="space-y-12">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {paginatedOrders.map((order, i) => (
                                        <motion.div
                                            key={order.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, delay: i * 0.05 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setIsDetailsModalOpen(true);
                                            }}
                                            className="group bg-white rounded-[2.5rem] p-6 shadow-[0_20px_50px_rgba(45,34,27,0.06)] border border-white hover:border-brand/30 transition-all relative overflow-hidden flex flex-col cursor-pointer"
                                        >
                                            {/* TOP LOGISTICS LAYER */}
                                            <div className="flex items-center justify-between mb-6 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${getStatusStyle(order.status)}`}>
                                                        {getStatusIcon(order.status)}
                                                        {order.status}
                                                    </div>
                                                    <div className="px-4 py-1.5 bg-slate-50 border border-accent-brown/5 rounded-full text-[9px] font-black uppercase tracking-widest text-black">
                                                        {order.fulfillment_method}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black tracking-[0.25em] text-accent-brown/20 uppercase">Deployment ID</p>
                                                    <p className="text-[10px] font-black text-accent-brown tracking-widest mt-0.5">HV-2026-{order.id.toString().padStart(6, '0')}</p>
                                                </div>
                                            </div>

                                            {/* CORE IDENTITY LAYER */}
                                            <div className="flex items-center gap-6 mb-8 relative z-10">
                                                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-accent-brown/5 overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500 p-4">
                                                    <img
                                                        src={order.items[0]?.image}
                                                        alt={order.items[0]?.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="text-[9px] font-black text-brand uppercase tracking-widest">
                                                            HV-2026-{order.id.toString().padStart(6, '0')}
                                                        </p>
                                                    </div>
                                                    <h3 className="text-xl font-black text-accent-brown tracking-tighter leading-tight group-hover:text-brand transition-colors">
                                                        {order.items[0]?.name}
                                                        {order.items.length > 1 && <span className="text-accent-brown/20 ml-2">+{order.items.length - 1} more</span>}
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-accent-brown/20 uppercase tracking-widest mb-1">TOTAL</p>
                                                    <p className="text-2xl font-black text-accent-brown tracking-tighter">₱{Number(order.total_amount).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* LOGISTICS PROGRESS BAR (STYLIZED) */}
                                            <div className="mb-10 relative z-10">
                                                <div className="flex justify-between items-end mb-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Order Progress</p>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">
                                                        {order.status === 'Completed' ? '100% Finalized' : order.status === 'Processing' ? '65% Routing' : '15% Initialization'}
                                                    </p>
                                                </div>
                                                <div className="h-2 w-full bg-slate-50 border border-accent-brown/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: order.status === 'Completed' ? '100%' : order.status === 'Processing' ? '65%' : '15%' }}
                                                        transition={{ duration: 1.5, ease: "circOut" }}
                                                        className={`h-full ${order.status === 'Completed' ? 'bg-emerald-500' : 'bg-brand'}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* INTERACTIVE FOOTER LAYER */}
                                            <div className="mt-auto pt-10 border-t border-accent-brown/5 flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex -space-x-3">
                                                        {order.items.slice(0, 3).map((item, idx) => (
                                                            <div key={idx} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                                                <img src={item.image} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                        ))}
                                                        {order.items.length > 3 && (
                                                            <div className="w-10 h-10 rounded-full border-2 border-white bg-accent-brown text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                                                +{order.items.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-[9px] font-black text-black uppercase tracking-[0.2em]">Deployment Timestamp</p>
                                                        <p className="text-[10px] font-black text-black tracking-widest">{new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {order.status === 'Cancelled' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); handleHideOrder(order.id); }}
                                                            className="w-14 h-14 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                            title="Purge Cancellation Record"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </motion.button>
                                                    )}

                                                    {order.status === 'Payment Pending' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => { e.stopPropagation(); handlePayExistingOrder(order); }}
                                                            className="h-14 px-8 bg-sky-500 text-white rounded-2xl flex items-center gap-3 shadow-xl shadow-sky-500/20 text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                            Resolve Payment
                                                        </motion.button>
                                                    )}
                                                    {order.status === 'Completed' && !order.return_status && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setSelectedOrder(order);
                                                                setShowReturnModal(true);
                                                            }}
                                                            className="h-14 px-8 bg-black text-white rounded-2xl flex items-center gap-3 shadow-xl text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                            Request Return
                                                        </motion.button>
                                                    )}

                                                    {order.return_status && (
                                                        <div className="h-14 px-8 bg-accent-peach/20 border-2 border-accent-peach/30 text-accent-brown rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-80 cursor-default">
                                                            <ShieldAlert className="w-4 h-4" />
                                                            {order.return_status}
                                                        </div>
                                                    )}

                                                    <div className="h-14 px-10 bg-brand text-white rounded-2xl flex items-center gap-3 shadow-2xl shadow-brand/20 text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all cursor-pointer">
                                                        Order Details
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Atmospheric Bloom */}
                                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[80px] -mr-40 -mt-40 group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Pagination Bar */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 py-10">
                                    <p className="text-[11px] font-black text-black uppercase tracking-[0.2em]">
                                        Logistics Page <span className="text-accent-brown">{currentPage}</span> of <span className="text-accent-brown">{totalPages}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="h-14 px-8 rounded-2xl bg-white text-accent-brown border border-accent-brown/5 font-black text-[10px] uppercase tracking-widest hover:bg-accent-brown hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-2 mx-4">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={`w-12 h-14 rounded-2xl font-black text-[11px] transition-all ${currentPage === i + 1 ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'bg-white text-accent-brown/30 border border-accent-brown/5 hover:border-brand/40 hover:text-brand'}`}
                                                >
                                                    {(i + 1).toString().padStart(2, '0')}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="h-14 px-8 rounded-2xl bg-brand text-white font-black text-[10px] uppercase tracking-widest hover:bg-brand-dark transition-all shadow-xl shadow-brand/20 disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ORDER DETAILS MODAL */}
                {createPortal(
                    <AnimatePresence>
                        {isDetailsModalOpen && selectedOrder && (() => {
                            const order = selectedOrder;
                            return (
                                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 lg:p-8">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="absolute inset-0 bg-accent-brown/30 backdrop-blur-2xl"
                                />
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 30 }}
                                    className="bg-white w-full max-w-7xl h-full lg:h-[85vh] rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden flex flex-col lg:flex-row transition-all border border-white"
                                >
                                    {/* LEFT SIDE: LOGISTICS PANE */}
                                    <div className="lg:w-[45%] bg-accent-peach/5 border-r border-accent-brown/5 flex flex-col overflow-hidden relative">
                                        <div className="p-10 pb-6">
                                            <div className="flex flex-col gap-1 mb-8 pt-4">
                                                <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase">Order Details</h3>
                                            </div>

                                            <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl shadow-accent-brown/5 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-accent-brown/5 flex items-center justify-center text-accent-brown">
                                                            <Navigation className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Tracking Number</p>
                                                            <p className="text-[11px] font-black text-accent-brown uppercase tracking-widest">HV-2026-{order.id.toString().padStart(6, '0')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-[1px] h-8 bg-accent-brown/10 mx-2" />
                                                        <div className="w-3 h-3 rounded-full bg-brand animate-pulse" />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex flex-col items-center gap-1.5 pt-1">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-accent-brown/20 shrink-0" />
                                                            <div className="w-[1px] h-10 bg-accent-brown/10 border-dashed border-[1px]" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div>
                                                                <p className="text-[9px] font-black text-black uppercase tracking-widest mb-0.5">Origin (Clinic)</p>
                                                                <p className="text-xs font-black text-accent-brown truncate">{order.branch_name || 'Verification Center'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-black uppercase tracking-widest mb-0.5">Destination (Encrypted Address)</p>
                                                                <p className="text-xs font-black text-accent-brown leading-relaxed line-clamp-2">{order.delivery_address || order.branch_address || 'Clinic Pickup Point'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 relative mx-10 mb-10 rounded-[3rem] overflow-hidden border border-accent-brown/5 group">
                                            <Map
                                                id="details-map"
                                                mapId="4c730709b30c1be1"
                                                defaultCenter={{ lat: 14.5995, lng: 120.9842 }}
                                                defaultZoom={15}
                                                gestureHandling={'greedy'}
                                                disableDefaultUI={true}
                                                className="w-full h-full"
                                            >
                                                <MapBoundsHandler
                                                    id="details-map"
                                                    points={[
                                                        { lat: Number(order.delivery_lat || 14.5995), lng: Number(order.delivery_lng || 120.9842) },
                                                        { lat: Number(order.branch_lat || 14.5995), lng: Number(order.branch_lng || 120.9842) }
                                                    ]}
                                                />
                                                {order.delivery_lat && (
                                                    <AdvancedMarker position={{ lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }}>
                                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-brand">
                                                            <User className="w-4 h-4 text-accent-brown" />
                                                        </div>
                                                    </AdvancedMarker>
                                                )}
                                                {order.branch_lat && (
                                                    <AdvancedMarker position={{ lat: Number(order.branch_lat), lng: Number(order.branch_lng) }}>
                                                        <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center shadow-xl border-2 border-white">
                                                            <Store className="w-4 h-4 text-accent-brown" />
                                                        </div>
                                                    </AdvancedMarker>
                                                )}
                                                <DirectionsLine
                                                    id="details-map"
                                                    userLat={Number(order.delivery_lat)}
                                                    userLng={Number(order.delivery_lng)}
                                                    clinicLat={Number(order.branch_lat)}
                                                    clinicLng={Number(order.branch_lng)}
                                                />
                                            </Map>
                                            <div className="absolute top-4 left-4 right-4 flex justify-between gap-4">
                                                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white shadow-lg">
                                                    <p className="text-[10px] font-black text-accent-brown">Real-time Visualization</p>
                                                </div>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-accent-peach/20 to-transparent pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* RIGHT SIDE: CONTENT PANE */}
                                    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                                        {/* Header / Summary */}
                                        <div className="p-10 pb-6 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-accent-brown border border-accent-brown/5">
                                                    <ShoppingBag className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-1">Receipt Intelligence</p>
                                                    <h2 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Order Summary</h2>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsDetailsModalOpen(false)}
                                                className="w-14 h-14 rounded-2xl bg-slate-50 border border-accent-brown/5 text-accent-brown/20 hover:bg-black hover:text-white transition-all flex items-center justify-center group"
                                            >
                                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                            </button>
                                        </div>
                                        <div className="px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                                            {[
                                                { label: 'Status', value: order.status, icon: getStatusIcon(order.status) },
                                                { label: 'Payment', value: order.payment_method, icon: <CreditCard className="w-4 h-4" /> },
                                                { label: 'Deployment', value: new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase(), icon: <Clock className="w-4 h-4" /> },
                                                { label: 'Payload', value: `${order.items.length} Units`, icon: <Package className="w-4 h-4" /> }
                                            ].map((stat, i) => (
                                                <div key={i} className="p-6 bg-slate-50 rounded-[2.5rem] border border-accent-brown/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-black mb-3">{stat.label}</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-accent-brown shadow-sm border border-accent-brown/5">
                                                            {stat.icon}
                                                        </div>
                                                        <span className="text-[10px] font-black text-accent-brown uppercase truncate">{stat.value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Items Area */}
                                        <div className="flex-1 overflow-y-auto px-10 py-6 no-scrollbar">
                                            <div className="space-y-4">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-8 p-6 bg-white rounded-[3rem] border border-accent-brown/5 hover:border-brand transition-all group shadow-sm hover:shadow-2xl hover:shadow-accent-brown/5">
                                                        <div className="w-24 h-24 bg-slate-50/50 rounded-[2.5rem] p-4 shrink-0 flex items-center justify-center border border-accent-brown/5 group-hover:scale-105 transition-transform duration-500">
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-black text-xl text-accent-brown truncate mb-2">{item.name}</h5>
                                                            <div className="flex items-center gap-4">
                                                                <span className="px-3 py-1 bg-brand/10 rounded-full text-[9px] font-black text-brand uppercase tracking-widest">{item.variant}</span>
                                                                <span className="text-[9px] font-bold text-black uppercase tracking-[0.2em]">Size: {item.size}</span>
                                                             </div>
                                                             {item.serial_number && (
                                                                  <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-accent-brown/5 rounded-xl border border-accent-brown/5 w-fit">
                                                                      <Tag className="w-3 h-3 text-accent-brown/20" />
                                                                      <span className="text-[9px] font-black text-accent-brown/60 uppercase tracking-widest">
                                                                          Serial: <span className="text-accent-brown">{item.serial_number}</span>
                                                                      </span>
                                                                  </div>
                                                             )}
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[10px] font-black text-accent-brown/20 uppercase tracking-widest mb-1.5">Qty {item.quantity}</p>
                                                            <p className="text-2xl font-black text-accent-brown tracking-tighter">₱{(item.price * item.quantity).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Summary Footer */}
                                        <div className="p-8 sm:p-10 bg-accent-peach/5 border-t border-accent-brown/5 shrink-0 flex items-center justify-between">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center gap-4">
                                                    {(order.status === 'Pending' || order.status === 'Payment Pending') && (
                                                        <button
                                                            onClick={() => {
                                                                setIsDetailsModalOpen(false);
                                                                setIsCancelModalOpen(true);
                                                            }}
                                                            className="px-8 py-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                                                        >
                                                            Cancel Order
                                                        </button>
                                                    )}
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black mb-1">Secure Transaction</p>
                                                        <p className="text-[11px] font-bold text-black/50">All calculations final</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex flex-col items-end gap-1 mb-4">
                                                    <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-black/30">
                                                        <span>Subtotal</span>
                                                        <span>₱{(order.total_amount - (order.shipping_fee || 0) + (order.discount_amount || 0)).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-brand">
                                                        <span>Logistics Fee</span>
                                                        <span>{(order.shipping_fee && order.shipping_fee > 0) ? `₱${order.shipping_fee.toLocaleString()}` : "FREE"}</span>
                                                    </div>
                                                    {order.discount_amount !== undefined && order.discount_amount > 0 && (
                                                        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                                            <span>Reward Applied</span>
                                                            <span>-₱{order.discount_amount.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand mb-1.5 leading-none">Total Settlement</p>
                                                <p className="text-5xl sm:text-7xl font-black text-accent-brown tracking-tighter leading-none">₱{order.total_amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                            );
                        })()}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Refund/Return Modal */}
                {showReturnModal && createPortal(
                    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReturnModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-white rounded-[4rem] w-full max-w-2xl p-16 shadow-3xl overflow-hidden relative z-10 border border-white"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32" />
                            
                            <h2 className="text-4xl font-black text-accent-brown tracking-tighter mb-2 relative">Request a Return</h2>
                            <p className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.3em] mb-12 relative">Order HV-{new Date(selectedOrder?.created_at || '').getFullYear()}-{selectedOrder?.id.toString().padStart(6, '0')}</p>

                            <div className="space-y-10 relative">
                                <div>
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-black block mb-4 ml-2">Reason for Request</label>
                                    <textarea 
                                        value={returnReason}
                                        onChange={e => setReturnReason(e.target.value)}
                                        placeholder="Please provide a detailed explanation..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 text-sm font-bold text-accent-brown outline-none focus:border-brand/50 transition-all min-h-[160px] resize-none shadow-inner"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-black block">Evidence Photos</label>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 bg-accent-peach/5 px-4 py-1.5 rounded-full border border-accent-peach/10">{returnPhotos.length} / 4 Slots</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {returnPhotos.map((url, i) => (
                                            <div key={i} className="aspect-square rounded-[2rem] border-2 border-slate-100 overflow-hidden relative group shadow-lg">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => setReturnPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute inset-0 bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        ))}
                                        {returnPhotos.length < 4 && (
                                            <label className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all group active:scale-95">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                                                    {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-300 group-hover:text-brand transition-all">Upload</span>
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-6 items-center">
                                    <button 
                                        onClick={() => setShowReturnModal(false)}
                                        className="flex-1 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] text-black border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        Dismiss
                                    </button>
                                    <button 
                                        onClick={submitReturnRequest}
                                        disabled={!returnReason || returnPhotos.length === 0 || submittingReturn}
                                        className="flex-[2] py-6 px-12 bg-black text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-brand-dark transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]"
                                    >
                                        {submittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {submittingReturn ? 'Processing...' : 'Finalize Request'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}

                {/* CANCELLATION MODAL */}
                {createPortal(
                    <AnimatePresence>
                        {isCancelModalOpen && (
                            <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="absolute inset-0 bg-rose-950/20 backdrop-blur-xl"
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border border-white"
                                >
                                    <div className="p-12 border-b border-rose-100/10 bg-rose-50/50">
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className="w-20 h-20 bg-rose-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-rose-500/30">
                                                <ShieldAlert className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-accent-brown tracking-tighter">REVOCATION</h3>
                                                <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest mt-1">Permanent Transaction Withdrawal</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-accent-brown/60 leading-relaxed max-w-2xl">
                                            You are about to revoke this transaction. This action is definitive. Please categorize the logic for our performance registry.
                                        </p>
                                    </div>

                                    <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            "Change of mind",
                                            "Algorithm Optimization Error",
                                            "Financial Pivot",
                                            "Logistic Delay Concerns",
                                            "Duplicate Order",
                                            "Others"
                                        ].map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => setCancelReason(reason)}
                                                className={`flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer ${cancelReason === reason
                                                    ? 'border-rose-500 bg-rose-50 text-rose-600'
                                                    : 'border-accent-brown/5 hover:border-brand/40 text-accent-brown/40 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-[11px] font-black uppercase tracking-widest">{reason}</span>
                                                {cancelReason === reason && <CheckCircle className="w-5 h-5" />}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-12 bg-slate-50 flex gap-4">
                                        <button
                                            onClick={() => setIsCancelModalOpen(false)}
                                            className="flex-1 py-6 bg-white border border-accent-brown/5 text-accent-brown rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-accent-peach/10 transition-all cursor-pointer shadow-sm"
                                        >
                                            ABORT
                                        </button>
                                        <button
                                            onClick={handleCancelOrder}
                                            disabled={!cancelReason || isCancelling}
                                            className="flex-1 py-6 bg-rose-500 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-30 shadow-2xl shadow-rose-500/20 cursor-pointer"
                                        >
                                            {isCancelling ? 'PROCESSING...' : 'CONFIRM'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

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
                    reference={`HV-2026-${(selectedOrder?.id || 0).toString().padStart(6, '0')}`}
                    status={qrStatus}
                />
            </DashboardLayout>
        </APIProvider>
    );
};

export default CustomerOrders;
