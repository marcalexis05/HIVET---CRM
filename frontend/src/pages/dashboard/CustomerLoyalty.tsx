import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { Award, Gift, TrendingUp, Sparkles, Star, Copy, Check, Loader2, AlertCircle, TrendingDown, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { toTitleCase } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Voucher {
    id: string;
    title: string;
    cost: number;
    type: string;
    active: boolean;
}

interface MyVoucher {
    id: number;
    title: string;
    code: string;
    type: string;
    date: string;
}

interface HistoryEntry {
    desc: string;
    points: number;
    date: string;
}

interface LoyaltyData {
    points: number;
    tier: string;
    next_tier: string;
    next_tier_points: number;
    history: HistoryEntry[];
    vouchers: Voucher[];
    my_vouchers: MyVoucher[];
    referral_code: string;
    points_per_peso: number;
    points_per_reservation: number;
}

const TIER_METADATA: Record<string, { gradient: string; color: string }> = {
    'Bronze': { gradient: 'from-[#CD7F32] to-[#8C4A10]', color: 'text-[#CD7F32]' },
    'Silver': { gradient: 'from-[#C0C0C0] to-[#708090]', color: 'text-slate-400' },
    'Gold': { gradient: 'from-[#FFD700] to-[#DAA520]', color: 'text-amber-500' },
    'Platinum': { gradient: 'from-[#E5E4E2] to-[#36454F]', color: 'text-slate-600' }
};

const VOUCHER_COLORS: Record<string, string> = {
    'Product': 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    'Service': 'bg-blue-50 text-blue-600 border border-blue-200',
    'Experience': 'bg-purple-50 text-purple-600 border border-purple-200'
};

const CustomerLoyalty = () => {
    const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmVoucher, setConfirmVoucher] = useState<Voucher | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedVoucher, setCopiedVoucher] = useState<number | null>(null);

    const shouldReduceMotion = useReducedMotion();

    // 3D Card Tilt Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], shouldReduceMotion ? ["0deg", "0deg"] : ["6deg", "-6deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], shouldReduceMotion ? ["0deg", "0deg"] : ["-6deg", "6deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (shouldReduceMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = (mouseX / width) - 0.5;
        const yPct = (mouseY / height) - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const token = localStorage.getItem('hivet_token');
        fetch(`${API}/api/loyalty`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(d => { setLoyalty(d); setLoading(false); })
            .catch(() => { setError('Could not load loyalty data. Is the backend running?'); setLoading(false); });
    }, []);

    const handleRedeem = async () => {
        if (!confirmVoucher || !loyalty) return;
        setRedeeming(true);
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/loyalty/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ voucher_id: confirmVoucher.id }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to redeem');
            }
            const data = await res.json();

            const newMyVoucher: MyVoucher = {
                id: Date.now(),
                title: confirmVoucher.title,
                code: data.voucher.code,
                type: confirmVoucher.type,
                date: new Date().toISOString().split('T')[0]
            };

            setLoyalty(prev => prev ? {
                ...prev,
                points: data.points,
                history: [{ desc: `Voucher Redeemed – ${confirmVoucher.title}`, points: -confirmVoucher.cost, date: new Date().toISOString().split('T')[0] }, ...prev.history],
                vouchers: prev.vouchers.map(v => ({ ...v, active: data.points >= v.cost })),
                my_vouchers: [newMyVoucher, ...prev.my_vouchers]
            } : null);

            showToast(`"${confirmVoucher.title}" redeemed successfully!`);
            setConfirmVoucher(null);
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Redemption failed.', 'error');
        } finally {
            setRedeeming(false);
        }
    };

    const copyCode = (code: string, id: number) => {
        navigator.clipboard.writeText(code);
        setCopiedVoucher(id);
        setTimeout(() => setCopiedVoucher(null), 2000);
    };

    const handleCopyReferral = () => {
        if (!loyalty) return;
        navigator.clipboard.writeText(loyalty.referral_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <DashboardLayout title="">
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-10 h-10 text-accent-brown animate-spin" />
                    <p className="text-xs font-medium text-black">Accessing Rewards Vault...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !loyalty) {
        return (
            <DashboardLayout title="">
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 sm:p-8 flex items-center gap-4 text-red-600 max-w-xl mx-auto my-12">
                    <AlertCircle className="w-8 h-8 shrink-0" />
                    <p className="font-bold text-sm">{error || "Connection Error"}</p>
                </div>
            </DashboardLayout>
        );
    }

    const tierProgress = Math.min(100, Math.round((loyalty.points / (loyalty.next_tier_points || 1)) * 100));
    const currentTierData = TIER_METADATA[loyalty.tier] || TIER_METADATA['Bronze'];

    return (
        <DashboardLayout title="">
            <div className="max-w-[960px] mx-auto space-y-6 sm:space-y-8 pb-28 lg:pb-16 px-3 sm:px-4">

                {/* Toast Notification (Top-4, Accessible & Sleek) */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -16, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl font-bold text-xs sm:text-sm max-w-[90vw] sm:max-w-md ${
                                toast.type === 'success'
                                    ? 'bg-emerald-600 text-white shadow-emerald-900/20'
                                    : 'bg-rose-600 text-white shadow-rose-900/20'
                            }`}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle className="w-4 h-4 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span className="leading-tight">{toast.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hero Membership Card (Compact, Responsive, Professional) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d",
                    }}
                    className="relative rounded-3xl overflow-hidden bg-brand shadow-xl shadow-brand/15 p-4 sm:p-5 md:p-6 lg:p-7 transition-all"
                >
                    {/* Background Subtle Gradient & Star Watermark */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                        <div className={`absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br ${currentTierData.gradient} opacity-[0.18] blur-[120px] rounded-full`} />
                        <div className="absolute -bottom-12 -right-12 p-8 opacity-[0.06]">
                            <Star className="w-64 h-64 text-white" />
                        </div>
                    </div>

                    <div className="relative z-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                        {/* Left Side: Membership Details */}
                        <div className="flex-1 space-y-3 sm:space-y-3.5 min-w-0">
                            {/* Row 1: Tier Icon Tile + Active Membership + Tier Name */}
                            <div className="flex items-center gap-3.5">
                                <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${currentTierData.gradient} p-0.5 shadow-md shadow-black/20`}>
                                    <div className="w-full h-full bg-white/20 backdrop-blur-md rounded-[14px] flex items-center justify-center border border-white/30">
                                        <Award className="w-7 h-7 text-white drop-shadow-sm" aria-hidden="true" />
                                    </div>
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                                        <span className="text-xs font-semibold text-white/90">Active Membership</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm truncate">
                                        {toTitleCase(loyalty.tier)} <span className="text-white">Member</span>
                                    </h1>
                                </div>
                            </div>

                            {/* Row 2: Total Points & Label on One Line */}
                            <div className="flex items-baseline gap-2.5 flex-wrap">
                                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums leading-none drop-shadow-sm">
                                    {loyalty.points.toLocaleString()}
                                </span>
                                <span className="text-sm font-semibold text-white/95 leading-none">Total points</span>
                            </div>

                            {/* Row 3: Description at 14px with Comfortable Line Height */}
                            <p className="text-sm font-medium text-white/95 leading-relaxed max-w-xl">
                                Your loyalty tier is calculated based on your total interaction with Hi-Vet. Continue earning to unlock exclusive rewards and priority clinic services.
                            </p>
                        </div>

                        {/* Right Side: Target Tier Progress Box */}
                        <div className="w-full md:w-[280px] lg:w-[320px] bg-black/15 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/20 shadow-lg flex flex-col gap-3 shrink-0">
                            <div className="flex justify-between items-center gap-2">
                                <div className="min-w-0">
                                    <span className="text-xs font-medium text-white/80 block">Target tier</span>
                                    <h4 className="text-base sm:text-lg font-bold text-white truncate">{toTitleCase(loyalty.next_tier)}</h4>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-lg sm:text-xl font-black text-white tabular-nums leading-none">{tierProgress}%</div>
                                    <span className="text-xs font-semibold text-white/80">Progress</span>
                                </div>
                            </div>

                            {/* Thicker Progress Bar (10px tall, accessible) */}
                            <div
                                className="h-2.5 w-full bg-black/25 rounded-full overflow-hidden shadow-inner border border-white/10"
                                role="progressbar"
                                aria-valuenow={tierProgress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${tierProgress}% of the way to ${toTitleCase(loyalty.next_tier)}`}
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${tierProgress}%` }}
                                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: "circOut" }}
                                    className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                                />
                            </div>

                            {/* Gap to Upgrade Row */}
                            <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between gap-3 border border-white/15">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-white/80 mb-0.5">Gap to upgrade</p>
                                    <p className="text-base font-black text-white tabular-nums leading-none">
                                        {(loyalty.next_tier_points - loyalty.points).toLocaleString()} pts
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20 text-white" aria-hidden="true">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Section 1: Earn Methods (Commerce, Schedules, Network) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {[
                        { title: 'Commerce', pts: 'Per Transaction', icon: TrendingUp, desc: 'Earn points on every pharmaceutical and supply purchase.' },
                        { title: 'Schedules', pts: 'Check-in Bonus', icon: Award, desc: 'Receive points automatically upon completing clinic appointments.' },
                        { title: 'Network', pts: '500 Pts / Referral', icon: Sparkles, desc: 'Receive rewards for growing the Hi-Vet ecosystem.' },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-brand/30 transition-all flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 rounded-xl bg-accent-brown/5 flex items-center justify-center text-accent-brown mb-3">
                                <item.icon className="w-5 h-5 text-brand" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 mb-1">{item.title}</h4>
                                <p className="text-base sm:text-lg font-black text-accent-brown leading-tight mb-1">{item.pts}</p>
                                <p className="text-xs font-normal text-slate-600 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Section 2: Active Rewards (Your Vouchers) */}
                {loyalty.my_vouchers && loyalty.my_vouchers.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-accent-brown/10">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-accent-brown">Your <span className="text-brand">Vouchers</span></h3>
                                <p className="text-xs font-medium text-slate-500">Available benefits in your collection</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {loyalty.my_vouchers.map((mv) => (
                                <div
                                    key={mv.id}
                                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between gap-4"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${VOUCHER_COLORS[mv.type] || 'bg-accent-brown/5 text-black'}`}>
                                            Voucher #{mv.id}
                                        </span>
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>

                                    <div>
                                        <h4 className="text-base sm:text-lg font-bold text-accent-brown tracking-tight leading-snug line-clamp-2">{mv.title}</h4>
                                        <p className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                            Validated {mv.date}
                                        </p>
                                    </div>

                                    <div className="bg-accent-brown/5 rounded-xl px-4 py-2.5 flex items-center justify-between border border-accent-brown/5">
                                        <code className="text-base sm:text-lg font-black text-accent-brown tracking-wider">{mv.code}</code>
                                        <button
                                            type="button"
                                            onClick={() => copyCode(mv.code, mv.id)}
                                            aria-label="Copy voucher code"
                                            className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-accent-brown hover:text-brand transition-all border border-accent-brown/10 active:scale-95 cursor-pointer"
                                        >
                                            {copiedVoucher === mv.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section 3: Marketplace (Available Vouchers to Redeem) */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-accent-brown/10">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-accent-brown">Available <span className="text-brand">Vouchers</span></h3>
                            <p className="text-xs font-medium text-slate-500">Convert points into rewards</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {loyalty.vouchers.map((voucher) => (
                            <div
                                key={voucher.id}
                                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                                    voucher.active
                                        ? 'border-slate-200/90 shadow-sm hover:shadow-md hover:border-brand/40'
                                        : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${VOUCHER_COLORS[voucher.type] ?? 'bg-accent-brown/5 text-black'}`}>
                                        <Gift className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{toTitleCase(voucher.type)}</span>
                                </div>

                                <div className="space-y-1 mb-4 flex-1">
                                    <h4 className="text-base sm:text-lg font-bold text-accent-brown leading-snug tracking-tight line-clamp-2">{voucher.title}</h4>
                                    <p className="text-xs font-normal text-slate-500 leading-relaxed">Secure digital asset. One-time conversion.</p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-medium text-slate-500 mb-0.5">Exchange rate</span>
                                        <span className="flex items-center gap-1.5 font-black text-base sm:text-lg text-accent-brown tabular-nums whitespace-nowrap">
                                            <Star className="w-4 h-4 fill-brand text-brand" /> {voucher.cost.toLocaleString()}
                                        </span>
                                    </div>

                                    {voucher.active ? (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmVoucher(voucher)}
                                            className="min-h-[44px] h-11 px-5 sm:px-6 rounded-xl font-bold text-xs bg-brand text-white hover:bg-brand-dark transition-all shadow-md shadow-brand/20 active:scale-95 cursor-pointer"
                                        >
                                            Redeem
                                        </button>
                                    ) : (
                                        <div className="min-h-[44px] h-11 px-3 sm:px-4 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500">
                                            {Math.abs(voucher.cost - loyalty.points).toLocaleString()} Deficit
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 4: Activity History & Referral Code in 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Activity Log */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-accent-brown/10">
                                <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Activity <span className="text-brand">History</span></h3>
                                <div className="w-2.5 h-2.5 rounded-full bg-accent-brown/20" />
                            </div>

                            <div className="space-y-2.5">
                                {loyalty.history.slice(0, 5).map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${entry.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {entry.points > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-accent-brown text-xs truncate">{entry.desc}</p>
                                            <p className="text-[10px] font-medium text-slate-500">{entry.date}</p>
                                        </div>
                                        <span className={`font-black text-xs sm:text-sm tabular-nums shrink-0 ${entry.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                {loyalty.history.length === 0 && (
                                    <div className="py-10 text-center space-y-2 opacity-50 px-4">
                                        <AlertCircle className="w-8 h-8 text-accent-brown mx-auto" />
                                        <p className="text-xs font-medium text-accent-brown">No recorded activity</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="w-full min-h-[44px] h-11 mt-4 rounded-xl bg-brand/10 text-brand text-xs font-bold hover:bg-brand hover:text-white transition-all cursor-pointer"
                        >
                            Full Registry History
                        </button>
                    </div>

                    {/* Referral Module */}
                    <div className="bg-brand rounded-2xl p-5 sm:p-6 shadow-lg shadow-brand/15 border border-white/10 relative overflow-hidden flex flex-col justify-between text-white">
                        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none" aria-hidden="true">
                            <Sparkles className="w-36 h-36 text-white" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="space-y-2">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center">
                                    <Gift className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Network <span className="text-accent-brown">Growth</span></h3>
                                <p className="text-xs font-medium text-white/90 leading-relaxed">
                                    Acquire 500 pts for every verified provider successfully integrated into the system.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-2.5 pl-4 bg-white/15 backdrop-blur-md rounded-xl border border-white/20">
                                <span className="font-black text-white tracking-wider text-base drop-shadow-sm truncate">{loyalty.referral_code}</span>
                                <button
                                    type="button"
                                    onClick={handleCopyReferral}
                                    aria-label="Copy referral code"
                                    className="min-h-[44px] min-w-[44px] w-11 h-11 bg-white rounded-lg flex items-center justify-center text-brand hover:bg-black hover:text-white transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Redemption Confirmation Modal */}
                <AnimatePresence>
                    {confirmVoucher && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => !redeeming && setConfirmVoucher(null)}
                                className="fixed inset-0 bg-accent-brown/70 backdrop-blur-md z-[9998]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                            >
                                <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md shadow-2xl transform relative overflow-hidden text-center pointer-events-auto border border-accent-brown/10">
                                    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand/20">
                                        <Gift className="w-8 h-8 text-brand" />
                                    </div>

                                    <div className="space-y-1 mb-4">
                                        <p className="text-xs font-semibold text-slate-500">Confirm transaction</p>
                                        <h2 className="text-2xl font-black text-accent-brown tracking-tight leading-tight">Redeem <span className="text-brand">Reward</span></h2>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 mb-4">
                                        <p className="text-base font-bold text-accent-brown leading-snug mb-2">"{confirmVoucher.title}"</p>
                                        <div className="flex items-center justify-center gap-2 font-black text-brand text-xl tabular-nums">
                                            <Star className="w-5 h-5 fill-brand" /> {confirmVoucher.cost.toLocaleString()} points
                                        </div>
                                    </div>

                                    <p className="text-xs font-normal text-slate-500 leading-relaxed mb-6">
                                        This process will deduct points from your primary balance and generate a unique authorization key.
                                    </p>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            type="button"
                                            onClick={handleRedeem}
                                            disabled={redeeming}
                                            className="w-full min-h-[44px] h-12 bg-brand text-white rounded-xl font-bold text-xs hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 disabled:opacity-50 cursor-pointer"
                                        >
                                            {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            {redeeming ? 'Authorizing...' : 'Redeem Now'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setConfirmVoucher(null)}
                                            disabled={redeeming}
                                            className="w-full min-h-[44px] h-11 text-xs font-bold text-slate-500 hover:text-accent-brown transition-all cursor-pointer"
                                        >
                                            Cancel Request
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default CustomerLoyalty;
