import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import { Store, Users, Bike, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Calendar, Hash } from 'lucide-react';

interface OnboardingUser {
    id: string;
    name: string;
    status: string;
    time: string;
}

const AdminDashboard = () => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        partners: 0, 
        partners_trend: '+0',
        riders: 0, 
        riders_trend: '+0',
        end_users: 0,
        end_users_trend: '+0',
        details: {
            partners: [] as any[],
            riders: [] as any[],
            end_users: [] as any[]
        }
    });
    const [selectedStat, setSelectedStat] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [onboarding, setOnboarding] = useState<{
        partners: OnboardingUser[];
        riders: OnboardingUser[];
        customers: OnboardingUser[];
    }>({ partners: [], riders: [], customers: [] });
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchData = async () => {
            if (authLoading) return;
            const token = user?.token || localStorage.getItem('hivet_token');
            if (!token) return;

            try {
                const [statsRes, onboardingRes] = await Promise.all([
                    fetch('http://localhost:8000/api/admin/dashboard-stats', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8000/api/admin/recent-onboarding', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (statsRes.ok && onboardingRes.ok) {
                    const statsData = await statsRes.json();
                    const onboardingData = await onboardingRes.json();
                    setStats(statsData);
                    setOnboarding(onboardingData);
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
            title: 'Total End Users', 
            value: stats.end_users.toLocaleString(), 
            icon: Users, 
            trend: stats.end_users_trend,
            data: stats.details.end_users,
            color: 'bg-white'
        },
    ];

    const StatModal = ({ isOpen, onClose, stat }: { isOpen: boolean, onClose: () => void, stat: any }) => {
        if (!isOpen || !stat) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-accent-brown/20 backdrop-blur-sm">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                {/* Main Content Area */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Onboarding Activities */}
                    <div className="space-y-8">
                        {/* Recent Partner Onboarding */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-accent-brown">Recent Partner Onboarding</h2>
                                <button onClick={() => navigate('/dashboard/admin/businesses')} className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors">View All Directory</button>
                            </div>

                            <div className="space-y-4">
                                {onboarding.partners.length > 0 ? onboarding.partners.map((biz, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl hover:bg-accent-peach/10 transition-colors cursor-pointer group gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-accent-peach/30 flex items-center justify-center text-brand-dark font-black text-xs shrink-0">
                                                {biz.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-accent-brown group-hover:text-brand-dark transition-colors truncate">{biz.name}</p>
                                                <p className="text-xs font-medium text-accent-brown/50 truncate">{biz.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0">
                                             <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-0.5 sm:p-0 rounded-md sm:rounded-none ${
                                                 biz.status === 'Active' ? 'text-green-600 bg-green-50 sm:bg-transparent' : 
                                                 biz.status === 'Pending' ? 'text-orange-500 bg-orange-50 sm:bg-transparent' :
                                                 'text-red-500 bg-red-50 sm:bg-transparent'
                                             }`}>{biz.status}</p>
                                            <p className="text-[10px] text-accent-brown/40 font-medium">{biz.time}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center py-8 text-xs font-bold text-accent-brown/30 uppercase tracking-widest">No recent partners</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Recent Rider Onboarding */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-accent-brown">Recent Rider Onboarding</h2>
                                <button onClick={() => navigate('/dashboard/admin/riders')} className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors">View All Fleet</button>
                            </div>

                            <div className="space-y-4">
                                {onboarding.riders.length > 0 ? onboarding.riders.map((rider, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl hover:bg-accent-peach/10 transition-colors cursor-pointer group gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-brand-light/30 flex items-center justify-center text-brand-dark font-black text-xs shrink-0">
                                                {rider.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-accent-brown group-hover:text-brand-dark transition-colors truncate">{rider.name}</p>
                                                <p className="text-xs font-medium text-accent-brown/50 truncate">{rider.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0">
                                             <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-0.5 sm:p-0 rounded-md sm:rounded-none ${
                                                 rider.status === 'Active' ? 'text-green-600 bg-green-50 sm:bg-transparent' : 
                                                 rider.status === 'Pending' ? 'text-orange-500 bg-orange-50 sm:bg-transparent' :
                                                 'text-red-500 bg-red-50 sm:bg-transparent'
                                             }`}>{rider.status}</p>
                                            <p className="text-[10px] text-accent-brown/40 font-medium">{rider.time}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center py-8 text-xs font-bold text-accent-brown/30 uppercase tracking-widest">No recent riders</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Recent Customer Onboarding (Super Admin Only) */}
                        {user?.role === 'super_admin' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 }}
                                className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white mt-8"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-accent-brown">Recent Customer Onboarding</h2>
                                    <button onClick={() => navigate('/dashboard/admin/users')} className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors">View All Users</button>
                                </div>

                                <div className="space-y-4">
                                    {onboarding.customers && onboarding.customers.length > 0 ? onboarding.customers.map((customer, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl hover:bg-accent-peach/10 transition-colors cursor-pointer group gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-accent-brown group-hover:text-brand-dark transition-colors truncate">{customer.name}</p>
                                                    <p className="text-xs font-medium text-accent-brown/50 truncate">{customer.id}</p>
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0">
                                                 <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-0.5 sm:p-0 rounded-md sm:rounded-none ${
                                                     customer.status === 'Active' ? 'text-green-600 bg-green-50 sm:bg-transparent' : 
                                                     customer.status === 'Pending' ? 'text-orange-500 bg-orange-50 sm:bg-transparent' :
                                                     'text-red-500 bg-red-50 sm:bg-transparent'
                                                 }`}>{customer.status}</p>
                                                <p className="text-[10px] text-accent-brown/40 font-medium">{customer.time}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-center py-8 text-xs font-bold text-accent-brown/30 uppercase tracking-widest">No recent customers</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
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
