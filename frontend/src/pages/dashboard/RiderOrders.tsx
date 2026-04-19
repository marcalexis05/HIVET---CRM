import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Bike, ChevronRight,
    Search, Loader2, Star, ArrowLeft, ArrowRight,
    X, MapPin, Store, Phone, User, Clock, ShieldCheck
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import RiderBottomNav from '../../components/RiderBottomNav';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const OrderDetailsModal = ({ order, isOpen, onClose }: { order: any, isOpen: boolean, onClose: () => void }) => {
    if (!order) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[2.5rem] p-8 w-[95%] max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-accent-brown/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center text-white">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-accent-brown/30 tracking-[0.3em]">Operational Review</p>
                                    <h3 className="text-xl font-black text-accent-brown uppercase tracking-tighter">#HY-{order.id.toString().slice(-6)}</h3>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-accent-peach/10 rounded-xl flex items-center justify-center text-accent-brown/40 hover:bg-red-50 hover:text-red-500 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="space-y-8">
                            {/* Status & Date */}
                            <div className="flex items-center justify-between">
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                    ['Completed', 'Delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-brand-dark text-white'
                                }`}>
                                    {order.status}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">
                                    <Clock size={12} /> {new Date(order.created_at).toLocaleString()}
                                </div>
                            </div>

                            {/* Logistics Route */}
                            <div className="space-y-6 bg-accent-peach/5 rounded-[2rem] p-6 border border-accent-brown/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-dark/[0.02] rounded-full -mr-16 -mt-16" />
                                
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-brand-dark ring-4 ring-brand-dark/10" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-1">Source Protocol</p>
                                    <p className="font-black text-accent-brown text-sm uppercase leading-tight">{order.pickup_name || 'Clinic Hub'}</p>
                                    <p className="text-[11px] font-bold text-accent-brown/50 mt-1 leading-snug">{order.pickup_address || 'Extraction point not specified'}</p>
                                </div>

                                <div className="h-8 border-l-2 border-dashed border-accent-brown/10 ml-1.5" />

                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/10" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-1">Target Mission</p>
                                    <p className="font-black text-accent-brown text-sm uppercase leading-tight">{order.customer_name || 'Customer Drop-off'}</p>
                                    <p className="text-[11px] font-bold text-accent-brown/50 mt-1 leading-snug">{order.delivery_address}</p>
                                </div>
                            </div>

                            {/* Inventory Manifest */}
                            <div>
                                <h4 className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.4em] mb-4">Inventory Manifest</h4>
                                <div className="space-y-3">
                                    {(order.items || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 items-center bg-white rounded-2xl p-4 border border-accent-brown/5 shadow-sm">
                                            <div className="w-14 h-14 bg-accent-peach/5 rounded-xl border border-accent-brown/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package size={20} className="text-accent-brown/20" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-accent-brown leading-tight uppercase tracking-tight truncate">{item.name}</p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="px-2 py-0.5 bg-brand-dark/10 text-brand-dark rounded-md text-[9px] font-black uppercase tracking-widest">Qty: {item.quantity}</span>
                                                    <span className="text-[10px] font-bold text-accent-brown/30">ID: {idx + 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payout Summary */}
                            <div className="pt-6 border-t border-accent-brown/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/30">Service Compensation</p>
                                        <h3 className="text-3xl font-black text-[#FB8500] tracking-tighter">₱{order.total_amount}</h3>
                                    </div>
                                    <div className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Star size={12} /> Performance Verified
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-accent-brown text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
                            >
                                Acknowledge Data
                            </button>
                        </div>
                    </motion.div>
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
        const matchesSearch = o.id.toString().includes(searchQuery) || 
                            o.pickup_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            o.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;
        if (filter === 'all') return true;
        if (filter === 'active') return ['Available', 'Pending', 'Processing', 'Out_For_Delivery', 'Picked Up', 'Pending_Pickup'].includes(o.status);
        if (filter === 'completed') return o.status === 'Completed';
        return true;
    });

    return (
        <DashboardLayout title="Orders">
            <OrderDetailsModal 
                isOpen={!!selectedOrder} 
                order={selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
            />
            <div className="space-y-6 pb-32">
                
                {/* ── LOGISTICS COMMAND CENTER HEADER ── */}
                <div className="bg-brand-dark rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-sm transition-all duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Real-time Analytics</p>
                            <h2 className="text-lg font-black tracking-tighter uppercase leading-none text-white">
                                Logistics Command Center
                            </h2>
                        </div>
                    </div>
                </div>

                {/* ── KPI TIERS ── */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Success Rate", value: stats.success_rate, icon: Star, desc: "Consistency across active cycles." },
                        { label: "Active Threads", value: stats.active_threads, icon: Bike, desc: "Ongoing operational logistics.", highlight: true },
                        { label: "Total Fulfilled", value: stats.total_fulfilled, icon: Package, desc: "Verified delivery completions." },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`rounded-2xl p-6 border border-accent-brown/5 shadow-sm flex flex-col gap-3 ${stat.highlight ? 'bg-brand-dark text-white' : 'bg-white'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.highlight ? 'bg-white/10 text-white' : 'bg-accent-peach/30 text-accent-brown'}`}>
                                <stat.icon size={18} />
                            </div>
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${stat.highlight ? 'text-white/40' : 'text-accent-brown/30'}`}>{stat.label}</p>
                                <h3 className={`text-2xl font-black tracking-tighter leading-none ${stat.highlight ? 'text-white' : 'text-accent-brown'}`}>{stat.value}</h3>
                            </div>
                            <p className={`text-[10px] font-bold leading-relaxed ${stat.highlight ? 'text-white/40' : 'text-accent-brown/40'}`}>{stat.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* ── OPERATIONS HEADER CONTROLS ── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <p className="text-[10px] font-black text-brand uppercase tracking-[0.4em]">Operational Ledger</p>
                            <h4 className="text-xl font-black text-accent-brown tracking-tighter uppercase">Mission History</h4>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-accent-brown/20" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="SEARCH LOGISTICS ID..."
                                className="w-full h-14 bg-white border border-accent-brown/10 rounded-xl pl-12 pr-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:ring-4 focus:ring-brand-dark/5 transition-all placeholder:text-accent-brown/20"
                            />
                        </div>

                        <div className="flex p-1.5 bg-white border border-accent-brown/10 rounded-xl shadow-sm">
                            {['all', 'active', 'completed'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => { setFilter(t); setCurrentPage(1); }}
                                    className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                                        filter === t ? 'text-white bg-brand-dark shadow-md' : 'text-accent-brown/40 hover:text-accent-brown'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ledger Content */}
                    <div className="relative min-h-[400px]">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-brand-dark" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/20">Syncing Ledger...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-2xl py-16 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                <div className="w-16 h-16 bg-accent-peach/10 rounded-full flex items-center justify-center mb-5">
                                    <Package className="w-8 h-8 text-accent-brown/20" />
                                </div>
                                <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tighter uppercase">Silence in Ledger</h4>
                                <p className="text-sm text-accent-brown/40 font-medium max-w-sm leading-relaxed italic">
                                    "Even the quietest operations are recorded. Our sensors show no data for this specific query."
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <AnimatePresence mode="popLayout">
                                        {filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((order) => (
                                            <motion.div
                                                key={order.id}
                                                layout
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-white rounded-2xl border border-accent-brown/5 shadow-sm overflow-hidden hover:border-accent-brown/20 transition-all flex flex-col"
                                            >
                                                {/* Card Header */}
                                                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-accent-brown/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0">
                                                            <Package size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Logistics ID</p>
                                                            <p className="font-black text-lg text-accent-brown tracking-tighter">#HY-{order?.id?.toString().slice(-4) || '0000'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-0.5">Value</p>
                                                        <p className="text-xl font-black text-accent-brown tracking-tighter">₱{order.total_amount}</p>
                                                    </div>
                                                </div>

                                                {/* Content Area */}
                                                <div className="px-6 py-5 space-y-5 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            ['Completed', 'Delivered'].includes(order.status) ? 'bg-green-500/10 text-green-600' : 'bg-brand-dark/10 text-brand-dark'
                                                        }`}>
                                                            {order.status}
                                                        </span>
                                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.1em]">
                                                            {new Date(order.created_at || Date.now()).toLocaleDateString()}
                                                        </p>
                                                    </div>

                                                    {/* Route Info */}
                                                    <div className="space-y-4">
                                                        <div className="flex gap-4 items-start">
                                                            <div className="w-2 h-2 rounded-full bg-brand-dark mt-1.5 shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-brown/30 mb-1">Pickup Hub</p>
                                                                <p className="text-xs font-black text-accent-brown truncate uppercase tracking-tight leading-none">{order.pickup_name || 'Hi-Vet Site'}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="border-l-2 border-dashed border-accent-brown/10 ml-[3px] h-4" />
                                                        
                                                        <div className="flex gap-4 items-start">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-brown/30 mb-1">Drop-off Point</p>
                                                                <p className="text-xs font-black text-accent-brown truncate" title={order.delivery_address}>{order.delivery_address || 'Customer Point'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Items Preview */}
                                                    <div className="flex items-center justify-between pt-4 border-t border-accent-brown/5">
                                                        <div className="flex -space-x-3">
                                                            {(order.items || []).slice(0, 3).map((item: any, i: number) => (
                                                                <div key={i} className="h-8 w-8 rounded-lg ring-2 ring-white border border-accent-brown/5 bg-[#FAF9F6] overflow-hidden">
                                                                    {item.image_url ? (
                                                                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <div className="h-full w-full flex items-center justify-center">
                                                                            <Package size={12} className="text-accent-brown/20" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {(order.items || []).length > 3 && (
                                                                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-brand-dark text-[8px] font-black text-white ring-2 ring-white">
                                                                    +{(order.items || []).length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="flex items-center gap-2 text-[9px] font-black text-brand-dark uppercase tracking-widest cursor-pointer hover:gap-3 transition-all outline-none"
                                                        >
                                                            Details <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                {/* Modern Pagination */}
                                {filteredOrders.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-center gap-2 pt-6">
                                        <button
                                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === 1}
                                            className="w-10 h-10 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div className="flex items-center gap-2 bg-white border border-accent-brown/10 p-1 rounded-xl shadow-sm">
                                            {Array.from({ length: Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                                                        currentPage === i + 1 ? 'bg-brand-dark text-white shadow-md' : 'bg-transparent text-accent-brown/40 hover:text-accent-brown'
                                                    }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => { setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / ITEMS_PER_PAGE), prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)}
                                            className="w-10 h-10 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                )}
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
