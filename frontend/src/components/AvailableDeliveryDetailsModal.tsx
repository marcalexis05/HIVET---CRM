import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Package, X, ArrowRight, Loader2, Navigation as NavIcon, AlertCircle } from 'lucide-react';
import { RIDER_TEXT } from '../constants/riderWording';
import { formatRiderOrderId, formatRiderOrderIdForAria } from '../utils/textFormatters';

interface AvailableDeliveryDetailsModalProps {
    order: any | null;
    isOpen: boolean;
    onClose: () => void;
    onAccept: (deliveryId: number) => Promise<void>;
    isAccepting: boolean;
}

const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AvailableDeliveryDetailsModal: React.FC<AvailableDeliveryDetailsModalProps> = ({
    order,
    isOpen,
    onClose,
    onAccept,
    isAccepting,
}) => {
    const shouldReduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    // Lock body scroll and compensate scrollbar width to prevent page shift
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

        // Auto-focus the close button on open (not the accept delivery button)
        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            clearTimeout(timer);
            // Restore focus to the trigger button that opened the sheet
            triggerElementRef.current?.focus?.();
        };
    }, [isOpen]);

    // Keyboard handling: Escape key and focus trap
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

    if (!order) return null;

    const formattedOrderId = formatRiderOrderId(order);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Plain light dim backdrop, max 40% dark, zero blur */}
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
                            aria-label={`Order ${formattedOrderId}`}
                            aria-labelledby="available-delivery-title"
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
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-lg md:max-w-xl overflow-hidden outline-none"
                        >
                            {/* Drag Handle (Mobile only, hidden on tablet/desktop, decoration only) */}
                            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0 bg-white" aria-hidden="true">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            {/* Fixed Header */}
                            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-accent-brown/10 shrink-0 bg-white">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0" aria-hidden="true">
                                        <Package size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                            {RIDER_TEXT.dashboard.orderCard.idLabel}
                                        </p>
                                        <h2
                                            id="available-delivery-title"
                                            className="text-lg sm:text-xl font-black text-accent-brown tracking-tight leading-snug break-words"
                                            aria-label={formatRiderOrderIdForAria(order)}
                                        >
                                            {formattedOrderId}
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                    <div className="text-right">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                            {RIDER_TEXT.dashboard.orderCard.payLabel}
                                        </p>
                                        <p className="text-lg sm:text-xl font-black text-accent-brown tracking-tight whitespace-nowrap">
                                            {formatCurrency(order.total_amount)}
                                        </p>
                                    </div>

                                    <button
                                        ref={closeBtnRef}
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close delivery details"
                                        className="min-w-[44px] min-h-[44px] w-11 h-11 bg-accent-peach/15 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 transition-all outline-none focus:ring-2 focus:ring-accent-brown/20 shrink-0"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content Middle */}
                            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6">
                                {/* 1. Package Items */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-brand">
                                            {RIDER_TEXT.dashboard.orderCard.itemsTitle}
                                        </h3>
                                        {order.items && order.items.length > 0 && (
                                            <span className="text-xs font-bold text-accent-brown/60 uppercase tracking-wider">
                                                {RIDER_TEXT.dashboard.orderCard.itemCount(order.items.length)}
                                            </span>
                                        )}
                                    </div>

                                    {order.items && order.items.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {order.items.map((item: any, idx: number) => (
                                                <div 
                                                    key={idx} 
                                                    className="flex items-center gap-3.5 bg-accent-peach/5 rounded-xl p-3 border border-accent-brown/10 hover:bg-accent-peach/10 transition-colors"
                                                >
                                                    <div className="w-12 h-12 bg-white rounded-lg border border-accent-brown/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-accent-brown/20">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={20} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-accent-brown leading-snug break-words mb-1">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs font-bold text-accent-brown/60 uppercase tracking-wider">
                                                            Qty: {item.quantity}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5 p-3 bg-red-50/50 rounded-xl border border-red-100 italic">
                                            <AlertCircle size={16} className="text-red-400 shrink-0" />
                                            <p className="text-xs font-bold text-red-400/80">
                                                {RIDER_TEXT.dashboard.orderCard.noItems}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Route Info: Pickup Place & Drop-off Location */}
                                <div className="space-y-3 bg-[#FAF9F6] rounded-2xl p-4 sm:p-5 border border-accent-brown/10">
                                    {/* Pickup Place */}
                                    <div className="flex gap-3.5 items-start">
                                        <div className="w-3 h-3 rounded-full bg-brand-dark mt-1 shrink-0" aria-hidden="true" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                                                    {RIDER_TEXT.dashboard.orderCard.pickupLabel}
                                                </p>
                                                {order.distance_km && (
                                                    <div className="shrink-0 flex items-center gap-1 text-accent-brown/80 text-xs font-bold bg-accent-peach/20 px-2 py-0.5 rounded-md">
                                                        <NavIcon size={11} aria-hidden="true" />
                                                        <span>{order.distance_km} KM</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-base font-black text-accent-brown uppercase tracking-tight leading-snug break-words">
                                                {order.clinic_name || order.pickup_name || 'Hi-Vet Site'}
                                            </p>
                                            <p className="text-sm text-slate-600 font-semibold mt-0.5 leading-relaxed break-words">
                                                {order.pickup_address}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dashed Connecting Line */}
                                    <div className="border-l-2 border-dashed border-accent-brown/20 ml-[5px] h-6 my-1" aria-hidden="true" />

                                    {/* Drop-off Location */}
                                    <div className="flex gap-3.5 items-start">
                                        <div className="w-3 h-3 rounded-full bg-orange-500 mt-1 shrink-0" aria-hidden="true" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                                                {RIDER_TEXT.dashboard.orderCard.dropoffLabel}
                                            </p>
                                            <p className="text-base font-black text-accent-brown leading-snug break-words">
                                                {order.delivery_address || 'Customer Point'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Free bottom padding so nothing is obscured by the fixed footer */}
                                <div className="h-2" aria-hidden="true" />
                            </div>

                            {/* Fixed Footer with Accept Delivery Button */}
                            <div className="p-4 sm:p-5 border-t border-accent-brown/10 shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
                                <button
                                    type="button"
                                    onClick={() => onAccept(order.delivery_id || order.id)}
                                    disabled={isAccepting}
                                    className="w-full bg-brand-dark hover:bg-black text-white min-h-[48px] h-12 sm:h-[50px] rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-brand-dark/30 group/btn"
                                >
                                    {isAccepting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                            <span>Accepting Delivery...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{RIDER_TEXT.dashboard.orderCard.acceptBtn}</span>
                                            <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AvailableDeliveryDetailsModal;
