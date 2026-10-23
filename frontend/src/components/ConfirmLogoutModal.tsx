import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HelpCircle, Loader2 } from 'lucide-react';

export interface ConfirmLogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
    error?: string | null;
}

export const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading: externalLoading = false,
    error = null,
}) => {
    const [internalLoading, setInternalLoading] = useState(false);
    const isLoading = externalLoading || internalLoading;
    const shouldReduceMotion = useReducedMotion();

    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusedElement = useRef<HTMLElement | null>(null);

    // Save previous active element & lock body scroll without jump
    useEffect(() => {
        if (!isOpen) return;

        previousFocusedElement.current = document.activeElement as HTMLElement | null;

        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        // Accessibility requirement: Focus moves into modal and lands on "Cancel"
        // so a quick Enter press does not log the person out by accident.
        const focusTimer = setTimeout(() => {
            cancelButtonRef.current?.focus();
        }, 30);

        return () => {
            clearTimeout(focusTimer);
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            if (previousFocusedElement.current && typeof previousFocusedElement.current.focus === 'function') {
                previousFocusedElement.current.focus();
            }
        };
    }, [isOpen]);

    // Handle Escape and Focus Trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (!isLoading) {
                    e.preventDefault();
                    onClose();
                }
                return;
            }

            if (e.key === 'Tab') {
                const focusableElements = [confirmButtonRef.current, cancelButtonRef.current].filter(
                    Boolean
                ) as HTMLButtonElement[];

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    const handleConfirmClick = async () => {
        if (isLoading) return;
        try {
            const result = onConfirm();
            if (result instanceof Promise) {
                setInternalLoading(true);
                await result;
                setInternalLoading(false);
            }
        } catch {
            setInternalLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-logout-title"
                    aria-describedby="confirm-logout-desc"
                >
                    {/* Backdrop: Plain light dim, at most 40% dark, with NO blur */}
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                        onClick={isLoading ? undefined : onClose}
                        className="fixed inset-0 bg-black/40 cursor-pointer"
                        aria-hidden="true"
                    />

                    {/* Card Container */}
                    <motion.div
                        ref={modalRef}
                        tabIndex={-1}
                        initial={
                            shouldReduceMotion
                                ? false
                                : { opacity: 0, scale: 0.95, y: 10 }
                        }
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={
                            shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.95, y: 10 }
                        }
                        transition={{
                            duration: shouldReduceMotion ? 0 : 0.2,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        className="relative w-full max-w-[400px] bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 shadow-2xl shadow-black/10 overflow-hidden text-center z-10 my-auto select-none max-h-[calc(100vh-2rem)] flex flex-col justify-between focus:outline-none"
                    >
                        {/* Faint cream circle decoration in bottom-left corner */}
                        <div
                            aria-hidden="true"
                            className="absolute -bottom-7 -left-7 w-24 h-24 rounded-full bg-[#FFF5EE] pointer-events-none"
                        />

                        {/* Modal Body */}
                        <div className="relative z-10 flex flex-col items-center">
                            {/* Orange circled question mark */}
                            <div
                                aria-hidden="true"
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFF5EE] flex items-center justify-center mx-auto mb-4 sm:mb-5 shrink-0"
                            >
                                <HelpCircle
                                    className="w-10 h-10 sm:w-11 sm:h-11 text-[#e05305] stroke-[2.3]"
                                />
                            </div>

                            {/* Title */}
                            <h2
                                id="confirm-logout-title"
                                className="text-2xl sm:text-[26px] font-black text-accent-brown tracking-tight leading-tight mb-2"
                            >
                                Confirm Log Out
                            </h2>

                            {/* Question text */}
                            <p
                                id="confirm-logout-desc"
                                className="text-sm sm:text-[15px] font-medium text-slate-600 leading-relaxed max-w-[280px] sm:max-w-[320px] mx-auto mb-6 sm:mb-7"
                            >
                                Are you sure you want to log out of your Hi-Vet account?
                            </p>

                            {/* Error if present */}
                            {error && (
                                <p className="text-xs font-bold text-red-500 mb-4 px-2">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Stacked Full-Width Buttons */}
                        <div className="relative z-10 flex flex-col gap-3 w-full">
                            {/* 1. Confirm button */}
                            <button
                                ref={confirmButtonRef}
                                type="button"
                                onClick={handleConfirmClick}
                                disabled={isLoading}
                                className="w-full h-12 sm:h-[50px] bg-[#e05305] hover:bg-[#c94700] active:scale-[0.98] text-white font-black text-sm sm:text-[15px] rounded-2xl shadow-md shadow-[#e05305]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e05305] focus-visible:ring-offset-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                ) : null}
                                <span>Confirm</span>
                            </button>

                            {/* 2. Cancel button */}
                            <button
                                ref={cancelButtonRef}
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full h-12 sm:h-[50px] bg-white hover:bg-slate-50 active:scale-[0.98] text-accent-brown font-bold text-sm sm:text-[15px] rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-brown focus-visible:ring-offset-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmLogoutModal;
