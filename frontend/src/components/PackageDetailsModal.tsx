import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Sparkles, Award, Clock3, CheckCircle } from 'lucide-react';
import { formatName } from '../utils/textFormatters';

export interface PackageModalData {
    id: number;
    name: string;
    price: number;
    description: string | null;
    duration_minutes?: number;
    is_package?: boolean;
    package_items_json?: string | null;
    loyalty_points?: number;
    category?: string;
}

interface PackageDetailsModalProps {
    packageModal: PackageModalData | null;
    onClose: () => void;
    onSelect: (pkg: PackageModalData) => void;
    isSelected: boolean;
}

const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
    packageModal,
    onClose,
    onSelect,
    isSelected,
}) => {
    const shouldReduceMotion = useReducedMotion();
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Escape key listener and focus management
    useEffect(() => {
        if (!packageModal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [packageModal, onClose]);

    if (!packageModal) return null;

    let items: string[] = [];
    try {
        if (packageModal.package_items_json) {
            const parsed = JSON.parse(packageModal.package_items_json);
            items = Array.isArray(parsed) ? parsed : [];
        }
    } catch {
        items = [];
    }

    const loyaltyPoints = packageModal.loyalty_points ?? 0;
    const durationMinutes = packageModal.duration_minutes ?? 0;

    const modalContent = (
        <AnimatePresence>
            <motion.div
                key="package-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="fixed inset-0 z-[200] bg-black/40 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overflow-hidden"
                style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
            >
                <motion.div
                    key="package-modal-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="package-modal-title"
                    initial={
                        shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: 35 }
                    }
                    animate={
                        shouldReduceMotion
                            ? { opacity: 1 }
                            : { opacity: 1, y: 0 }
                    }
                    exit={
                        shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: 35 }
                    }
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#FAF9F6] w-full sm:w-[92%] sm:max-w-[620px] lg:max-w-[840px] xl:max-w-[880px] max-h-[92dvh] sm:max-h-[88dvh] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden border border-accent-brown/10 text-accent-brown"
                >
                    {/* Fixed Header */}
                    <header className="bg-white px-5 sm:px-7 py-4 sm:py-5 border-b border-accent-brown/10 flex items-start justify-between gap-3 shrink-0">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-4 sm:h-4.5 bg-brand rounded-full shrink-0" aria-hidden="true" />
                                <span className="text-xs font-black uppercase tracking-wider text-accent-brown/70 leading-none">
                                    Pet Care Package
                                </span>
                            </div>
                            <h2
                                id="package-modal-title"
                                className="text-2xl sm:text-3xl lg:text-[34px] font-black italic tracking-tight text-accent-brown uppercase leading-tight break-words"
                            >
                                {formatName(packageModal.name)}
                            </h2>
                            <p className="text-sm font-medium text-accent-brown/75 leading-relaxed mt-1">
                                Everything your pet needs in one visit.
                            </p>
                        </div>
                        <button
                            ref={closeBtnRef}
                            type="button"
                            onClick={onClose}
                            aria-label="Close package details"
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-accent-peach/20 hover:bg-accent-peach/40 active:scale-95 text-accent-brown flex items-center justify-center transition-all shrink-0 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </header>

                    {/* Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5 lg:space-y-0 no-scrollbar">
                        <div className="flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
                            {/* Left Column (Desktop) / Top Section (Mobile & Tablet) */}
                            <div className="w-full lg:w-[46%] lg:shrink-0 space-y-4 sm:space-y-5">
                                {/* What's Included Card */}
                                <div className="bg-white border border-brand/15 rounded-2xl p-4 sm:p-5 shadow-xs">
                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center shadow-md shadow-brand/20 shrink-0"
                                            aria-hidden="true"
                                        >
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-brand-dark block">
                                                Included In Care
                                            </span>
                                            <h3 className="text-sm sm:text-base font-black text-accent-brown uppercase tracking-tight leading-tight">
                                                What's Included
                                            </h3>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-accent-brown/85 leading-relaxed italic mt-3">
                                        This package includes all the care your pet needs in one visit.
                                    </p>
                                </div>

                                {/* Price & Points Block */}
                                <div className="bg-white border border-accent-brown/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                                    <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="text-xs font-black text-accent-brown/70 uppercase tracking-wider block mb-1">
                                                Price
                                            </span>
                                            <span className="text-3xl sm:text-4xl font-black text-accent-brown italic tracking-tight leading-none whitespace-nowrap tabular-nums">
                                                ₱{packageModal.price.toLocaleString()}
                                            </span>
                                        </div>

                                        {loyaltyPoints > 0 && (
                                            <div
                                                className="bg-brand text-white px-3.5 py-2 rounded-xl shadow-md shadow-brand/20 flex items-center gap-2 shrink-0 select-none"
                                                aria-label={`Earn ${loyaltyPoints} points`}
                                            >
                                                <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                <span className="text-xs font-black uppercase tracking-wider leading-tight">
                                                    {loyaltyPoints} Points Reward
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {durationMinutes > 0 && (
                                        <div className="pt-2 border-t border-accent-brown/5 flex items-center gap-2 text-xs font-bold text-accent-brown/75 uppercase tracking-wider">
                                            <Clock3 className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                                            <span>{durationMinutes} Min Estimated Time</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column (Desktop) / Bottom Section (Mobile & Tablet) */}
                            <div className="w-full lg:flex-1 space-y-3">
                                <div className="flex items-center justify-between gap-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-3.5 bg-brand rounded-full shrink-0" aria-hidden="true" />
                                        <span className="text-xs font-black uppercase tracking-wider text-accent-brown/70">
                                            Package Details
                                        </span>
                                    </div>
                                    {items.length > 0 && (
                                        <span className="text-xs font-bold text-accent-brown/60 bg-accent-peach/20 px-2.5 py-0.5 rounded-full tabular-nums">
                                            {items.length} {items.length === 1 ? 'service' : 'services'} included
                                        </span>
                                    )}
                                </div>

                                {items.length > 0 ? (
                                    <ul className="space-y-2.5" role="list">
                                        {items.map((item, i) => (
                                            <li
                                                key={i}
                                                className="min-h-[52px] p-3.5 sm:p-4 bg-white border border-accent-brown/10 rounded-2xl flex items-center gap-3.5 shadow-xs transition-colors hover:border-brand/30"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs"
                                                    aria-hidden="true"
                                                >
                                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold text-accent-brown leading-snug break-words flex-1">
                                                    {formatName(item)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-accent-brown/15 rounded-2xl text-center bg-white">
                                        <p className="text-xs font-bold text-accent-brown/40 uppercase tracking-wider italic">
                                            No technical data available.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Footer with Full-Width Action Button */}
                    <footer className="bg-white px-5 sm:px-7 py-4 border-t border-accent-brown/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                        <button
                            type="button"
                            onClick={() => onSelect(packageModal)}
                            className={`w-full min-h-[48px] sm:min-h-[52px] h-12 sm:h-13 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer ${
                                isSelected
                                    ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                                    : 'bg-brand-dark text-white shadow-brand-dark/20 hover:bg-black'
                            }`}
                        >
                            {isSelected ? (
                                <>
                                    <CheckCircle className="w-4.5 h-4.5" />
                                    <span>Package Selected</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4.5 h-4.5" />
                                    <span>Select This Package</span>
                                </>
                            )}
                        </button>
                    </footer>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default PackageDetailsModal;
