import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
    const shouldReduceMotion = useReducedMotion();
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

    const fallbackKpis = [
        { label: 'Business Revenue', value: '₱0', change: '0 Orders', icon: 'Wallet', sub: 'Gross Revenue' },
        { label: 'Clinic Services', value: '₱0', change: '0 Appts', icon: 'LayoutGrid', sub: 'Confirmed visits' },
        { label: 'Inventory Status', value: '0', change: 'In Stock', icon: 'Package', sub: 'Active Products' },
        { label: 'Brand Loyalty', value: '0', change: 'Repeat Clients', icon: 'Star', sub: 'Client Health' }
    ];
    const displayKpis = kpiList.length > 0 ? kpiList : fallbackKpis;

    return (
        <DashboardLayout title="Reports">
            <div className="w-full max-w-[1280px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">

                {/* Visually hidden heading for a11y */}
                <h1 className="sr-only">Reports</h1>

                {/* Header Controls (Branch Selector & Period) */}
                <div className="bg-white p-3 sm:p-4 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    {/* Period Selector: 4 equal parts, min 48px height, 44px touch target */}
                    <div
                        role="radiogroup"
                        aria-label="Reporting period"
                        className="w-full sm:w-auto flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 min-h-[48px] h-12"
                    >
                        {[
                            { id: '7d', label: '7D' },
                            { id: '30d', label: '30D' },
                            { id: '6m', label: '6M' },
                            { id: '1y', label: '1Y' },
                        ].map((p) => {
                            const isSelected = revenuePeriod === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    onClick={() => setRevenuePeriod(p.id)}
                                    className={`flex-1 sm:flex-initial sm:px-5 h-full rounded-xl text-sm font-bold tracking-normal transition-all flex items-center justify-center min-w-[44px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                        isSelected
                                            ? 'bg-brand text-white shadow-sm font-black'
                                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Branch Selector: Full width on phones, 280px-340px on tablets/desktop */}
                    {user?.token && (
                        <div className="w-full sm:w-[280px] md:w-[320px] shrink-0">
                            <BranchSelector
                                token={user.token}
                                onBranchChange={setBranchId}
                                currentBranchId={branchId}
                                allowAllBranches={true}
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-brand" />
                        <p className="text-sm font-bold uppercase tracking-wider text-slate-600">Loading reports & analytics...</p>
                    </div>
                ) : (
                    <>
                        {/* Section 1: Key Numbers (2 rows of 2 on mobile/tablet, 4 columns on desktop) */}
                        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 items-stretch">
                            {displayKpis.map((k, i) => {
                                const Icon = ICON_MAP[k.icon] || Zap;
                                const isRevenue = i === 0 || k.label.toLowerCase().includes('revenue') || k.label.toLowerCase().includes('earnings');
                                const isFeedback = k.label.toLowerCase().includes('feedback') || k.label.toLowerCase().includes('loyalty');

                                return (
                                    <motion.div
                                        key={k.label}
                                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className={`bg-white p-3.5 sm:p-5 rounded-[20px] transition-all flex flex-col justify-between col-span-1 ${
                                            isRevenue
                                                ? 'border-2 border-brand shadow-sm shadow-brand/10'
                                                : 'border border-accent-brown/10 shadow-sm hover:border-brand/30'
                                        }`}
                                        aria-label={`${k.label}, ${k.value}`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                        isRevenue
                                                            ? 'bg-brand/15 text-brand'
                                                            : 'bg-slate-100 text-accent-brown'
                                                    }`}
                                                    aria-hidden="true"
                                                >
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide leading-tight min-w-0 break-words">
                                                    {k.label}
                                                </p>
                                            </div>

                                            <div className="mt-3 flex items-baseline gap-1.5 min-w-0">
                                                <h3 className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight truncate">
                                                    {k.value}
                                                </h3>
                                                {isFeedback && <span className="text-lg text-brand" aria-hidden="true">★</span>}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 leading-tight break-words">
                                                {k.change || k.sub || 'Updated'}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Section 2: Earnings & Growth */}
                        <div className="w-full">
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm">
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Earnings Trend</h3>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Revenue performance over time</p>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <div className="w-3 h-3 rounded-full bg-brand shadow-sm" aria-hidden="true" />
                                        <span className="text-xs font-bold text-accent-brown">Earnings (₱)</span>
                                    </div>
                                </div>
                                <div className="h-[220px] sm:h-[280px] lg:h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueTrend}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                interval="preserveStartEnd"
                                                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }}
                                            />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' }}
                                                formatter={(val: any) => [`₱${Number(val || 0).toLocaleString()}`, 'Earnings']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={chartColors.primary}
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorRev)"
                                                isAnimationActive={!shouldReduceMotion}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Popular Items & Services */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                            {/* Sales Breakdown */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Sales Breakdown</h3>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Category distribution</p>
                                    </div>
                                    <ShoppingCart className="w-5 h-5 text-accent-brown/30" aria-hidden="true" />
                                </div>
                                <div className="h-[240px] sm:h-[260px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distributionData}
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                                isAnimationActive={!shouldReduceMotion}
                                            >
                                                {distributionData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={[chartColors.primary, chartColors.secondary, chartColors.neutral, chartColors.comparison][index % 4]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                            <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Sales by Branch */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Sales by Branch</h3>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Regional revenue comparison</p>
                                    </div>
                                    <MapPin className="w-5 h-5 text-accent-brown/30" aria-hidden="true" />
                                </div>
                                <div className="h-[240px] sm:h-[260px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={branchPerformance} layout="vertical" margin={{ left: 10, right: 10 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }} width={95} />
                                            <Tooltip formatter={(val: any) => [`₱${Number(val || 0).toLocaleString()}`, 'Revenue']} />
                                            <Bar dataKey="revenue" fill={chartColors.primary} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={!shouldReduceMotion} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Patient Insights */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                            {/* Species Mix */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-accent-brown tracking-tight">What Pets?</h3>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5 mb-4">Patient species mix</p>
                                </div>
                                <div className="h-[190px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={petStats?.species?.slice(0, 3) || [{ name: 'Dog', value: 70 }, { name: 'Cat', value: 30 }]}
                                                dataKey="value"
                                                outerRadius={70}
                                                stroke="none"
                                                isAnimationActive={!shouldReduceMotion}
                                            >
                                                <Cell fill={chartColors.primary} />
                                                <Cell fill={chartColors.secondary} />
                                                <Cell fill={chartColors.neutral} />
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3">
                                    {(petStats?.species || [{ name: 'Dog', value: 70 }, { name: 'Cat', value: 30 }]).slice(0, 3).map((s: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: [chartColors.primary, chartColors.secondary, chartColors.neutral][idx] }} aria-hidden="true" />
                                            <span className="text-xs font-bold text-slate-700 uppercase">{s.name} ({s.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Breed Leaderboard */}
                            <div className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-accent-brown tracking-tight">Top Breeds</h3>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5 mb-4">Most frequent clinical visitors</p>
                                </div>
                                <div className="h-[220px] sm:h-[250px] w-full">
                                    {petStats?.breeds ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={petStats.breeds.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 10 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }} width={110} />
                                                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                                <Bar dataKey="value" fill={chartColors.primary} radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={!shouldReduceMotion} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center opacity-30"><Activity className="w-10 h-10" /></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Feedback & Satisfaction */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                            {/* Product Reviews */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Product Reviews</h3>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Average rating per product</p>
                                    </div>
                                    <Star className="w-5 h-5 text-brand fill-brand" aria-hidden="true" />
                                </div>
                                <div className="h-[220px] sm:h-[250px] w-full flex items-center justify-center">
                                    {marketMatrix.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={marketMatrix} margin={{ left: 10, right: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} />
                                                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} />
                                                <Tooltip />
                                                <Bar dataKey="A" name="Rating" fill={chartColors.secondary} radius={[4, 4, 0, 0]} barSize={26} isAnimationActive={!shouldReduceMotion} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center opacity-30 py-8">
                                            <Star className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Reviews Recorded</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Popular Services */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Popular Services</h3>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Which services are most used?</p>
                                    </div>
                                    <Activity className="w-5 h-5 text-brand" aria-hidden="true" />
                                </div>
                                <div className="h-[220px] sm:h-[250px] w-full flex items-center justify-center">
                                    {serviceDNA.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={serviceDNA} margin={{ left: 10, right: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} />
                                                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                                <Bar dataKey="value" name="Usage" fill={chartColors.primary} radius={[6, 6, 0, 0]} barSize={30} isAnimationActive={!shouldReduceMotion} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center opacity-30 py-8">
                                            <Activity className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Service Usage</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 6: Retention & Performance Sync */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 items-stretch">
                            {/* Top Products Rankings */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm h-full flex flex-col justify-between">
                                <div className="flex items-center gap-2.5 mb-6">
                                    <Star className="w-5 h-5 text-brand" aria-hidden="true" />
                                    <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Top Performance</h3>
                                </div>
                                <div className="flex flex-col gap-4 flex-1 justify-center">
                                    {topProducts.length > 0 ? topProducts.slice(0, 6).map((product, index) => (
                                        <div key={index} className="flex flex-col gap-1.5 w-full">
                                            <div className="flex justify-between items-baseline gap-2">
                                                <span className="text-xs sm:text-sm font-bold text-accent-brown uppercase tracking-wide leading-snug break-words">
                                                    {product.name}
                                                </span>
                                                <span className="text-xs sm:text-sm font-black text-brand shrink-0">
                                                    ₱{Number(product.revenue || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${product.pct || 0}%` }}
                                                    transition={{ duration: shouldReduceMotion ? 0.05 : 0.8, ease: 'easeOut', delay: index * 0.08 }}
                                                    className="h-full bg-brand rounded-full"
                                                />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center opacity-30 py-8">
                                            <Star className="w-10 h-10 mb-2 text-slate-400" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Data Available</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Regional Correlation Line Chart */}
                            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-[20px] border border-accent-brown/10 shadow-sm w-full h-full flex flex-col justify-between">
                                <div className="mb-6">
                                    <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Branch Comparison</h3>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">How all branches sync over time</p>
                                </div>
                                <div className="h-[220px] sm:h-[250px] w-full flex items-center justify-center">
                                    {allBranchesTrend.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={allBranchesTrend} margin={{ left: 10, right: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE0D5" opacity={0.5} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                                                <YAxis hide />
                                                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                                                {Object.keys(allBranchesTrend[0]).filter(k => k !== 'name').map((key, idx) => (
                                                    <Line
                                                        key={idx}
                                                        type="monotone"
                                                        dataKey={key}
                                                        stroke={[chartColors.primary, chartColors.secondary, chartColors.neutral, '#8b5cf6'][idx % 4]}
                                                        strokeWidth={4}
                                                        dot={false}
                                                        isAnimationActive={!shouldReduceMotion}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center opacity-30 py-8">
                                            <Globe className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Comparative Data</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </DashboardLayout>
    );
};

export default BusinessAnalytics;




