import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingBag, Award, ArrowUp, ArrowDown } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const revenue = [42, 58, 51, 67, 73, 89];
const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const maxRev = Math.max(...revenue);

const topProducts = [
    { name: 'Premium Dog Food 5kg', revenue: 176080, sold: 142, pct: 100, delta: 12 },
    { name: 'Cat Vitamin Complex', revenue: 56840, sold: 98, pct: 69, delta: 7 },
    { name: 'Grooming Accessory Set', revenue: 68080, sold: 74, pct: 52, delta: -3 },
    { name: 'Dental Chew Pack', revenue: 20740, sold: 61, pct: 43, delta: 5 },
    { name: 'Organic Salmon 12lb', revenue: 10440, sold: 6, pct: 20, delta: -8 },
];

const redemptions = [
    { tier: 'Bronze', count: 14, pct: 37 },
    { tier: 'Silver', count: 11, pct: 29 },
    { tier: 'Gold', count: 9, pct: 24 },
    { tier: 'Platinum', count: 4, pct: 10 },
];

const TIER_COLOR: Record<string, string> = {
    Bronze: 'bg-orange-400', Silver: 'bg-slate-400', Gold: 'bg-yellow-400', Platinum: 'bg-cyan-400',
};

const kpis = [
    { label: 'Total Revenue', value: '₱380k', change: '+21%', up: true, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'Total Customers', value: '318', change: '+8%', up: true, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Units Sold', value: '1,284', change: '+15%', up: true, icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
    { label: 'Loyalty Redeemed', value: '38', change: '-5%', up: false, icon: Award, color: 'bg-purple-50 text-purple-600' },
];

const BusinessAnalytics = () => {
    return (
        <DashboardLayout title="Analytics">
            <div className="space-y-8">

                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {kpis.map((k, i) => (
                        <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col gap-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.color}`}><k.icon className="w-5 h-5" /></div>
                            <div>
                                <p className="text-3xl font-black text-accent-brown tracking-tighter leading-none mb-1">{k.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{k.label}</p>
                                <div className={`flex items-center gap-1 mt-1 text-[10px] font-black ${k.up ? 'text-green-600' : 'text-red-500'}`}>
                                    {k.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {k.change} vs last period
                                </div>
                            </div>
                        </motion.div>
                    ))}
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
                            {revenue.map((v, i) => (
                                <div key={months[i]} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-[9px] font-black text-accent-brown/40">₱{v}k</span>
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(v / maxRev) * 100}%` }} transition={{ duration: 0.7, delay: 0.4 + i * 0.07 }}
                                        className={`w-full rounded-2xl ${i === revenue.length - 1 ? 'bg-gradient-to-t from-brand-dark to-brand' : 'bg-accent-peach/70'}`} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">{months[i]}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Loyalty Redemptions Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col">
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-2">Loyalty Redemptions</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-8">Breakdown by tier · 38 total</p>
                        <div className="space-y-5 flex-1">
                            {redemptions.map(r => (
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
                            <p className="text-5xl font-black text-accent-brown tracking-tighter mt-1">86%</p>
                            <p className="text-[10px] font-bold text-green-600 mt-1">↑ 4pts vs last month</p>
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
                                {topProducts.map((p, i) => (
                                    <tr key={p.name} className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors">
                                        <td className="py-4 font-bold text-accent-brown text-sm">{p.name}</td>
                                        <td className="py-4 text-sm font-black text-accent-brown/60">{p.sold}</td>
                                        <td className="py-4 font-black text-accent-brown">₱{p.revenue.toLocaleString()}</td>
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
