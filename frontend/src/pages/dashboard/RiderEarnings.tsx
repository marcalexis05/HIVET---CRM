import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, ArrowUpRight, DollarSign, 
    ChevronRight, Package, Loader2,
    ArrowLeft, ArrowRight, Wallet,
    X, ShieldCheck, MapPin, Store, Clock, Calendar,
    TrendingUp, AlertCircle, CheckCircle2, History
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import RiderBottomNav from '../../components/RiderBottomNav';
import { CustomDatePicker } from '../../components/CustomDatePicker';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TransactionDetailsModal = ({ transaction, isOpen, onClose }: { transaction: any, isOpen: boolean, onClose: () => void }) => {
    if (!transaction) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[2.5rem] p-8 w-[95%] max-w-lg shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-accent-brown/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-accent-brown/30 tracking-[0.3em]">Financial Receipt</p>
                                    <h3 className="text-xl font-black text-accent-brown uppercase tracking-tighter">TRX-{transaction.id.toString().slice(-6)}</h3>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-accent-peach/10 rounded-xl flex items-center justify-center text-accent-brown/40 hover:bg-red-50 hover:text-red-500 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-8">
                            {/* main stats */}
                            <div className="bg-accent-peach/5 rounded-[2rem] p-8 border border-accent-brown/5 text-center relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/5 rounded-full blur-2xl" />
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-accent-brown/30 mb-2">Authenticated Disbursement</p>
                                <h2 className="text-5xl font-black text-accent-brown tracking-tighter uppercase">₱{(transaction.amount || 0).toLocaleString()}</h2>
                                <div className="mt-4 flex items-center justify-center gap-3">
                                    <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Completed</div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-accent-brown/40 uppercase tracking-widest">
                                        <History size={12} /> {transaction.date}
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center shrink-0 text-accent-brown">
                                        <Store size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-0.5">Hub Extraction Point</p>
                                        <p className="text-xs font-black text-accent-brown uppercase">{transaction.pickup_name || 'Hi-Vet Clinic Hub'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center shrink-0 text-accent-brown">
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-0.5">Deliverable Mission</p>
                                        <p className="text-xs font-black text-accent-brown leading-snug line-clamp-2 uppercase">{transaction.address || 'Standard Delivery'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-accent-brown text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
                            >
                                Close Audit
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const PayoutModal = ({ isOpen, onClose, totalEarnings, onPayoutSuccess }: { isOpen: boolean, onClose: () => void, totalEarnings: number, onPayoutSuccess: (amount: number) => void }) => {
    const [method, setMethod] = useState('GCash');
    const [amount, setAmount] = useState(totalEarnings.toString());
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handlePayout = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < 100) {
            setError("Minimum disbursement is ₱100.00");
            return;
        }
        if (val > totalEarnings) {
            setError("Insufficient accumulated assets");
            return;
        }

        setError('');
        setSubmitting(true);
        
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/payout/request`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: val, method })
            });

            if (res.ok) {
                setSuccess(true);
                onPayoutSuccess(val);
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                }, 3000);
            } else {
                const data = await res.json();
                setError(data.detail || "Disbursement failed. Please try again.");
            }
        } catch (err) {
            setError("Treasury network error. Please check your connection.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[2.5rem] p-8 w-[95%] max-w-sm shadow-2xl">
                        {success ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-green-200">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter mb-2">Disbursement Sent</h3>
                                <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-[0.2em]">Asset transit finalized</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-dark rounded-xl flex items-center justify-center text-white"><ArrowUpRight size={20} /></div>
                                        <h3 className="text-lg font-black text-accent-brown uppercase tracking-tighter">Initiate Payout</h3>
                                    </div>
                                    <button onClick={onClose} className="text-accent-brown/20 hover:text-red-500 transition-colors"><X size={20} /></button>
                                </div>

                                <div className="bg-accent-peach/5 p-6 rounded-2xl border border-accent-brown/5 text-center">
                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.3em] mb-1">Available to Withdraw</p>
                                    <h4 className="text-3xl font-black text-accent-brown tracking-tighter">₱{(totalEarnings || 0).toLocaleString()}</h4>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest ml-1 italic">Withdrawal Yield (₱)</p>
                                    <input 
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-[#FAFAFA] border-2 border-accent-brown/5 rounded-xl py-4 px-6 text-lg font-black text-accent-brown focus:border-brand-dark/40 outline-none transition-all tracking-tight"
                                        placeholder="0.00"
                                    />
                                    {error && <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest ml-1">{error}</p>}
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest ml-1 italic">Select Target Method</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['GCash', 'PayMaya', 'BPI Bank', 'UnionBank'].map(m => (
                                            <button 
                                                key={m} 
                                                onClick={() => setMethod(m)}
                                                className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${method === m ? 'bg-brand-dark text-white border-brand-dark shadow-lg shadow-brand-dark/10' : 'bg-white text-accent-brown/40 border-accent-brown/10 hover:border-accent-brown/30'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={handlePayout}
                                    disabled={submitting}
                                    className="w-full bg-brand-dark text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3"
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Confirm Disbursement</>}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const AuditModal = ({ isOpen, onClose, stats }: { isOpen: boolean, onClose: () => void, stats: any }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[2.5rem] p-8 w-[95%] max-w-md shadow-2xl">
                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown"><TrendingUp size={20} /></div>
                                    <h3 className="text-lg font-black text-accent-brown uppercase tracking-tighter">Operational Audit</h3>
                                </div>
                                <button onClick={onClose} className="text-accent-brown/20 hover:text-red-500 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Gross Earnings", val: `₱${(stats.total_earnings || 0).toLocaleString()}`, icon: ArrowUpRight, col: "text-green-600" },
                                    { label: "Today's Contribution", val: `₱${(stats.today_earnings || 0).toLocaleString()}`, icon: TrendingUp, col: "text-brand-dark" },
                                    { label: "Successful Missions", val: stats.completed_orders || 0, icon: Package, col: "text-accent-brown" },
                                    { label: "Assets in Transit", val: `₱${(stats.pending_payout || 0).toLocaleString()}`, icon: Wallet, col: "text-[#FB8500]" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-accent-peach/5 rounded-2xl border border-accent-brown/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-accent-brown/20 shadow-sm border border-black/5"><item.icon size={14} /></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{item.label}</p>
                                        </div>
                                        <p className={`text-sm font-black tracking-tight ${item.col}`}>{item.val}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-brand-dark p-6 rounded-2xl text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <div className="flex items-center gap-3 mb-2">
                                    <ShieldCheck size={16} />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">Fleet Integrity Score</p>
                                </div>
                                <h4 className="text-3xl font-black tracking-tighter">98.4%</h4>
                                <p className="text-[9px] font-bold text-white/40 mt-2 uppercase tracking-widest italic">Top 5% of operational riders this cycle.</p>
                            </div>

                            <button onClick={onClose} className="w-full bg-accent-peach/20 text-accent-brown py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-accent-peach/30 transition-all">
                                Close Registry
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const RiderEarnings = () => {
    const [stats, setStats] = useState({ 
        total_earnings: 0, 
        completed_orders: 0, 
        today_earnings: 0,
        pending_payout: 0 
    });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isPayoutOpen, setIsPayoutOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [filterDate, setFilterDate] = useState('');
    const ITEMS_PER_PAGE = 6;

    const fetchEarnings = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/earnings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(prev => ({ ...prev, ...data }));
            }

            const historyRes = await fetch(`${API}/api/rider/earnings/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setHistory(historyData.history || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEarnings();
    }, []);

    // Calendar Filtering Logic
    const filteredHistory = useMemo(() => {
        if (!filterDate) return history;
        return history.filter(h => {
            // History items usually have data in "Apr 19, 2026" or similar format
            // but the DatePicker returns "YYYY-MM-DD".
            // Let's normalize both to comparison.
            const hDate = new Date(h.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
            return hDate === filterDate;
        });
    }, [history, filterDate]);

    const dateSpecificEarnings = useMemo(() => {
        if (!filterDate) return stats.today_earnings;
        return filteredHistory.reduce((sum, h) => sum + h.amount, 0);
    }, [filteredHistory, filterDate, stats.today_earnings]);

    return (
        <DashboardLayout title="Earnings">
            <TransactionDetailsModal 
                isOpen={!!selectedTransaction}
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
            />
            <PayoutModal 
                isOpen={isPayoutOpen} 
                onClose={() => setIsPayoutOpen(false)} 
                totalEarnings={stats.total_earnings} 
                onPayoutSuccess={(amount) => {
                    setStats(prev => ({ ...prev, total_earnings: prev.total_earnings - amount }));
                }}
            />
            <AuditModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} stats={stats} />

            <div className="space-y-6 pb-32">
                
                {/* ── FLEET TREASURY HEADER ── */}
                <div className="bg-brand-dark rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-sm transition-all duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Financial Ledger</p>
                            <h2 className="text-lg font-black tracking-tighter uppercase leading-none text-white">
                                Fleet Treasury Status
                            </h2>
                        </div>
                    </div>
                </div>

                {/* ── MAIN BALANCE DISPLAY ── */}
                <div className="bg-white rounded-2xl p-8 border border-accent-brown/5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-peach/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-brown/30 mb-2 leading-none">Total Accumulated Asset</p>
                            <h3 className="text-5xl font-black text-accent-brown tracking-tighter uppercase leading-none">
                                ₱{(stats.total_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[11px] font-bold text-accent-brown/40 mt-3 italic">Verified logistics compensation across all cycles.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                            <button 
                                onClick={() => setIsPayoutOpen(true)}
                                className="px-8 py-4 bg-brand-dark text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CreditCard size={14} /> Initiate Payout
                            </button>
                            <button 
                                onClick={() => setIsAuditOpen(true)}
                                className="px-8 py-4 bg-accent-peach/20 text-accent-brown rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-accent-peach/30 transition-all active:scale-95"
                            >
                                Operational Audit
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── PERFORMANCE METRICS ── */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { 
                            label: filterDate ? "Selected Yield" : "Today's Yield", 
                            value: `₱${(dateSpecificEarnings || 0).toLocaleString()}`, 
                            icon: filterDate ? History : DollarSign, 
                            desc: filterDate ? `Earnings for ${new Date(filterDate).toLocaleDateString()}` : "Confirmed earnings for this cycle." 
                        },
                        { label: "Logistical Count", value: stats.completed_orders || 0, icon: Package, desc: "Successful fulfillment completions.", highlight: true },
                        { label: "Pending Asset", value: `₱${(stats.pending_payout || 0).toLocaleString()}`, icon: Wallet, desc: "Asset value currently in transit." },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`rounded-2xl p-6 border border-accent-brown/5 shadow-sm flex flex-col gap-3 ${stat.highlight ? 'bg-brand-dark text-white' : 'bg-white'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.highlight ? 'bg-white/10 text-white' : 'bg-accent-peach/30 text-accent-brown'}`}>
                                <stat.icon size={18} />
                            </div>
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${stat.highlight ? 'text-white/40' : 'text-accent-brown/30'}`}>{stat.label}</p>
                                <h3 className={`text-2xl font-black tracking-tighter leading-none ${stat.highlight ? 'text-white' : 'text-accent-brown'}`}>{stat.value}</h3>
                            </div>
                            <p className={`text-[10px] font-bold leading-relaxed ${stat.highlight ? 'text-white/40' : 'text-accent-brown/40'}`}>{stat.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* ── TRANSACTION LEDGER ── */}
                <div className="space-y-4 pt-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                        <div>
                            <p className="text-[10px] font-black text-brand uppercase tracking-[0.4em]">Transaction Ledger</p>
                            <h4 className="text-xl font-black text-accent-brown tracking-tighter uppercase">Recent Activity</h4>
                        </div>
                        <div className="w-full md:w-80">
                            <CustomDatePicker 
                                value={filterDate} 
                                onChange={(val) => { setFilterDate(val); setCurrentPage(1); }} 
                                label="Filter Operational Date" 
                            />
                            {filterDate && (
                                <button 
                                    onClick={() => setFilterDate('')}
                                    className="text-[9px] font-black text-brand mt-2 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all ml-2"
                                >
                                    <History size={10} /> Reset Calendar Filter
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative min-h-[400px]">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-brand-dark" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/20">Syncing Treasury...</p>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] py-24 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-12 shadow-sm">
                                <div className="w-20 h-20 bg-accent-peach/10 rounded-full flex items-center justify-center mb-6">
                                    <AlertCircle className="w-10 h-10 text-accent-brown/10" />
                                </div>
                                <h4 className="text-2xl font-black text-accent-brown mb-2 tracking-tighter uppercase leading-none">No Records Found</h4>
                                <p className="text-[11px] font-bold text-accent-brown/30 max-w-sm leading-relaxed uppercase tracking-widest italic">
                                    "No transaction payload detected for the specified temporal coordinates."
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-2xl border border-accent-brown/5 shadow-sm overflow-hidden hover:border-accent-brown/20 transition-all flex flex-col"
                                        >
                                            <div className="px-6 py-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                                                        <ArrowUpRight size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Transaction ID</p>
                                                        <p className="font-black text-sm text-accent-brown tracking-tighter uppercase">HV-TR-{item.id.toString().slice(-6)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-green-600 tracking-tighter">+₱{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.1em]">{item.date}</p>
                                                </div>
                                            </div>

                                            <div className="px-6 pb-5">
                                                <div className="bg-[#FAF9F6] rounded-xl p-4 border border-accent-brown/5 flex items-center justify-between">
                                                   <div className="flex items-center gap-3">
                                                       <Package size={14} className="text-accent-brown/20" />
                                                       <p className="text-[10px] font-black uppercase tracking-tight text-accent-brown">Delivery Compensation</p>
                                                   </div>
                                                   <button 
                                                        onClick={() => setSelectedTransaction(item)}
                                                        className="flex items-center gap-2 text-[9px] font-black text-brand-dark uppercase tracking-widest cursor-pointer group outline-none"
                                                    >
                                                       Details <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                   </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Modern Pagination */}
                                {filteredHistory.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-center gap-2 pt-6">
                                        <button
                                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === 1}
                                            className="w-10 h-10 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div className="flex items-center gap-2 bg-white border border-accent-brown/10 p-1 rounded-xl shadow-sm">
                                            {Array.from({ length: Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                                                        currentPage === i + 1 ? 'bg-brand-dark text-white shadow-md' : 'bg-transparent text-accent-brown/40 hover:text-accent-brown'
                                                    }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => { setCurrentPage(prev => Math.min(Math.ceil(filteredHistory.length / ITEMS_PER_PAGE), prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)}
                                            className="w-10 h-10 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <RiderBottomNav />
        </DashboardLayout>
    );
};

export default RiderEarnings;
