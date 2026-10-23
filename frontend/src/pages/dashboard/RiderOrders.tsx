import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Bike, ChevronRight,
    Search, Loader2, Star,
    X, Clock, ShieldCheck
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Pagination from '../../components/Pagination';
import RiderBottomNav from '../../components/RiderBottomNav';
import { RIDER_TEXT } from '../../constants/riderWording';
import { formatRiderOrderId, formatRiderOrderIdForAria, matchesRiderOrderIdSearch } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const OrderDetailsModal = ({ order, isOpen, onClose }: { order: any, isOpen: boolean, onClose: () => void }) => {
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

    // Lock body scroll while modal is open to prevent page shifting/scrolling behind
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        // Auto-focus close button for keyboard accessibility
        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        return () => {
            clearTimeout(timer);
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isOpen]);

    if (!order) return null;

    // Handle Escape key and focus trapping
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    };

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orderNumber = order?.id?.toString().slice(-4) || '0000';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Plain light dim backdrop, max 40% dark, zero blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[200]"
                        aria-hidden="true"
                    />

                    {/* Modal Wrapper: Mobile Bottom Sheet / Desktop Centered Dialog */}
                    <div className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
                        <motion.div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={formatRiderOrderIdForAria(order)}
                            tabIndex={-1}
                            onKeyDown={handleKeyDown}
                            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
                            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
                            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-lg md:max-w-xl overflow-hidden outline-none"
                        >
                            {/* Fixed Header */}
                            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-accent-brown/10 shrink-0 bg-white">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0" aria-hidden="true">
                                        <Package size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5">
                                            {RIDER_TEXT.orders.orderIdLabel}
                                        </p>
                                        <h2 className="text-lg sm:text-xl font-black text-accent-brown uppercase tracking-tight truncate">
                                            {formatRiderOrderId(order)}
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        ['Completed', 'Delivered'].includes(order.status) 
                                            ? 'bg-green-500/15 text-green-700' 
                                            : 'bg-brand-dark/15 text-brand-dark'
                                    }`}>
                                        {order.status}
                                    </span>
                                    <button 
                                        ref={closeBtnRef}
                                        type="button"
                                        onClick={onClose} 
                                        aria-label="Close delivery details"
                                        className="min-w-[44px] min-h-[44px] w-11 h-11 bg-accent-peach/15 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrolling Body */}
                            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px)+1rem)]">
                                {/* Pay & Date Bar */}
                                <div className="p-4 bg-accent-peach/10 rounded-2xl border border-accent-brown/10 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5">
                                            {RIDER_TEXT.orders.payLabel}
                                        </p>
                                        <h3 className="text-2xl sm:text-3xl font-black text-[#FB8500] tracking-tight">
                                            ₱{order.total_amount}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5">
                                            Delivery Date
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase">
                                            <Clock size={13} aria-hidden="true" />
                                            <time dateTime={new Date(order.created_at || Date.now()).toISOString()}>
                                                {new Date(order.created_at || Date.now()).toLocaleDateString()}
                                            </time>
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery Route Section (Pickup Place & Drop-off Location) */}
                                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-accent-brown/10 space-y-4">
                                    {/* Pickup Place */}
                                    <div className="flex gap-3 items-start">
                                        <div className="w-3 h-3 rounded-full bg-brand-dark ring-4 ring-brand-dark/15 mt-1 shrink-0" aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                                {RIDER_TEXT.orders.pickupLabel}
                                            </p>
                                            <p className="text-base font-bold text-accent-brown uppercase leading-snug break-words">
                                                {order.pickup_name || 'Hi-Vet Site'}
                                            </p>
                                            <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed break-words">
                                                {order.pickup_address || RIDER_TEXT.orders.modal.pickupFallback}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dashed line */}
                                    <div className="border-l-2 border-dashed border-accent-brown/20 ml-[5px] h-6" aria-hidden="true" />

                                    {/* Drop-off Location */}
                                    <div className="flex gap-3 items-start">
                                        <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/15 mt-1 shrink-0" aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                                {RIDER_TEXT.orders.dropoffLabel}
                                            </p>
                                            <p className="text-base font-bold text-accent-brown leading-snug break-words">
                                                {order.customer_name || 'Customer Point'}
                                            </p>
                                            <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed break-words">
                                                {order.delivery_address || 'Customer Point'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Package Items (if any) */}
                                {order.items && order.items.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                                            {RIDER_TEXT.orders.modal.itemsTitle}
                                        </h4>
                                        <div className="space-y-2.5">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex gap-3.5 items-center bg-white rounded-xl p-3 sm:p-4 border border-accent-brown/10 shadow-sm">
                                                    <div className="w-12 h-12 bg-accent-peach/10 rounded-xl border border-accent-brown/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={20} className="text-accent-brown/30" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-accent-brown leading-snug uppercase tracking-tight truncate">{item.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-2 py-0.5 bg-brand-dark/10 text-brand-dark rounded-md text-xs font-bold uppercase tracking-wider">Qty: {item.quantity}</span>
                                                            <span className="text-xs font-semibold text-slate-500">Item #{idx + 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Payout Summary */}
                                <div className="pt-3 border-t border-accent-brown/10 flex items-center justify-between">
                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Fulfillment Status
                                    </div>
                                    <div className="px-3 py-1 bg-green-50 text-green-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <Star size={14} aria-hidden="true" /> {RIDER_TEXT.orders.modal.statusCompleted}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

const RiderOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [stats, setStats] = useState({
        success_rate: '0%',
        avg_fulfillment: '0m',
        active_threads: 0,
        total_fulfilled: 0,
        efficiency_rating: 'N/A'
    });
    const [filter, setFilter] = useState('all'); // all, active, completed
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const triggerRef = React.useRef<HTMLElement | null>(null);

    const handleOpenOrder = (order: any, e?: React.MouseEvent) => {
        triggerRef.current = (e?.currentTarget as HTMLElement) || (document.activeElement as HTMLElement);
        setSelectedOrder(order);
    };

    const handleCloseOrder = () => {
        setSelectedOrder(null);
        if (triggerRef.current) {
            triggerRef.current.focus();
            triggerRef.current = null;
        }
    };
    const ITEMS_PER_PAGE = 6;

    const fetchOrders = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/orders/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/orders/analytics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchAnalytics();
    }, []);

    const filteredOrders = orders.filter(o => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query ||
            matchesRiderOrderIdSearch(o, query) ||
            o.pickup_name?.toLowerCase().includes(query) ||
            o.delivery_address?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
        if (filter === 'all') return true;
        if (filter === 'active') return ['Available', 'Pending', 'Processing', 'Out_For_Delivery', 'Picked Up', 'Pending_Pickup'].includes(o.status);
        if (filter === 'completed') return o.status === 'Completed';
        return true;
    });

    const handleTabKeyDown = (e: React.KeyboardEvent) => {
        const tabKeys = ['all', 'active', 'completed'];
        const currentIndex = tabKeys.indexOf(filter);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (currentIndex + 1) % tabKeys.length;
            setFilter(tabKeys[next]);
            setCurrentPage(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = (currentIndex - 1 + tabKeys.length) % tabKeys.length;
            setFilter(tabKeys[prev]);
            setCurrentPage(1);
        }
    };

    return (
        <DashboardLayout title={RIDER_TEXT.orders.pageTitle}>
            <OrderDetailsModal 
                isOpen={!!selectedOrder} 
                order={selectedOrder} 
                onClose={handleCloseOrder} 
            />
            <div className="w-full max-w-[1200px] min-[1360px]:max-w-[1360px] mx-auto px-3.5 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
                
                {/* Visually hidden heading for a11y */}
                <h1 className="sr-only">{RIDER_TEXT.orders.pageTitle}</h1>

                {/* ── SUMMARY STATS CARDS ── */}
                <div 
                    className="grid grid-cols-2 min-[481px]:grid-cols-3 gap-3 sm:gap-4 items-stretch"
                    role="region"
                    aria-label="Delivery Statistics"
                >
                    {/* Card 1: Completion Rate */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0 }}
                        className="col-span-1 rounded-2xl p-4 sm:p-5 border border-accent-brown/10 shadow-sm bg-white flex flex-col justify-between"
                    >
                        <div className="space-y-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent-peach/30 text-accent-brown flex items-center justify-center shrink-0" aria-hidden="true">
                                <Star size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-0.5">{RIDER_TEXT.orders.completionRate}</p>
                                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-accent-brown whitespace-nowrap tabular-nums">{stats.success_rate}</h3>
                            </div>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-slate-600 mt-3">{RIDER_TEXT.orders.completionRateDesc}</p>
                    </motion.div>

                    {/* Card 2: Active Deliveries (solid orange highlight) */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="col-span-1 rounded-2xl p-4 sm:p-5 border border-transparent shadow-sm bg-brand-dark text-white flex flex-col justify-between"
                    >
                        <div className="space-y-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0" aria-hidden="true">
                                <Bike size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-white/90 mb-0.5">{RIDER_TEXT.orders.activeDeliveries}</p>
                                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white whitespace-nowrap tabular-nums">{stats.active_threads}</h3>
                            </div>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-white/85 mt-3">{RIDER_TEXT.orders.activeDeliveriesDesc}</p>
                    </motion.div>

                    {/* Card 3: Total Completed (full width below on <=480px, 3rd column on >=481px) */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16 }}
                        className="col-span-2 min-[481px]:col-span-1 rounded-2xl p-4 sm:p-5 border border-accent-brown/10 shadow-sm bg-white flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-3.5 min-[481px]:flex-col min-[481px]:items-start min-[481px]:gap-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent-peach/30 text-accent-brown flex items-center justify-center shrink-0" aria-hidden="true">
                                <Package size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-0.5">{RIDER_TEXT.orders.totalCompleted}</p>
                                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-accent-brown whitespace-nowrap tabular-nums">{stats.total_fulfilled}</h3>
                            </div>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-slate-600 mt-2 min-[481px]:mt-3">{RIDER_TEXT.orders.totalCompletedDesc}</p>
                    </motion.div>
                </div>

                {/* ── DELIVERY HISTORY & CONTROLS ── */}
                <div className="space-y-3 sm:space-y-4 pt-2">
                    <div>
                        <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">
                            {RIDER_TEXT.orders.historySub}
                        </p>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-accent-brown tracking-tight uppercase leading-tight">
                            {RIDER_TEXT.orders.historyHeader}
                        </h2>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center">
                        {/* Search input */}
                        <div className="relative flex-1">
                            <label htmlFor="rider-orders-search" className="sr-only">
                                {RIDER_TEXT.orders.searchPlaceholder}
                            </label>
                            <Search 
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" 
                                size={22} 
                                aria-hidden="true" 
                            />
                            <input
                                id="rider-orders-search"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder={RIDER_TEXT.orders.searchPlaceholder}
                                className="w-full h-12 sm:h-14 min-h-[48px] bg-white border border-accent-brown/20 rounded-2xl pl-12 pr-10 text-base font-bold text-accent-brown outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-slate-500 placeholder:font-medium shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    aria-label="Clear search"
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-accent-peach/20 hover:bg-accent-peach/40 text-accent-brown flex items-center justify-center transition-all"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Filter tabs */}
                        <div 
                            role="tablist" 
                            aria-label="Filter deliveries" 
                            onKeyDown={handleTabKeyDown}
                            className="flex p-1.5 bg-white border border-accent-brown/15 rounded-2xl shadow-sm shrink-0 overflow-x-auto no-scrollbar"
                        >
                            {[
                                { key: 'all', label: RIDER_TEXT.orders.filterAll },
                                { key: 'active', label: RIDER_TEXT.orders.filterActive },
                                { key: 'completed', label: RIDER_TEXT.orders.filterCompleted },
                            ].map(({ key, label }) => {
                                const isSelected = filter === key;
                                return (
                                    <button
                                        key={key}
                                        role="tab"
                                        id={`tab-${key}`}
                                        aria-selected={isSelected}
                                        aria-controls="delivery-history-list"
                                        tabIndex={isSelected ? 0 : -1}
                                        onClick={() => { setFilter(key); setCurrentPage(1); }}
                                        className={`flex-1 sm:flex-initial min-h-[44px] h-11 sm:h-12 px-5 sm:px-6 rounded-xl text-sm font-bold tracking-normal sm:tracking-wide transition-all whitespace-nowrap flex items-center justify-center select-none ${
                                            isSelected 
                                                ? 'bg-brand-dark text-white shadow-md' 
                                                : 'text-slate-600 hover:text-accent-brown hover:bg-slate-50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="relative min-h-[360px]" id="delivery-history-list" aria-live="polite">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="animate-spin text-brand-dark" size={32} />
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{RIDER_TEXT.orders.loading}</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-2xl py-14 border border-accent-brown/10 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mb-4">
                                    <Package className="w-8 h-8 text-accent-brown/40" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-accent-brown mb-1 tracking-tight uppercase">{RIDER_TEXT.orders.emptyTitle}</h3>
                                <p className="text-sm text-slate-600 font-medium max-w-sm leading-relaxed">
                                    {RIDER_TEXT.orders.emptyDesc}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <ul className="grid grid-cols-1 min-[340px]:grid-cols-2 sm:grid-cols-3 min-[1360px]:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 items-stretch list-none p-0 m-0" role="list">
                                    <AnimatePresence mode="popLayout">
                                        {filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((order) => (
                                            <li key={order.id} className="h-full flex" role="listitem">
                                                <motion.article
                                                    layout
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="w-full bg-white rounded-2xl sm:rounded-[1.25rem] border border-accent-brown/10 shadow-sm hover:shadow-md hover:border-brand-dark/30 transition-all flex flex-col justify-between overflow-hidden"
                                                >
                                                    {/* Card Body */}
                                                    <div className="p-3 sm:p-4 lg:p-5 flex flex-col flex-1">
                                                        {/* 1. Top: Icon Tile & Order ID + 2. Pay */}
                                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-3.5 border-b border-accent-brown/10">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0" aria-hidden="true">
                                                                    <Package size={18} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5 leading-none">
                                                                        {RIDER_TEXT.orders.orderIdLabel}
                                                                    </p>
                                                                    <h3 className="font-black text-xs min-[360px]:text-sm sm:text-base text-accent-brown tracking-tight whitespace-nowrap leading-tight">
                                                                        {formatRiderOrderId(order)}
                                                                    </h3>
                                                                </div>
                                                            </div>
                                                            <div className="sm:text-right shrink-0">
                                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5 leading-none">
                                                                    {RIDER_TEXT.orders.payLabel}
                                                                </p>
                                                                <p className="text-lg sm:text-xl font-black text-accent-brown tracking-tight whitespace-nowrap tabular-nums leading-tight" aria-label={`Pay: ${order.total_amount} pesos`}>
                                                                    ₱{order.total_amount}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 3. Status Badge & Date */}
                                                        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                                                            <div>
                                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                    ['Completed', 'Delivered'].includes(order.status) 
                                                                        ? 'bg-green-500/15 text-green-700' 
                                                                        : 'bg-brand-dark/15 text-brand-dark'
                                                                }`}>
                                                                    {order.status}
                                                                </span>
                                                            </div>
                                                            <time className="text-xs font-semibold text-slate-600 uppercase tracking-normal" dateTime={new Date(order.created_at || Date.now()).toISOString()}>
                                                                {new Date(order.created_at || Date.now()).toLocaleDateString()}
                                                            </time>
                                                        </div>

                                                        {/* 4. Thin Divider & View Details Button */}
                                                        <div className="pt-3 border-t border-accent-brown/10 mt-auto">
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => handleOpenOrder(order, e)}
                                                                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold text-brand-dark hover:bg-brand-dark/10 active:scale-[0.98] active:bg-brand-dark/15 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40"
                                                                aria-label={`View details of ${formatRiderOrderIdForAria(order)}`}
                                                            >
                                                                <span>{RIDER_TEXT.orders.detailsBtn}</span>
                                                                <ChevronRight size={16} aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.article>
                                            </li>
                                        ))}
                                    </AnimatePresence>
                                </ul>

                                {/* Modern Pagination */}
                                <Pagination 
                                    currentPage={currentPage} 
                                    totalPages={Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)} 
                                    onPageChange={setCurrentPage} 
                                    scrollToTop={true} 
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <RiderBottomNav />
        </DashboardLayout>
    );
};

export default RiderOrders;
