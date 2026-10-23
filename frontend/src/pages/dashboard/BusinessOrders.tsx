import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { 
    Search, Eye, CheckCircle, XCircle, Clock, Loader2, 
    Truck, Store, X, Navigation, ShoppingBag, 
    Users, Banknote, Bike, ShieldAlert 
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import BranchSelector from '../../components/BranchSelector';
import Pagination from '../../components/Pagination';
import BusinessOrderDetailsModal from '../../components/BusinessOrderDetailsModal';
import { CLINIC_TEXT } from '../../constants/clinicWording';

const STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
    Requested: 'bg-orange-100 text-orange-700 animate-pulse',
    Approved: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-slate-100 text-slate-500',
    Refunded: 'bg-purple-100 text-purple-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    Completed: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
    Processing: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />,
    Pending: <Clock className="w-3.5 h-3.5 text-yellow-600" />,
    Cancelled: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    Requested: <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />,
    Approved: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
    Rejected: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
    Refunded: <Banknote className="w-3.5 h-3.5 text-purple-600" />,
};

const STATUS_FILTERS = ['All', 'Completed', 'Processing', 'Pending', 'Cancelled', 'Refunds'];
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
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [processingAction, setProcessingAction] = useState<Record<string, string>>({});
    const statusPillsContainerRef = useRef<HTMLDivElement>(null);

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

    // Auto-scroll selected status pill into view
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!statusPillsContainerRef.current) return;
            const selectedBtn = statusPillsContainerRef.current.querySelector<HTMLElement>(`[data-status="${statusFilter}"]`);
            if (selectedBtn) {
                const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                selectedBtn.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    inline: 'center',
                    block: 'nearest'
                });
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [statusFilter]);

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
                const data = await resp.json();
                setOrders(data);
                // Keep selectedOrder in sync if open
                if (selectedOrder) {
                    const updated = data.find((o: any) => o.id === selectedOrder.id);
                    if (updated) setSelectedOrder(updated);
                }
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!selectedOrder) return;
        try {
            const res = await fetch(`http://localhost:8000/api/business/orders/${selectedOrder.order_id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setSelectedOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const handleBroadcast = async () => {
        if (!selectedOrder) return;
        setProcessingAction(prev => ({ ...prev, [`${selectedOrder.order_id}-broadcast`]: 'processing' }));
        try {
            const res = await fetch(`http://localhost:8000/api/business/deliveries/${selectedOrder.order_id}/broadcast`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) {
                setSelectedOrder((prev: any) => prev ? { ...prev, delivery_status: 'broadcasted' } : null);
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to broadcast', err);
        } finally {
            setProcessingAction(prev => {
                const next = { ...prev };
                delete next[`${selectedOrder.order_id}-broadcast`];
                return next;
            });
        }
    };

    const handleReturnHandle = async (action: 'Approved' | 'Rejected') => {
        if (!selectedOrder) return;
        setProcessingAction(prev => ({ ...prev, [`${selectedOrder.order_id}-${action.toLowerCase()}`]: 'processing' }));
        try {
            const res = await fetch(`http://localhost:8000/api/business/orders/${selectedOrder.order_id}/return-handle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                setSelectedOrder((prev: any) => prev ? { ...prev, return_status: action } : null);
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to handle return', err);
        } finally {
            setProcessingAction(prev => {
                const next = { ...prev };
                delete next[`${selectedOrder.order_id}-${action.toLowerCase()}`];
                return next;
            });
        }
    };

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('All');
        setFulfillmentFilter('All');
    };

    const filtered = orders.filter(o => {
        let matchStatus = statusFilter === 'All' || o.status === statusFilter;
        if (statusFilter === 'Refunds') {
            matchStatus = o.return_status && ['Requested', 'Approved', 'Rejected', 'Refunded'].includes(o.return_status);
        } else if (statusFilter === 'All') {
            matchStatus = true;
        } else {
            matchStatus = o.status === statusFilter;
        }

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
    const isFiltered = search !== '' || statusFilter !== 'All' || fulfillmentFilter !== 'All';

    return (
        <DashboardLayout title="">
            <div className="w-full max-w-[1280px] mx-auto space-y-4 sm:space-y-5 lg:space-y-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">

                {/* Visually hidden heading for a11y */}
                <h1 className="sr-only">{CLINIC_TEXT.orders.title}</h1>

                {/* Branch Picker */}
                <div className="flex items-center justify-end pt-1 sm:pt-2">
                    <div className="w-full md:w-[320px] shrink-0">
                        {user?.token && <BranchSelector token={user.token} onBranchChange={setBranchId} currentBranchId={branchId} />}
                    </div>
                </div>

                {/* 3 Summary Cards */}
                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6 items-stretch">
                    {/* Total Sales Card */}
                    <div
                        role="article"
                        aria-label={`${CLINIC_TEXT.orders.totalSales}: ₱${totalRevenue.toLocaleString()}`}
                        className="col-span-1 min-[360px]:col-span-2 md:col-span-1 bg-white rounded-[20px] p-3.5 min-[400px]:p-4 sm:p-5 border border-accent-brown/10 shadow-sm flex items-center gap-3.5 sm:gap-4 h-full"
                    >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                            <Banknote className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-0.5 truncate">
                                {CLINIC_TEXT.orders.totalSales}
                            </span>
                            <span className="text-2xl sm:text-[28px] lg:text-3xl font-black text-brand tracking-tight truncate block leading-tight">
                                ₱{totalRevenue.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Total Orders Card */}
                    <div
                        role="article"
                        aria-label={`${CLINIC_TEXT.orders.totalOrders}: ${filtered.length}`}
                        className="col-span-1 bg-white rounded-[20px] p-3.5 min-[400px]:p-4 sm:p-5 border border-accent-brown/10 shadow-sm flex items-center gap-3.5 sm:gap-4 h-full"
                    >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown shrink-0">
                            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-0.5 truncate">
                                {CLINIC_TEXT.orders.totalOrders}
                            </span>
                            <span className="text-2xl sm:text-[28px] lg:text-3xl font-black text-accent-brown tracking-tight truncate block leading-tight">
                                {filtered.length}
                            </span>
                        </div>
                    </div>

                    {/* Delivery Card */}
                    <div
                        role="article"
                        aria-label={`Delivery: ${filtered.filter(o => o.fulfillment_method?.toLowerCase() === 'delivery').length}`}
                        className="col-span-1 bg-white rounded-[20px] p-3.5 min-[400px]:p-4 sm:p-5 border border-accent-brown/10 shadow-sm flex items-center gap-3.5 sm:gap-4 h-full"
                    >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown shrink-0">
                            <Truck className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-0.5 truncate">
                                Delivery
                            </span>
                            <span className="text-2xl sm:text-[28px] lg:text-3xl font-black text-accent-brown tracking-tight truncate block leading-tight">
                                {filtered.filter(o => o.fulfillment_method?.toLowerCase() === 'delivery').length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter Card: Reusing Customer Store layout & styles */}
                <div className="bg-white rounded-2xl xs:rounded-3xl sm:rounded-[2rem] p-4 sm:p-6 border border-accent-brown/10 shadow-sm">
                    {/* Top Row: Search Box + 3-part Segmented Control */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Find orders by ID, Customer name or Product..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full min-h-[48px] h-12 pl-10 sm:pl-11 pr-10 bg-accent-brown/5 rounded-xl sm:rounded-2xl border border-transparent focus:border-brand/30 focus:bg-white text-xs sm:text-sm font-bold text-accent-brown placeholder:text-black/40 placeholder:font-medium transition-all outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black/60 transition-colors cursor-pointer"
                                    aria-label="Clear search query"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* 3-Part Segmented Fulfillment Control (Customer Store style) */}
                        <div className="w-full lg:w-auto lg:min-w-[320px] p-1.5 bg-accent-brown/5 rounded-2xl sm:rounded-[2rem] border border-transparent shrink-0">
                            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                                {FULFILLMENT_FILTERS.map((f) => {
                                    const isSelected = fulfillmentFilter === f;
                                    return (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setFulfillmentFilter(f)}
                                            className={`min-h-[44px] px-2 xs:px-3 py-2 rounded-xl sm:rounded-[1.4rem] text-xs font-bold transition-all flex items-center justify-center text-center cursor-pointer ${
                                                isSelected
                                                    ? 'bg-white text-accent-brown shadow-md shadow-accent-brown/5 font-black'
                                                    : 'text-black hover:text-brand hover:bg-white/40'
                                            }`}
                                        >
                                            <span className="truncate">{f}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Status Filter Pills (Matching Customer Store Type Filter styling) */}
                    <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-accent-brown/5">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <span className="text-xs font-bold text-black">Filter by status:</span>
                            {isFiltered && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>

                        {/* Status Pills Container with horizontal scroll and fade */}
                        <div
                            ref={statusPillsContainerRef}
                            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 -mx-1 px-1"
                            role="group"
                            aria-label="Filter by order status"
                        >
                            {STATUS_FILTERS.map((status) => {
                                const isSelected = statusFilter === status;
                                return (
                                    <button
                                        key={status}
                                        data-status={status}
                                        type="button"
                                        onClick={() => setStatusFilter(status)}
                                        className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all snap-start shrink-0 cursor-pointer ${
                                            isSelected
                                                ? 'bg-brand text-white shadow-md shadow-brand/20 font-black'
                                                : 'bg-white text-black border border-accent-brown/10 hover:border-brand hover:text-brand'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Orders Grid: 2-column mobile, 3-col tablet, 4-col desktop matching Customer Catalog */}
                <div className="pt-2 sm:pt-4">
                    {loading ? (
                        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 items-stretch">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="aspect-[3/4] bg-white rounded-2xl xs:rounded-3xl sm:rounded-[2rem] border border-accent-brown/10 animate-pulse shadow-sm" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white py-16 sm:py-24 rounded-2xl xs:rounded-3xl sm:rounded-[2rem] text-center border border-accent-brown/10 shadow-sm px-4"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-brown/5 rounded-full flex items-center justify-center mx-auto mb-5 text-brand">
                                <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight mb-2">No Orders Found</h3>
                            <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-md mx-auto">
                                We couldn't find any orders matching your current search or filters. Try adjusting your filters or switching branches.
                            </p>
                            {isFiltered && (
                                <button
                                    onClick={resetFilters}
                                    className="mt-6 min-h-[44px] px-6 sm:px-8 py-3 bg-brand text-white rounded-xl sm:rounded-2xl text-xs font-black tracking-wide hover:bg-black transition-all shadow-md shadow-brand/20 cursor-pointer"
                                >
                                    Clear All Search Filters
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 items-stretch">
                            <AnimatePresence mode="popLayout">
                                {paginated.map((o, i) => {
                                    const currentStatus = o.return_status || o.status;
                                    const isDelivery = o.fulfillment_method === 'delivery';

                                    return (
                                        <motion.div
                                            key={o.id}
                                            layout
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => setSelectedOrder(o)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedOrder(o);
                                                }
                                            }}
                                            className="group bg-white rounded-2xl xs:rounded-3xl sm:rounded-[2rem] p-3 xs:p-3.5 sm:p-5 border border-accent-brown/10 hover:border-brand/40 transition-all duration-300 flex flex-col justify-between relative overflow-hidden h-full shadow-sm hover:shadow-lg cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                        >
                                            <div>
                                                {/* 1. Square Image Area (1:1 Aspect Ratio) */}
                                                <div className="relative aspect-square rounded-xl xs:rounded-2xl sm:rounded-[1.5rem] bg-accent-brown/5 mb-3 xs:mb-3.5 sm:mb-4 flex items-center justify-center p-2.5 xs:p-3 sm:p-4 group-hover:bg-white transition-all duration-300 overflow-hidden">
                                                    <div className="absolute inset-0 bg-accent-brown/5 group-hover:bg-brand/5 transition-colors" />
                                                    
                                                    {o.image ? (
                                                        <img
                                                            src={o.image}
                                                            alt={o.product}
                                                            className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="relative z-10 flex flex-col items-center gap-1.5 opacity-25">
                                                            <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true" />
                                                            <span className="text-[10px] font-black uppercase">No Image</span>
                                                        </div>
                                                    )}

                                                    {/* Top-Left: Status Badge Pill */}
                                                    <div className="absolute top-2 left-2 z-20">
                                                        <span className={`min-h-[26px] flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm border border-white/20 backdrop-blur-md ${STATUS_STYLES[currentStatus] || 'bg-slate-100 text-slate-700'}`}>
                                                            {STATUS_ICONS[currentStatus] || <Clock className="w-3 h-3" />}
                                                            <span>{currentStatus}</span>
                                                        </span>
                                                    </div>

                                                    {/* Bottom-Right: Fulfillment Pill */}
                                                    <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-20">
                                                        <div className="bg-brand/95 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl shadow-sm border border-white/10 flex items-center gap-1">
                                                            {isDelivery ? <Truck className="w-3 h-3 text-white shrink-0" /> : <Store className="w-3 h-3 text-white shrink-0" />}
                                                            <span className="text-[10px] sm:text-[11px] font-black text-white capitalize">
                                                                {o.fulfillment_method || 'Pickup'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Order ID and Date Line */}
                                                <div className="flex items-center justify-between gap-2 mb-1 px-0.5">
                                                    <span className="text-xs font-black text-brand tracking-tight">
                                                        {o.id}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span className="truncate">{o.date}</span>
                                                    </div>
                                                </div>

                                                {/* 3. Product Name */}
                                                <h4 className="text-sm sm:text-base font-black text-accent-brown tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2 px-0.5 mb-1.5">
                                                    {o.product}
                                                </h4>

                                                {/* 4. Customer Info & Quantity */}
                                                <div className="px-0.5 space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                        <Users className="w-3.5 h-3.5 text-accent-brown/70 shrink-0" />
                                                        <span className="truncate">{o.customer}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                                        <span>Quantity:</span>
                                                        <span className="font-bold text-accent-brown">×{o.qty}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 5. Bottom Row: Divider, Total, and Details Button */}
                                            <div className="mt-auto pt-3 sm:pt-4 border-t border-accent-brown/5 flex items-center justify-between gap-2 px-0.5">
                                                <div className="space-y-0.5 shrink-0">
                                                    <p className="text-[11px] font-bold text-black/60 uppercase tracking-wider">Total</p>
                                                    <div className="flex items-baseline gap-0.5 font-black text-brand">
                                                        <span className="text-xs sm:text-sm">₱</span>
                                                        <span className="text-base sm:text-lg tracking-tight tabular-nums">
                                                            {Number(o.total || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(o);
                                                    }}
                                                    className="min-h-[44px] px-3.5 sm:px-4 py-2 bg-accent-brown/5 hover:bg-brand hover:text-white text-accent-brown rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Details</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {!loading && filtered.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}

            </div>

            {/* Responsive Order Details Modal */}
            <BusinessOrderDetailsModal
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onStatusChange={handleStatusChange}
                onBroadcast={handleBroadcast}
                onReturnHandle={handleReturnHandle}
                onOpenStreetView={() => {
                    setViewingOrder(selectedOrder);
                    setShowStreetView(true);
                }}
                isBroadcasting={selectedOrder ? !!processingAction[`${selectedOrder.order_id}-broadcast`] : false}
                isHandlingReturn={
                    selectedOrder && processingAction[`${selectedOrder.order_id}-approve`]
                        ? 'Approved'
                        : selectedOrder && processingAction[`${selectedOrder.order_id}-reject`]
                        ? 'Rejected'
                        : null
                }
                statusStyles={STATUS_STYLES}
                statusIcons={STATUS_ICONS}
            />

            {/* Street View Overlay */}
            <AnimatePresence>
                {showStreetView && viewingOrder && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[1000] bg-black flex flex-col"
                    >
                        <div className="absolute top-4 sm:top-8 left-4 sm:left-8 right-4 sm:right-8 z-[1110] flex items-center justify-between gap-3 pointer-events-none">
                            <div className="bg-white/10 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border border-white/20 pointer-events-auto min-w-0 max-w-[80%]">
                                <h3 className="text-white text-base sm:text-lg font-black tracking-tight leading-tight truncate">{viewingOrder.customer}</h3>
                                <p className="text-white/70 text-xs font-semibold truncate">{viewingOrder.delivery_address}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowStreetView(false);
                                    streetViewInstance.current = null;
                                }}
                                className="w-11 h-11 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-600 transition-all pointer-events-auto shadow-2xl shrink-0 cursor-pointer"
                                aria-label="Close Street View"
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
                                        className="bg-brand-dark text-white px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/10 flex items-center gap-3 pointer-events-auto hover:bg-black transition-all cursor-pointer"
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