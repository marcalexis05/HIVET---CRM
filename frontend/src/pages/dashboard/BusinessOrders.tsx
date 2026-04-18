import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Search, Eye, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp, MapPin, Truck, Store, X, Navigation, ShieldCheck, ShoppingBag, Users, Banknote, Bike } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { CustomDropdown } from '../../components/CustomDropdown';
import BranchSelector from '../../components/BranchSelector';

// ALL_ORDERS moved to state

const STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    Completed: <CheckCircle className="w-3 h-3" />,
    Processing: <Loader2 className="w-3 h-3 animate-spin" />,
    Pending: <Clock className="w-3 h-3" />,
    Cancelled: <XCircle className="w-3 h-3" />,
};

const STATUS_FILTERS = ['All', 'Completed', 'Processing', 'Pending', 'Cancelled'];
const FULFILLMENT_FILTERS = ['All', 'Delivery', 'Pickup'];

const BusinessOrders = () => {
    const { user } = useAuth();
    const [branchId, setBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (saved === 'all') return null;
        return saved ? parseInt(saved) : null;
    });
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [fulfillmentFilter, setFulfillmentFilter] = useState('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Street View State
    const [showStreetView, setShowStreetView] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [panoPosition, setPanoPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState({ heading: 0, pitch: 0 });
    const streetViewInstance = React.useRef<google.maps.StreetViewPanorama | null>(null);

    useEffect(() => {
        if (user?.token) {
            fetchOrders();
        }
    }, [user?.token, branchId]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:8000/api/business/orders';
            const params = new URLSearchParams();
            if (branchId) params.append('branch_id', branchId.toString());
            if (params.toString()) url += `?${params.toString()}`;

            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (resp.ok) {
                setOrders(await resp.json());
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = orders.filter(o => {
        const matchStatus = statusFilter === 'All' || o.status === statusFilter;
        const matchFulfillment = fulfillmentFilter === 'All' ||
            (fulfillmentFilter === 'Delivery' && o.fulfillment_method === 'delivery') ||
            (fulfillmentFilter === 'Pickup' && o.fulfillment_method === 'pickup');
        const matchSearch = String(o.customer || '').toLowerCase().includes(search.toLowerCase())
            || String(o.id || '').toLowerCase().includes(search.toLowerCase())
            || String(o.product || '').toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchFulfillment && matchSearch;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, fulfillmentFilter, branchId]);

    const totalRevenue = filtered.reduce((sum, o) => sum + (!['Cancelled', 'Pending'].includes(o.status) ? o.total : 0), 0);

    return (
        <DashboardLayout title="">
            <div className="space-y-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-accent-brown tracking-tighter">Order Logistics</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mt-1">Real-time fulfillment tracking per branch</p>
                    </div>
                    {user?.token && <BranchSelector token={user.token} onBranchChange={setBranchId} currentBranchId={branchId} />}
                </div>

                {/* Uniform KPI Overview (25% Sizing) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue Card */}
                    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 border border-white shadow-xl shadow-accent-brown/5 flex items-center gap-4 transition-all hover:scale-[1.02]">
                        <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                            <Banknote className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Total Revenue</p>
                            <h2 className="text-xl font-black text-brand-dark tracking-tighter">
                                ₱{totalRevenue.toLocaleString()}
                            </h2>
                        </div>
                    </div>

                    {/* Total Orders Card */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/50 flex items-center gap-4 transition-all hover:scale-[1.02]">
                        <div className="w-12 h-12 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown shrink-0">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Total Orders</p>
                            <p className="text-2xl font-black text-accent-brown">{filtered.length}</p>
                        </div>
                    </div>

                    {/* Delivery Card */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/50 flex items-center gap-4 transition-all hover:scale-[1.02]">
                        <div className="w-12 h-12 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown shrink-0">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Delivery</p>
                            <p className="text-2xl font-black text-accent-brown">{filtered.filter(o => o.fulfillment_method?.toLowerCase() === 'delivery').length}</p>
                        </div>
                    </div>

                    {/* Pickup Card */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/50 flex items-center gap-4 transition-all hover:scale-[1.02]">
                        <div className="w-12 h-12 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown shrink-0">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Pickup</p>
                            <p className="text-2xl font-black text-accent-brown">{filtered.filter(o => o.fulfillment_method?.toLowerCase() === 'pickup').length}</p>
                        </div>
                    </div>
                </div>

                {/* Order Command Center (Redesigned Search & Filters) */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-4 shadow-2xl shadow-accent-brown/5 border border-white flex flex-col xl:flex-row items-center gap-6">
                    {/* Left: Search - Expanded & Premium */}
                    <div className="relative flex-1 w-full group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown group-focus-within:bg-brand group-focus-within:text-white transition-all duration-500">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            type="text"
                            placeholder="Find orders by ID, Customer name or Product..."
                            className="w-full pl-16 pr-6 py-4 bg-white/40 rounded-2xl border border-accent-peach/10 focus:border-brand/40 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown transition-all shadow-inner"
                        />
                    </div>

                    {/* Right: Filter Clusters */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        {/* Fulfillment Cluster */}
                        <div className="flex items-center gap-2 p-1.5 bg-accent-peach/10 rounded-2xl border border-accent-peach/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                            <div className="px-3 py-1 flex items-center gap-2 border-r border-accent-brown/5 mr-1">
                                <Truck className="w-3.5 h-3.5 text-accent-brown" />
                                <span className="text-[8px] font-black uppercase text-accent-brown tracking-widest hidden lg:block">Fulfillment</span>
                            </div>
                            {FULFILLMENT_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFulfillmentFilter(f)}
                                    className={`px-5 py-2 rounded-[0.9rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${fulfillmentFilter === f ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-accent-brown hover:bg-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Status Cluster */}
                        <div className="flex items-center gap-2 p-1.5 bg-accent-peach/10 rounded-2xl border border-accent-peach/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                            <div className="px-3 py-1 flex items-center gap-2 border-r border-accent-brown/5 mr-1">
                                <Clock className="w-3.5 h-3.5 text-accent-brown" />
                                <span className="text-[8px] font-black uppercase text-accent-brown tracking-widest hidden lg:block">Status</span>
                            </div>
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`px-5 py-2 rounded-[0.9rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === f ? 'bg-brand-dark text-white shadow-lg shadow-brand/20' : 'text-accent-brown hover:bg-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Professional Card Grid (Replaces Table) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="bg-white rounded-[2rem] h-[400px] animate-pulse border border-accent-peach/10" />
                        ))
                    ) : (
                        paginated.map((o, i) => (
                            <motion.div
                                key={o.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-accent-brown/5 border-2 transition-all group flex flex-col ${expandedId === o.id ? 'border-brand ring-4 ring-brand/5' : 'border-transparent hover:border-brand/20'}`}
                            >
                                {/* Card Body Clickable for Detail */}
                                <div
                                    className="cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                >
                                    {/* Image Section */}
                                    <div className="aspect-[4/3] bg-accent-peach/5 relative overflow-hidden flex items-center justify-center p-8">
                                        {o.image ? (
                                            <img src={o.image} alt={o.product} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 opacity-10">
                                                <ShoppingBag className="w-12 h-12" />
                                                <span className="text-[10px] font-black uppercase">No Image</span>
                                            </div>
                                        )}
                                        {/* Status Floating Badge */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md ${STATUS_STYLES[o.status]}`}>
                                                {STATUS_ICONS[o.status]} {o.status}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/50 shadow-sm">
                                            <p className="text-[8px] font-black text-accent-brown uppercase tracking-widest">{o.id}</p>
                                        </div>
                                    </div>

                                    {/* Info Section */}
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <h4 className="font-black text-accent-brown text-lg tracking-tight leading-tight line-clamp-2">{o.product}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-6 h-6 rounded-lg bg-accent-peach/20 flex items-center justify-center text-accent-brown/50">
                                                    <Users className="w-3.5 h-3.5" />
                                                </div>
                                                <p className="text-xs font-bold text-accent-brown/70">{o.customer}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-accent-brown/5">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 mb-0.5">Quantity</p>
                                                <p className="text-sm font-black text-accent-brown">×{o.qty}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 mb-0.5">Total Amount</p>
                                                <p className="text-base font-black text-brand-dark tracking-tighter">₱{o.total.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex items-center gap-1 text-accent-brown/40">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{o.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-accent-brown/40">
                                                {o.fulfillment_method === 'delivery' ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{o.fulfillment_method}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content (Detailed Logistics) */}
                                <AnimatePresence>
                                    {expandedId === o.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-accent-peach/5 border-t border-accent-brown/5"
                                        >
                                            <div className="p-6 space-y-6">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Update Status</p>
                                                            <CustomDropdown
                                                                value={o.status}
                                                                onChange={async (val) => {
                                                                    try {
                                                                        const res = await fetch(`http://localhost:8000/api/business/orders/${o.order_id}/status`, {
                                                                            method: 'PATCH',
                                                                            headers: {
                                                                                'Content-Type': 'application/json',
                                                                                'Authorization': `Bearer ${user?.token}`
                                                                            },
                                                                            body: JSON.stringify({ status: val })
                                                                        });
                                                                        if (res.ok) fetchOrders();
                                                                    } catch (err) {
                                                                        console.error('Failed to update status', err);
                                                                    }
                                                                }}
                                                                options={STATUS_FILTERS.slice(1).map(s => ({
                                                                    label: s,
                                                                    value: s,
                                                                    icon: STATUS_ICONS[s]
                                                                }))}
                                                                className="!py-2 !rounded-xl !text-[10px]"
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <button
                                                                onClick={() => {
                                                                    setViewingOrder(o);
                                                                    setShowStreetView(true);
                                                                }}
                                                                className="w-full h-[42px] bg-accent-brown text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                                                            >
                                                                <Navigation className="w-3.5 h-3.5" /> Tracking HUD
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {o.serial_number && (
                                                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                                            <p className="text-[8px] font-black uppercase text-orange-400 mb-1 tracking-widest">Verification Serial</p>
                                                            <p className="text-sm font-black text-orange-600 tracking-wider break-all">{o.serial_number}</p>
                                                        </div>
                                                    )}

                                                    {o.fulfillment_method === 'delivery' && !o.delivery_status && (
                                                        <button
                                                            onClick={async () => {
                                                                const res = await fetch(`http://localhost:8000/api/business/deliveries/${o.order_id}/broadcast`, {
                                                                    method: 'POST',
                                                                    headers: { 'Authorization': `Bearer ${user?.token}` }
                                                                });
                                                                if (res.ok) fetchOrders();
                                                            }}
                                                            className="w-full py-3 bg-brand text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-brand/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/10"
                                                        >
                                                            <Truck className="w-3.5 h-3.5" /> Broadcast to Rider
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="h-40 rounded-2xl overflow-hidden border border-accent-brown/10 shadow-inner group/smallmap">
                                                    <Map
                                                        mapId="7b36622874134468"
                                                        center={o.delivery_lat ? { lat: o.delivery_lat, lng: o.delivery_lng } : { lat: 14.5995, lng: 120.9842 }}
                                                        defaultZoom={14}
                                                        disableDefaultUI={true}
                                                        className="w-full h-full"
                                                    >
                                                        {o.delivery_lat && (
                                                            <AdvancedMarker position={{ lat: o.delivery_lat, lng: o.delivery_lng }}>
                                                                <div className="relative">
                                                                    {/* Radiation Effect */}
                                                                    <div className="absolute inset-0 bg-brand rounded-full animate-ping opacity-60" />
                                                                    <div className="relative w-4 h-4 bg-brand rounded-full border-2 border-white shadow-xl" />
                                                                </div>
                                                            </AdvancedMarker>
                                                        )}
                                                    </Map>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-8">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="w-11 h-11 rounded-xl bg-white border border-accent-peach/20 flex items-center justify-center text-accent-brown hover:bg-brand-dark hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-accent-brown shadow-xl shadow-accent-brown/5"
                        >
                            <ChevronDown className="w-5 h-5 rotate-90" />
                        </button>
                        <div className="flex items-center gap-2">
                            {[...Array(totalPages)].map((_, pi) => (
                                <button
                                    key={pi}
                                    onClick={() => setCurrentPage(pi + 1)}
                                    className={`w-11 h-11 rounded-xl font-black text-xs transition-all ${currentPage === pi + 1 ? 'bg-brand shadow-lg shadow-brand/20 text-white' : 'bg-white text-accent-brown border border-accent-peach/10 hover:border-brand/50'}`}
                                >
                                    {pi + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="w-11 h-11 rounded-xl bg-white border border-accent-peach/20 flex items-center justify-center text-accent-brown hover:bg-brand-dark hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-accent-brown shadow-xl shadow-accent-brown/5"
                        >
                            <ChevronDown className="w-5 h-5 -rotate-90" />
                        </button>
                    </div>
                )}

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-accent-peach/20">
                        <p className="text-accent-brown/40 font-bold">No orders found matching your criteria.</p>
                    </div>
                )}

            </div>

            {/* Street View Overlay */}
            <AnimatePresence>
                {showStreetView && viewingOrder && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[1000] bg-black flex flex-col"
                    >
                        <div className="absolute top-8 left-8 right-8 z-[1110] flex items-center justify-between pointer-events-none">
                            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 pointer-events-auto">
                                <h3 className="text-white text-lg font-black tracking-tighter leading-tight">{viewingOrder.customer}</h3>
                                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">{viewingOrder.delivery_address}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowStreetView(false);
                                    streetViewInstance.current = null;
                                }}
                                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-600 transition-all pointer-events-auto shadow-2xl"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col relative">
                            <div className="flex-[0.7] relative bg-black">
                                <div
                                    ref={(el) => {
                                        if (el && !streetViewInstance.current) {
                                            const pos = { lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) };
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
                            </div>

                            <div className="flex-[0.3] relative overflow-hidden shadow-2xl border-t-2 border-brand/5">
                                <Map
                                    mapId="46537618861d8583"
                                    center={panoPosition || { lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) }}
                                    zoom={17}
                                    disableDefaultUI={true}
                                    className="w-full h-full"
                                >
                                    {panoPosition && (
                                        <AdvancedMarker position={panoPosition}>
                                            <div
                                                className="w-10 h-10 flex items-center justify-center"
                                                style={{ transform: `rotate(${panoPov.heading}deg)` }}
                                            >
                                                <div className="relative flex items-center justify-center">
                                                    {/* Motorcycle Radiation Effect */}
                                                    <div className="absolute inset-0 bg-brand rounded-full animate-ping opacity-20 scale-150" />
                                                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border-2 border-brand shadow-2xl relative">
                                                        <Bike className="w-5 h-5 text-brand" />
                                                    </div>
                                                </div>
                                            </div>
                                        </AdvancedMarker>
                                    )}
                                    <AdvancedMarker position={{ lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) }}>
                                        <div className="relative">
                                            {/* Radiation Effect */}
                                            <div className="absolute inset-0 bg-brand rounded-full animate-ping" />
                                            <div className="relative w-6 h-6 bg-brand rounded-full border-2 border-white shadow-xl" />
                                        </div>
                                    </AdvancedMarker>
                                </Map>

                                <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border border-white flex flex-col gap-1 pointer-events-auto">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Real-time HUD</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-accent-brown/60 uppercase">Heading: {Math.round(panoPov.heading)}° | Pitch: {Math.round(panoPov.pitch)}°</p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (streetViewInstance.current) {
                                                streetViewInstance.current.setPosition({ lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) });
                                                streetViewInstance.current.setPov({ heading: 0, pitch: 0 });
                                            }
                                        }}
                                        className="bg-brand-dark text-white px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/10 flex items-center gap-3 pointer-events-auto hover:bg-black transition-all"
                                    >
                                        <Navigation className="w-4 h-4" /> Reset Tracker
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default BusinessOrders;
