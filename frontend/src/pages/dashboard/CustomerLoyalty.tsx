import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Gift, TrendingUp, Sparkles, Star, Copy, Check, Loader2, AlertCircle, TrendingDown, CheckCircle, X } from 'lucide-react';
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

const VOUCHER_COLORS: Record<string, string> = {
    Service: 'bg-blue-100 text-blue-600',
    Discount: 'bg-orange-100 text-orange-600',
    Credit: 'bg-green-100 text-green-600',
};

const TIER_GRADIENT: Record<string, string> = {
    Bronze: 'from-orange-700 to-orange-500',
    Silver: 'from-slate-400 to-slate-300',
    Gold: 'from-yellow-500 to-yellow-300',
    Platinum: 'from-cyan-400 to-indigo-400',
};

const CustomerLoyalty = () => {
    const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmVoucher, setConfirmVoucher] = useState<Voucher | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedVoucher, setCopiedVoucher] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
            <DashboardLayout title="Loyalty Rewards">
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-brand-dark animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !loyalty) {
        return (
            <DashboardLayout title="Loyalty Rewards">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4 text-red-600">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="font-medium text-sm">{error || "Could not load data"}</p>
                </div>
            </DashboardLayout>
        );
    }

    const tierProgress = Math.min(100, Math.round((loyalty.points / (loyalty.next_tier_points || 1)) * 100));

    return (
        <DashboardLayout title="Loyalty Rewards">
            <div className="space-y-8">
                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}
                        >
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Overview - Back to ORIGINAL integrated layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    {/* Points Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-2 bg-gradient-to-br from-brand-dark to-[#3A2D28] rounded-3xl sm:rounded-[2rem] p-5 xs:p-8 md:p-12 text-white relative overflow-hidden"
                    >
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 h-full">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-12 h-12 bg-gradient-to-tr ${TIER_GRADIENT[loyalty.tier] ?? TIER_GRADIENT['Gold']} rounded-full flex items-center justify-center shadow-lg`}>
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                     <div>
                                         <span className="text-xs font-black uppercase tracking-widest text-white/70 block">Current Status</span>
                                         <span className="font-black text-xl tracking-tight text-brand-light">{loyalty.tier} Member</span>
                                     </div>
                                </div>
                                <h3 className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter mb-2 break-all sm:break-normal">
                                     {loyalty.points.toLocaleString()} <span className="text-lg sm:text-2xl text-white/40 font-bold">pts</span>
                                </h3>
                                 <p className="text-white/80 font-medium text-sm">Earn loyalty points for every purchase based on items in our catalog.</p>
                            </div>

                            <div className="w-full md:w-64 bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/10">
                                 <span className="text-xs font-black uppercase tracking-widest text-white/70 block mb-2">Next Tier: {loyalty.next_tier}</span>
                                <div className="w-full h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
                                    <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${tierProgress}%` }} />
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-brand">{loyalty.points.toLocaleString()}</span>
                                    <span className="text-white/40">{loyalty.next_tier_points.toLocaleString()} pts</span>
                                </div>
                                 {loyalty.next_tier_points - loyalty.points > 0 && (
                                     <p className="text-xs font-black uppercase tracking-widest text-white mt-4 text-center">
                                         Just {(loyalty.next_tier_points - loyalty.points).toLocaleString()} pts to upgrade!
                                     </p>
                                 )}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[80px]" />
                        <Sparkles className="absolute top-10 right-10 w-24 h-24 text-white/5" />
                    </motion.div>

                    {/* How to Earn */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-accent-peach/20 rounded-3xl sm:rounded-[2rem] p-5 xs:p-8 border border-white flex flex-col justify-center"
                    >
                        <h3 className="text-sm font-black uppercase tracking-widest text-accent-brown mb-6 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-dark" /> How to Earn
                        </h3>
                        <ul className="space-y-6">
                            {[
                                ['Shop the Catalog', 'Points vary per item'],
                                ['Book Reservations', 'Points vary by clinic'],
                                ['Refer a Friend', '500 pts Bonus'],
                            ].map(([label, pts], idx) => (
                                <li key={label} className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-brand-dark font-black">{idx + 1}</div>
                                     <div>
                                         <p className="font-bold text-accent-brown text-sm mb-0.5">{label}</p>
                                         <p className="text-xs text-accent-brown/80 font-bold uppercase tracking-widest">{pts}</p>
                                     </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Active Vouchers - Integrated simply */}
                {loyalty.my_vouchers && loyalty.my_vouchers.length > 0 && (
                    <div>
                         <div className="flex items-center justify-between mb-6">
                             <h3 className="text-xl font-black text-accent-brown tracking-tighter">My Active Vouchers</h3>
                             <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/60">Ready to use</span>
                         </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {loyalty.my_vouchers.map((mv) => (
                                <motion.div 
                                    key={mv.id}
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-5 rounded-2xl border-2 border-brand-dark/5 shadow-xl shadow-accent-brown/5 flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${VOUCHER_COLORS[mv.type] || 'bg-gray-100'}`}>
                                            {mv.type}
                                        </div>
                                    </div>
                                    <h4 className="font-black text-accent-brown text-sm mb-4 flex-1">{mv.title}</h4>
                                    <div className="p-2 bg-brand-dark/5 rounded-lg flex items-center justify-between border border-brand-dark/5">
                                        <code className="text-xs font-black text-brand tracking-widest">{mv.code}</code>
                                        <button onClick={() => copyCode(mv.code, mv.id)} className="text-accent-brown/30 hover:text-brand transition-colors">
                                            {copiedVoucher === mv.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vouchers Grid - Available Rewards */}
                <div>
                     <div className="flex items-center justify-between mb-6">
                         <h3 className="text-xl font-black text-accent-brown tracking-tighter">Available Rewards</h3>
                         <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/60">Redeem your points</span>
                     </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {loyalty.vouchers.map((voucher, i) => (
                            <motion.div
                                key={voucher.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={voucher.active ? { scale: 1.05, y: -5, borderColor: '#ff9f1c', boxShadow: '0 20px 25px -5px rgba(61, 43, 31, 0.1)' } : {}}
                                whileTap={voucher.active ? { scale: 0.95 } : {}}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className={`bg-white rounded-2xl p-5 sm:p-6 shadow-xl shadow-accent-brown/5 border-2 transition-all relative overflow-hidden group flex flex-col ${voucher.active ? 'border-transparent cursor-pointer' : 'border-transparent opacity-60'}`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${VOUCHER_COLORS[voucher.type] ?? 'bg-gray-100 text-gray-600'}`}>
                                         <Gift className="w-6 h-6" />
                                     </div>
                                      <span className="text-xs font-black uppercase tracking-widest text-accent-brown/80 bg-accent-peach/50 px-3 py-1 rounded-full">{voucher.type}</span>
                                 </div>
                                <h4 className="font-black text-accent-brown text-lg leading-tight tracking-tight mb-2 pr-4 flex-1">{voucher.title}</h4>
                                <div className="mt-4 pt-4 border-t border-accent-brown/5 flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-bold text-sm text-brand-dark">
                                        <Star className="w-3.5 h-3.5 fill-brand-dark" /> {voucher.cost.toLocaleString()}
                                    </span>
                                     {voucher.active ? (
                                           <motion.button
                                               whileHover={{ scale: 1.1 }}
                                               whileTap={{ scale: 0.9 }}
                                               onClick={() => setConfirmVoucher(voucher)}
                                               className="text-xs font-black uppercase tracking-widest bg-brand-dark text-white px-4 py-2 rounded-xl hover:bg-black transition-colors cursor-pointer"
                                           >
                                               Redeem
                                           </motion.button>
                                     ) : (
                                         <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/60">
                                             Need {(voucher.cost - loyalty.points).toLocaleString()} more
                                          </span>
                                     )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* History + Referral */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Points History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-3xl sm:rounded-[2rem] p-5 xs:p-8 shadow-xl shadow-accent-brown/5 border border-white overflow-hidden"
                    >
                        <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Points History</h3>
                        <div className="space-y-3">
                            {loyalty.history.slice(0, 5).map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-4 py-3 border-b border-accent-brown/5 last:border-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${entry.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                        {entry.points > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    </div>
                                     <div className="flex-1 min-w-0">
                                         <p className="font-bold text-accent-brown text-sm truncate pr-2">{entry.desc}</p>
                                         <p className="text-xs font-bold text-accent-brown/80 uppercase tracking-widest">{entry.date}</p>
                                     </div>
                                    <span className={`font-black text-sm shrink-0 ${entry.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Referral */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-br from-brand-dark to-[#3A2D28] rounded-3xl sm:rounded-[2rem] p-5 xs:p-8 text-white relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-brand/20 rounded-2xl flex items-center justify-center mb-6">
                                <Gift className="w-6 h-6 text-brand" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight mb-2">Refer a Friend</h3>
                             <p className="text-white/70 text-sm font-medium mb-8">Share your code and earn 500 bonus points for every successful referral.</p>
                            <div className="bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                                <span className="font-black text-brand tracking-widest text-sm xs:text-base sm:text-lg break-all text-center sm:text-left">{loyalty.referral_code}</span>
                                <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 159, 28, 1)', color: '#3d2b1f' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleCopyReferral}
                                    className="w-full sm:w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </motion.button>
                            </div>
                             <p className="text-xs font-black uppercase tracking-widest text-white/50 mt-4 text-center">
                                 {copied ? '✓ Copied to clipboard!' : 'Tap to copy'}
                             </p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-[60px]" />
                    </motion.div>
                </div>

                {/* Redeem Confirmation Modal */}
                <AnimatePresence>
                    {confirmVoucher && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => !redeeming && setConfirmVoucher(null)}
                                className="fixed inset-0 bg-accent-brown/30 backdrop-blur-sm z-50"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            >
                                <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center">
                                    <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Gift className="w-8 h-8 text-brand-dark" />
                                    </div>
                                    <h2 className="text-2xl font-black text-accent-brown tracking-tight mb-2">Confirm Redemption</h2>
                                    <p className="text-accent-brown/50 text-sm font-medium mb-2">You're about to redeem:</p>
                                    <p className="font-black text-accent-brown text-lg mb-1">"{confirmVoucher.title}"</p>
                                    <p className="text-sm font-bold text-brand-dark mb-8 flex items-center justify-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-brand-dark" /> {confirmVoucher.cost.toLocaleString()} points will be deducted
                                    </p>
                                    <div className="space-y-3">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleRedeem}
                                            disabled={redeeming}
                                            className="w-full bg-brand-dark text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Confirm Redemption
                                        </motion.button>
                                          <motion.button
                                              whileHover={{ scale: 1.1, color: '#3d2b1f' }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={() => setConfirmVoucher(null)}
                                              disabled={redeeming}
                                              className="w-full py-3 text-xs font-black uppercase tracking-widest text-accent-brown/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                          >
                                              <X className="w-3 h-3" /> Cancel
                                          </motion.button>
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
