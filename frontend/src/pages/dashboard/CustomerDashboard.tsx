import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import { 
    Package, Award, Calendar, Bell, MapPin, 
    Gift, ShoppingBag, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Truck = (props: any) => (
    <svg 
        {...props} 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" height="24" viewBox="0 0 24 24" 
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><circle cx="7" cy="18" r="2"/><path d="M9 18h4"/><circle cx="18" cy="18" r="2"/><path d="M20 18h2a1 1 0 0 0 1-1v-5l-3-4h-3v10Z"/>
    </svg>
);

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
    insight: string;
    clinic_checkup: {
        pet_name: string;
        service: string;
        clinic_name: string;
        date: string;
        time: string;
        status: string;
    } | null;
}

const CustomerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const firstName = user?.name?.split(' ')[0] ?? 'Partner';

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
            <DashboardLayout title="">
                <div className="flex items-center justify-center min-h-[600px]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-t-4 border-brand rounded-full"
                    />
                </div>
            </DashboardLayout>
        );
    }

    const quickActions = [
        { id: 'catalog', title: 'CATALOG', sub: 'PET SUPPLIES', icon: ShoppingBag, color: 'bg-orange-50 text-orange-600', path: '/dashboard/customer/catalog' },
        { id: 'tracking', title: 'TRACKING', sub: 'ORDER STATUS', icon: Package, color: 'bg-blue-50 text-blue-600', path: '/dashboard/customer/orders' },
        { id: 'visit', title: 'VISIT', sub: 'BOOK CLINIC', icon: Calendar, color: 'bg-green-50 text-green-600', path: '/dashboard/customer/reservations' },
        { id: 'clinics', title: 'CLINICS', sub: 'FIND BRANCH', icon: MapPin, color: 'bg-purple-50 text-purple-600', path: '/dashboard/customer/map' },
    ];

    return (
        <DashboardLayout title="" hideHeader={false}>
            <div className="space-y-12 w-full">
                
                {/* 1. Hero Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-white rounded-[3rem] p-8 sm:p-12 overflow-hidden shadow-2xl shadow-accent-brown/5 border border-white"
                >
                    {/* Decorative Background Pattern (Paws) */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.03] pointer-events-none">
                        <div className="grid grid-cols-3 gap-8 -rotate-12 translate-x-20">
                            {[...Array(9)].map((_, i) => (
                                <Heart key={i} size={80} className="fill-current text-brand" />
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
                            <Award className="w-4 h-4 text-brand" />
                            <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">
                                {stats?.loyalty?.tier || 'BRONZE'} ELITE MEMBER
                            </span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl font-black text-accent-brown tracking-tighter leading-[0.9]">
                            Welcome back,<br />
                            <span className="text-brand">{firstName}.</span>
                        </h1>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/dashboard/customer/catalog')}
                                className="px-8 py-4 bg-brand text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-brand/20 flex items-center gap-3 cursor-pointer"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Start Shopping
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/dashboard/customer/loyalty')}
                                className="px-8 py-4 bg-white border-2 border-accent-brown/5 text-accent-brown rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-accent-brown/5 transition-colors cursor-pointer"
                            >
                                View Rewards
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Quick Actions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {quickActions.map((action, i) => (
                        <motion.div
                            key={action.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            onClick={() => navigate(action.path)}
                            className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-accent-brown/5 border border-white flex flex-col items-center text-center group cursor-pointer"
                        >
                            <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                                <action.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-sm font-black text-accent-brown tracking-[0.2em] mb-1">{action.title}</h3>
                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">{action.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* 3. Main Dashboard Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* Left & Middle Column (Current Activity & Insights) */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Current Activity Section */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-[3rem] p-10 shadow-xl shadow-accent-brown/5 border border-white"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-brand">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-accent-brown tracking-tight">Current Activity</h2>
                                        <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em]">Ongoing Fulfillment</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/dashboard/customer/orders')}
                                    className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
                                >
                                    Detailed View
                                </button>
                            </div>

                            {stats?.recent_order ? (
                                <div className="space-y-10">
                                    <div className="p-8 bg-accent-peach/5 border border-accent-brown/5 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                                                <Package className="w-8 h-8 text-accent-brown/20" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-brand uppercase tracking-widest block mb-1">
                                                    ORDER {stats.recent_order?.id}
                                                </span>
                                                <h3 className="text-xl font-black text-accent-brown tracking-tight">
                                                    {stats.recent_order?.item_summary}
                                                </h3>
                                                <p className="text-xs font-bold text-accent-brown/40 mt-1">
                                                    {stats.recent_order?.location}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest ${getStatusColor(stats.recent_order?.status || '')}`}>
                                            {stats.recent_order?.status}
                                        </div>
                                    </div>

                                    {/* Progress Tracker */}
                                    <div className="px-4">
                                        <div className="relative h-1 bg-accent-brown/5 rounded-full flex items-center justify-between">
                                            <div 
                                                className="absolute left-0 top-0 h-full bg-brand rounded-full transition-all duration-1000"
                                                style={{ 
                                                    width: stats.recent_order?.status?.toLowerCase() === 'completed' ? '100%' : 
                                                           stats.recent_order?.status?.toLowerCase() === 'delivering' ? '75%' :
                                                           stats.recent_order?.status?.toLowerCase() === 'processing' ? '50%' : '25%' 
                                                }}
                                            />
                                            {['ORDERED', 'PROCESSING', 'DELIVERING', 'COMPLETE'].map((step, idx) => (
                                                <div key={step} className="relative flex flex-col items-center">
                                                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-colors ${
                                                        (idx === 0) || 
                                                        (idx === 1 && ['processing', 'delivering', 'completed'].includes(stats.recent_order?.status?.toLowerCase() || '')) ||
                                                        (idx === 2 && ['delivering', 'completed'].includes(stats.recent_order?.status?.toLowerCase() || '')) ||
                                                        (idx === 3 && stats.recent_order?.status?.toLowerCase() === 'completed')
                                                        ? 'bg-brand' : 'bg-accent-brown/10'
                                                    }`} />
                                                    <span className={`absolute top-6 whitespace-nowrap text-[9px] font-black uppercase tracking-widest ${
                                                        (idx === 0) || 
                                                        (idx === 1 && ['processing', 'delivering', 'completed'].includes(stats.recent_order?.status?.toLowerCase() || '')) ||
                                                        (idx === 2 && ['delivering', 'completed'].includes(stats.recent_order?.status?.toLowerCase() || '')) ||
                                                        (idx === 3 && stats.recent_order?.status?.toLowerCase() === 'completed')
                                                        ? 'text-accent-brown' : 'text-accent-brown/20'
                                                    }`}>
                                                        {step}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-accent-peach/5 rounded-[2rem]">
                                    <Package className="w-12 h-12 text-accent-brown/10 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-accent-brown/40 uppercase tracking-widest">No active shipments</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Bottom Row: Loyalty, Insights, Health */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Loyalty Progress Card */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                onClick={() => navigate('/dashboard/customer/loyalty')}
                                className="bg-brand rounded-[2.5rem] p-8 text-white flex flex-col justify-between h-[300px] cursor-pointer"
                            >
                                <Award className="w-10 h-10 opacity-50" />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Loyalty Balance</h4>
                                    <div className="flex items-baseline gap-2 mb-6">
                                        <span className="text-5xl font-black">{stats?.loyalty?.points || 0}</span>
                                        <span className="text-sm font-bold opacity-60">pts</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-white rounded-full" 
                                                style={{ width: `${(stats?.loyalty?.points || 0) / (stats?.loyalty?.next_points || 1000) * 100}%` }} 
                                            />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                                            {stats?.loyalty?.points_to_next || 0} points to {stats?.loyalty?.next_tier || 'Silver'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Member Insights Card */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                className="bg-white rounded-[2.5rem] p-8 border border-white shadow-xl shadow-accent-brown/5 flex flex-col justify-between h-[300px]"
                            >
                                <Gift className="w-10 h-10 text-brand" />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-4">Member Insights</h4>
                                    <p className="text-sm font-bold text-accent-brown italic mb-6">
                                        "{stats?.insight || "Ear points for every purchase to unlock exclusive member rewards."}"
                                    </p>
                                    <button className="w-full py-4 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand/20 hover:brightness-110">
                                        Redeem Points
                                    </button>
                                </div>
                            </motion.div>

                            {/* Pet Health Pulse */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                onClick={() => navigate('/dashboard/customer/reservations')}
                                className="bg-[#0A0A0A] rounded-[2.5rem] p-8 text-white flex flex-col justify-between h-[300px] cursor-pointer overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="w-10 h-10 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-brand" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Pet Health</h4>
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center p-2">
                                            <div className="w-full h-full flex flex-col justify-center items-center gap-1">
                                                <div className="w-1 h-1 bg-brand rounded-full animate-ping" />
                                                <div className="w-1 h-1 bg-brand rounded-full" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black tracking-tight leading-tight">
                                                {stats?.clinic_checkup?.service || 'Clinic Visit'}
                                            </h3>
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                                {stats?.clinic_checkup?.pet_name ? `For ${stats.clinic_checkup.pet_name}` : 'Ongoing Care Plan'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-brand/10 border border-brand/20 p-3 rounded-xl">
                                        <Calendar className="w-4 h-4 text-brand" />
                                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">
                                            {stats?.clinic_checkup ? `Next Slot: ${stats.clinic_checkup.date} ${stats.clinic_checkup.time}` : 'No Upcoming Visits'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                        </div>

                    </div>

                    {/* Right Column (Alert Center) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-[3rem] p-10 shadow-xl shadow-accent-brown/5 border border-white flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <Bell className="w-6 h-6 text-brand" />
                                <h2 className="text-xl font-black text-accent-brown tracking-tight">Alert Center</h2>
                            </div>
                            <span className="text-lg font-black text-accent-brown/20">{stats?.unread_count || 0}</span>
                        </div>

                        <div className="flex-1 space-y-6">
                            {stats?.alerts && stats.alerts.length > 0 ? (
                                stats.alerts.map((alert, i) => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className="group cursor-pointer"
                                    >
                                        <div className="p-1 flex items-start gap-4 hover:translate-x-1 transition-transform">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.type === 'System' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                            <div>
                                                <h4 className="font-bold text-sm text-accent-brown leading-tight group-hover:text-brand transition-colors">
                                                    {alert.title}
                                                </h4>
                                                <p className="text-[10px] text-accent-brown/40 font-medium mt-1 line-clamp-2">
                                                    {alert.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-20">
                                    <Bell size={64} strokeWidth={1} />
                                    <p className="mt-4 font-black text-[10px] uppercase tracking-[0.2em]">No Notifications</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => navigate('/dashboard/customer/alerts')}
                            className="mt-10 w-full py-5 border-2 border-accent-brown/5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/10 hover:text-accent-brown hover:border-transparent transition-all"
                        >
                            View All Activity
                        </button>
                    </motion.div>

                </div>

            </div>
        </DashboardLayout>
    );
};

export default CustomerDashboard;
