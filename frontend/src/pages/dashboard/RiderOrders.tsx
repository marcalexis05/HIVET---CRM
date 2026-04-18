import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Package, MapPin, ChevronRight,
    Filter, Search, Loader2,
    Store, Bike, ArrowLeft, ArrowRight, Star
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import RiderBottomNav from '../../components/RiderBottomNav';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
        if (filter === 'all') return true;
        if (filter === 'active') return ['Available', 'Pending', 'Out_For_Delivery'].includes(o.status);
        if (filter === 'completed') return o.status === 'Completed';
        return true;
    });

    return (
        <DashboardLayout title="Orders">
            <div className="space-y-12 pb-32">
                {/* Logistics Command Master */}
                <div className="relative overflow-hidden rounded-[4rem] bg-brand-dark p-10 sm:p-14 shadow-2xl shadow-brand-dark/20 group">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mt-64 blur-[100px] group-hover:bg-white/10 transition-all duration-1000" />

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Logistics Command Center</span>
                                </div>
                                <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] uppercase">
                                    Operational <br /> <span className="text-white/30 italic font-outfit lowercase tracking-normal">Archive</span>
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-w-[160px]">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Success Rate</p>
                                    <h4 className="text-2xl font-black text-white tracking-tighter">{stats.success_rate}</h4>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-w-[160px]">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Avg. Fulfilment</p>
                                    <h4 className="text-2xl font-black text-white tracking-tighter">{stats.avg_fulfillment}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operational Velocity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { label: "Total Fulfilled", value: stats.total_fulfilled, icon: Package, color: "bg-white", desc: "Successfully completed assignments." },
                        { label: "Active Threads", value: stats.active_threads, icon: Bike, color: "bg-brand-dark text-white", desc: "Ongoing operational logistics." },
                        { label: "Efficiency Rating", value: stats.efficiency_rating, icon: Star, color: "bg-white", desc: "Fleet performance ranking." }
                    ].map((stat, i) => (
                        <div key={i} className={`rounded-[2.5rem] p-10 shadow-sm border border-accent-brown/5 hover:shadow-2xl transition-all group/stat ${stat.color.includes('bg-white') ? 'bg-white' : stat.color}`}>
                            <div className="flex items-center justify-between mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover/stat:rotate-12 ${stat.color.includes('bg-white') ? 'bg-accent-peach/20 text-accent-brown border-accent-brown/5' : 'bg-white/10 text-white border-white/10'}`}>
                                    <stat.icon size={24} />
                                </div>
                                <div className={`w-10 h-[2px] ${stat.color.includes('bg-white') ? 'bg-accent-brown/5' : 'bg-white/10'}`} />
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${stat.color.includes('bg-white') ? 'text-accent-brown/30' : 'text-white/40'}`}>{stat.label}</p>
                            <h4 className={`text-3xl font-black tracking-tighter uppercase ${stat.color.includes('bg-white') ? 'text-accent-brown' : 'text-white'}`}>{stat.value}</h4>
                            <p className={`text-[11px] font-bold mt-2 leading-relaxed italic ${stat.color.includes('bg-white') ? 'text-accent-brown/40' : 'text-white/60'}`}>{stat.desc}</p>
                        </div>
                    ))}
                </div>
                {/* Tactical Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-accent-brown/20 group-focus-within:text-accent-brown transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="OPERATIONAL SEARCH (ORDER ID)..."
                            className="w-full bg-white border-2 border-accent-brown/5 rounded-[2rem] py-5 pl-14 pr-6 text-xs font-black uppercase tracking-[0.2em] outline-none focus:border-accent-brown/20 focus:bg-white transition-all shadow-sm focus:shadow-xl"
                        />
                    </div>
                    <button className="h-[64px] px-8 bg-brand-dark border border-brand/20 rounded-2xl flex items-center justify-center gap-3 text-white hover:bg-black hover:shadow-lg hover:shadow-brand-dark/10 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest">
                        <Filter size={18} /> Advanced Metrics
                    </button>
                </div>

                <div className="flex p-1.5 bg-white border border-accent-brown/5 rounded-full shadow-sm max-w-2xl mx-auto mb-4">
                    {['all', 'active', 'completed'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`flex-1 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all relative z-10 ${filter === t ? 'text-white' : 'text-accent-brown hover:text-brand-dark'
                                }`}
                        >
                            <span className="relative z-20 transition-colors duration-300">{t}</span>
                            {filter === t && (
                                <motion.div
                                    layoutId="activeTabControl"
                                    className="absolute inset-0 bg-brand-dark rounded-full shadow-lg shadow-brand-dark/30 z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Operational Ledger Header */}
                <div className="flex items-center justify-between px-2 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-[2px] bg-accent-brown" />
                        <h3 className="font-black text-white uppercase tracking-[0.4em] text-[10px]">Operational Ledger</h3>
                    </div>
                </div>
                <div className="space-y-6">
                    {loading ?
                        <div className="py-32 flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <Loader2 className="animate-spin text-white" size={48} />
                                <div className="absolute inset-0 bg-accent-brown/10 blur-xl rounded-full" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 animate-pulse">Synchronizing Data Streams...</p>
                        </div>
                        : filteredOrders.length === 0 ?
                            <div className="bg-white rounded-[4.5rem] py-32 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-10 shadow-sm">
                                <div className="w-24 h-24 bg-accent-peach/20 rounded-full flex items-center justify-center mb-8">
                                    <Package className="w-12 h-12 text-white/10" />
                                </div>
                                <h4 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase leading-none">Record Empty</h4>
                                <p className="text-sm text-white/40 font-bold max-w-xs leading-relaxed italic">
                                    {filter === 'active' ? 'Operational manifest currently clear. Scanning network for new logistics assignments.' : 'Our ledger shows no historical data for this filter.'}
                                </p>
                            </div>
                            :
                            <div className="space-y-12">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((order) => (
                                        <motion.div
                                            key={order.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-white rounded-[2.5rem] p-10 border border-accent-brown/5 shadow-xl shadow-accent-brown/5 group/row cursor-pointer transition-all hover:border-brand-dark/20 flex flex-col min-h-[500px]"
                                        >
                                            <div className="flex justify-between items-start mb-10">
                                                <div className="w-16 h-16 bg-brand-dark/10 group-hover/row:bg-brand-dark/20 rounded-2xl flex items-center justify-center text-brand-dark transition-all border border-brand/10">
                                                    <Bike className="w-8 h-8" />
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-accent-brown tracking-tighter">₱{order.total_amount}</p>
                                                    <p className="text-[9px] font-black text-accent-brown uppercase tracking-[0.3em] mt-1">Compensation</p>
                                                </div>
                                            </div>

                                            <div className="space-y-1 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-2xl font-black text-accent-brown tracking-tighter">HV-2026-{order.id.toString().padStart(6, '0')}</p>
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm bg-brand-dark text-white`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/40 italic">Scheduled Today</p>
                                            </div>

                                            <div className="flex-1 space-y-6 mb-8 p-6 bg-accent-peach/5 rounded-[2rem] border border-accent-brown/5 relative overflow-hidden">
                                                <div className="relative pl-6">
                                                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-brand-dark shadow-sm" />
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Pickup Hub</p>
                                                    <p className="text-[11px] font-black text-accent-brown uppercase tracking-tight truncate">{order.pickup_name || 'Clinic Hub'}</p>
                                                </div>
                                                <div className="relative pl-6">
                                                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-brand-dark shadow-sm" />
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Drop-off Point</p>
                                                    <p className="text-[11px] font-black text-accent-brown line-clamp-2 leading-tight uppercase tracking-tight" title={order.delivery_address}>{order.delivery_address?.split(',')[0] || 'Designated Point'}</p>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-accent-brown/5 flex items-center justify-between">
                                                <div className="flex items-center -space-x-3">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="w-8 h-8 rounded-xl border-2 border-white bg-white flex items-center justify-center text-[7px] font-black text-accent-brown shadow-sm group-hover/row:scale-110 transition-transform">INV</div>
                                                    ))}
                                                </div>
                                                <button className="inline-flex items-center gap-2 text-[9px] font-black text-brand-dark uppercase tracking-[0.2em] group-hover/row:gap-4 transition-all hover:text-black">
                                                    Details <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>


                                {filteredOrders.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-center gap-4 pt-10 border-t border-accent-brown/5">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="w-14 h-14 bg-white border-2 border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown hover:border-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="flex items-center gap-3">
                                            {Array.from({ length: Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={`w-14 h-14 rounded-2xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20 scale-110' : 'bg-white text-accent-brown hover:text-brand-dark hover:border-brand-dark/20 border-2 border-accent-brown/5'}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / ITEMS_PER_PAGE), prev + 1))}
                                            disabled={currentPage === Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)}
                                            className="w-14 h-14 bg-white border border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ArrowRight size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                    }
                </div>
            </div>
            <RiderBottomNav />
        </DashboardLayout>
    );
};

export default RiderOrders;
