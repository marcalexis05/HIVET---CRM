import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShieldCheck, X, History, Store, MapPin } from 'lucide-react';
import { RIDER_TEXT } from '../constants/riderWording';
import { formatTransactionId } from '../utils/textFormatters';

export interface PaymentReceiptModalProps {
    transaction: {
        id: string | number;
        amount?: number;
        date?: string;
        pickup_name?: string;
        address?: string;
        [key: string]: any;
    } | null;
    isOpen: boolean;
    onClose: () => void;
}

const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
    transaction,
    isOpen,
    onClose,
}) => {
    const shouldReduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    // Capture the trigger element and lock body scroll with scrollbar compensation
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

        // Focus close button on open
        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            clearTimeout(timer);
            // Return focus to the trigger element on close
            triggerElementRef.current?.focus?.();
        };
    }, [isOpen]);

    // Keyboard accessibility: Escape to close and Tab focus trap
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

    if (!transaction) return null;

    const trxNumber = formatTransactionId(transaction.id);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop: plain light dim (max 40% dark), zero blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[200]"
                        aria-hidden="true"
                    />

                    {/* Responsive Modal / Bottom Sheet Container */}
                    <div className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
                        <motion.div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Payment Receipt, ${trxNumber}`}
                            aria-labelledby="receipt-trx-title"
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
                            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-md md:max-w-[480px] overflow-hidden outline-none"
                        >
                            {/* Mobile Drag Handle (Decoration only, hidden on tablet/desktop and from screen readers) */}
                            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0 bg-white" aria-hidden="true">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            {/* Fixed Header */}
                            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-accent-brown/10 shrink-0 bg-white">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div 
                                        className="w-11 h-11 bg-green-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm" 
                                        aria-hidden="true"
                                    >
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase text-slate-500 tracking-wider leading-none mb-1">
                                            {RIDER_TEXT.earnings.receiptModal.title}
                                        </p>
                                        <h2 
                                            id="receipt-trx-title" 
                                            className="text-lg sm:text-xl font-black text-accent-brown uppercase tracking-tight truncate"
                                        >
                                            {trxNumber}
                                        </h2>
                                    </div>
                                </div>
                                <button 
                                    ref={closeBtnRef}
                                    type="button"
                                    onClick={onClose} 
                                    aria-label="Close transaction details"
                                    className="min-w-[44px] min-h-[44px] w-11 h-11 bg-accent-peach/15 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 transition-all outline-none focus:ring-2 focus:ring-accent-brown/20 shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Content Middle */}
                            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
                                {/* 1. Main stats / Amount Received Card */}
                                <div className="bg-accent-peach/5 rounded-2xl p-5 sm:p-6 border border-accent-brown/10 text-center relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        {RIDER_TEXT.earnings.receiptModal.amountReceived}
                                    </p>
                                    <h3 className="text-3xl sm:text-4xl font-black text-accent-brown tracking-tight uppercase leading-none">
                                        ₱{(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                    <div className="mt-3.5 sm:mt-4 flex flex-wrap items-center justify-center gap-2.5">
                                        <span className="px-3 py-1 bg-green-500/15 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                                            {RIDER_TEXT.earnings.receiptModal.statusCompleted}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-normal">
                                            <History size={14} aria-hidden="true" /> {transaction.date}
                                        </span>
                                    </div>
                                </div>

                                {/* 2. Pickup & Dropoff Cards */}
                                <div className="space-y-3">
                                    {/* Pickup Place Card */}
                                    <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#FAF9F6] border border-accent-brown/5">
                                        <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center shrink-0 text-accent-brown" aria-hidden="true">
                                            <Store size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5">
                                                {RIDER_TEXT.earnings.receiptModal.pickupLabel}
                                            </p>
                                            <p className="text-sm sm:text-base font-bold text-accent-brown uppercase leading-snug break-words">
                                                {transaction.pickup_name || 'Hi-Vet Clinic'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Delivery Address Card */}
                                    <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#FAF9F6] border border-accent-brown/5">
                                        <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center shrink-0 text-accent-brown" aria-hidden="true">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5">
                                                {RIDER_TEXT.earnings.receiptModal.dropoffLabel}
                                            </p>
                                            <p className="text-sm sm:text-base font-bold text-accent-brown leading-snug break-words">
                                                {transaction.address || 'Delivery Address'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Footer with Close Button and Safe Area support */}
                            <div className="p-4 sm:p-5 border-t border-accent-brown/10 shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full min-h-[48px] h-12 bg-accent-brown text-white rounded-xl font-black uppercase text-sm tracking-wider shadow-md hover:bg-black transition-all active:scale-98 outline-none focus:ring-2 focus:ring-accent-brown/30 flex items-center justify-center"
                                >
                                    {RIDER_TEXT.earnings.receiptModal.closeBtn}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PaymentReceiptModal;
