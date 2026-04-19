import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, Users, ShoppingBag, Award, ArrowUp, ArrowDown,
    LayoutGrid, Package, ChevronRight, MapPin, BarChart2,
    Activity, Zap, Globe, Star, Wallet, Calendar, HeartPulse,
    Eye, ShoppingCart, DollarSign
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import BranchSelector from '../../components/BranchSelector';
import Sparkline from '../../components/Sparkline';


const ICON_MAP: Record<string, any> = { TrendingUp, Users, ShoppingBag, Award, LayoutGrid, Package, Activity, Zap, Globe, Star, Wallet, Calendar, HeartPulse, Eye, ShoppingCart, DollarSign };

const BusinessAnalytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [branchId, setBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (saved === 'all') return null;
        return saved ? parseInt(saved) : null;
    });

    // Analytics States
    const [kpiList, setKpiList] = useState<any[]>([]);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topServices, setTopServices] = useState<any[]>([]);
    const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
    const [allBranchesTrend, setAllBranchesTrend] = useState<any[]>([]);

    // Intelligence States
    const [petStats, setPetStats] = useState<any>(null);
    const [marketMatrix, setMarketMatrix] = useState<any[]>([]);
    const [serviceDNA, setServiceDNA] = useState<any[]>([]);
    const [retentionRate, setRetentionRate] = useState(0);
    const [retentionChange, setRetentionChange] = useState('');

    const [revenueType, setRevenueType] = useState('all');
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

    useEffect(() => {
        if (user?.token) {
            fetchAnalytics();
        }
    }, [user?.token, revenueType, branchId, revenuePeriod]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            let url = `http://localhost:8000/api/business/dashboard/analytics?data_type=${revenueType}&period=${revenuePeriod}`;
            if (branchId) url += `&branch_id=${branchId}`;

            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await resp.json();

            setKpiList(data.kpis || []);
            setRevenueTrend(data.revenue_trend?.chartData || []);
            setComparisonData(data.comparison_data || []);
            setDistributionData(data.distribution_data || []);
            setTopProducts(data.top_products || []);
            setTopServices(data.top_services || []);
            setBranchPerformance(data.branch_performance || []);
            
            // Filter and rename branches for the comparison chart
            const rawBranchesTrend = data.all_branches_trend || [];
            const filteredBranchesTrend = rawBranchesTrend.map((item: any) => {
                const newItem: any = { name: item.name };
                
                // Map Branch 7 -> Main Branch, or keep Main Branch if already named that way
                if (item['Branch 7'] !== undefined) {
                    newItem['Main Branch'] = item['Branch 7'];
                } else if (item['Main Branch'] !== undefined) {
                    newItem['Main Branch'] = item['Main Branch'];
                }

                // Keep any branch containing "Ruby"
                Object.keys(item).forEach(k => {
                    if (k.toLowerCase().includes('ruby')) {
                        // Rename nicely if it's truncated or just use the existing key if preferred
                        newItem['Ruby St. Branch'] = item[k]; 
                    }
                });

                return newItem;
            });
            setAllBranchesTrend(filteredBranchesTrend);

            setPetStats(data.pet_stats || null);
            setMarketMatrix(data.market_matrix || []);
            setServiceDNA(data.service_dna || []);
            setRetentionRate(data.retention_rate || 0);
            setRetentionChange(data.retention_change || '');

        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentBranchInfo = branchPerformance.find(b => b.id === branchId || b.branch_id === branchId);

    // Simplification Mappings
    const chartColors = {
        primary: '#FB8500', // Brand Orange
        secondary: '#219EBC', // Sky Blue
        neutral: '#8D6E63', // Slate Brown
        comparison: '#64748B', // Slate Blue (Modified for better contrast)
        success: '#10B981',
        danger: '#EF4444'
    };

    return (
        <DashboardLayout title="Business Analytics">
            <div className="space-y-8 pb-10">

                {/* Header Controls (Branch Selector & Period) */}
                <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                    <div className="bg-white p-1 rounded-xl border border-accent-brown/5 shadow-sm flex items-center gap-1">
                        {['7d', '30d', '6m', '1y'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setRevenuePeriod(p)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${revenuePeriod === p
                                        ? 'bg-brand text-white shadow-md'
                                        : 'text-accent-brown/40 hover:bg-slate-50'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    {user?.token && <BranchSelector token={user.token} onBranchChange={setBranchId} currentBranchId={branchId} allowAllBranches={true} />}
                </div>

                

                {/* Section 1: Key Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(kpiList.length > 0 ? kpiList : [
                        { label: 'Total Earnings', value: '₱0', change: '+0%', icon: 'Wallet', sub: 'Gross Revenue' },
                        { label: 'Total Patients', value: '0', change: 'Stable', icon: 'HeartPulse', sub: 'Unique Pets' },
                        { label: 'Booking Success', value: '0', change: 'Real-time', icon: 'Calendar', sub: 'Confirmed visits' },
                        { label: 'Brand Loyalty', value: '0', change: 'Healthy', icon: 'Star', sub: 'Repeat Customers' }
                    ]).map((k, i) => {
                        const Icon = ICON_MAP[k.icon] || Zap;
                        const isRevenue = k.label.toLowerCase().includes('revenue') || k.label.toLowerCase().includes('earnings');
                        const isFeedback = k.label.toLowerCase().includes('feedback') || k.label.toLowerCase().includes('loyalty');

                        return (
                            <motion.div
                                key={k.label}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className={`bg-white p-7 rounded-[2rem] border transition-all group ${isRevenue ? 'border-brand/40 shadow-xl shadow-brand/5' : 'border-accent-brown/5 shadow-sm hover:shadow-xl hover:border-brand/20'}`}
                            >
                                <div className="mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isRevenue ? 'bg-brand/10 text-brand' : 'bg-slate-50 text-accent-brown group-hover:bg-brand group-hover:text-white'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">{k.label}</p>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-3xl font-black text-accent-brown tracking-tighter transition-transform group-hover:scale-105 origin-left">
                                            {k.value}
                                        </h3>
                                        {isFeedback && <span className="text-xl text-brand group-hover:animate-pulse">★</span>}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-50/50">
                                    <p className="text-[10px] font-black text-accent-brown uppercase italic opacity-60 tracking-tight">
                                        {k.change}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Section 2: Earnings & Growth */}
                <div className="w-full">
                    {/* Main Sales Trend */}
                    <div className="w-full">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-accent-brown tracking-tight">Earnings Trend</h3>
                                    <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">Revenue performance over time</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-brand shadow-lg" />
                                    <span className="text-[10px] font-black text-accent-brown tracking-tight">Earnings (₱)</span>
                                </div>
                            </div>
                            <div className="h-[300px] w-full" >
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueTrend}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}
                                            formatter={(val: any) => [`₱${val.toLocaleString()}`, 'Earnings']}
                                        />
                                        <Area type="monotone" dataKey="value" stroke={chartColors.primary} strokeWidth={6} fillOpacity={1} fill="url(#colorRev)"  />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Popular Items & Services */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Operations Mix */}
                    <div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-accent-brown tracking-tight">Sales Breakdown</h3>
                                <ShoppingCart className="w-5 h-5 text-accent-brown/20" />
                            </div>
                            <div className="h-[250px] w-full flex items-center" >
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={distributionData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={[chartColors.primary, chartColors.secondary, chartColors.neutral, chartColors.comparison][index % 4]}  />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Regional Contribution */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-accent-brown tracking-tight">Sales by Branch</h3>
                            <MapPin className="w-5 h-5 text-accent-brown/20" />
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchPerformance} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} width={100} />
                                    <Tooltip />
                                    <Bar dataKey="revenue" fill={chartColors.primary} radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Section 4: Patient Insights */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Species Pie */}
                    <div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                            <h3 className="text-lg font-black text-accent-brown tracking-tight mb-1">What Pets?</h3>
                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest mb-6">Patient species mix</p>
                            <div className="h-[200px] w-full" >
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={petStats?.species?.slice(0, 3) || [{ name: 'Dog', value: 70 }, { name: 'Cat', value: 30 }]}
                                            dataKey="value"
                                            outerRadius={80}
                                            stroke="none"
                                        >
                                            <Cell fill={chartColors.primary}  />
                                            <Cell fill={chartColors.secondary}  />
                                            <Cell fill={chartColors.neutral}  />
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {(petStats?.species || [{ name: 'Dog', value: 70 }, { name: 'Cat', value: 30 }]).slice(0, 3).map((s: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: [chartColors.primary, chartColors.secondary, chartColors.neutral][idx] }} />
                                        <span className="text-[10px] font-bold text-accent-brown uppercase">{s.name} ({s.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Breed Leaderboard */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                            <h3 className="text-lg font-black text-accent-brown tracking-tight mb-1">Top Breeds</h3>
                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest mb-6">Most frequent clinical visitors</p>
                            <div className="h-[250px] w-full" >
                                {petStats?.breeds ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={petStats.breeds.slice(0, 5)} layout="vertical">
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} width={120} />
                                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                            <Bar dataKey="value" fill={chartColors.primary} radius={[0, 6, 6, 0]} barSize={24}  />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center opacity-20"><Activity className="w-10 h-10" /></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 5: Feedback & Satisfaction (The simplified Radars) */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Market Matrix -> Feedback Bar */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight">Product Reviews</h3>
                                <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">Average rating per product</p>
                            </div>
                            <Star className="w-5 h-5 text-brand fill-brand" />
                        </div>
                        <div className="h-[250px] w-full flex items-center justify-center">
                            {marketMatrix.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={marketMatrix} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                                        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                                        <Tooltip />
                                        <Bar dataKey="A" name="Rating" fill={chartColors.secondary} radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center opacity-20">
                                    <Star className="w-10 h-10 mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Reviews Recorded</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service DNA -> Popular Services Bar */}
                    <div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-accent-brown tracking-tight">Popular Services</h3>
                                    <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">Which services are most used?</p>
                                </div>
                                <Activity className="w-5 h-5 text-brand" />
                            </div>
                            <div className="h-[250px] w-full flex items-center justify-center" >
                                {serviceDNA.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={serviceDNA} margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                            <Bar dataKey="value" name="Usage" fill={chartColors.primary} radius={[6, 6, 0, 0]} barSize={36}  />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center opacity-20">
                                        <Activity className="w-10 h-10 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Service Usage</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 6: Retention & Performance Sync */}
                <div className="grid lg:grid-cols-2 gap-6 items-stretch">
                    {/* Top Products Rankings */}
                    <div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <Star className="w-5 h-5 text-brand" />
                                <h3 className="text-xl font-black text-accent-brown tracking-tighter">Top Performance</h3>
                            </div>
                            <div className="flex flex-col gap-6 flex-1 justify-center relative">
                                {topProducts.length > 0 ? topProducts.slice(0, 6).map((product, index) => (
                                    <div key={index} className="flex flex-col gap-1.5 w-full">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-accent-brown uppercase tracking-widest leading-none">
                                                {product.name}
                                            </span>
                                            <span className="text-[11px] font-black text-brand leading-none">
                                                ₱{Number(product.revenue).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-brand/5 h-1 relative overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${product.pct}%` }}
                                                transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                                                className="absolute inset-y-0 left-0 bg-brand"
                                            />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center opacity-20 absolute inset-0">
                                        <Star className="w-10 h-10 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Data</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Regional Correlation Line Chart */}
                    <div className="w-full h-full flex">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-accent-brown/5 shadow-sm w-full">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-accent-brown tracking-tight">Branch Comparison</h3>
                                    <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">How all branches sync over time</p>
                                </div>
                            </div>
                            <div className="h-[250px] w-full flex items-center justify-center" >
                                {allBranchesTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={allBranchesTrend}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                                            <YAxis hide />
                                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                            {Object.keys(allBranchesTrend[0]).filter(k => k !== 'name').map((key, idx) => (
                                                <Line
                                                    key={idx}
                                                    type="monotone"
                                                    dataKey={key}
                                                    stroke={[chartColors.primary, chartColors.secondary, chartColors.neutral, '#8b5cf6'][idx % 4]}
                                                    strokeWidth={6}
                                                    dot={false}
                                                    
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center opacity-20">
                                        <Globe className="w-10 h-10 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Comparative Data</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default BusinessAnalytics;




