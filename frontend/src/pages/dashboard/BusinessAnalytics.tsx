import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingBag, Award, ArrowUp, ArrowDown, LayoutGrid, Package, ChevronRight, MapPin, BarChart2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar } from 'recharts';
import BranchSelector from '../../components/BranchSelector';

const ICON_MAP: Record<string, any> = { TrendingUp, Users, ShoppingBag, Award, LayoutGrid, Package };

const BusinessAnalytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [branchId, setBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (saved === 'all') return null;
        return saved ? parseInt(saved) : null;
    });
    const [kpiList, setKpiList] = useState<any[]>([]);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topServices, setTopServices] = useState<any[]>([]);
    const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
    const [retentionRate, setRetentionRate] = useState(0);
    const [retentionChange, setRetentionChange] = useState('');
    const [distributionData, setDistributionData] = useState<any[]>([]);

    const [revenueType, setRevenueType] = useState('all');

    useEffect(() => {
        if (user?.token) {
            fetchAnalytics();
        }
    }, [user?.token, revenueType, branchId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            let url = `http://localhost:8000/api/business/dashboard/analytics?data_type=${revenueType}`;
            if (branchId) url += `&branch_id=${branchId}`;
            
            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await resp.json();
            setKpiList(data.kpis || []);
            setRevenueTrend(data.revenue_trend?.chartData || []);
            setTopProducts(data.top_products || []);
            setTopServices(data.top_services || []);
            setBranchPerformance(data.branch_performance || []);
            setRetentionRate(data.retention_rate || 0);
            setRetentionChange(data.retention_change || '');
            setDistributionData(data.distribution_data || []);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentBranchInfo = branchPerformance.find(b => b.id === branchId || b.branch_id === branchId);

    return (
        <DashboardLayout 
            title="Business Analytics" 
            branchContext={branchId ? { id: branchId, name: currentBranchInfo?.branch || 'Branch', address: currentBranchInfo?.address } : undefined}
        >
            <div className="space-y-12">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/40">Performance Cycle</span>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-accent-brown uppercase tracking-tighter">Real-time Analytics</h2>
                            {kpiList.some(k => k.change.includes('(30d Snapshot)')) && (
                                <span className="bg-brand/10 text-brand-dark px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse border border-brand/20">
                                    Snapshot Active (Last 30D)
                                </span>
                            )}
                        </div>
                    </div>
                    {user?.token && <BranchSelector token={user.token} onBranchChange={setBranchId} currentBranchId={branchId} allowAllBranches={true} />}
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {loading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white h-32 animate-pulse" />
                        ))
                    ) : kpiList.map((k, i) => {
                        const Icon = ICON_MAP[k.icon] || TrendingUp;
                        return (
                            <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col gap-4 group hover:shadow-2xl hover:shadow-accent-brown/10 transition-all border-accent-brown/0 hover:border-accent-brown/5">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.color} shadow-lg shadow-current/10 transition-transform group-hover:scale-110`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none mb-1">{k.value}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{k.label}</p>
                                    <div className={`flex items-center gap-1 mt-1 text-[10px] font-black ${k.up ? 'text-green-600' : 'text-red-500'}`}>
                                        {k.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {k.change}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Revenue Trend - tall chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white relative overflow-hidden group">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight">Revenue Trend</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mt-1">Real-time performance cycle</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 bg-accent-brown/5 p-1.5 rounded-2xl">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'products', label: 'Products' },
                                        { id: 'services', label: 'Services' },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setRevenueType(type.id)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                revenueType === type.id 
                                                ? 'bg-brand-dark text-white shadow-lg shadow-brand/20' 
                                                : 'text-accent-brown/40 hover:text-accent-brown'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full mt-4">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Aggregating Sales...</p>
                                </div>
                            ) : revenueTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart 
                                        data={revenueTrend}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FB8500" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#FB8500" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.3} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#8D6E63', fontSize: 10, fontWeight: 800 }}
                                            dy={15}
                                        />
                                        <YAxis 
                                            hide={true}
                                            domain={['dataMin', 'auto']}
                                        />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border-2 border-accent-brown/5 shadow-2xl">
                                                            <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest mb-1">
                                                                {payload[0].payload.name}
                                                            </p>
                                                            <p className="text-xl font-black text-accent-brown tracking-tighter">
                                                                ₱{payload[0].value?.toLocaleString()}
                                                            </p>
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
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Trend Data Found</p>
                                </div>
                            )}
                        </div>
                        {/* Decorative element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                    </motion.div>

                    {/* Branch Performance Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col relative overflow-hidden">
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-2">Branch Performance</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-8">
                            Revenue distribution by location
                        </p>
                        <div className="space-y-6 flex-1 relative z-10">
                            {(branchId ? branchPerformance.filter(b => b.id === branchId || b.branch_id === branchId) : branchPerformance).map((b, i) => (
                                <div key={b.branch} className="group/item">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-accent-peach/20 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-brand-dark" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-black text-accent-brown block leading-none">{b.branch}</span>
                                                <span className="text-[9px] font-bold text-accent-brown/30">₱{b.revenue.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-brand-dark bg-brand/10 px-2 py-1 rounded-lg">{b.pct}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-accent-peach/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                                            className="h-full rounded-full bg-brand-dark shadow-sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-accent-brown/5 text-center relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 flex items-center justify-center gap-1">
                                Customer Health <ChevronRight className="w-3 h-3" />
                            </p>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <div>
                                    <p className="text-4xl font-black text-accent-brown tracking-tighter">{retentionRate}%</p>
                                    <p className="text-[9px] font-bold text-green-600 mt-0.5">{retentionChange}</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-accent-peach/5 to-transparent pointer-events-none" />
                    </motion.div>

                    {/* Operations Mix - Pie Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col relative overflow-hidden">
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-2">Operations Mix</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-8">
                            Volume ratio: Products vs Services
                        </p>
                        <div className="h-48 w-full relative z-10">
                            {loading ? (
                                <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-accent-brown/20" /></div>
                            ) : distributionData.length > 0 && distributionData.some(d => d.value > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={distributionData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white px-3 py-2 rounded-xl shadow-xl border border-accent-brown/5">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">{payload[0].name}</p>
                                                            <p className="text-sm font-black text-accent-brown">{payload[0].value} units</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <BarChart2 className="w-8 h-8 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-center">No Data Available</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center gap-6 mt-6 pb-2">
                            {distributionData.map((d) => (
                                <div key={d.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-[10px] font-black text-accent-brown uppercase tracking-widest opacity-60">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Service Performance - Bar Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
                        className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col relative overflow-hidden">
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-2">Service Performance</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-8">
                            Top performing services by completed sessions
                        </p>
                        <div className="flex-1 w-full min-h-[250px] relative z-10">
                            {loading ? (
                                <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-accent-brown/20" /></div>
                            ) : topServices?.length > 0 && topServices[0]?.name !== "No services yet" ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topServices} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#EAE0D5" opacity={0.3} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#8D6E63', fontSize: 10, fontWeight: 800 }} width={120} />
                                        <RechartsTooltip 
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white px-3 py-2 rounded-xl shadow-xl border border-accent-brown/5">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">{payload[0].payload.name}</p>
                                                            <p className="text-sm font-black text-accent-brown">{payload[0].value} sessions</p>
                                                            <p className="text-[10px] font-bold text-accent-brown/30 mt-1">Revenue: {payload[0].payload.revenue}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="sold" fill="#219EBC" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1500}>
                                            {topServices.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? "#FFB703" : "#219EBC"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <BarChart2 className="w-8 h-8 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-center">No Data Available</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Top Products table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-accent-brown tracking-tight">
                                Product Sales
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mt-1">Sorted by total revenue contribution</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr className="border-b border-accent-brown/5">
                                    {[revenueType === 'services' ? 'Service' : 'Product', revenueType === 'services' ? 'Sessions' : 'Units Sold', 'Revenue', 'Change', 'Growth'].map(h => (
                                        <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-accent-brown/30 pb-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center opacity-30">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] uppercase font-black">Decrypting performance data...</p>
                                        </td>
                                    </tr>
                                ) : topProducts.map((p, i) => (
                                    <tr key={p.name} className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors group">
                                        <td className="py-5">
                                            <div className="font-black text-accent-brown text-sm group-hover:text-brand-dark transition-colors">{p.name}</div>
                                        </td>
                                        <td className="py-5 text-sm font-black text-accent-brown/40">{p.sold}</td>
                                        <td className="py-5 font-black text-accent-brown">{p.revenue}</td>
                                        <td className="py-5">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${p.delta >= 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                                                {p.delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {Math.abs(p.delta)}%
                                            </span>
                                        </td>
                                        <td className="py-5 w-48">
                                            <div className="w-full h-1.5 bg-accent-peach/20 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                                                    className="h-full bg-brand-dark rounded-full shadow-sm" />
                                            </div>
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

export default BusinessAnalytics;
