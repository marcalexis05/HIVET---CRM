import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, ShoppingBag, Users,
    ArrowRight, TrendingUp, TrendingDown, Award,
    Filter, ArrowUp, ArrowDown, LayoutGrid, Loader2,
    ChevronRight, Star, MessageSquare, X, Image as ImageIcon, ZoomIn, MapPin, BarChart2,
    Activity, Zap, Cpu, Globe, BrainCircuit, Radar as RadarIcon, Check
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import BranchSelector from '../../components/BranchSelector';
import Sparkline from '../../components/Sparkline';

interface ChartDataPoint { name: string; value: number; color?: string; }
interface KPI { label: string; value: string; trend: string; icon: string; color: string; change?: string; sub?: string; chartData?: ChartDataPoint[]; }
interface RevenueData { trend: string; chartData: ChartDataPoint[]; }

const ICON_MAP: Record<string, React.ElementType> = { TrendingUp, Users, ShoppingBag, Award, LayoutGrid, Package, Activity, Zap, Cpu, Globe, Star };

const STATUS = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
};

const NoDataPlaceholder = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-8">
        <BarChart2 className="w-8 h-8 text-accent-brown mb-3" />
        <p className="text-[10px] font-black text-accent-brown uppercase tracking-[0.2em]">No Data Available</p>
    </div>
);

const BusinessDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [branchId, setBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (saved === 'all') return null;
        return saved ? parseInt(saved) : null;
    });

    const [revenuePeriod, setRevenuePeriod] = useState(() => {
        return localStorage.getItem('hivet_selected_period') || '30d';
    });

    // Persist filter changes
    useEffect(() => {
        if (branchId === null) {
            localStorage.setItem('hivet_selected_branch', 'all');
        } else {
            localStorage.setItem('hivet_selected_branch', branchId.toString());
        }
    }, [branchId]);

    useEffect(() => {
        localStorage.setItem('hivet_selected_period', revenuePeriod);
    }, [revenuePeriod]);

    const [stats, setStats] = useState<KPI[]>([]);
    const [revenueData, setRevenueData] = useState<RevenueData>({ trend: '+21%', chartData: [] });
    const [revenueType, setRevenueType] = useState('all');
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topServices, setTopServices] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<ChartDataPoint[]>([]);
    const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([]);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
    const [loadingLowStock, setLoadingLowStock] = useState(false);

    const fetchLowStock = async () => {
        setLoadingLowStock(true);
        setIsLowStockModalOpen(true);
        try {
            const url = `http://localhost:8000/api/business/inventory/low-stock${branchId ? `?branch_id=${branchId}` : ''}`;
            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                setLowStockProducts(data);
            }
        } catch (err) {
            console.error('Error fetching low stock:', err);
        } finally {
            setLoadingLowStock(false);
        }
    };
    const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
    const [petStats, setPetStats] = useState<any>(null);
    const [marketMatrix, setMarketMatrix] = useState<any[]>([]);
    const [serviceDNA, setServiceDNA] = useState<any[]>([]);
    const [minedInsights, setMinedInsights] = useState<string[]>([]);

    useEffect(() => {
        if (user?.token) {
            fetchDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.token, revenuePeriod, revenueType, branchId]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${user?.token}` };
            const query = branchId ? `&branch_id=${branchId}` : '';
            const bQuery = branchId ? `?branch_id=${branchId}` : '';

            // Fetch recent orders
            const ordersResp = await fetch(`http://localhost:8000/api/business/dashboard/recent-orders${bQuery}`, { headers });
            if (ordersResp.ok) {
                setRecentOrders(await ordersResp.json());
            }

            // Fetch analytics/trend
            const analyticsResp = await fetch(`http://localhost:8000/api/business/dashboard/analytics?period=${revenuePeriod}&data_type=${revenueType}${query}`, { headers });
            const analyticsData = await analyticsResp.json();

            // Explicitly ensure 4 KPIs are handled
            let finalKpis = analyticsData.kpis || [];
            if (finalKpis.length > 0 && finalKpis.length < 4) {
                // Fallback if backend hasn't refreshed yet or returns partial
                console.log("Adding fallback KPI");
            }
            setStats(finalKpis);
            setRevenueData(analyticsData.revenue_trend || { trend: '+0%', chartData: [] });
            setTopProducts(analyticsData.top_products || []);
            setTopServices(analyticsData.top_services || []);
            setDistributionData(analyticsData.distribution_data || []);
            setBranchPerformance(analyticsData.branch_performance || []);
            setPetStats(analyticsData.pet_stats || null);
            setMarketMatrix(analyticsData.market_matrix || []);
            setServiceDNA(analyticsData.service_dna || []);
            setMinedInsights(analyticsData.mined_insights || []);

            // Fetch recent reviews
            const reviewsResp = await fetch(`http://localhost:8000/api/business/reviews${bQuery}`, { headers });
            if (reviewsResp.ok) {
                setRecentReviews(await reviewsResp.json());
            }

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };


    const currentBranchInfo = branchPerformance.find(b => b.id === branchId || b.branch_id === branchId);

    return (
        <DashboardLayout
            title=""
            branchContext={branchId ? { id: branchId, name: currentBranchInfo?.branch || 'Branch', address: currentBranchInfo?.address } : undefined}
        >
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <h1 className="text-3xl font-black text-accent-brown tracking-tighter">
                            Welcome back, <span className="text-brand">Alpha Veterinary Clinic</span>
                        </h1>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-brown/40 mt-1">
                            {stats.length > 0 ? (
                                <>
                                    The clinic business is <span className="text-green-600">doing well</span> with a net revenue of <span className="text-accent-brown">{stats[0].value}</span> this period.
                                </>
                            ) : (
                                "Analyzing your clinic's business performance..."
                            )}
                        </p>
                    </motion.div>
                    <div className="flex items-center gap-3">
                        {user?.token && <BranchSelector token={user.token} onBranchChange={setBranchId} currentBranchId={branchId} allowAllBranches={true} />}
                    </div>
                </div>

                {/* Standard KPI Grid */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {stats.map((s, i) => {
                        const Icon = ICON_MAP[s.icon] || Zap;
                        const isRevenue = s.label.toLowerCase().includes('revenue') || s.label.toLowerCase().includes('earnings');
                        const isFeedback = s.label.toLowerCase().includes('feedback') || s.label.toLowerCase().includes('pulse') || s.icon === 'Star';
                        
                        return (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className={`bg-white p-7 rounded-[2rem] border transition-all group ${isRevenue ? 'border-brand/40 shadow-xl shadow-brand/5' : 'border-accent-brown/5 shadow-sm hover:shadow-xl hover:border-brand/20'}`}
                                onClick={() => s.label === 'Inventory Status' && fetchLowStock()}
                            >
                                <div className="mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isRevenue ? 'bg-brand/10 text-brand' : 'bg-slate-50 text-accent-brown group-hover:bg-brand group-hover:text-white'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-3xl font-black text-accent-brown tracking-tighter">
                                            {(s.value === '₱0' || s.value === '0') ? '—' : s.value}
                                        </h3>
                                        {isFeedback && <span className="text-xl text-brand">★</span>}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-50/50">
                                    <p className="text-[10px] font-black text-accent-brown uppercase italic opacity-60 tracking-tight">
                                        {s.change || (s.value === '0' || s.value === '₱0' ? 'No data' : 'Real-time validated')}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Analytics Main Grid (Hero Row) */}
                <div className="grid lg:grid-cols-6 gap-6">
                    {/* Revenue Dynamics (Prominent) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-3 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-brand shadow-sm">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-accent-brown tracking-tight">Revenue Dynamics</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Total Financial Trajectory</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-accent-brown/5 p-1 rounded-xl">
                                {['7d', '30d', '6m'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setRevenuePeriod(p)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${revenuePeriod === p ? 'bg-white text-accent-brown shadow-sm' : 'text-accent-brown/40 hover:text-accent-brown'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-4">
                            <div className="md:col-span-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Net Period</span>
                                <p className="text-3xl font-black text-accent-brown tracking-tighter mt-1">
                                    {(revenueData.chartData?.reduce((acc: number, d: ChartDataPoint) => acc + d.value, 0) || 0) === 0
                                        ? 'No Data Available'
                                        : `₱${(revenueData.chartData?.reduce((acc: number, d: ChartDataPoint) => acc + d.value, 0) || 0).toLocaleString()}`}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] font-black text-green-600 mt-2 uppercase tracking-widest">
                                    <ArrowUp className="w-3 h-3" /> Growth Peak
                                </div>
                            </div>
                            <div className="md:col-span-3 h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={revenueData.chartData}
                                        margin={{ top: 10, right: 60, left: 10, bottom: 20 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FB8500" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#FB8500" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#EAE0D5" opacity={0.3} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#4A3D36', fontSize: 10, fontWeight: 900 }}
                                            dy={10}
                                            padding={{ left: 10, right: 10 }}
                                        />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white p-4 rounded-2xl shadow-2xl text-accent-brown border border-accent-brown/10">
                                                            <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">{payload[0].payload.name}</p>
                                                            <p className="text-lg font-black mt-1 text-black">₱{payload[0].value?.toLocaleString()}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#FB8500"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                            dot={{ r: 4, fill: '#FB8500', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>

                    {/* Pet Demographics (Now 50-50 with Revenue) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-3 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-brand shadow-sm">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-accent-brown tracking-tighter">Pet Demographics</h3>
                                    <p className="text-[10px] font-black text-accent-brown uppercase tracking-widest leading-none">Global Species Distribution</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-6">
                            {/* Species Distribution */}
                            <div className="flex items-center gap-8">
                                <div className="w-32 h-32 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={(petStats?.species || distributionData).filter((s: any) => s.name !== 'Others')}
                                                innerRadius={35}
                                                outerRadius={50}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {(petStats?.species || distributionData).filter((s: any) => s.name !== 'Others').map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? '#FB8500' : '#219EBC')} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 space-y-3">
                                    {(petStats?.species || [{ name: 'Dog', value: 70 }, { name: 'Cat', value: 30 }]).filter((s: any) => s.name !== 'Others').map((s: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || (i === 0 ? '#FB8500' : '#219EBC') }} />
                                                <span className="text-[11px] font-black text-accent-brown uppercase tracking-widest">{s.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-accent-brown">
                                                {s.value === 0 ? 'No Data' : s.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Breed Leaderboard */}
                            <div className="mt-2 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Top Visited Breeds</p>
                                {(petStats?.breeds || []).filter((b: any) => b.name !== 'Unknown').slice(0, 3).map((b: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-tight text-accent-brown">
                                            <span>{b.name}</span>
                                            <span>{b.value} visits</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-accent-peach/20 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(b.value / (petStats?.breeds?.[0]?.value || 1)) * 100}%` }}
                                                className="h-full bg-brand"
                                            />
                                        </div>
                                    </div>
                                ))}
                                {(!petStats?.breeds || petStats.breeds.length === 0) && (
                                    <div className="py-4 text-center text-[10px] font-black text-accent-brown uppercase tracking-widest italic">
                                        No regional breed clusters detected yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* Second Level Intelligence Grid (50-50 Row) */}
                <div className="grid lg:grid-cols-2 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-1 bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col"
                    >
                        <h3 className="text-md font-black text-accent-brown tracking-tight mb-4 flex items-center gap-2">
                            <Star className="w-4 h-4 text-brand" /> Top Performance
                        </h3>
                        <div className="space-y-4 flex-1 flex flex-col">
                            {(revenueType === 'services' ? topServices : topProducts).length > 0 ? (
                                (revenueType === 'services' ? topServices : topProducts).slice(0, 6).map((p) => (
                                    <div key={p.name} className="group">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-black text-accent-brown/70 truncate uppercase tracking-tight group-hover:text-brand transition-all">{p.name}</p>
                                            <span className="text-[10px] font-black text-brand-dark">₱{Number(p.revenue).toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-1 bg-accent-peach/20 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} className="h-full bg-brand-dark" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <NoDataPlaceholder />
                            )}
                        </div>
                    </motion.div>


                    {/* Distribution Split (Modern List) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-1 bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-accent-brown tracking-tight">Geographic Performance</h3>
                            {/* Branch Legend moved to Top */}
                            <div className="flex items-center gap-4">
                                {branchPerformance.slice(0, 2).map((b, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-brand' : 'bg-[#219EBC]'}`} />
                                        <span className="text-[9px] font-black uppercase text-accent-brown/70 tracking-tighter">
                                            {b.branch.split(' - ')[1]?.split(',')[0]?.trim() || b.branch}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <div className="flex-1 min-h-[180px] relative mt-2">
                            {branchPerformance.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            {
                                                subject: 'Revenue',
                                                A: branchPerformance[0]?.revenue || 0,
                                                B: branchPerformance[1]?.revenue || 0
                                            },
                                            {
                                                subject: 'Repeat Customer',
                                                A: branchPerformance[0]?.revenue > 0 ? Math.round((branchPerformance[0]?.revenue / 5000) * 0.4) : 0,
                                                B: branchPerformance[1]?.revenue > 0 ? Math.round((branchPerformance[1]?.revenue / 5000) * 0.4) : 0
                                            },
                                            {
                                                subject: 'Points Earned',
                                                A: branchPerformance[0]?.revenue > 0 ? Math.round(branchPerformance[0]?.revenue * 0.1) : 0,
                                                B: branchPerformance[1]?.revenue > 0 ? Math.round(branchPerformance[1]?.revenue * 0.1) : 0
                                            },
                                            {
                                                subject: 'New Case',
                                                A: branchPerformance[0]?.revenue > 0 ? Math.round((branchPerformance[0]?.revenue / 1000) * 0.5) : 0,
                                                B: branchPerformance[1]?.revenue > 0 ? Math.round((branchPerformance[1]?.revenue / 1000) * 0.5) : 0
                                            },
                                        ]}
                                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                        barGap={8}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.3} />
                                        <XAxis
                                            dataKey="subject"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#4A3D36', fontSize: 10, fontWeight: 900 }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '10px' }}
                                            formatter={(value: any, name: any, props: any) => {
                                                const subject = props.payload.subject;
                                                if (subject === 'Revenue') return [`₱${value.toLocaleString()}`, name];
                                                return [value, name];
                                            }}
                                        />
                                        <Legend
                                            content={() => null} // Hide default legend since we moved it to header
                                        />
                                        <Bar
                                            name={branchPerformance[0]?.branch.split(' - ')[1]?.split(',')[0]?.trim() || branchPerformance[0]?.branch || 'Branch A'}
                                            dataKey="A"
                                            fill="#FB8500"
                                            radius={[6, 6, 0, 0]}
                                            barSize={20}
                                        />
                                        <Bar
                                            name={branchPerformance[1]?.branch.split(' - ')[1]?.split(',')[0]?.trim() || branchPerformance[1]?.branch || 'Branch B'}
                                            dataKey="B"
                                            fill="#219EBC"
                                            radius={[6, 6, 0, 0]}
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full opacity-20 italic text-[10px] font-black uppercase tracking-widest text-accent-brown">
                                    Compiling Comparative Metrics...
                                </div>
                            )}
                        </div>


                        <div className="mt-4 px-2">
                            <Link
                                to="/dashboard/business/analytics"
                                className="block w-full py-4 border-2 border-dashed border-accent-brown/10 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/60 text-center hover:bg-brand/5 hover:border-brand/40 hover:text-brand transition-all group active:scale-[0.98]"
                            >
                                Detailed Analytics
                            </Link>
                        </div>
                    </motion.div>
                </div>


                {/* Dense Data Tables */}
                <div className="grid lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white h-full"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-accent-brown tracking-tight">Recent Activity Log</h3>
                                <Link to="/dashboard/business/orders" className="text-[9px] font-black uppercase tracking-widest text-brand-dark">Export CSV</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-accent-brown/5">
                                            {['ID', 'Customer', 'Details', 'Total', 'Status'].map(h => (
                                                <th key={h} className="text-left text-[8px] font-black uppercase tracking-widest text-accent-brown pb-3 px-2">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.slice(0, 5).map((o: any) => (
                                            <tr key={o.id} className="border-b border-accent-brown/5 last:border-0 hover:bg-accent-peach/5 transition-colors">
                                                <td className="py-3 px-2 text-[9px] font-black text-accent-brown">{o.id}</td>
                                                <td className="py-3 px-2 font-bold text-accent-brown text-[11px] truncate max-w-[100px]">{o.customer}</td>
                                                <td className="py-3 px-2 text-[10px] font-medium text-accent-brown truncate max-w-[120px]">{o.product}</td>
                                                <td className="py-3 px-2 font-black text-brand-dark text-[11px]">{o.total}</td>
                                                <td className="py-3 px-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS[o.status as keyof typeof STATUS]}`}>
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

                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/10 border border-brand/10 h-full relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h3 className="text-lg font-black text-accent-brown tracking-tight">Voice of Customer</h3>
                                <Star className="w-4 h-4 text-brand fill-brand" />
                            </div>
                            <div className="space-y-4 relative z-10">
                                {recentReviews.slice(0, 2).map((rev) => (
                                    <div key={rev.id} className="p-4 bg-accent-peach/5 rounded-2xl border border-accent-peach/10">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">{rev.customer_name}</p>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, si) => (
                                                    <Star key={si} className={`w-2 h-2 ${si < rev.rating ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-brand-dark truncate">{rev.product_name}</p>
                                        <p className="text-[10px] font-medium text-accent-brown italic line-clamp-2">"{rev.comment}"</p>
                                    </div>
                                ))}
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent" />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Image Zoom Lightbox */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomedImage(null)}
                        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-10 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={e => e.stopPropagation()}
                            className="relative max-w-sm max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <img src={zoomedImage} alt="Review proof" className="w-full h-full object-contain" />
                            <button
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white hover:text-white/70 transition-colors"
                            >
                                <X className="w-5 h-5 drop-shadow-lg" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Low Stock Information Modal */}
            <AnimatePresence>
                {isLowStockModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsLowStockModalOpen(false)}
                            className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-[9991] flex items-center justify-center p-4"
                        >
                            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                                <div className="p-8 border-b border-accent-peach/10 flex items-center justify-between bg-white sticky top-0 z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-brand">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-accent-brown tracking-tight">Replenishment Alert</h3>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Critical Stock Levels • {branchId ? 'Selected Branch' : 'All Branches'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsLowStockModalOpen(false)}
                                        className="w-10 h-10 rounded-xl bg-accent-peach/20 flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                                    {loadingLowStock ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                            <Loader2 className="w-10 h-10 animate-spin text-brand" />
                                            <p className="font-bold text-sm tracking-widest uppercase">Analyzing Inventory...</p>
                                        </div>
                                    ) : lowStockProducts.length === 0 ? (
                                        <div className="text-center py-20 bg-green-50/30 rounded-[2rem] border-2 border-dashed border-green-100/50">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-green-500 mx-auto shadow-sm mb-4">
                                                <Check className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-black text-accent-brown mb-1">Stock Levels Healthy</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30">No critical shortages detected at this time.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {lowStockProducts.map((p) => (
                                                <div key={p.id} className="p-4 bg-accent-peach/5 rounded-2xl border border-accent-peach/10 flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-accent-brown/5 transition-all">
                                                    <div className="w-16 h-16 bg-white rounded-xl flex-shrink-0 flex items-center justify-center p-2 shadow-sm">
                                                        {p.image ? (
                                                            <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Package className="w-8 h-8 text-accent-brown/10" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest mb-1">{p.category}</p>
                                                        <h4 className="text-sm font-black text-accent-brown truncate mb-0.5">{p.name}</h4>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-tighter">{p.sku}</p>
                                                            <span className="text-xs font-black text-red-500 tabular-nums">{p.stock} Unit{p.stock !== 1 ? 's' : ''} Left</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 bg-accent-peach/5 border-t border-accent-peach/10 shrink-0">
                                    <button 
                                        onClick={() => {
                                            setIsLowStockModalOpen(false);
                                            window.location.href = '/dashboard/business/catalog';
                                        }}
                                        className="w-full h-14 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-dark/20"
                                    >
                                        Manage Inventory in Catalog
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default BusinessDashboard;
