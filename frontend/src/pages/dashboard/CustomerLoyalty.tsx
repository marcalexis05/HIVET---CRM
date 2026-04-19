import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Award, Gift, TrendingUp, Sparkles, Star, Copy, Check, Loader2, AlertCircle, TrendingDown, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

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

const TIER_METADATA: Record<string, { gradient: string, glow: string, label: string, color: string }> = {
    Bronze: {
        gradient: 'from-[#CD7F32] via-[#B87333] to-[#8B4513]',
        glow: 'shadow-orange-500/10',
        label: 'Bronze Member',
        color: 'text-orange-400'
    },
    Silver: {
        gradient: 'from-[#C0C0C0] via-[#A8A8A8] to-[#808080]',
        glow: 'shadow-slate-500/10',
        label: 'Silver Member',
        color: 'text-slate-300'
    },
    Gold: {
        gradient: 'from-[#FFD700] via-[#DAA520] to-[#B8860B]',
        glow: 'shadow-yellow-500/10',
        label: 'Gold Member',
        color: 'text-brand'
    },
    Platinum: {
        gradient: 'from-[#E5E4E2] via-[#B4B4B4] to-[#708090]',
        glow: 'shadow-cyan-500/10',
        label: 'Platinum Member',
        color: 'text-cyan-400'
    },
};

const VOUCHER_COLORS: Record<string, string> = {
    Service: 'bg-blue-50 text-blue-600 border border-blue-100',
    Discount: 'bg-orange-50 text-orange-600 border border-orange-100',
    Credit: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

const CustomerLoyalty = () => {
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmVoucher, setConfirmVoucher] = useState<Voucher | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedVoucher, setCopiedVoucher] = useState<number | null>(null);

    // 3D Tilt Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Accessing Rewards Vault...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !loyalty) {
        return (
            <DashboardLayout title="">
                <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 flex items-center gap-6 text-red-600 max-w-2xl mx-auto my-12">
                    <AlertCircle className="w-8 h-8 shrink-0" />
                    <p className="font-bold text-sm uppercase tracking-tight">{error || "Connection Error"}</p>
                </div>
            </DashboardLayout>
        );
    }

    const tierProgress = Math.min(100, Math.round((loyalty.points / (loyalty.next_tier_points || 1)) * 100));
    const currentTierData = TIER_METADATA[loyalty.tier] || TIER_METADATA['Bronze'];

    return (
        <DashboardLayout title="">
            <div className="max-w-[1600px] mx-auto space-y-12 pb-24 px-4">

                {/* Notification Overlay */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: -20, x: '-50%' }}
                            className={`fixed top-28 left-1/2 z-[100] flex items-center gap-4 px-8 py-4 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-[0.2em] ${toast.type === 'success' ? 'bg-accent-brown text-white' : 'bg-red-600 text-white'}`}
                        >
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hero Membership Card (3D Animated) */}
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
                    className="relative rounded-[2.5rem] overflow-hidden bg-brand shadow-2xl shadow-brand/20 flex items-center p-8 md:p-12 lg:p-14 transition-all duration-200"
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={`absolute -top-40 -right-40 w-[800px] h-[800px] bg-gradient-to-br ${currentTierData.gradient} opacity-[0.15] blur-[150px] rounded-full`} />
                        <div className="absolute top-0 right-0 p-20 opacity-5">
                            <Star className="w-96 h-96 text-white" />
                        </div>
                    </div>

                    <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center justify-between gap-12 lg:gap-24">
                        <div className="flex-1 space-y-10">
                            <div className="flex items-center gap-6">
                                <motion.div 
                                    style={{ transform: "translateZ(50px)" }}
                                    className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${currentTierData.gradient} p-0.5 shadow-2xl shadow-black/30`}
                                >
                                    <div className="w-full h-full bg-white/20 backdrop-blur-md rounded-[1.9rem] flex items-center justify-center border border-white/20">
                                        <Award className="w-10 h-10 text-white drop-shadow-md" />
                                    </div>
                                </motion.div>
                                <div style={{ transform: "translateZ(30px)" }} className="space-y-1.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Active Membership</span>
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-lg">
                                        {loyalty.tier} <span className="text-white">Member</span>
                                    </h1>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl md:text-7xl font-black text-white tracking-tighter tabular-nums leading-none">
                                        {loyalty.points.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase italic">Total Points</span>
                                </div>
                                <p className="text-sm font-medium text-white max-w-xl leading-relaxed">
                                    Your loyalty tier is calculated based on your total interaction with Hi-Vet. Continue earning to unlock exclusive rewards and priority clinic services.
                                </p>
                            </div>
                        </div>

                        {/* Status Hub (3D Layered) */}
                        <div 
                            style={{ transform: "translateZ(40px)" }}
                            className="lg:w-[320px] bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Target Tier</span>
                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{loyalty.next_tier}</h4>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-white tabular-nums">{tierProgress}%</div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white">Progress</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden shadow-inner border border-black/10">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${tierProgress}%` }}
                                        transition={{ duration: 1, ease: "circOut" }}
                                        className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-1">Gap to Upgrade</p>
                                        <p className="text-base font-black text-white">{(loyalty.next_tier_points - loyalty.points).toLocaleString()} Pts</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                        <TrendingUp className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Loyalty Benefit System */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">

                    {/* Primary Content (Left) */}
                    <div className="xl:col-span-8 space-y-16">

                        {/* Earn Methods */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: 'Commerce', pts: 'Per Transaction', icon: TrendingUp, desc: 'Earn points on every pharmaceutical and supply purchase.' },
                                { title: 'Schedules', pts: 'Check-in Bonus', icon: Award, desc: 'Receive points automatically upon completing clinic appointments.' },
                                { title: 'Network', pts: '500 Pts / Referral', icon: Sparkles, desc: 'Receive rewards for growing the Hi-Vet ecosystem.' },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ 
                                        scale: 1.05,
                                        rotateX: 5,
                                        rotateY: -5,
                                        z: 10
                                    }}
                                    className="bg-white rounded-[2rem] p-8 border border-accent-brown/5 shadow-sm hover:shadow-2xl hover:border-brand/40 transition-all group perspective-1000"
                                >
                                    <div style={{ transform: "translateZ(20px)" }} className="w-12 h-12 rounded-2xl bg-accent-brown/5 flex items-center justify-center text-accent-brown mb-6 group-hover:bg-brand group-hover:text-white transition-all">
                                        <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div style={{ transform: "translateZ(10px)" }}>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-black mb-2">{item.title}</h4>
                                        <p className="text-lg font-black text-accent-brown mb-1.5">{item.pts}</p>
                                        <p className="text-[10px] font-medium text-black leading-relaxed uppercase">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Active Rewards (Your Vouchers) */}
                        {loyalty.my_vouchers && loyalty.my_vouchers.length > 0 && (
                            <section className="space-y-10">
                                <div className="flex items-center justify-between pb-6 border-b border-accent-brown/10">
                                    <div className="space-y-1.5">
                                        <h3 className="text-3xl font-black tracking-tighter uppercase italic text-accent-brown">Your <span className="text-brand">Vouchers</span></h3>
                                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black">Available benefits in your collection</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {loyalty.my_vouchers.map((mv) => (
                                        <motion.div
                                            key={mv.id}
                                            whileHover={{ 
                                                y: -10, 
                                                rotateX: 5, 
                                                rotateY: -5,
                                                scale: 1.02
                                            }}
                                            style={{ transformStyle: "preserve-3d" }}
                                            className="bg-white rounded-[2.5rem] p-8 border border-accent-brown/10 shadow-sm flex flex-col gap-8 relative group transition-all perspective-1000"
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${VOUCHER_COLORS[mv.type] || 'bg-accent-brown/5 text-black'}`}>
                                                    Voucher #{mv.id}
                                                </span>
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            </div>

                                            <div>
                                                <h4 className="text-xl font-black text-accent-brown tracking-tight leading-tight uppercase italic">{mv.title}</h4>
                                                <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-2 flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Validated {mv.date}
                                                </p>
                                            </div>

                                            <div className="bg-accent-brown/5 rounded-2xl px-6 py-4 flex items-center justify-between border border-accent-brown/5 group-hover:border-accent-brown/20 transition-all">
                                                <code className="text-xl font-black text-accent-brown tracking-[0.3em] uppercase drop-shadow-sm">{mv.code}</code>
                                                <button
                                                    onClick={() => copyCode(mv.code, mv.id)}
                                                    className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-accent-brown/20 hover:text-accent-brown transition-all border border-accent-brown/5 active:scale-90"
                                                >
                                                    {copiedVoucher === mv.id ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Marketplace (Available Vouchers) */}
                        <section className="space-y-10">
                            <div className="flex items-center justify-between pb-6 border-b border-accent-brown/10">
                                <div className="space-y-1.5">
                                    <h3 className="text-3xl font-black tracking-tighter uppercase italic text-accent-brown">Available <span className="text-brand">Vouchers</span></h3>
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black">Convert points into rewards</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {loyalty.vouchers.map((voucher) => (
                                    <motion.div
                                        key={voucher.id}
                                        whileHover={voucher.active ? { 
                                            y: -10, 
                                            rotateX: 10, 
                                            rotateY: -10,
                                            scale: 1.02
                                        } : {}}
                                        style={{ transformStyle: "preserve-3d" }}
                                        className={`bg-white rounded-[2.5rem] p-8 border transition-all relative overflow-hidden group flex flex-col perspective-1000 ${voucher.active ? 'border-accent-brown/10 shadow-sm hover:shadow-2xl hover:border-accent-brown/30' : 'border-accent-brown/5 opacity-50 grayscale'}`}
                                    >
                                        <div className="flex items-start justify-between mb-8">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${VOUCHER_COLORS[voucher.type] ?? 'bg-accent-brown/5 text-black'}`}>
                                                <Gift className="w-7 h-7" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black bg-accent-brown/5 px-4 py-1.5 rounded-full">{voucher.type}</span>
                                        </div>

                                        <div className="space-y-3 mb-8 flex-1">
                                            <h4 className="text-xl font-black text-accent-brown leading-tight tracking-tight uppercase italic">{voucher.title}</h4>
                                            <p className="text-[10px] font-medium text-black uppercase tracking-[0.1em] leading-relaxed">Secure digital asset. One-time conversion.</p>
                                        </div>

                                        <div className="pt-6 border-t border-accent-brown/5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-black uppercase tracking-[0.3em] mb-1">Exchange Rate</span>
                                                <span className="flex items-center gap-2 font-black text-xl text-accent-brown tabular-nums">
                                                    <Star className="w-4 h-4 fill-brand text-brand" /> {voucher.cost.toLocaleString()}
                                                </span>
                                            </div>

                                            {voucher.active ? (
                                                <button
                                                    onClick={() => setConfirmVoucher(voucher)}
                                                    className="bg-brand text-white h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-brand-dark shadow-xl shadow-brand/20 active:scale-95"
                                                >
                                                    Redeem
                                                </button>
                                            ) : (
                                                <div className="bg-accent-brown/5 h-12 px-6 rounded-2xl flex items-center justify-center border border-accent-brown/5">
                                                    <span className="text-[10px] font-black text-black">{Math.abs(voucher.cost - loyalty.points).toLocaleString()} Deficit</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right: Operational Feed / Metadata */}
                    <aside className="xl:col-span-4 space-y-8">

                        {/* Activity Log */}
                        <div className="bg-white rounded-[2.5rem] p-10 border border-accent-brown/10 shadow-sm flex flex-col min-h-[500px]">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-black text-accent-brown tracking-tighter uppercase italic">Activity <span className="text-brand">History</span></h3>
                                <div className="w-2.5 h-2.5 rounded-full bg-accent-brown/10" />
                            </div>

                            <div className="space-y-4 flex-1">
                                {loyalty.history.slice(0, 5).map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-5 p-5 bg-accent-brown/5 rounded-3xl border border-transparent transition-all hover:bg-white hover:border-accent-brown/10 hover:shadow-xl group">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${entry.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600 shadow-inner'}`}>
                                            {entry.points > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-accent-brown text-[11px] truncate uppercase tracking-tight">{entry.desc}</p>
                                            <p className="text-[9px] font-bold text-black uppercase mt-1 tracking-widest">{entry.date}</p>
                                        </div>
                                        <span className={`font-black text-sm tabular-nums tracking-tighter ${entry.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                {loyalty.history.length === 0 && (
                                    <div className="py-20 text-center space-y-4 opacity-30 px-6">
                                        <AlertCircle className="w-10 h-10 text-accent-brown mx-auto" />
                                        <p className="text-[10px] font-black text-accent-brown uppercase tracking-[0.3em]">No Recorded Activity</p>
                                    </div>
                                )}
                            </div>

                            <button className="w-full h-16 mt-8 rounded-2xl bg-brand/10 text-brand text-[11px] font-black uppercase tracking-[0.3em] hover:bg-brand hover:text-white transition-all">
                                Full Registry History
                            </button>
                        </div>

                        {/* Referral Module */}
                        <div className="bg-brand rounded-[2.5rem] p-10 shadow-2xl shadow-brand/20 border border-white/5 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.15] group-hover:opacity-[0.25] transition-opacity pointer-events-none">
                                <Sparkles className="w-48 h-48 text-white" />
                            </div>
                            <div className="relative z-10 space-y-8">
                                <div className="space-y-3">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                                        <Gift className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Network <span className="text-accent-brown">Growth</span></h3>
                                    <p className="text-[11px] font-bold text-white uppercase tracking-[0.2em] leading-relaxed drop-shadow-sm">
                                        Acquire 500 Pts for every verified provider successfully integrated into the system.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between p-3 pl-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 focus-within:border-white/50 transition-all">
                                    <span className="font-black text-white tracking-[0.3em] text-lg uppercase drop-shadow-lg">{loyalty.referral_code}</span>
                                    <button
                                        onClick={handleCopyReferral}
                                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand hover:bg-black hover:text-white transition-all shadow-xl active:scale-90"
                                    >
                                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Redemption Modal Interface */}
                <AnimatePresence>
                    {confirmVoucher && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => !redeeming && setConfirmVoucher(null)}
                                className="fixed inset-0 bg-accent-brown/80 backdrop-blur-xl z-[9998]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-none"
                            >
                                <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-[0_50px_100px_rgba(0,0,0,0.5)] transform relative overflow-hidden text-center pointer-events-auto border border-accent-brown/10">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                                        <Gift className="w-64 h-64 text-accent-brown" />
                                    </div>

                                    <div className="w-24 h-24 bg-accent-brown/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-accent-brown/10">
                                        <Gift className="w-10 h-10 text-accent-brown" />
                                    </div>

                                    <div className="space-y-2 mb-10">
                                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black italic">Confirm Transaction</p>
                                        <h2 className="text-3xl font-black text-accent-brown tracking-tighter uppercase italic leading-none">Redeem <span className="text-brand">Reward</span></h2>
                                    </div>

                                    <div className="p-8 bg-accent-brown/5 rounded-[2rem] border border-accent-brown/5 mb-10">
                                        <p className="text-xl font-black text-accent-brown leading-tight mb-3 uppercase italic">"{confirmVoucher.title}"</p>
                                        <div className="flex items-center justify-center gap-3 font-black text-brand text-2xl tabular-nums drop-shadow-sm">
                                            <Star className="w-6 h-6 fill-brand" /> {confirmVoucher.cost.toLocaleString()} Points
                                        </div>
                                    </div>

                                    <p className="text-[11px] font-medium text-accent-brown/40 uppercase tracking-[0.1em] leading-relaxed px-6 pb-12 italic border-b border-accent-brown/5 mb-10">
                                        This process will deduct points from your primary balance and generate a unique authorization key.
                                    </p>

                                    <div className="flex flex-col gap-5">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            onClick={handleRedeem} disabled={redeeming}
                                            className="w-full bg-brand text-white h-16 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all hover:bg-brand-dark flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl shadow-brand/20"
                                        >
                                            {redeeming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5 text-white" />}
                                            {redeeming ? 'Authorizing...' : 'Redeem Now'}
                                        </motion.button>

                                        <button
                                            onClick={() => setConfirmVoucher(null)} disabled={redeeming}
                                            className="w-full py-2 text-[11px] font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-accent-brown transition-all"
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
