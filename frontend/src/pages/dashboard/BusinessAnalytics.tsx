import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingBag, Award, ArrowUp, ArrowDown, LayoutGrid, Package } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const TIER_COLOR: Record<string, string> = {
    Bronze: 'bg-orange-400', Silver: 'bg-slate-400', Gold: 'bg-yellow-400', Platinum: 'bg-cyan-400',
};

const ICON_MAP: Record<string, any> = { TrendingUp, Users, ShoppingBag, Award, LayoutGrid, Package };

const BusinessAnalytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [kpiList, setKpiList] = useState<any[]>([]);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loyaltyRedemptions, setLoyaltyRedemptions] = useState<any[]>([]);
    const [retentionRate, setRetentionRate] = useState(0);
    const [retentionChange, setRetentionChange] = useState('');

    useEffect(() => {
        if (user?.token) {
            fetchAnalytics();
        }
    }, [user?.token]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const resp = await fetch('http://localhost:8000/api/business/dashboard/analytics', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await resp.json();
            setKpiList(data.kpis);
            setRevenueTrend(data.revenue_trend);
            setTopProducts(data.top_products);
            setLoyaltyRedemptions(data.loyalty_redemptions);
            setRetentionRate(data.retention_rate);
            setRetentionChange(data.retention_change);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const maxRev = revenueTrend.length > 0 ? Math.max(...revenueTrend.map(d => d.value)) : 0;

    return (
        <DashboardLayout title="Analytics">
            <div className="space-y-8">

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
                                className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col gap-4">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.color}`}><Icon className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none mb-1">{k.value}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{k.label}</p>
                                    <div className={`flex items-center gap-1 mt-1 text-[10px] font-black ${k.up ? 'text-green-600' : 'text-red-500'}`}>
                                        {k.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {k.change} vs last period
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Revenue Trend - tall chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight">Revenue Trend</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mt-1">Last 6 months · in thousands ₱</p>
                            </div>
                            <span className="bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +21%
                            </span>
                        </div>
                        <div className="flex items-end gap-4 h-56">
                            {loading ? (
                                <div className="w-full flex items-center justify-center opacity-30">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : revenueTrend.map((d, i) => (
                                <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-[9px] font-black text-accent-brown/40">₱{(d.value/1000).toFixed(0)}k</span>
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / maxRev) * 100}%` }} transition={{ duration: 0.7, delay: 0.4 + i * 0.07 }}
                                        className={`w-full rounded-2xl ${i === revenueTrend.length - 1 ? 'bg-gradient-to-t from-brand-dark to-brand' : 'bg-accent-peach/70'}`} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">{d.month}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Loyalty Redemptions Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col">
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-2">Loyalty Redemptions</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-8">
                            Breakdown by tier · {loyaltyRedemptions.reduce((acc, r) => acc + r.count, 0)} total
                        </p>
                        <div className="space-y-5 flex-1">
                            {loyaltyRedemptions.map(r => (
                                <div key={r.tier}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${TIER_COLOR[r.tier]}`} />
                                            <span className="text-xs font-black text-accent-brown">{r.tier}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-accent-brown/50">{r.count} redeemed</span>
                                    </div>
                                    <div className="w-full h-2 bg-accent-peach/30 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.6, delay: 0.5 }}
                                            className={`h-full rounded-full ${TIER_COLOR[r.tier]}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-accent-brown/5 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Customer Retention</p>
                            <p className="text-5xl font-black text-accent-brown tracking-tighter mt-1">{retentionRate}%</p>
                            <p className="text-[10px] font-bold text-green-600 mt-1">{retentionChange}</p>
                        </div>
                    </motion.div>
                </div>

                {/* Top Products table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white">
                    <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Top Products by Revenue</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr className="border-b border-accent-brown/5">
                                    {['Product', 'Units Sold', 'Revenue', 'Change', 'Share'].map(h => (
                                        <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-accent-brown/30 pb-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center opacity-30">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] uppercase font-black">Loading performance data...</p>
                                        </td>
                                    </tr>
                                ) : topProducts.map((p, i) => (
                                    <tr key={p.name} className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors">
                                        <td className="py-4 font-bold text-accent-brown text-sm">{p.name}</td>
                                        <td className="py-4 text-sm font-black text-accent-brown/60">{p.sold}</td>
                                        <td className="py-4 font-black text-accent-brown">{p.revenue}</td>
                                        <td className="py-4">
                                            <span className={`flex items-center gap-1 text-[10px] font-black ${p.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {p.delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {Math.abs(p.delta)}%
                                            </span>
                                        </td>
                                        <td className="py-4 w-36">
                                            <div className="w-full h-1.5 bg-accent-peach/30 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                                                    className="h-full bg-brand-dark rounded-full" />
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
