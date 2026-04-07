import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Package, ShoppingBag, Users, 
    ArrowRight, TrendingUp, Award,
    Filter, ArrowUp, ArrowDown, LayoutGrid, Loader2,
    ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

interface ChartDataPoint { name: string; value: number; color?: string; }
interface KPI { label: string; value: string; trend: string; icon: string; color: string; change?: string; sub?: string; }
interface RevenueData { trend: string; chartData: ChartDataPoint[]; }
interface TopProduct { name: string; sold: number; revenue: number; pct: number; }

const ICON_MAP: Record<string, React.ElementType> = { TrendingUp, Users, ShoppingBag, Award, LayoutGrid, Package };

const STATUS = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
};

const BusinessDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<KPI[]>([]);

    const [revenueData, setRevenueData] = useState<RevenueData>({ trend: '+21%', chartData: [] });
    const [revenuePeriod, setRevenuePeriod] = useState('6m');
    const [revenueType, setRevenueType] = useState('all');
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [distributionData, setDistributionData] = useState<ChartDataPoint[]>([]);
    const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([]);

    useEffect(() => {
        if (user?.token) {
            fetchDashboardData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.token, revenuePeriod, revenueType]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${user?.token}` };
            
            // Fetch recent orders
            const ordersResp = await fetch('http://localhost:8000/api/business/dashboard/recent-orders', { headers });
            if (ordersResp.ok) {
                setRecentOrders(await ordersResp.json());
            }

            // Fetch analytics/trend
            const analyticsResp = await fetch(`http://localhost:8000/api/business/dashboard/analytics?period=${revenuePeriod}&data_type=${revenueType}`, { headers });
            const analyticsData = await analyticsResp.json();
            setStats(analyticsData.kpis || []);
            setRevenueData(analyticsData.revenue_trend || { trend: '+0%', chartData: [] });
            setTopProducts(analyticsData.top_products || []);
            setDistributionData(analyticsData.distribution_data || []);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };


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
                    {loading ? (
                        [1,2,3,4].map(i => (
                            <div key={i} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white h-32 animate-pulse" />
                        ))
                    ) : stats.map((s, i) => {
                        const Icon = ICON_MAP[s.icon] || TrendingUp;
                        return (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.08 }}
                                className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col gap-4"
                            >
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${s.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none mb-1">{s.value}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{s.label}</p>
                                    <p className="text-[10px] font-bold text-green-600 mt-1">{s.change}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid lg:grid-cols-5 gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight">Revenue Trend</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mt-1">Personal Sales Performance</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1 bg-accent-brown/5 p-1 rounded-2xl">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'products', label: 'Products' },
                                        { id: 'services', label: 'Services' },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setRevenueType(type.id)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                revenueType === type.id 
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                                : 'text-accent-brown/40 hover:text-accent-brown'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 bg-accent-brown/5 p-1 rounded-2xl">
                                    {[
                                        { id: '7d', label: '7D' },
                                        { id: '30d', label: '30D' },
                                        { id: '6m', label: '6M' },
                                        { id: '1y', label: '1Y' },
                                    ].map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setRevenuePeriod(p.id)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                revenuePeriod === p.id 
                                                ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                                                : 'text-accent-brown/40 hover:text-accent-brown'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 mb-8">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-accent-brown tracking-tighter">
                                    ₱{(revenueData.chartData?.reduce((acc: number, d: ChartDataPoint) => acc + d.value, 0) || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Total Period Revenue</span>
                            </div>
                            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                revenueData.trend?.startsWith('+') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                                {revenueData.trend?.startsWith('+') ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                {revenueData.trend}
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Aggregating Sales...</p>
                                </div>
                            ) : revenueData.chartData?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={revenueData.chartData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FB8500" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#FB8500" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#8D6E63', fontSize: 10, fontWeight: 800 }} 
                                            dy={10}
                                            tickFormatter={(val) => {
                                                if (revenuePeriod === '6m' || revenuePeriod === '1y') {
                                                    const d = new Date(val + "-01");
                                                    return d.toLocaleString('default', { month: 'short' }).toUpperCase();
                                                }
                                                return val;
                                            }}
                                        />
                                        <YAxis 
                                            hide 
                                            domain={['auto', 'auto']}
                                        />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-accent-brown/5">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">{payload[0].payload.name}</p>
                                                            <p className="text-xl font-black text-brand-dark">₱{payload[0].value?.toLocaleString()}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#FB8500" 
                                            strokeWidth={4} 
                                            dot={{ fill: '#FB8500', strokeWidth: 2, r: 4, stroke: '#FFF' }} 
                                            activeDot={{ r: 6, fill: '#FFB703', stroke: '#FFF', strokeWidth: 2 }}
                                            animationDuration={1500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale saturate-0">
                                    <Filter className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest">No order data available for this period</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Top Products */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">
                            {revenueType === 'services' ? 'Top Clinic Services' : 'Top Products'}
                        </h3>
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
                                    <p className="text-[9px] font-bold text-accent-brown/40 mt-1">
                                        {p.sold} {revenueType === 'services' ? 'sessions' : 'units sold'}
                                    </p>
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
                                {recentOrders.map((o: any) => (
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
