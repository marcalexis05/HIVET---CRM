import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    LayoutDashboard,
    Calendar,
    ShoppingBag,
    Store,
    Menu,
    X,
    BarChart2,
    UserCircle
} from 'lucide-react';
import { CLINIC_TEXT } from '../constants/clinicWording';
import { calculateSideTabDimensions } from '../utils/moreMenuGeometry';

interface BusinessBottomNavProps {
    onOpenLogout?: () => void;
}

const BusinessBottomNav: React.FC<BusinessBottomNavProps> = ({ onOpenLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const moreButtonRef = useRef<HTMLButtonElement | null>(null);
    const sideTabRef = useRef<HTMLDivElement | null>(null);

    // Responsive Side Tab Dimensions (matching Customer More Tab geometry)
    const [sideTabDims, setSideTabDims] = useState(() => {
        if (typeof window === 'undefined') return { width: 220, height: 260, rowHeight: 52, iconSize: 44, fontSizePx: 14, gap: 5, padding: 12 };
        return calculateSideTabDimensions(window.innerWidth, window.innerHeight);
    });

    useEffect(() => {
        const updateDimensions = () => {
            setSideTabDims(calculateSideTabDimensions(window.innerWidth, window.innerHeight));
        };
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const isRtl = typeof document !== 'undefined' && document.dir === 'rtl';

    // Close "More" tab on route change
    useEffect(() => {
        setIsMoreOpen(false);
    }, [location.pathname]);

    // Handle Escape key and body scroll lock
    useEffect(() => {
        if (!isMoreOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsMoreOpen(false);
                moreButtonRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMoreOpen]);

    // Hide bottom bar when mobile keyboard is open to prevent jumping over inputs
    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                setIsInputFocused(true);
            }
        };

        const handleFocusOut = () => {
            setIsInputFocused(false);
        };

        window.addEventListener('focusin', handleFocusIn);
        window.addEventListener('focusout', handleFocusOut);

        return () => {
            window.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('focusout', handleFocusOut);
        };
    }, []);

    // Main 4 Bottom Nav Links
    const primaryNavItems = [
        {
            name: CLINIC_TEXT.nav.dashboard,
            path: '/dashboard/business',
            icon: LayoutDashboard,
            isActive: location.pathname === '/dashboard/business',
        },
        {
            name: CLINIC_TEXT.nav.reservations,
            path: '/dashboard/business/reservations',
            icon: Calendar,
            isActive: location.pathname.startsWith('/dashboard/business/reservations'),
        },
        {
            name: CLINIC_TEXT.nav.orders,
            path: '/dashboard/business/orders',
            icon: ShoppingBag,
            isActive: location.pathname.startsWith('/dashboard/business/orders'),
        },
        {
            name: CLINIC_TEXT.nav.store,
            path: '/dashboard/business/catalog',
            icon: Store,
            isActive: location.pathname.startsWith('/dashboard/business/catalog'),
        },
    ];

    // Check if the "More" tab is active (either side tab is open or user is on Reports/Account)
    const isMoreActive =
        isMoreOpen ||
        location.pathname.startsWith('/dashboard/business/analytics') ||
        location.pathname.startsWith('/dashboard/business/account');

    // Items inside the "More" Side Tab
    const moreSheetItems = [
        {
            name: CLINIC_TEXT.nav.analytics,
            path: '/dashboard/business/analytics',
            icon: BarChart2,
            isActive: location.pathname.startsWith('/dashboard/business/analytics'),
            action: () => {
                setIsMoreOpen(false);
                navigate('/dashboard/business/analytics');
            },
        },
        {
            name: CLINIC_TEXT.nav.account,
            path: '/dashboard/business/account',
            icon: UserCircle,
            isActive: location.pathname.startsWith('/dashboard/business/account'),
            action: () => {
                setIsMoreOpen(false);
                navigate('/dashboard/business/account');
            },
        },
    ];

    return (
        <>
            {/* Fixed Bottom Navigation Bar on Phones (hidden on >= 768px) */}
            <nav
                aria-label="Clinic Navigation"
                className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-accent-brown/10 shadow-[0_-10px_25px_rgba(0,0,0,0.06)] h-16 px-2 pb-[env(safe-area-inset-bottom,0px)] select-none transition-transform duration-200 ${
                    isInputFocused ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
                }`}
            >
                <div className="flex items-center justify-around h-full max-w-lg mx-auto">
                    {/* Primary 4 Tabs */}
                    {primaryNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/dashboard/business'}
                            onClick={() => setIsMoreOpen(false)}
                            aria-current={item.isActive ? 'page' : undefined}
                            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 transition-all group select-none outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                item.isActive ? 'text-brand-dark' : 'text-slate-700 hover:text-brand-dark'
                            }`}
                        >
                            <div
                                className={`p-1.5 rounded-xl transition-all ${
                                    item.isActive ? 'bg-brand-dark/10 scale-105' : 'group-hover:scale-105'
                                }`}
                            >
                                <item.icon
                                    className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-2'}`}
                                    aria-hidden="true"
                                />
                            </div>
                            <span
                                className={`text-xs leading-none mt-0.5 truncate max-w-full px-0.5 ${
                                    item.isActive
                                        ? 'font-black text-brand-dark'
                                        : 'font-bold text-slate-700 group-hover:text-brand-dark'
                                }`}
                            >
                                {item.name}
                            </span>
                        </NavLink>
                    ))}

                    {/* 5th Tab: More */}
                    <button
                        ref={moreButtonRef}
                        type="button"
                        onClick={() => setIsMoreOpen((prev) => !prev)}
                        aria-expanded={isMoreOpen}
                        aria-haspopup="menu"
                        aria-label={isMoreOpen ? 'Close more options' : 'Open more navigation options'}
                        className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 transition-all group select-none outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
                            isMoreActive ? 'text-brand-dark' : 'text-slate-700 hover:text-brand-dark'
                        }`}
                    >
                        <div
                            className={`p-1.5 rounded-xl transition-all ${
                                isMoreActive ? 'bg-brand-dark/10 scale-105' : 'group-hover:scale-105'
                            }`}
                        >
                            {isMoreOpen ? (
                                <X className="w-5 h-5 stroke-[2.5] text-brand-dark" aria-hidden="true" />
                            ) : (
                                <Menu
                                    className={`w-5 h-5 ${isMoreActive ? 'stroke-[2.5]' : 'stroke-2'}`}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                        <span
                            className={`text-xs leading-none mt-0.5 truncate max-w-full px-0.5 ${
                                isMoreActive
                                    ? 'font-black text-brand-dark'
                                    : 'font-bold text-slate-700 group-hover:text-brand-dark'
                            }`}
                        >
                            {isMoreOpen ? 'Close' : 'More'}
                        </span>
                    </button>
                </div>
            </nav>

            {/* "More" Side Tab (Matches Image 1 layout: right-aligned floating panel with round icons) */}
            <AnimatePresence>
                {isMoreOpen && (
                    <>
                        {/* Light Dim Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0.05 : 0.15 }}
                            onClick={() => {
                                setIsMoreOpen(false);
                                moreButtonRef.current?.focus();
                            }}
                            className="md:hidden fixed inset-0 bg-black/25 z-50 backdrop-blur-none"
                            aria-hidden="true"
                        />

                        {/* Side Tab Panel stuck flat to right edge (or left in RTL) */}
                        <motion.div
                            ref={sideTabRef}
                            role="menu"
                            aria-label="More navigation options"
                            initial={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? '-100%' : '100%', opacity: 0.8 }}
                            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? '-100%' : '100%', opacity: 0 }}
                            transition={
                                shouldReduceMotion
                                    ? { duration: 0.1 }
                                    : { type: 'spring', damping: 28, stiffness: 320, duration: 0.26 }
                            }
                            style={{
                                width: `${sideTabDims.width}px`,
                            }}
                            className={`md:hidden fixed ${
                                isRtl
                                    ? 'left-0 rounded-r-[24px] rounded-l-none border-r border-y shadow-[10px_0_30px_rgba(0,0,0,0.12)]'
                                    : 'right-0 rounded-l-[24px] rounded-r-none border-l border-y shadow-[-10px_0_30px_rgba(0,0,0,0.12)]'
                            } bottom-[calc(4rem+8px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-5rem-env(safe-area-inset-bottom,0px)-16px)] z-50 bg-white border-slate-200/90 select-none overflow-hidden flex flex-col pointer-events-auto`}
                        >
                            {/* Vertical list of items */}
                            <div className="flex flex-col gap-1 p-3 overflow-y-auto max-h-full no-scrollbar">
                                {moreSheetItems.map((item, idx) => (
                                    <motion.button
                                        key={item.path}
                                        type="button"
                                        role="menuitem"
                                        initial={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? -14 : 14, opacity: 0 }}
                                        animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
                                        exit={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? -14 : 14, opacity: 0 }}
                                        transition={shouldReduceMotion ? { duration: 0.1 } : { delay: 0.04 + idx * 0.03, duration: 0.2 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            item.action();
                                        }}
                                        style={{ minHeight: `${sideTabDims.rowHeight}px` }}
                                        className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer select-none group ${
                                            isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'
                                        } ${
                                            item.isActive
                                                ? 'bg-brand/10 text-brand-dark'
                                                : 'hover:bg-slate-100/80 active:bg-slate-200/60 text-slate-800'
                                        } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
                                    >
                                        {/* Round Icon Button (matching Image 1) */}
                                        <div
                                            style={{ width: `${sideTabDims.iconSize}px`, height: `${sideTabDims.iconSize}px` }}
                                            className={`rounded-full flex items-center justify-center shrink-0 relative transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
                                                item.isActive
                                                    ? 'bg-brand text-white shadow-md shadow-brand/30 ring-2 ring-brand/40'
                                                    : 'bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm group-hover:bg-brand group-hover:text-white group-hover:border-brand'
                                            }`}
                                        >
                                            <item.icon className="w-5 h-5 stroke-[2.2]" />
                                        </div>

                                        {/* Bold label */}
                                        <span
                                            className={`text-sm tracking-tight leading-snug whitespace-nowrap transition-colors flex-1 ${
                                                item.isActive ? 'font-black text-brand-dark' : 'font-bold text-slate-800 group-hover:text-brand-dark'
                                            }`}
                                        >
                                            {item.name}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default BusinessBottomNav;
