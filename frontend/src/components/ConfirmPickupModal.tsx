import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { RIDER_TEXT } from '../constants/riderWording';

interface ConfirmPickupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    pinValue: string;
    onPinChange: (value: string) => void;
    isUpdatingStatus: boolean;
    error?: string | null;
}

const ConfirmPickupModal: React.FC<ConfirmPickupModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    pinValue,
    onPinChange,
    isUpdatingStatus,
    error,
}) => {
    const shouldReduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const cancelBtnRef = useRef<HTMLButtonElement>(null);

    // 1. Lock body scroll and compensate for scrollbar width to prevent background jump
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        // Auto-focus input on open
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 60);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            clearTimeout(timer);
        };
    }, [isOpen]);

    // 2. Keyboard accessibility: Escape key and focus trap
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Enter' && !isConfirmDisabled) {
            e.preventDefault();
            onConfirm();
            return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    const isConfirmDisabled = pinValue.trim().length < 3 || isUpdatingStatus;

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

                    {/* Responsive Modal / Bottom Sheet Wrapper */}
                    <div className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
                        <motion.div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="confirm-pickup-title"
                            aria-describedby="confirm-pickup-desc"
                            tabIndex={-1}
                            onKeyDown={handleKeyDown}
                            initial={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24 }
                            }
                            animate={
                                shouldReduceMotion
                                    ? { opacity: 1 }
                                    : { opacity: 1, y: 0 }
                            }
                            exit={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24 }
                            }
                            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-md md:max-w-[480px] overflow-hidden outline-none"
                        >
                            {/* Scrollable Content Body */}
                            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4 sm:space-y-5 text-center">
                                {/* Centered Shield Icon Tile */}
                                <div
                                    className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FFF5ED] rounded-2xl flex items-center justify-center mx-auto text-[#FB8500] shrink-0 border border-[#FB8500]/15 shadow-sm"
                                    aria-hidden="true"
                                >
                                    <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                                </div>

                                {/* Title */}
                                <div>
                                    <h2
                                        id="confirm-pickup-title"
                                        className="text-xl min-[400px]:text-2xl sm:text-[26px] font-black text-accent-brown uppercase tracking-tight text-center leading-snug px-1"
                                    >
                                        {RIDER_TEXT.dashboard.pickupModal.title}
                                    </h2>
                                    <p
                                        id="confirm-pickup-desc"
                                        className="text-sm sm:text-base font-medium text-slate-600 leading-relaxed text-center max-w-sm mx-auto mt-1.5 px-2 break-words"
                                    >
                                        {RIDER_TEXT.dashboard.pickupModal.description}
                                    </p>
                                </div>

                                {/* Serial Number Input Box */}
                                <div className="space-y-2 pt-1 text-left">
                                    <label
                                        htmlFor="package-serial-input"
                                        className="sr-only"
                                    >
                                        {RIDER_TEXT.dashboard.pickupModal.title}
                                    </label>
                                    <input
                                        ref={inputRef}
                                        id="package-serial-input"
                                        type="text"
                                        value={pinValue}
                                        onChange={(e) => onPinChange(e.target.value)}
                                        autoCorrect="off"
                                        autoCapitalize="characters"
                                        spellCheck={false}
                                        autoComplete="off"
                                        aria-labelledby="confirm-pickup-title"
                                        aria-describedby={error ? "pickup-serial-error" : "confirm-pickup-desc"}
                                        aria-invalid={!!error}
                                        className="w-full min-h-[52px] h-[52px] sm:h-14 bg-white border-2 border-[#FB8500] focus:border-[#FB8500] focus:ring-4 focus:ring-[#FB8500]/20 rounded-2xl text-center text-base sm:text-lg min-[400px]:text-xl font-black text-accent-brown tracking-normal min-[360px]:tracking-wider uppercase px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-semibold placeholder:tracking-widest"
                                        placeholder={RIDER_TEXT.dashboard.pickupModal.placeholder}
                                    />

                                    {/* Dedicated Error / Help text area (preserves height to prevent button jump) */}
                                    <div className="min-h-[22px] flex items-center justify-center px-1" aria-live="polite">
                                        {error ? (
                                            <p
                                                id="pickup-serial-error"
                                                className="text-sm font-semibold text-red-600 flex items-center justify-center gap-1.5 text-center leading-tight"
                                                role="alert"
                                            >
                                                <AlertCircle size={15} className="shrink-0 text-red-500" aria-hidden="true" />
                                                <span>{error}</span>
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Footer Buttons */}
                            <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-accent-brown/10 bg-white shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
                                <div className="flex flex-col-reverse min-[340px]:flex-row gap-3 items-stretch min-[340px]:items-center">
                                    <button
                                        ref={cancelBtnRef}
                                        type="button"
                                        onClick={onClose}
                                        className="min-[340px]:w-[40%] w-full min-h-[48px] h-12 sm:h-[50px] px-4 rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-wider text-accent-brown bg-white hover:bg-slate-50 border border-accent-brown/20 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 flex items-center justify-center"
                                    >
                                        {RIDER_TEXT.dashboard.pickupModal.cancelBtn}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onConfirm}
                                        disabled={isConfirmDisabled}
                                        aria-disabled={isConfirmDisabled}
                                        className={`min-[340px]:w-[60%] w-full min-h-[48px] h-12 sm:h-[50px] px-4 rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 ${
                                            isConfirmDisabled
                                                ? 'bg-slate-200 text-slate-600 cursor-not-allowed shadow-none'
                                                : 'bg-[#FB8500] hover:bg-[#E07400] text-white active:scale-[0.98] shadow-md shadow-[#FB8500]/25 cursor-pointer'
                                        }`}
                                    >
                                        {isUpdatingStatus ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
                                        ) : (
                                            RIDER_TEXT.dashboard.pickupModal.confirmBtn
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmPickupModal;
