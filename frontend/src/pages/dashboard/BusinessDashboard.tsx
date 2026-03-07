import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Package, Award, ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const revenueData = [42000, 58000, 51000, 67000, 73000, 89000];
const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const maxRevenue = Math.max(...revenueData);

const recentOrders = [
    { id: 'ORD-0091', customer: 'Maria Santos', product: 'Premium Dog Food 5kg', total: '₱1,240', status: 'Completed', date: 'Mar 06' },
    { id: 'ORD-0090', customer: 'Juan Reyes', product: 'Cat Vitamin Complex', total: '₱580', status: 'Processing', date: 'Mar 06' },
    { id: 'ORD-0089', customer: 'Ana Cruz', product: 'Grooming Accessory Set', total: '₱920', status: 'Completed', date: 'Mar 05' },
    { id: 'ORD-0088', customer: 'Mark Villanueva', product: 'Dental Chew Pack', total: '₱340', status: 'Pending', date: 'Mar 05' },
    { id: 'ORD-0087', customer: 'Lea Torres', product: 'Harness + Leash Bundle', total: '₱760', status: 'Completed', date: 'Mar 04' },
];

const STATUS = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
};

const topProducts = [
    { name: 'Premium Dog Food 5kg', sold: 142, revenue: '₱176,080', pct: 100 },
    { name: 'Cat Vitamin Complex', sold: 98, revenue: '₱56,840', pct: 69 },
    { name: 'Grooming Set', sold: 74, revenue: '₱68,080', pct: 52 },
    { name: 'Dental Chew Pack', sold: 61, revenue: '₱20,740', pct: 43 },
];

const BusinessDashboard = () => {
    const { user } = useAuth();

    const stats = [
        { label: 'Total Orders', value: '1,284', sub: '+12% this month', icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
        { label: 'Monthly Revenue', value: '₱89k', sub: '+21% vs last mo', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
        { label: 'Active Products', value: '47', sub: '3 low stock', icon: Package, color: 'bg-orange-50 text-orange-600' },
        { label: 'Loyalty Redemptions', value: '38', sub: 'This month', icon: Award, color: 'bg-purple-50 text-purple-600' },
    ];

    return (
        <DashboardLayout title="Overview">
            <div className="space-y-8">

                {/* Welcome Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-dark rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8"
                >
                    <div className="relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand mb-2 block">Partner Portal</span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
                            Welcome back,<br />{user?.name ?? 'Partner'}!
                        </h2>
                        <p className="text-white/60 font-medium max-w-md">
                            Your store is performing well. Revenue is up 21% compared to last month. Keep it up!
                        </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap gap-3 shrink-0">
                        <Link to="/dashboard/business/orders" className="bg-brand text-brand-dark px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2">
                            View Orders <ArrowRight className="w-3 h-3" />
                        </Link>
                        <Link to="/dashboard/business/catalog" className="bg-white/10 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors">
                            Manage Catalog
                        </Link>
                    </div>
                    <div className="absolute top-[-20%] right-[-5%] w-80 h-80 bg-brand/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-30%] left-[20%] w-64 h-64 bg-white/5 rounded-full blur-[60px]" />
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.08 }}
                            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col gap-4"
                        >
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${s.color}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none mb-1">{s.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{s.label}</p>
                                <p className="text-[10px] font-bold text-green-600 mt-1">{s.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Revenue Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-3 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight">Revenue Trend</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mt-1">Last 6 months</p>
                            </div>
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">+21%</span>
                            </div>
                        </div>
                        <div className="flex items-end gap-3 h-44">
                            {revenueData.map((val, i) => (
                                <div key={months[i]} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-[9px] font-black text-accent-brown/40">₱{(val / 1000).toFixed(0)}k</span>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(val / maxRevenue) * 100}%` }}
                                        transition={{ duration: 0.6, delay: 0.4 + i * 0.07 }}
                                        className={`w-full rounded-xl ${i === revenueData.length - 1 ? 'bg-brand-dark' : 'bg-accent-peach/60'}`}
                                    />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">{months[i]}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Top Products */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Top Products</h3>
                        <div className="space-y-5">
                            {topProducts.map((p) => (
                                <div key={p.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-xs font-bold text-accent-brown truncate pr-4">{p.name}</p>
                                        <span className="text-[10px] font-black text-brand-dark shrink-0">{p.revenue}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-accent-peach/30 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.pct}%` }}
                                            transition={{ duration: 0.6, delay: 0.5 }}
                                            className="h-full bg-brand-dark rounded-full"
                                        />
                                    </div>
                                    <p className="text-[9px] font-bold text-accent-brown/40 mt-1">{p.sold} units sold</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Recent Orders */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-accent-brown tracking-tight">Recent Orders</h3>
                        <Link to="/dashboard/business/orders" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors">
                            View All <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className="border-b border-accent-brown/5">
                                    {['Order', 'Customer', 'Product', 'Date', 'Total', 'Status'].map(h => (
                                        <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-accent-brown/30 pb-4 px-2">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((o) => (
                                    <tr key={o.id} className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors">
                                        <td className="py-4 px-2 text-[10px] font-black text-accent-brown/50">{o.id}</td>
                                        <td className="py-4 px-2 font-bold text-accent-brown text-sm">{o.customer}</td>
                                        <td className="py-4 px-2 text-sm font-medium text-accent-brown/70">{o.product}</td>
                                        <td className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{o.date}</td>
                                        <td className="py-4 px-2 font-black text-accent-brown">{o.total}</td>
                                        <td className="py-4 px-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS[o.status as keyof typeof STATUS]}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

            </div>
        </DashboardLayout>
    );
};

export default BusinessDashboard;
