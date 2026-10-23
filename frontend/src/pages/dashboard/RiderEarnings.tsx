import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
    CreditCard, ArrowUpRight, DollarSign, 
    ChevronRight, Package, Loader2,
    Wallet, X, ShieldCheck,
    TrendingUp, AlertCircle, CheckCircle2, History
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Pagination from '../../components/Pagination';
import RiderBottomNav from '../../components/RiderBottomNav';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';
import { RIDER_TEXT } from '../../constants/riderWording';
import { formatTransactionId } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PayoutModal = ({ isOpen, onClose, totalEarnings, onPayoutSuccess }: { isOpen: boolean, onClose: () => void, totalEarnings: number, onPayoutSuccess: (amount: number) => void }) => {
    const shouldReduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    const [method, setMethod] = useState('GCash');
    const [amount, setAmount] = useState((Number(totalEarnings) || 0).toFixed(2));
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            triggerElementRef.current = document.activeElement as HTMLElement;
            const originalOverflow = document.body.style.overflow;
            const originalPaddingRight = document.body.style.paddingRight;
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }

            setAmount((Number(totalEarnings) || 0).toFixed(2));
            setError('');
            setSuccess(false);

            const timer = setTimeout(() => {
                closeBtnRef.current?.focus();
            }, 50);

            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.paddingRight = originalPaddingRight;
                clearTimeout(timer);
                triggerElementRef.current?.focus?.();
            };
        }
    }, [isOpen, totalEarnings]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    };

    const handlePayout = async () => {
        const val = Math.round(parseFloat(amount) * 100) / 100;
        if (isNaN(val) || val < 100) {
            setError(RIDER_TEXT.earnings.payoutModal.errorMin);
            return;
        }
        if (val > totalEarnings) {
            setError(RIDER_TEXT.earnings.payoutModal.errorBalance);
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
                setError(data.detail || RIDER_TEXT.earnings.payoutModal.errorGeneral);
            }
        } catch {
            setError(RIDER_TEXT.earnings.payoutModal.errorGeneral);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        onClick={onClose} 
                        className="fixed inset-0 bg-black/40 z-[200]" 
                        aria-hidden="true" 
                    />
                    <div className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
                        <motion.div 
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={RIDER_TEXT.earnings.payoutModal.title}
                            tabIndex={-1}
                            onKeyDown={handleKeyDown}
                            initial={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { 
                                        opacity: 0, 
                                        y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24,
                                        scale: typeof window !== 'undefined' && window.innerWidth >= 641 ? 0.96 : 1 
                                      }
                            }
                            animate={
                                shouldReduceMotion
                                    ? { opacity: 1 }
                                    : { opacity: 1, y: 0, scale: 1 }
                            }
                            exit={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { 
                                        opacity: 0, 
                                        y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24,
                                        scale: typeof window !== 'undefined' && window.innerWidth >= 641 ? 0.96 : 1 
                                      }
                            }
                            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-md overflow-hidden outline-none"
                        >
                            {/* Drag handle on mobile */}
                            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0 bg-white" aria-hidden="true">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            {success ? (
                                <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-green-200">
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <h3 className="text-xl font-black text-accent-brown uppercase tracking-tight mb-1">{RIDER_TEXT.earnings.payoutModal.successTitle}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{RIDER_TEXT.earnings.payoutModal.successDesc}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Fixed Header */}
                                    <div className="flex justify-between items-center p-4 sm:p-5 border-b border-accent-brown/10 shrink-0 bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-dark rounded-xl flex items-center justify-center text-white shadow-sm" aria-hidden="true">
                                                <ArrowUpRight size={20} />
                                            </div>
                                            <h3 className="text-lg font-black text-accent-brown uppercase tracking-tight">
                                                {RIDER_TEXT.earnings.payoutModal.title}
                                            </h3>
                                        </div>
                                        <button 
                                            ref={closeBtnRef}
                                            type="button"
                                            onClick={onClose} 
                                            aria-label="Close cash out modal" 
                                            className="min-w-[44px] min-h-[44px] w-11 h-11 bg-accent-peach/15 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 transition-all outline-none focus:ring-2 focus:ring-accent-brown/20 shrink-0"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Scrollable Middle */}
                                    <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
                                        <div className="bg-accent-peach/5 p-5 rounded-2xl border border-accent-brown/10 text-center">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                                {RIDER_TEXT.earnings.payoutModal.availableLabel}
                                            </p>
                                            <h4 className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight">
                                                ₱{(Number(totalEarnings) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </h4>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="payout-amount-input" className="text-xs font-bold text-slate-600 uppercase tracking-wide block">
                                                {RIDER_TEXT.earnings.payoutModal.amountLabel}
                                            </label>
                                            <input 
                                                id="payout-amount-input"
                                                type="number"
                                                step="0.01"
                                                min="100"
                                                max={(Number(totalEarnings) || 0).toFixed(2)}
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full bg-[#FAFAFA] border border-accent-brown/20 rounded-xl py-3 px-4 text-lg font-black text-accent-brown focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20 outline-none transition-all tracking-tight"
                                                placeholder="0.00"
                                            />
                                            {error && <p className="text-xs font-bold text-red-600 uppercase tracking-wide mt-1">{error}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                {RIDER_TEXT.earnings.payoutModal.methodLabel}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {['GCash', 'PayMaya', 'BPI Bank', 'UnionBank'].map(m => (
                                                    <button 
                                                        key={m} 
                                                        type="button"
                                                        onClick={() => setMethod(m)}
                                                        className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center ${method === m ? 'bg-brand-dark text-white border-brand-dark shadow-md' : 'bg-white text-slate-600 border-accent-brown/15 hover:border-accent-brown/30'}`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fixed Footer */}
                                    <div className="p-4 sm:p-5 border-t border-accent-brown/10 shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
                                        <button 
                                            type="button"
                                            onClick={handlePayout}
                                            disabled={submitting}
                                            className="w-full min-h-[48px] h-12 bg-brand-dark text-white rounded-xl font-black uppercase text-xs sm:text-sm tracking-wider shadow-md hover:bg-black transition-all flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-brand-dark/30 disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {submitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <><ShieldCheck size={18} aria-hidden="true" /> {RIDER_TEXT.earnings.payoutModal.confirmBtn}</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

const AuditModal = ({ isOpen, onClose, stats }: { isOpen: boolean, onClose: () => void, stats: any }) => {
    const shouldReduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        triggerElementRef.current = document.activeElement as HTMLElement;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            clearTimeout(timer);
            triggerElementRef.current?.focus?.();
        };
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        onClick={onClose} 
                        className="fixed inset-0 bg-black/40 z-[200]" 
                        aria-hidden="true" 
                    />
                    <div className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
                        <motion.div 
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={RIDER_TEXT.earnings.summaryModal.title}
                            tabIndex={-1}
                            onKeyDown={handleKeyDown}
                            initial={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { 
                                        opacity: 0, 
                                        y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24,
                                        scale: typeof window !== 'undefined' && window.innerWidth >= 641 ? 0.96 : 1 
                                      }
                            }
                            animate={
                                shouldReduceMotion
                                    ? { opacity: 1 }
                                    : { opacity: 1, y: 0, scale: 1 }
                            }
                            exit={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { 
                                        opacity: 0, 
                                        y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24,
                                        scale: typeof window !== 'undefined' && window.innerWidth >= 641 ? 0.96 : 1 
                                      }
                            }
                            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-md overflow-hidden outline-none"
                        >
                            {/* Drag handle on mobile */}
                            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0 bg-white" aria-hidden="true">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            {/* Fixed Header */}
                            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-accent-brown/10 shrink-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0" aria-hidden="true">
                                        <TrendingUp size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-accent-brown uppercase tracking-tight">
                                        {RIDER_TEXT.earnings.summaryModal.title}
                                    </h3>
                                </div>
                                <button 
                                    ref={closeBtnRef}
                                    type="button"
                                    onClick={onClose} 
                                    aria-label="Close summary modal" 
                                    className="min-w-[44px] min-h-[44px] w-11 h-11 bg-accent-peach/15 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 transition-all outline-none focus:ring-2 focus:ring-accent-brown/20 shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Middle */}
                            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
                                <div className="space-y-3">
                                    {[
                                        { label: RIDER_TEXT.earnings.summaryModal.totalEarnings, val: `₱${(Number(stats.total_earnings) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: ArrowUpRight, col: "text-green-600" },
                                        { label: RIDER_TEXT.earnings.summaryModal.todayEarnings, val: `₱${(Number(stats.today_earnings) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, col: "text-brand-dark" },
                                        { label: RIDER_TEXT.earnings.summaryModal.completedDeliveries, val: (stats.completed_orders || 0).toLocaleString('en-PH'), icon: Package, col: "text-accent-brown" },
                                        { label: RIDER_TEXT.earnings.summaryModal.pendingCashOut, val: `₱${(Number(stats.pending_payout) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Wallet, col: "text-[#FB8500]" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3.5 bg-accent-peach/5 rounded-xl border border-accent-brown/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-accent-brown/40 shadow-sm border border-black/5" aria-hidden="true">
                                                    <item.icon size={16} />
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{item.label}</p>
                                            </div>
                                            <p className={`text-sm font-black tracking-tight ${item.col}`}>{item.val}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-brand-dark p-5 rounded-2xl text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" aria-hidden="true" />
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ShieldCheck size={18} aria-hidden="true" />
                                        <p className="text-xs font-bold uppercase tracking-wider text-white/90">{RIDER_TEXT.earnings.summaryModal.ratingScore}</p>
                                    </div>
                                    <h4 className="text-2xl sm:text-3xl font-black tracking-tight">98.4%</h4>
                                    <p className="text-xs font-medium text-white/85 mt-1">{RIDER_TEXT.earnings.summaryModal.ratingDesc}</p>
                                </div>
                            </div>

                            {/* Fixed Footer */}
                            <div className="p-4 sm:p-5 border-t border-accent-brown/10 shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
                                <button 
                                    type="button"
                                    onClick={onClose} 
                                    className="w-full min-h-[48px] h-12 bg-accent-peach/20 text-accent-brown rounded-xl font-black uppercase text-xs sm:text-sm tracking-wider hover:bg-accent-peach/30 transition-all outline-none focus:ring-2 focus:ring-accent-brown/20 flex items-center justify-center"
                                >
                                    {RIDER_TEXT.earnings.summaryModal.closeBtn}
                                </button>
                            </div>
                        </motion.div>
                    </div>
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
            const hDate = new Date(h.date).toLocaleDateString('en-CA');
            return hDate === filterDate;
        });
    }, [history, filterDate]);

    const dateSpecificEarnings = useMemo(() => {
        if (!filterDate) return stats.today_earnings;
        return filteredHistory.reduce((sum, h) => sum + (h.amount || 0), 0);
    }, [filteredHistory, filterDate, stats.today_earnings]);

    const isCashOutDisabled = (stats.total_earnings || 0) < 100;

    return (
        <DashboardLayout title={RIDER_TEXT.earnings.pageTitle}>
            <PaymentReceiptModal 
                isOpen={!!selectedTransaction}
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
            />
            <PayoutModal 
                isOpen={isPayoutOpen} 
                onClose={() => setIsPayoutOpen(false)} 
                totalEarnings={stats.total_earnings} 
                onPayoutSuccess={(amount) => {
                    setStats(prev => ({ ...prev, total_earnings: Math.max(0, prev.total_earnings - amount) }));
                }}
            />
            <AuditModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} stats={stats} />

            <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
                
                {/* Visually hidden heading for a11y */}
                <h1 className="sr-only">{RIDER_TEXT.earnings.pageTitle}</h1>

                {/* ── HERO EARNINGS OVERVIEW (Balance 60% + 3 Summary Cards 40% on Desktop) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
                    
                    {/* ── MAIN BALANCE DISPLAY (Left ~60% on desktop) ── */}
                    <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 border border-accent-brown/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-peach/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" aria-hidden="true" />
                        
                        <div className="relative z-10 space-y-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 leading-none">
                                    {RIDER_TEXT.earnings.balanceLabel}
                                </p>
                                <h3 
                                    className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-accent-brown tracking-normal leading-tight break-words sm:break-normal tabular-nums"
                                    aria-label={`Available balance: ${(stats.total_earnings || 0).toLocaleString()} pesos`}
                                >
                                    ₱{(stats.total_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-xl">
                                {RIDER_TEXT.earnings.balanceDesc}
                            </p>
                        </div>
                        
                        <div className="relative z-10 flex flex-col sm:flex-row gap-3 pt-6 sm:pt-8 items-stretch">
                            <button 
                                type="button"
                                onClick={() => setIsPayoutOpen(true)}
                                disabled={isCashOutDisabled}
                                aria-disabled={isCashOutDisabled}
                                className={`w-full sm:flex-[1.4] min-h-[48px] h-12 sm:h-[50px] px-6 bg-brand-dark text-white rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all outline-none focus:ring-2 focus:ring-brand-dark/30 ${
                                    isCashOutDisabled 
                                        ? 'opacity-50 cursor-not-allowed bg-brand-dark/70' 
                                        : 'hover:bg-black active:scale-98 shadow-md'
                                }`}
                            >
                                <CreditCard size={18} aria-hidden="true" /> 
                                <span>{RIDER_TEXT.earnings.cashOutBtn}</span>
                                {isCashOutDisabled && <span className="sr-only"> (Disabled, minimum ₱100 required)</span>}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsAuditOpen(true)}
                                className="w-full sm:flex-1 min-h-[48px] h-12 sm:h-[50px] px-6 bg-white hover:bg-slate-50 text-accent-brown rounded-xl font-black text-sm uppercase tracking-wide border border-accent-brown/20 shadow-sm transition-all active:scale-98 flex items-center justify-center outline-none focus:ring-2 focus:ring-accent-brown/20"
                            >
                                {RIDER_TEXT.earnings.viewSummaryBtn}
                            </button>
                        </div>
                    </div>

                    {/* ── THREE SUMMARY CARDS (Right ~40% on desktop stacked; 2-col/3-col on mobile/tablet) ── */}
                    <div 
                        className="lg:col-span-5 grid grid-cols-2 min-[481px]:grid-cols-3 lg:flex lg:flex-col gap-3 sm:gap-4 lg:gap-3.5 lg:h-full lg:justify-between"
                        role="region"
                        aria-label="Summary Statistics"
                    >
                        {/* Card 1: Today's Earnings / Selected Date's Earnings */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0 }}
                            className="col-span-2 min-[481px]:col-span-1 lg:flex-1 rounded-2xl p-4 sm:p-5 border border-accent-brown/10 shadow-sm bg-white flex flex-col justify-between"
                        >
                            <div className="flex items-center gap-3.5 min-[481px]:flex-col min-[481px]:items-start min-[481px]:gap-3">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent-peach/30 text-accent-brown flex items-center justify-center shrink-0" aria-hidden="true">
                                    {filterDate ? <History size={20} /> : <DollarSign size={20} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-0.5">
                                        {filterDate ? RIDER_TEXT.earnings.metrics.selectedDateEarnings : RIDER_TEXT.earnings.metrics.todayEarnings}
                                    </p>
                                    <h4 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-none text-accent-brown whitespace-nowrap tabular-nums">
                                        ₱{(dateSpecificEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h4>
                                </div>
                            </div>
                            <p className="text-xs font-medium leading-relaxed text-slate-600 mt-2 min-[481px]:mt-3">
                                {filterDate ? `Earnings for ${new Date(filterDate).toLocaleDateString()}` : RIDER_TEXT.earnings.metrics.todayDesc}
                            </p>
                        </motion.div>

                        {/* Card 2: Completed Deliveries (Solid Orange Highlight) */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="col-span-1 lg:flex-1 rounded-2xl p-4 sm:p-5 border border-transparent shadow-sm bg-brand-dark text-white flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0" aria-hidden="true">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-white/90 mb-0.5">
                                        {RIDER_TEXT.earnings.metrics.completedOrders}
                                    </p>
                                    <h4 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-none text-white whitespace-nowrap tabular-nums">
                                        {stats.completed_orders || 0}
                                    </h4>
                                </div>
                            </div>
                            <p className="text-xs font-medium leading-relaxed text-white/85 mt-2 sm:mt-3">
                                {RIDER_TEXT.earnings.metrics.completedDesc}
                            </p>
                        </motion.div>

                        {/* Card 3: Pending Cash Out */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.16 }}
                            className="col-span-1 lg:flex-1 rounded-2xl p-4 sm:p-5 border border-accent-brown/10 shadow-sm bg-white flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent-peach/30 text-accent-brown flex items-center justify-center shrink-0" aria-hidden="true">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-0.5">
                                        {RIDER_TEXT.earnings.metrics.pendingCashOut}
                                    </p>
                                    <h4 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-none text-accent-brown whitespace-nowrap tabular-nums">
                                        ₱{(stats.pending_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h4>
                                </div>
                            </div>
                            <p className="text-xs font-medium leading-relaxed text-slate-600 mt-2 sm:mt-3">
                                {RIDER_TEXT.earnings.metrics.pendingDesc}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* ── RECENT ACTIVITY & DATE FILTER ── */}
                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 px-1">
                        <div>
                            <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">
                                {RIDER_TEXT.earnings.activitySub}
                            </p>
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-accent-brown tracking-tight uppercase leading-tight">
                                {RIDER_TEXT.earnings.activityTitle}
                            </h2>
                        </div>
                        <div className="w-full md:w-auto md:min-w-[260px]">
                            <CustomDatePicker 
                                value={filterDate} 
                                onChange={(val) => { setFilterDate(val); setCurrentPage(1); }} 
                                label={RIDER_TEXT.earnings.filterDateLabel} 
                                buttonClassName="w-full min-h-[44px] h-11 sm:h-12 px-4 rounded-xl bg-white border border-accent-brown/20 text-sm font-bold text-accent-brown shadow-sm flex items-center justify-between"
                            />
                            {filterDate && (
                                <button 
                                    type="button"
                                    onClick={() => setFilterDate('')}
                                    className="text-xs font-bold text-brand mt-1.5 uppercase tracking-wider flex items-center gap-1.5 hover:gap-2 transition-all ml-1 outline-none"
                                >
                                    <History size={12} aria-hidden="true" /> {RIDER_TEXT.earnings.resetFilterBtn}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative min-h-[360px]" id="earnings-activity-list" aria-live="polite">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="animate-spin text-brand-dark" size={32} />
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{RIDER_TEXT.earnings.loading}</p>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="bg-white rounded-2xl py-14 border border-accent-brown/10 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-8 h-8 text-accent-brown/40" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-accent-brown mb-1 tracking-tight uppercase">{RIDER_TEXT.earnings.emptyTitle}</h3>
                                <p className="text-sm text-slate-600 font-medium max-w-sm leading-relaxed">
                                    {RIDER_TEXT.earnings.emptyDesc}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch list-none p-0 m-0" role="list">
                                    <AnimatePresence mode="popLayout">
                                        {filteredHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                                            <li key={item.id} className="h-full flex" role="listitem">
                                                <motion.article
                                                    layout
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="w-full bg-white rounded-2xl border border-accent-brown/10 shadow-sm hover:shadow-md hover:border-brand-dark/30 transition-all flex flex-col justify-between overflow-hidden p-4 sm:p-5"
                                                >
                                                    <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-accent-brown/10">
                                                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0" aria-hidden="true">
                                                                <ArrowUpRight size={18} className="sm:w-5 sm:h-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-500 leading-tight">Transaction ID</p>
                                                                <h4 className="font-black text-xs min-[360px]:text-sm text-accent-brown tracking-tight uppercase truncate">
                                                                    {formatTransactionId(item.id)}
                                                                </h4>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm min-[360px]:text-base sm:text-lg font-black text-green-600 tracking-tight whitespace-nowrap">
                                                                +₱{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </p>
                                                            <time className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-normal block" dateTime={item.date}>
                                                                {item.date}
                                                            </time>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Package size={15} className="text-accent-brown/40 shrink-0" aria-hidden="true" />
                                                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-accent-brown leading-snug truncate">
                                                                {RIDER_TEXT.earnings.cardTitle}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setSelectedTransaction(item)}
                                                            className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center justify-end gap-1 text-xs sm:text-sm font-black text-brand-dark hover:bg-brand-dark/10 transition-all outline-none focus:ring-2 focus:ring-brand-dark/30 shrink-0"
                                                            aria-label={`View details for transaction ${formatTransactionId(item.id)}`}
                                                        >
                                                            <span>{RIDER_TEXT.earnings.detailsBtn}</span>
                                                            <ChevronRight size={15} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </motion.article>
                                            </li>
                                        ))}
                                    </AnimatePresence>
                                </ul>

                                {/* Modern Pagination */}
                                <Pagination 
                                    currentPage={currentPage} 
                                    totalPages={Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)} 
                                    onPageChange={setCurrentPage} 
                                    scrollToTop={true} 
                                />
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
