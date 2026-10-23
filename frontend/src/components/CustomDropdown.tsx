import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
    label: string | number;
    value: any;
    disabled?: boolean;
    badge?: string;
    icon?: React.ReactNode;
}

interface CustomDropdownProps {
    value: any;
    options: (string | number | Option)[];
    onChange: (val: any) => void;
    className?: string;
    label?: string;
    placeholder?: string;
    icon?: React.ReactNode;
    isRequired?: boolean;
    isOptional?: boolean;
    buttonClassName?: string;
    labelClassName?: string;
    disabled?: boolean;
    hideInlineLabel?: boolean;
}

export const CustomDropdown = ({ 
    value, 
    options, 
    onChange, 
    className = "", 
    label, 
    placeholder = "Select Option...",
    icon,
    isRequired = false,
    isOptional = false,
    buttonClassName,
    labelClassName,
    disabled = false,
    hideInlineLabel = false
}: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640);
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        width: number;
        maxHeight: number;
        opensUpward: boolean;
    }>({
        top: 0,
        left: 0,
        width: 200,
        maxHeight: 280,
        opensUpward: false
    });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const selectedOptionRef = useRef<HTMLButtonElement | null>(null);

    const getLabel = (val: any) => {
        if (val === "" || val === null || val === undefined) return placeholder;
        const opt = options.find(o => typeof o === 'object' ? o.value === val : o === val);
        return typeof opt === 'object' ? opt.label : (opt || placeholder);
    };

    // Calculate smart floating geometry for desktop & tablet
    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const isMob = vw <= 640;
        setIsMobile(isMob);
        if (isMob) return;

        // Dropdown width: at least as wide as the selector, clamped between 180px and 260px (or full width if selector is wider)
        const dropdownWidth = Math.max(rect.width, 180);
        
        // Horizontal alignment with screen edge protection
        let left = rect.left;
        if (left + dropdownWidth > vw - 16) {
            left = Math.max(16, rect.right - dropdownWidth);
        }
        if (left + dropdownWidth > vw - 16) {
            left = Math.max(16, vw - dropdownWidth - 16);
        }

        // Vertical collision and flip detection
        const spaceBelow = vh - rect.bottom - 16;
        const spaceAbove = rect.top - 16;
        const desiredHeight = 280;

        const shouldOpenUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

        let top = 0;
        let maxHeight = desiredHeight;

        if (shouldOpenUpward) {
            maxHeight = Math.min(desiredHeight, Math.max(120, spaceAbove));
            top = rect.top - maxHeight - 8;
        } else {
            maxHeight = Math.min(desiredHeight, Math.max(120, spaceBelow));
            top = rect.bottom + 8;
        }

        setCoords({
            top,
            left,
            width: dropdownWidth,
            maxHeight,
            opensUpward: shouldOpenUpward
        });
    };

    // Keep position updated on scroll and resize
    useLayoutEffect(() => {
        if (!isOpen) return;

        updatePosition();

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });

        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
        };
    }, [isOpen]);

    // Outside click and Escape key dismissal
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                menuRef.current?.contains(target)
            ) {
                return;
            }
            setIsOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown, { passive: true });
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Scroll active item into view when dropdown opens
    useEffect(() => {
        if (isOpen && selectedOptionRef.current) {
            selectedOptionRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [isOpen]);

    const handleSelect = (val: any) => {
        onChange(val);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const renderedOptions = options.map((opt, index) => {
        const optLabel = typeof opt === 'object' ? opt.label : opt;
        const val = typeof opt === 'object' ? opt.value : opt;
        const isDisabled = typeof opt === 'object' && opt.disabled;
        const badge = typeof opt === 'object' ? opt.badge : null;
        const optIcon = typeof opt === 'object' ? opt.icon : null;
        const isSelected = value === val;

        return (
            <button
                key={index}
                type="button"
                ref={isSelected ? selectedOptionRef : null}
                role="option"
                aria-selected={isSelected}
                disabled={isDisabled}
                onClick={() => {
                    if (!isDisabled) handleSelect(val);
                }}
                className={`w-full min-h-[48px] px-4 py-3 text-left text-sm font-bold transition-all relative flex items-center justify-between rounded-xl select-none cursor-pointer ${
                    isDisabled 
                        ? 'text-accent-brown/30 bg-accent-peach/5 cursor-not-allowed italic font-medium' 
                        : isSelected 
                            ? 'bg-brand/10 text-brand-dark font-black' 
                            : 'text-accent-brown hover:bg-accent-peach/15 hover:text-black active:bg-accent-peach/25'
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    {optIcon && (
                        <span className={`transition-colors shrink-0 ${isSelected ? 'text-brand' : 'text-accent-brown/30'}`}>
                            {optIcon}
                        </span>
                    )}
                    <span className="truncate">{optLabel}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isDisabled 
                                ? 'bg-accent-brown/5 text-accent-brown/20' 
                                : isSelected 
                                    ? 'bg-brand/15 text-brand-dark' 
                                    : 'bg-accent-peach/30 text-accent-brown/60'
                        }`}>
                            {badge}
                        </span>
                    )}
                    {isSelected && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center bg-brand text-white shadow-sm shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                    )}
                </div>
            </button>
        );
    });

    return (
        <div className={`relative w-full ${className}`}>
            {label && !hideInlineLabel && (
                <label className={labelClassName || "text-xs font-semibold text-slate-700 block mb-1.5 ml-0.5"}>
                    {label} 
                    {isRequired && <span className="text-brand ml-1">*</span>}
                    {isOptional && (
                        <span className="text-slate-600 text-xs font-normal not-italic ml-1.5">Optional</span>
                    )}
                </label>
            )}

            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={label ? `${label}, ${getLabel(value)}` : undefined}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                    }
                }}
                className={
                    buttonClassName 
                        ? `${buttonClassName} ${isOpen ? 'border-brand bg-white ring-2 ring-brand/20 shadow-md' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}` 
                        : `w-full bg-accent-peach/20 border border-amber-900/15 transition-all duration-200 rounded-2xl min-h-[52px] h-[52px] sm:h-14 py-3.5 px-4 text-base font-bold text-accent-brown flex items-center justify-between outline-none group ${
                            isOpen 
                                ? 'border-brand bg-white shadow-md ring-2 ring-brand/20' 
                                : 'hover:border-accent-peach/50 hover:bg-white'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
                }
            >
                <div className="flex items-center gap-3 min-w-0">
                    {icon && (
                        <span className={`transition-colors shrink-0 ${isOpen ? 'text-brand' : 'text-accent-brown/30'}`}>
                            {icon}
                        </span>
                    )}
                    <span className={`truncate tracking-normal text-base ${!value ? 'text-stone-500 font-normal' : 'font-bold text-accent-brown'}`}>
                        {getLabel(value)}
                    </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-accent-brown/50 transition-transform duration-300 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-brand' : 'group-hover:text-accent-brown'}`} />
            </button>

            {/* Portal Rendering: Floating Popover on Desktop, Bottom Sheet on Phones */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        isMobile ? (
                            /* ── MOBILE BOTTOM SHEET (Phones <= 640px) ── */
                            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
                                {/* Dimmed backdrop with NO blur */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => setIsOpen(false)}
                                    className="fixed inset-0 bg-black/50 select-none"
                                />

                                {/* Bottom Sheet panel */}
                                <motion.div
                                    ref={menuRef}
                                    role="listbox"
                                    aria-label={label || placeholder}
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                    className="relative w-full bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[60vh] z-10 overflow-hidden pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
                                >
                                    {/* Grabber handle */}
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                                    {/* Header */}
                                    <div className="px-6 py-3 flex items-center justify-between border-b border-accent-brown/5 shrink-0">
                                        <div className="min-w-0">
                                            <h4 className="text-base font-black text-accent-brown tracking-tight truncate">
                                                {label || placeholder || "Select Time"}
                                            </h4>
                                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-wider">
                                                Tap an option to select
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            aria-label="Close"
                                            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 active:scale-95 transition-all shrink-0"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Scrollable list */}
                                    <div className="p-4 overflow-y-auto space-y-1 overscroll-contain flex-1">
                                        {renderedOptions}
                                    </div>
                                </motion.div>
                            </div>
                        ) : (
                            /* ── DESKTOP & TABLET FLOATING DROPDOWN (Window > 640px) ── */
                            <div className="fixed inset-0 z-[9999] pointer-events-none">
                                <motion.div
                                    ref={menuRef}
                                    role="listbox"
                                    aria-label={label || placeholder}
                                    initial={{ opacity: 0, y: coords.opensUpward ? 10 : -10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: coords.opensUpward ? 10 : -10, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    style={{
                                        position: 'fixed',
                                        top: `${coords.top}px`,
                                        left: `${coords.left}px`,
                                        width: `${coords.width}px`,
                                        maxHeight: `${coords.maxHeight}px`,
                                    }}
                                    className="bg-white rounded-2xl shadow-[0_16px_45px_rgba(0,0,0,0.18)] border border-accent-peach/20 overflow-hidden py-1.5 overflow-y-auto ring-1 ring-black/5 pointer-events-auto flex flex-col space-y-0.5 px-1.5"
                                >
                                    {renderedOptions}
                                </motion.div>
                            </div>
                        )
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
