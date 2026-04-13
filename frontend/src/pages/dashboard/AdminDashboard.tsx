import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import { Store, Users, Bike, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Calendar, Hash, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';


const AdminDashboard = () => {
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState({ 
        partners: 0, 
        partners_trend: '+0',
        riders: 0, 
        riders_trend: '+0',
        customers: 0,
        customers_trend: '+0',
        end_users: 0,
        end_users_trend: '+0',
        details: {
            partners: [] as any[],
            riders: [] as any[],
            customers: [] as any[],
            end_users: [] as any[]
        }
    });
    const [selectedStat, setSelectedStat] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [analytics, setAnalytics] = useState<{
        growth: any[];
        distribution: any[];
        velocity: any[];
    }>({ growth: [], distribution: [], velocity: [] });
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchData = async () => {
            if (authLoading) return;
            const token = user?.token || localStorage.getItem('hivet_token');
            if (!token) return;

            try {
                const [statsRes, analyticsRes] = await Promise.all([
                    fetch('http://localhost:8000/api/admin/dashboard-stats', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8000/api/admin/analytics', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (statsRes.ok && analyticsRes.ok) {
                    const statsData = await statsRes.json();
                    const analyticsData = await analyticsRes.json();
                    setStats(statsData);
                    setAnalytics(analyticsData);
                }
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [authLoading, user?.token]);

    const statCards = [
        { 
            title: 'Active Partners', 
            value: stats.partners.toLocaleString(), 
            icon: Store, 
            trend: stats.partners_trend,
            data: stats.details.partners,
            color: 'bg-accent-peach/20'
        },
        { 
            title: 'Registered Riders', 
            value: stats.riders.toLocaleString(), 
            icon: Bike, 
            trend: stats.riders_trend,
            data: stats.details.riders,
            color: 'bg-brand/10'
        },
        { 
            title: 'Active Customers', 
            value: stats.customers.toLocaleString(), 
            icon: Users, 
            trend: stats.customers_trend,
            data: stats.details.customers,
            color: 'bg-blue-50/50'
        },
        { 
            title: 'Overall Population', 
            value: stats.end_users.toLocaleString(), 
            icon: Activity, 
            trend: stats.end_users_trend,
            data: stats.details.end_users,
            color: 'bg-white'
        },
    ];

    const StatModal = ({ isOpen, onClose, stat }: { isOpen: boolean, onClose: () => void, stat: any }) => {
        if (!isOpen || !stat) return null;

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-accent-brown/20 backdrop-blur-sm pt-20">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-white overflow-hidden flex flex-col max-h-[80vh]"
                >
                    <div className="p-8 border-b border-accent-brown/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-brand-dark`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-accent-brown tracking-tighter">{stat.title}</h2>
                                <p className="text-xs font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Complete Platform Data</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-accent-brown/5 flex items-center justify-center text-accent-brown hover:bg-brand hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 pb-4 border-b border-accent-brown/5 px-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/30">
                                <div className="flex items-center gap-2"><Hash className="w-3 h-3" /> ID</div>
                                <div className="flex items-center gap-2">Name</div>
                                <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email</div>
                                <div className="flex items-center gap-2 sm:justify-end text-right"><Calendar className="w-3 h-3" /> Joined</div>
                            </div>

                            {stat.data.length > 0 ? stat.data.map((item: any, i: number) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="grid grid-cols-4 gap-4 p-4 rounded-2xl hover:bg-accent-peach/10 transition-colors group"
                                >
                                    <div className="font-bold text-xs text-accent-brown/40">{item.id}</div>
                                    <div className="font-bold text-xs text-accent-brown truncate">{item.name}</div>
                                    <div className="font-medium text-xs text-accent-brown/60 truncate">{item.email}</div>
                                    <div className="text-xs text-accent-brown/40 font-medium sm:text-right">{item.joined}</div>
                                </motion.div>
                            )) : (
                                <div className="py-20 flex flex-col items-center justify-center opacity-30 grayscale saturate-0">
                                    <stat.icon className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest">No detailed data found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 border-t border-accent-brown/5 bg-accent-peach/5 flex justify-end">
                        <button onClick={onClose} className="px-8 py-3 bg-brand-dark text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-brand transition-colors">
                            Close Analysis
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    };


    if (loading && !authLoading) {
        return (
            <DashboardLayout title="Platform Overview">
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-brand animate-spin" />
                    <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">Crunching platform data...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Platform Overview">
            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => {
                                setSelectedStat(stat);
                                setIsModalOpen(true);
                            }}
                            className={`bg-white text-accent-brown p-6 rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 ${(stat.color || 'bg-accent-peach/20') + ' text-brand-dark'} rounded-2xl flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${(stat.trend.startsWith('+') && stat.trend !== '+0' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}`}>
                                    {stat.trend}
                                </span>
                            </div>
                            <h3 className={`text-3xl font-black tracking-tighter text-accent-brown group-hover:text-brand transition-colors`}>{stat.value}</h3>
                            <p className={`text-xs font-bold uppercase tracking-widest mt-1 text-accent-brown/40 group-hover:text-brand-dark/60 transition-colors`}>{stat.title}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Area - Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Platform Growth Chart */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-8 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black text-accent-brown flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-brand" /> Platform Growth
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mt-1">6-Month Cumulative Projection</p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.growth}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FB8500" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#FB8500" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#219EBC" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#219EBC" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#8D6E63', fontSize: 10, fontWeight: 800 }} 
                                        dy={10} 
                                    />
                                    <YAxis hide />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-4 rounded-2xl shadow-2xl border border-accent-brown/5">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-2">{label}</p>
                                                        {payload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center justify-between gap-4 mb-1">
                                                                <span className="text-[10px] font-black uppercase text-accent-brown/60">{entry.name}:</span>
                                                                <span className="text-sm font-black text-accent-brown">{entry.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="Customers" stroke="#FB8500" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                    <Area type="monotone" dataKey="Partners" stroke="#219EBC" strokeWidth={3} fillOpacity={1} fill="url(#colorPartners)" />
                                    <Area type="monotone" dataKey="Riders" stroke="#8D6E63" strokeWidth={3} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* User Segmentation (Pie Chart) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-4 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col"
                    >
                        <h2 className="text-xl font-black text-accent-brown mb-2 flex items-center gap-2">
                             <PieIcon className="w-5 h-5 text-brand" /> User Split
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-8">Current Role Distribution</p>
                        
                        <div className="flex-1 min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.distribution}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                        animationDuration={1500}
                                    >
                                        {analytics.distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-3 mt-4">
                            {analytics.distribution.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[10px] font-black uppercase text-accent-brown/60">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-accent-brown">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Daily Onboarding Velocity (Bar Chart) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="lg:col-span-12 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black text-accent-brown flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-brand" /> Onboarding Velocity
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mt-1">Daily Registrations (Last 14 Days)</p>
                            </div>
                        </div>

                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.velocity}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.3} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#8D6E63', fontSize: 9, fontWeight: 700 }} 
                                    />
                                    <YAxis hide />
                                    <Tooltip 
                                        cursor={{ fill: '#FB8500', opacity: 0.05 }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-brand-dark px-4 py-2 rounded-xl shadow-lg">
                                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{payload[0].value} New Sign-ups</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="new" fill="#FB8500" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            </div>

            <StatModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                stat={selectedStat} 
            />
        </DashboardLayout>
    );
};

export default AdminDashboard;
