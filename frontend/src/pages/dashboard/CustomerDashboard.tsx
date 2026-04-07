import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import { Package, Award, Calendar, Bell, MapPin, ChevronRight, Gift, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
    loyalty: {
        points: number;
        tier: string;
        next_tier: string;
        next_points: number;
        points_to_next: number;
    };
    recent_order: {
        id: string;
        status: string;
        item_summary: string;
        location: string;
        created_at: string;
    } | null;
    alerts: {
        id: number;
        type: string;
        title: string;
        desc: string;
        created_at: string;
    }[];
    unread_count: number;
}

const CustomerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const firstName = user?.name?.split(' ')[0] ?? 'there';

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('http://localhost:8000/api/customer/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user?.token]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'ready':
            case 'ready for pickup': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-accent-peach/20 text-accent-brown/60';
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="My Hub">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="My Hub">
            <div className="space-y-8">
                {/* Welcome Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-dark rounded-3xl sm:rounded-[2rem] p-5 xs:p-10 text-white relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-12"
                >
                    <div className="relative z-10 w-full">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand mb-2 block">Premium Member</span>
                        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-6 sm:mb-8">Welcome back,<br />{firstName}!</h2>

                        <div className="flex flex-col xs:flex-row items-center gap-3 sm:gap-4 mt-8 sm:mt-10">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/dashboard/customer/catalog')}
                                className="w-full xs:w-auto px-5 sm:px-8 py-3.5 sm:py-4 bg-brand hover:bg-white text-white hover:text-brand-dark rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                                Browse Catalog
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/dashboard/customer/loyalty')}
                                className="w-full xs:w-auto px-5 sm:px-8 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest transition-all backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                                View Loyalty 
                            </motion.button>
                        </div>
                    </div>
                    {/* Decorative blobs */}
                    <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-20%] right-[10%] w-64 h-64 bg-white/10 rounded-full blur-[60px]" />
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Quick Stats Grid */}
                    <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
                        {/* Loyalty Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, y: -5, borderColor: 'var(--color-brand)' }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 25 }}
                            className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between group cursor-pointer transition-all"
                            onClick={() => navigate('/dashboard/customer/loyalty')}
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Tier Status</span>
                                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">{stats?.loyalty.tier} Member</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl sm:text-4xl font-black text-accent-brown tracking-tighter mb-2">
                                    {stats?.loyalty.points.toLocaleString()} <span className="text-lg text-accent-brown/40 font-bold">pts</span>
                                </h3>
                                <div className="flex items-center justify-between mt-4 border-t border-accent-brown/5 pt-4">
                                    <span className="text-xs font-bold text-accent-brown/60">
                                        {stats?.loyalty?.points_to_next !== undefined && stats.loyalty.points_to_next > 0
                                            ? `${stats.loyalty.points_to_next} pts to ${stats.loyalty.next_tier}`
                                            : 'Maximum Tier Reached'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-brand-dark group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent Order Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, y: -5, borderColor: 'var(--color-brand)' }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 25 }}
                            className="bg-white rounded-3xl sm:rounded-[2rem] p-5 xs:p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between group cursor-pointer transition-all"
                            onClick={() => navigate('/dashboard/customer/orders')}
                        >
                            {stats?.recent_order ? (
                                <>
                                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-4 mb-6 sm:mb-8">
                                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <span className={`${getStatusColor(stats.recent_order.status)} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit`}>
                                            {stats.recent_order.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1 block">
                                            Order {stats.recent_order.id}
                                        </span>
                                        <h3 className="text-xl font-black text-accent-brown tracking-tight leading-tight mb-4 truncate">
                                            {stats.recent_order.item_summary}
                                        </h3>
                                        <div className="flex items-center justify-between border-t border-accent-brown/5 pt-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-accent-brown/60">
                                                <MapPin className="w-3 h-3" />
                                                {stats.recent_order.location}
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-brand-dark group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                                    <ShoppingBag className="w-10 h-10 text-accent-brown/10 mb-2" />
                                    <p className="text-sm font-bold text-accent-brown/40 uppercase tracking-widest">No recent orders</p>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); navigate('/dashboard/customer/catalog'); }}
                                        className="mt-4 text-xs font-black text-brand-dark hover:text-brand transition-colors cursor-pointer"
                                    >
                                        START SHOPPING
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Alert Center */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-accent-peach/20 rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 border border-accent-brown/5 h-full"
                    >
                        <div className="flex items-center justify-between mb-6 sm:mb-8">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-brand-dark" />
                                <h2 className="text-lg font-black text-accent-brown uppercase tracking-widest">Alerts</h2>
                            </div>
                            {stats?.unread_count && stats.unread_count > 0 ? (
                                <span className="w-6 h-6 bg-brand-dark text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {stats.unread_count}
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            {stats?.alerts && stats.alerts.length > 0 ? (
                                stats.alerts.map((alert) => (
                                    <motion.div
                                        key={alert.id}
                                        whileHover={{ scale: 1.03, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-white p-4 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all relative overflow-hidden group"
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.type === 'System' ? 'bg-brand-dark' : 'bg-orange-400'}`}></div>
                                        <div className="pl-3">
                                            <p className={`text-xs font-black uppercase tracking-widest ${alert.type === 'System' ? 'text-brand-dark' : 'text-orange-500'} mb-1 flex items-center gap-2`}>
                                                {alert.type === 'Promo' ? <Gift className="w-3 h-3" /> : <Calendar className="w-3 h-3" />} {alert.type} Msg
                                            </p>
                                            <p className="font-bold text-sm text-accent-brown mb-1 group-hover:text-brand-dark transition-colors">{alert.title}</p>
                                            <p className="text-[10px] text-accent-brown/40 font-medium line-clamp-2">{alert.desc}</p>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <Bell className="w-8 h-8 text-accent-brown/10 mx-auto mb-2" />
                                    <p className="text-[10px] font-black text-accent-brown/20 uppercase tracking-widest">All caught up!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CustomerDashboard;
