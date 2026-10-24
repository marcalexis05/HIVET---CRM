import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
    LogOut, LayoutDashboard, ShoppingBag, Users, Settings, Bell,
    Calendar, Award, ShoppingCart, X, Plus, Minus, Wallet,
    BarChart2, UserCircle, Menu, Store, Truck, Check, MapPin,
    ChevronRight, ChevronLeft, Search, Zap, HelpCircle, Clock, Package, Shield,
    MessageCircle, Home, QrCode
} from 'lucide-react';
import { Logo } from './Logo';
import { AdminFooter } from './AdminFooter';
import SupportBot from './SupportBot';
import ConfirmLogoutModal from './ConfirmLogoutModal';
import NotificationBell from './NotificationBell';
import PwaInstallModal from './PwaInstallModal';
import { setPwaManifestForRole } from '../utils/pwaManager';
import { formatName } from '../utils/textFormatters';
import { RIDER_TEXT } from '../constants/riderWording';
import { CLINIC_TEXT } from '../constants/clinicWording';
import BusinessBottomNav from './BusinessBottomNav';
import ClinicAvatarBlock from './ClinicAvatarBlock';
import RiderAvatarBlock from './RiderAvatarBlock';
import AppTopHeader from './AppTopHeader';
import {
    calculateSideTabDimensions,
    runStandardScreenOverlapChecks
} from '../utils/moreMenuGeometry';

const MotionLink = motion(Link);

interface DashboardLayoutProps {
    children: ReactNode;
    title: string;
    hideHeader?: boolean;
    hideFooter?: boolean;
    branchContext?: { id: number | null; name: string; address?: string };
    branchAction?: ReactNode;
}

const DashboardLayout = ({ children, title, hideHeader = false, hideFooter = false, branchContext, branchAction }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const { items, totalItems, removeFromCart, updateQuantity } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isShortScreen, setIsShortScreen] = useState(() => typeof window !== 'undefined' && window.innerHeight < 520);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [showPwaModal, setShowPwaModal] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('hivet_sidebar_collapsed') === 'true');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const role = user?.role === 'business' ? 'business' : user?.role === 'rider' ? 'rider' : 'customer';
        setPwaManifestForRole(role);
    }, [user?.role]);

    const isCustomer = user?.role === 'customer';
    const isRider = user?.role === 'rider';
    const shouldReduceMotion = useReducedMotion();
    const isRtl = typeof document !== 'undefined' && (document.dir === 'rtl' || document.documentElement.dir === 'rtl');
    const moreButtonRef = useRef<HTMLButtonElement | null>(null);
    const prevMoreOpenRef = useRef(isMoreMenuOpen);

    const sideTabRef = useRef<HTMLDivElement | null>(null);

    // Responsive Side Tab Dimensions
    const [sideTabDims, setSideTabDims] = useState(() => {
        if (typeof window === 'undefined') return { width: 220, height: 300, rowHeight: 52, iconSize: 44, fontSizePx: 14, gap: 5, padding: 12 };
        return calculateSideTabDimensions(window.innerWidth, window.innerHeight);
    });

    // Responsively adapt side tab menu sizing & rotation
    useEffect(() => {
        const updateDimensions = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setIsShortScreen(h < 560);
            setSideTabDims(calculateSideTabDimensions(w, h));
        };
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Dev-time assertion check for geometries
    useEffect(() => {
        if (import.meta.env.DEV) {
            const check = runStandardScreenOverlapChecks();
            if (!check.passed) {
                console.warn('[MoreMenu] Overlap check detected issues:', check.results);
            }
        }
    }, []);

    // Return focus to "More" button when menu closes
    useEffect(() => {
        if (prevMoreOpenRef.current && !isMoreMenuOpen) {
            moreButtonRef.current?.focus();
        }
        prevMoreOpenRef.current = isMoreMenuOpen;
    }, [isMoreMenuOpen]);

    // Gracefully close "More" popup and revert dummy history entry
    const closeMoreMenu = () => {
        setIsMoreMenuOpen(false);
        if (typeof window !== 'undefined' && window.history.state?.hivetMoreMenu) {
            window.history.back();
        }
    };

    // Keyboard (Escape, ArrowUp, ArrowDown) & Hardware/Browser Back button handlers for "More" popup
    useEffect(() => {
        if (!isMoreMenuOpen) return;

        window.history.pushState({ hivetMoreMenu: true }, '');

        const handlePopState = () => {
            setIsMoreMenuOpen(false);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeMoreMenu();
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
                const menuItems = sideTabRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
                if (!menuItems || menuItems.length === 0) return;

                const activeIndex = Array.from(menuItems).indexOf(document.activeElement as HTMLButtonElement);
                e.preventDefault();

                if (e.key === 'Home') {
                    menuItems[0]?.focus();
                } else if (e.key === 'End') {
                    menuItems[menuItems.length - 1]?.focus();
                } else if (e.key === 'ArrowDown') {
                    const next = activeIndex < menuItems.length - 1 ? activeIndex + 1 : 0;
                    menuItems[next]?.focus();
                } else if (e.key === 'ArrowUp') {
                    const prev = activeIndex > 0 ? activeIndex - 1 : menuItems.length - 1;
                    menuItems[prev]?.focus();
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMoreMenuOpen]);

    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const handleQuantityInput = (item: any, value: string) => {
        let num = parseInt(value.replace(/[^0-9]/g, ''));
        if (isNaN(num)) num = 1;
        updateQuantity(item.id, num, item.variant, item.size);
    };

    const timerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    const startCounter = (item: any, increment: boolean) => {
        const initialItem = itemsRef.current.find(i => i.id === item.id && i.variant === item.variant && i.size === item.size);
        if (!initialItem) return;

        const newQty = increment ? initialItem.quantity + 1 : initialItem.quantity - 1;
        updateQuantity(initialItem.id, newQty, initialItem.variant, initialItem.size);

        timerRef.current = setTimeout(() => {
            let speed = 100;
            const run = () => {
                const currentItem = itemsRef.current.find(i => i.id === item.id && i.variant === item.variant && i.size === item.size);
                if (currentItem) {
                    const nextQty = increment ? currentItem.quantity + 1 : currentItem.quantity - 1;
                    updateQuantity(item.id, nextQty, item.variant, item.size);
                    intervalRef.current = setTimeout(run, speed);
                    if (speed > 30) speed -= 10;
                }
            };
            run();
        }, 400);
    };

    const stopCounter = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearTimeout(intervalRef.current);
    };

    const fetchNotifications = async () => {
        const token = localStorage.getItem('hivet_token');
        if (!token) return;
        const isAdmin = ['super_admin', 'system_admin'].includes(user?.role || '');
        const endpoint = isAdmin ? 'http://localhost:8000/api/admin/alerts' : 'http://localhost:8000/api/notifications';

        try {
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const newSelection = new Set(selectedItems);
        items.forEach(item => {
            const key = `${item.id}-${item.variant}-${item.size}`;
            if (!newSelection.has(key)) {
                newSelection.add(key);
            }
        });
        const currentKeys = new Set(items.map(item => `${item.id}-${item.variant}-${item.size}`));
        Array.from(newSelection).forEach(key => {
            if (!currentKeys.has(key)) newSelection.delete(key);
        });
        setSelectedItems(newSelection);
    }, [items]);

    const toggleSelection = (key: string) => {
        const next = new Set(selectedItems);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setSelectedItems(next);
    };

    const selectedCount = items.filter(i => selectedItems.has(`${i.id}-${i.variant}-${i.size}`)).length;
    const selectiveAmount = items
        .filter(i => selectedItems.has(`${i.id}-${i.variant}-${i.size}`))
        .reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);

    const markAsRead = async (id: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const markAllAsRead = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            await fetch(`http://localhost:8000/api/notifications/read-all`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const deleteNotification = async (id: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        localStorage.setItem('hivet_sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);

    const businessLinks = [
        { name: CLINIC_TEXT.nav.dashboard, path: '/dashboard/business', icon: LayoutDashboard },
        { 
            name: CLINIC_TEXT.nav.reservations, 
            path: '/dashboard/business/reservations', 
            icon: Calendar,
            submenus: [
                { name: CLINIC_TEXT.nav.schedule, path: '/dashboard/business/reservations?tab=hours', icon: Clock },
                { name: CLINIC_TEXT.nav.overrides, path: '/dashboard/business/reservations?tab=special', icon: Zap },
                { 
                    name: CLINIC_TEXT.nav.clinicServices, 
                    path: '/dashboard/business/reservations?tab=services',
                    icon: Settings,
                    submenus: [
                        { name: CLINIC_TEXT.nav.launchNewService, path: '/dashboard/business/reservations?tab=services&action=launch', icon: Plus }
                    ]
                }
            ]
        },
        { name: CLINIC_TEXT.nav.orders, path: '/dashboard/business/orders', icon: ShoppingBag },
        { 
            name: CLINIC_TEXT.nav.store, 
            path: '/dashboard/business/catalog', 
            icon: Store,
            submenus: [
                { name: CLINIC_TEXT.nav.addProductItem, path: '/dashboard/business/catalog/product/new', icon: Plus }
            ]
        },
        { name: CLINIC_TEXT.nav.analytics, path: '/dashboard/business/analytics', icon: BarChart2 },
        { name: CLINIC_TEXT.nav.account, path: '/dashboard/business/account', icon: UserCircle },
    ];

    const userLinks = [
        { name: 'Home', path: '/dashboard/customer', icon: Home },
        { name: 'Store', path: '/dashboard/customer/catalog', icon: ShoppingBag },
        { name: 'Orders', path: '/dashboard/customer/orders', icon: ShoppingBag },
        { name: 'Visits', path: '/dashboard/customer/reservations', icon: Calendar },
        { name: 'Clinic Map', path: '/dashboard/customer/map', icon: MapPin },
        { name: 'Rewards', path: '/dashboard/customer/loyalty', icon: Award },
        { name: 'Notifications', path: '/dashboard/customer/alerts', icon: Bell },
        { name: 'Account', path: '/dashboard/customer/account', icon: UserCircle },
    ];

    const superAdminLinks = [
        { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Clinic Compliance', path: '/dashboard/admin/compliance/clinics', icon: Store },
        { name: 'Rider Compliance', path: '/dashboard/admin/compliance/riders', icon: Truck },
        { name: 'Customer Records', path: '/dashboard/admin/customer-records', icon: Users },
        { name: 'Global Directory', path: '/dashboard/admin/users', icon: Shield },
        { name: 'System Alerts', path: '/dashboard/admin/alerts', icon: Bell },
    ];

    const systemAdminLinks = [
        { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Clinic Compliance', path: '/dashboard/admin/compliance/clinics', icon: Store },
        { name: 'Rider Compliance', path: '/dashboard/admin/compliance/riders', icon: Truck },
        { name: 'Customer Records', path: '/dashboard/admin/customer-records', icon: Users },
        { name: 'System Alerts', path: '/dashboard/admin/alerts', icon: Bell },
    ];

    const riderLinks = [
        { name: RIDER_TEXT.nav.home, path: '/dashboard/rider', icon: Home },
        { name: RIDER_TEXT.nav.history, path: '/dashboard/rider/orders', icon: ShoppingBag },
        { name: RIDER_TEXT.nav.earnings, path: '/dashboard/rider/earnings', icon: Wallet },
        { name: RIDER_TEXT.nav.notifications, path: '/dashboard/rider/alerts', icon: Bell },
        { name: RIDER_TEXT.nav.profile, path: '/dashboard/rider/account', icon: UserCircle },
    ];

    const links = user?.role === 'super_admin' ? superAdminLinks :
        user?.role === 'system_admin' ? systemAdminLinks :
            user?.role === 'business' ? businessLinks :
                user?.role === 'rider' ? riderLinks :
                    userLinks;

    const basePath = ['super_admin', 'system_admin'].includes(user?.role || '') ? 'admin' : user?.role;
    const hasStockError = items.some(item => item.stock !== undefined && item.quantity > item.stock);
    const currentPathName = links.find(l => location.pathname === l.path)?.name || title;
    const hubLabel = user?.role === 'business' ? CLINIC_TEXT.nav.hub : (user?.role === 'rider' ? RIDER_TEXT.nav.home : 'Hub');
    const isHome = !currentPathName || currentPathName.trim().toLowerCase() === 'home' || currentPathName.trim().toLowerCase() === hubLabel.trim().toLowerCase();

    // --- RENDER SIDEBAR LAYOUT (For Business/Admin/Rider) ---
    if (!isCustomer && user) {
        return (
            <div className="min-h-screen min-h-[100dvh] w-full bg-[#FAF9F6] flex transition-all duration-300 overflow-x-hidden">
                <aside className={`hidden lg:flex flex-col bg-white border-r border-accent-brown/5 fixed inset-y-0 left-0 z-50 overflow-hidden shadow-2xl shadow-accent-brown/5 transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-72'}`}>
                    {/* Collapse Toggle */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="absolute right-[-12px] top-12 w-8 h-8 bg-white border border-accent-brown/10 rounded-full flex items-center justify-center shadow-lg z-[60] text-black hover:bg-brand hover:text-white transition-all group"
                    >
                        <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
                            <ChevronLeft size={16} className="group-hover:scale-110 transition-transform" />
                        </motion.div>
                    </button>

                    <div className={`p-8 pb-10 transition-all ${isCollapsed ? 'px-4' : 'px-8'}`}>
                        <div className={`flex items-center group ${isCollapsed ? 'justify-center' : 'gap-3.5'}`}>
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-xl shadow-brand/10 flex items-center justify-center p-2 border border-brand/5 group-hover:scale-105 transition-transform shrink-0">
                                <Logo className="w-full h-full" />
                            </div>
                            {!isCollapsed && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col overflow-hidden">
                                    <h2 className="text-2xl font-black text-accent-brown tracking-tighter leading-none mb-1 whitespace-nowrap">Hi-Vet</h2>
                                    <p className="text-xs font-bold text-brand-dark transition-all opacity-70 leading-none whitespace-nowrap">
                                        {user?.role === 'super_admin' ? 'Super Admin' :
                                            user?.role === 'system_admin' ? 'System Admin' :
                                                user?.role === 'business' ? CLINIC_TEXT.nav.partnerPortal :
                                                    'Rider Portal'}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-8">
                        {links.map((link) => {
                            const linkBase = link.path.split('?')[0];
                            const isParentActive = (link.name === 'Dashboard' || link.name === 'Home')
                                ? location.pathname === linkBase 
                                : location.pathname.startsWith(linkBase);
                            const hasSubmenus = !!(link as any).submenus;

                            return (
                                <div key={link.name} className="relative">
                                    <NavLink
                                        to={link.path}
                                        onClick={(e) => {
                                            if (hasSubmenus && isParentActive && !location.search) {
                                                e.preventDefault(); // Prevent navigating entirely if just clicking the active parent
                                            }
                                        }}
                                        end={link.name === 'Dashboard'}
                                        className={() => `flex items-center rounded-2xl font-bold text-xs transition-all group relative ${isCollapsed ? 'justify-center p-4' : 'gap-3 px-4 py-4'} ${isParentActive ? 'bg-brand text-white shadow-lg shadow-brand/20 ml-2' : 'text-accent-brown hover:text-brand hover:bg-brand/5'}`}
                                    >
                                        {() => (
                                            <>
                                                <link.icon className={`w-5 h-5 transition-transform group-hover:scale-110 shrink-0 ${isParentActive ? 'text-white' : 'text-black group-hover:text-brand'}`} />
                                                {!isCollapsed && (
                                                    <motion.span initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="whitespace-nowrap">{link.name}</motion.span>
                                                )}
                                                {isParentActive && !isCollapsed && <motion.div layoutId="active-nav" className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1.5 h-8 bg-brand-dark rounded-r-full" />}
                                                {hasSubmenus && !isCollapsed && (
                                                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isParentActive ? 'rotate-90 text-white/50' : 'text-accent-brown/30'}`} />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                    
                                    <AnimatePresence>
                                        {hasSubmenus && isParentActive && !isCollapsed && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="ml-10 mt-2 mb-4 space-y-4 border-l-2 border-brand/20 pl-4 py-1">
                                                    {(link as any).submenus.map((sub: any) => {
                                                        const basePath = sub.path.split('?')[0];
                                                        const subQuery = sub.path.split('?')[1];
                                                        
                                                        const isSubActive = subQuery 
                                                            ? location.search.includes(subQuery.split('&')[0]) 
                                                            : (basePath === '/dashboard/business/catalog' 
                                                                ? location.pathname === basePath 
                                                                : location.pathname.startsWith(basePath));
                                                                
                                                        const isLaunchActive = location.search.includes('action=launch');
                                                        
                                                        return (
                                                            <div key={sub.name}>
                                                                <Link to={sub.path} className={`flex items-center gap-2.5 font-semibold text-xs transition-all ${(isSubActive && !isLaunchActive) || (isSubActive && !sub.submenus) ? 'text-brand drop-shadow-sm' : 'text-black opacity-80 hover:opacity-100 hover:text-brand'}`}>
                                                                    {sub.icon && <sub.icon className="w-4 h-4 opacity-70" />}
                                                                    {sub.name}
                                                                </Link>
                                                                
                                                                {/* Deep nested submenus */}
                                                                {sub.submenus && isSubActive && (
                                                                    <div className="ml-5 mt-3 space-y-3 border-l-2 border-brand/10 pl-4">
                                                                        {sub.submenus.map((deep: any) => {
                                                                            const deepActive = location.search.includes(deep.path.split('?')[1]);
                                                                            return (
                                                                                <Link key={deep.name} to={deep.path} className={`flex items-center gap-2 font-medium text-xs transition-all ${deepActive ? 'text-brand' : 'text-black opacity-60 hover:opacity-100 hover:text-brand'}`}>
                                                                                    {deep.icon && <deep.icon className="w-3.5 h-3.5 opacity-70" />}
                                                                                    {deep.name}
                                                                                </Link>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </nav>

                    <div className={`mt-auto transition-all ${isCollapsed ? 'p-4' : 'p-6'}`}>
                        <div className={`bg-accent-peach/5 p-4 rounded-3xl border border-accent-peach/10 relative group overflow-hidden ${isCollapsed ? 'flex justify-center' : ''}`}>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white border border-brand/5 shadow-sm flex items-center justify-center text-accent-brown overflow-hidden shrink-0">
                                    {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full opacity-20 p-2" />}
                                </div>
                                {!isCollapsed && (
                                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-[11px] font-black text-accent-brown truncate leading-none mb-1 text-xs">{user?.clinic_name || user?.name || 'My Account'}</p>
                                        <p className="text-xs font-medium text-slate-500 truncate">{user?.email}</p>
                                    </motion.div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-brand/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </div>
                        <button onClick={() => setIsLogoutModalOpen(true)} className={`w-full mt-4 py-4 rounded-2xl flex items-center justify-center gap-3 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all font-bold text-xs shadow-sm ${isCollapsed ? 'px-0' : 'px-4'}`}>
                            <LogOut className="w-4 h-4 shrink-0" /> 
                            {!isCollapsed && <span>{user?.role === 'business' ? CLINIC_TEXT.nav.logOutPortal : 'Log Out'}</span>}
                        </button>
                    </div>
                </aside>

                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
                    {!hideHeader && (
                        user?.role === 'business' ? (
                        /* Clinic Business Unified Responsive Header (shared transparent-on-top shell) */
                        <AppTopHeader
                            role="banner"
                            position="sticky"
                            surface="portal"
                            className="h-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(5rem+env(safe-area-inset-top,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] lg:pl-8 lg:pr-8 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]"
                        >
                            {/* Mobile / Tablet (< 1024px): Clinic Avatar Block on the Left */}
                            <div className="flex lg:hidden items-center min-w-0 flex-1 mr-2">
                                <ClinicAvatarBlock maxTextWidth="max-w-[calc(100vw-120px)] xs:max-w-[280px] sm:max-w-[360px]" />
                            </div>

                            {/* Desktop (>= 1024px): Breadcrumb on the Left */}
                            <div className="hidden lg:flex items-center gap-2 min-w-0">
                                <Link
                                    to={`/dashboard/${basePath}`}
                                    className="text-xs font-bold text-slate-400 hover:text-brand-dark transition-colors"
                                >
                                    {hubLabel}
                                </Link>
                                {!isHome && (
                                    <>
                                        <ChevronRight className="w-3 h-3 text-accent-brown/20 shrink-0" />
                                        <span className="text-xs font-bold text-accent-brown truncate max-w-[200px]">
                                            {currentPathName}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Right Side: Search Box + Bell + Desktop Clinic Avatar Block */}
                            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
                                {/* Desktop Search Input */}
                                <div className="hidden lg:flex items-center gap-2.5 bg-accent-peach/5 border border-accent-brown/5 px-3.5 py-2 rounded-2xl w-48 xl:w-60 group focus-within:border-brand/40 transition-all">
                                    <Search className="w-3.5 h-3.5 text-accent-brown/30" />
                                    <input
                                        type="text"
                                        placeholder={CLINIC_TEXT.nav.searchPlaceholder}
                                        className="bg-transparent border-none outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/30 w-full"
                                    />
                                </div>

                                {/* Notification Bell */}
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    markAsRead={markAsRead}
                                    markAllAsRead={markAllAsRead}
                                    deleteNotification={deleteNotification}
                                    variant="portal"
                                />
                                <button
                                    onClick={() => setShowPwaModal(true)}
                                    title="Install App & Scan QR Code"
                                    aria-label="Install App / Scan QR Code"
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand/10 hover:bg-brand/20 text-brand flex items-center justify-center transition-all cursor-pointer shrink-0"
                                >
                                    <QrCode className="w-5 h-5" />
                                </button>


                                {/* Desktop Clinic Avatar Block (Next to Bell) */}
                                <div className="hidden lg:flex items-center border-l border-accent-brown/10 pl-3 xl:pl-4">
                                    <ClinicAvatarBlock maxTextWidth="max-w-[160px] xl:max-w-[220px]" />
                                </div>

                                {branchAction && <div className="hidden xl:block">{branchAction}</div>}
                            </div>
                        </AppTopHeader>
                    ) : user?.role === 'rider' ? (
                        /* Rider Unified Responsive Header (shared transparent-on-top shell) */
                        <AppTopHeader
                            role="banner"
                            position="sticky"
                            surface="portal"
                            className="h-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(5rem+env(safe-area-inset-top,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] lg:pl-8 lg:pr-8 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]"
                        >
                            {/* Left: Rider Avatar Block */}
                            <div className="flex items-center min-w-0 flex-1 mr-3">
                                <RiderAvatarBlock maxTextWidth="max-w-[calc(100vw-120px)] xs:max-w-[280px] sm:max-w-[420px] lg:max-w-[500px]" />
                            </div>

                            {/* Right: Bell with Unread Dot */}
                            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    markAsRead={markAsRead}
                                    markAllAsRead={markAllAsRead}
                                    deleteNotification={deleteNotification}
                                    variant="portal"
                                />
                                <button
                                    onClick={() => setShowPwaModal(true)}
                                    title="Install App & Scan QR Code"
                                    aria-label="Install App / Scan QR Code"
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand/10 hover:bg-brand/20 text-brand flex items-center justify-center transition-all cursor-pointer shrink-0"
                                >
                                    <QrCode className="w-5 h-5" />
                                </button>
                                {branchAction && <div className="hidden xl:block">{branchAction}</div>}
                            </div>
                        </AppTopHeader>
                    ) : (
                        /* Original Header for Admins */
                        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-accent-brown/5 sticky top-0 z-40 px-4 sm:px-8 lg:px-10 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                {!isRider && (
                                    <button
                                        aria-label="Open Navigation Menu"
                                        className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center bg-accent-peach/10 rounded-xl text-accent-brown hover:bg-accent-peach/20 active:scale-95 transition-all"
                                        onClick={() => setIsMobileMenuOpen(true)}
                                    >
                                        <Menu className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="flex items-center gap-2 min-w-0">
                                    {!isHome && (
                                        <>
                                            <Link
                                                to={`/dashboard/${basePath}`}
                                                className="text-xs font-bold text-slate-400 hover:text-brand-dark transition-colors hidden xs:block"
                                            >
                                                {hubLabel}
                                            </Link>
                                            <ChevronRight className="w-3 h-3 text-accent-brown/20 hidden xs:block shrink-0" />
                                        </>
                                    )}
                                    <h1 className="text-lg font-black text-accent-brown tracking-tight truncate max-w-[180px] xs:max-w-none">{currentPathName}</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                <div className="hidden sm:flex items-center gap-3 bg-accent-peach/5 border border-accent-brown/5 px-4 py-2.5 rounded-2xl w-64 group focus-within:border-brand/40 transition-all">
                                    <Search className="w-4 h-4 text-accent-brown/30" />
                                    <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/20 w-full" />
                                </div>
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    markAsRead={markAsRead}
                                    markAllAsRead={markAllAsRead}
                                    deleteNotification={deleteNotification}
                                    variant="portal"
                                />
                                <button
                                    onClick={() => setShowPwaModal(true)}
                                    title="Install App & Scan QR Code"
                                    aria-label="Install App / Scan QR Code"
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand/10 hover:bg-brand/20 text-brand flex items-center justify-center transition-all cursor-pointer shrink-0"
                                >
                                    <QrCode className="w-5 h-5" />
                                </button>
                                {branchAction && <div className="hidden xl:block">{branchAction}</div>}
                            </div>
                        </header>
                    ))}
                    <main className={`flex-1 p-4 sm:p-6 lg:p-10 w-full overflow-x-hidden ${hideHeader ? 'pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] lg:pt-10' : ''} ${user?.role === 'business' ? 'pb-28 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px)+1.5rem)] md:pb-6 lg:pb-10' : ''}`}>
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                            {children}
                        </motion.div>
                    </main>
                    {!hideFooter && (
                        (user?.role === 'super_admin' || user?.role === 'system_admin') ? (
                            <AdminFooter />
                        ) : null
                    )}
                </div>
                {/* Non-Customer Mobile Drawer */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-brand-dark/60 backdrop-blur-md z-[60]" />
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-[280px] bg-white z-[70] flex flex-col">
                                <div className="p-6 flex items-center justify-between border-b border-brand-dark/5 bg-accent-peach/10">
                                    <span className="font-bold text-xs text-slate-500">Navigation</span>
                                    <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                                    {links?.map((link) => (
                                        <NavLink
                                            key={link?.name}
                                            to={link?.path || '#'}
                                            end={link?.name === 'Dashboard' || link?.name === 'Home'}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }) => `flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-xs transition-all group ${isActive ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-black hover:bg-brand hover:text-white'}`}
                                        >
                                            <link.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" /> <span>{link?.name}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
                {/* Support Bot Widget */}
                <SupportBot hideFloating={isLogoutModalOpen} />
                {/* Business Mobile Bottom Navigation Bar (Phones < 768px) */}
                {user?.role === 'business' && !hideFooter && (
                    <BusinessBottomNav onOpenLogout={() => setIsLogoutModalOpen(true)} />
                )}
                <ConfirmLogoutModal
                    isOpen={isLogoutModalOpen}
                    onClose={() => setIsLogoutModalOpen(false)}
                    onConfirm={handleLogout}
                />
            </div>
        );
    }

    // Customer "More" Popup Menu Items (The remaining 4 items not in bottom bar)
    const moreMenuItems = [
        {
            id: 'map',
            name: 'Clinic Map',
            path: '/dashboard/customer/map',
            icon: MapPin,
        },
        {
            id: 'rewards',
            name: 'Rewards',
            path: '/dashboard/customer/loyalty',
            icon: Award,
        },
        {
            id: 'alerts',
            name: 'Notifications',
            path: '/dashboard/customer/alerts',
            icon: Bell,
            badge: unreadCount,
        },
        {
            id: 'account',
            name: 'Account',
            path: '/dashboard/customer/account',
            icon: UserCircle,
        },
    ];

    const handleMoreItemClick = (item: (typeof moreMenuItems)[number]) => {
        setIsMoreMenuOpen(false);
        if (item.path) {
            if (typeof window !== 'undefined' && window.history.state?.hivetMoreMenu) {
                navigate(item.path, { replace: true });
            } else {
                navigate(item.path);
            }
        }
    };

    // --- RENDER ORIGINAL TOP-NAV LAYOUT (Specifically for Customers) ---
    return (
        <div className={`min-h-screen flex flex-col ${user?.role === 'rider' ? 'bg-[#FAF9F6]' : 'bg-accent-peach/20'}`}>
            {/* Top Navigation Bar */}
            {!hideHeader && (
                <AppTopHeader as="nav" position="fixed" surface="customer" className="h-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(5.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]">
                    <div className="max-w-[1920px] mx-auto px-4 sm:px-8 h-full flex items-center justify-between gap-6">
                        {/* Profile Avatar & User Info (or Brand for non-customers) */}
                        {isCustomer ? (
                            <Link
                                to="/dashboard/customer/account"
                                className="flex items-center gap-2.5 sm:gap-3.5 shrink min-w-0 max-w-[calc(100vw-130px)] xs:max-w-none group transition-all"
                                title="View Account Profile"
                            >
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-brand/10 border-2 border-brand/30 overflow-hidden flex items-center justify-center text-brand-dark font-black text-xs sm:text-sm shadow-sm group-hover:scale-105 group-hover:border-brand transition-all shrink-0">
                                    {user?.avatar ? (
                                        <img src={user?.avatar} alt={user?.name || 'User Profile'} className="w-full h-full object-cover" />
                                    ) : (
                                        (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <h2 className="text-sm sm:text-lg font-black text-accent-brown tracking-tight leading-tight truncate group-hover:text-brand-dark transition-colors">
                                        {formatName(user?.name) || 'My Profile'}
                                    </h2>
                                    <p className="text-xs mt-0.5 font-bold text-black/60 truncate">
                                        Bronze Elite Member
                                    </p>
                                </div>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 transition-opacity">
                                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-xl shadow-md shadow-brand/10 flex items-center justify-center p-1.5 shrink-0 border border-brand/5">
                                    <Logo className="w-full h-full" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <h2 className="text-base sm:text-xl lg:text-[22px] font-black text-accent-brown tracking-tighter leading-none truncate">{user?.clinic_name || 'Hi-Vet'}</h2>
                                    <p className="text-xs mt-0.5 font-bold text-black transition-all whitespace-nowrap opacity-60 capitalize">
                                        {user?.role || 'Portal'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Desktop Navigation Links */}
                        <div className="hidden lg:flex items-center justify-center flex-1 gap-1 xl:gap-2">
                            {links?.map((link) => (
                                <NavLink
                                    key={link?.name}
                                    to={link?.path || '#'}
                                    end={link?.path === `/dashboard/${basePath}`}
                                    className={({ isActive }) => {
                                        const hasSearch = link?.path?.includes('?') || false;
                                        const actuallyActive = hasSearch ? (location.pathname + location.search === link?.path) : isActive;
                                        return `flex items-center gap-2 px-3 xl:px-4 py-2.5 rounded-full font-black text-[12px] xl:text-[13px] transition-all cursor-pointer whitespace-nowrap ${actuallyActive
                                            ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                            : 'text-accent-brown hover:text-brand hover:bg-brand/5'
                                            }`
                                    }}
                                >
                                    <link.icon className="w-4 h-4 shrink-0" />
                                    <span className="inline">{link?.name}</span>
                                </NavLink>
                            ))}
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            {user?.role === 'customer' && (
                                <motion.button
                                    onClick={() => setIsCartOpen(true)}
                                    aria-label={`Shopping cart with ${totalItems} items`}
                                    className="relative min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 bg-brand-dark/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-dark hover:text-white hover:bg-brand hover:shadow-lg hover:shadow-brand/20 transition-all cursor-pointer"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm pointer-events-none">
                                            {totalItems}
                                        </span>
                                    )}
                                </motion.button>
                            )}

                            <NotificationBell
                                notifications={notifications}
                                unreadCount={unreadCount}
                                markAsRead={markAsRead}
                                markAllAsRead={markAllAsRead}
                                deleteNotification={deleteNotification}
                                variant="customer"
                            />

                            <button
                                onClick={() => setShowPwaModal(true)}
                                title="Install App & Scan QR Code"
                                aria-label="Install App / Scan QR Code"
                                className="min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 bg-brand/10 hover:bg-brand/20 text-brand rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                            >
                                <QrCode className="w-5 h-5" />
                            </button>

                            <div className="hidden lg:flex items-center">
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                    whileTap={{ scale: 0.9, rotate: 5 }}
                                    onClick={() => setIsLogoutModalOpen(true)}
                                    className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-xl hover:shadow-red-500/20 transition-all cursor-pointer shrink-0"
                                >
                                    <LogOut className="w-4.5 h-4.5 sm:w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </AppTopHeader>
            )}

            <main className={`flex-1 flex flex-col w-full px-2 sm:px-4 lg:px-6 ${hideHeader ? 'pt-[calc(1.5rem+env(safe-area-inset-top,0px))]' : 'pt-[calc(6rem+env(safe-area-inset-top,0px))] sm:pt-[calc(7rem+env(safe-area-inset-top,0px))] lg:pt-30'} pb-24 lg:pb-16`}>
                {title && (
                    <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-accent-brown tracking-tighter leading-tight">{title}</h1>
                            {branchContext?.id && (
                                <div className="flex items-center gap-1.5 text-brand-dark font-bold text-xs bg-brand/10 px-3 py-1 rounded-full self-start mt-4">
                                    <MapPin className="w-3 h-3" />
                                    {branchContext?.name}
                                    {branchContext?.address && <span className="text-brand-dark/70 font-bold normal-case ml-1">| {branchContext?.address}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                    {children}
                </motion.div>
            </main>


            {/* Customer Mobile Bottom Navigation Bar */}
            {isCustomer && !hideFooter && (
                <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 ${isMoreMenuOpen ? 'bg-white' : 'bg-white/95 backdrop-blur-xl'} border-t border-accent-brown/10 shadow-[0_-10px_25px_rgba(0,0,0,0.06)] h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-2`}>
                    <div className="flex items-center justify-around h-full max-w-lg mx-auto">
                        {[
                            { name: 'Home', path: '/dashboard/customer', icon: Home },
                            { name: 'Store', path: '/dashboard/customer/catalog', icon: ShoppingBag },
                            { name: 'Orders', path: '/dashboard/customer/orders', icon: Package },
                            { name: 'Visits', path: '/dashboard/customer/reservations', icon: Calendar },
                        ].map((item) => {
                            const isActive = item.path === '/dashboard/customer'
                                ? location.pathname === '/dashboard/customer'
                                : location.pathname.startsWith(item.path);
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.path}
                                    end={item.path === '/dashboard/customer'}
                                    onClick={() => { if (isMoreMenuOpen) closeMoreMenu(); }}
                                    className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                                        isActive && !isMoreMenuOpen ? 'text-brand-dark' : 'text-black hover:text-brand-dark'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${isActive && !isMoreMenuOpen ? 'bg-brand-dark/10 scale-105' : 'group-hover:scale-105'}`}>
                                        <item.icon className={`w-5 h-5 ${isActive && !isMoreMenuOpen ? 'stroke-[2.5]' : 'stroke-2'}`} />
                                    </div>
                                    <span className={`text-xs leading-none mt-0.5 ${isActive && !isMoreMenuOpen ? 'font-black' : 'font-bold'}`}>
                                        {item.name}
                                    </span>
                                </NavLink>
                            );
                        })}
                        <button
                            ref={moreButtonRef}
                            type="button"
                            onClick={() => {
                                if (isMoreMenuOpen) {
                                    closeMoreMenu();
                                } else {
                                    setIsMoreMenuOpen(true);
                                }
                            }}
                            aria-expanded={isMoreMenuOpen}
                            aria-haspopup="dialog"
                            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                                isMoreMenuOpen || ['/dashboard/customer/map', '/dashboard/customer/loyalty', '/dashboard/customer/alerts', '/dashboard/customer/account'].some(p => location.pathname.startsWith(p))
                                    ? 'text-brand-dark'
                                    : 'text-black hover:text-brand-dark'
                            }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${
                                isMoreMenuOpen || ['/dashboard/customer/map', '/dashboard/customer/loyalty', '/dashboard/customer/alerts', '/dashboard/customer/account'].some(p => location.pathname.startsWith(p))
                                    ? 'bg-brand-dark/10 scale-105'
                                    : 'group-hover:scale-105'
                            }`}>
                                {isMoreMenuOpen ? (
                                    <X className="w-5 h-5 stroke-[2.5] text-brand" />
                                ) : (
                                    <Menu className="w-5 h-5 stroke-2" />
                                )}
                            </div>
                            <span className={`text-xs leading-none mt-0.5 ${
                                isMoreMenuOpen || ['/dashboard/customer/map', '/dashboard/customer/loyalty', '/dashboard/customer/alerts', '/dashboard/customer/account'].some(p => location.pathname.startsWith(p))
                                    ? 'font-black text-brand-dark'
                                    : 'font-bold'
                            }`}>
                                {isMoreMenuOpen ? 'Close' : 'More'}
                            </span>
                        </button>
                    </div>
                </nav>
            )}

            {/* Customer Animated Side Tab "More" Menu Attached Flat to Right Edge */}
            <AnimatePresence>
                {isCustomer && isMoreMenuOpen && (
                    <>
                        {/* Light Dim Backdrop - Zero blur, page remains crisp & legible */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
                            onClick={closeMoreMenu}
                            className="lg:hidden fixed inset-0 bg-black/[0.08] z-40"
                            aria-hidden="true"
                        />

                        {/* Vertical Side Tab Panel stuck flat to right edge (or left in RTL) */}
                        <motion.div
                            ref={sideTabRef}
                            role="menu"
                            aria-label="More navigation options"
                            initial={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? '-100%' : '100%', opacity: 0.8 }}
                            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? '-100%' : '100%', opacity: 0 }}
                            transition={shouldReduceMotion ? { duration: 0.1 } : { type: 'spring', damping: 28, stiffness: 320, duration: 0.26 }}
                            style={{
                                width: `${sideTabDims.width}px`,
                            }}
                            className={`lg:hidden fixed ${
                                isRtl
                                    ? 'left-0 rounded-r-[24px] rounded-l-none border-r border-y shadow-[10px_0_30px_rgba(0,0,0,0.12)]'
                                    : 'right-0 rounded-l-[24px] rounded-r-none border-l border-y shadow-[-10px_0_30px_rgba(0,0,0,0.12)]'
                            } bottom-[calc(4rem+8px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-5rem-env(safe-area-inset-bottom,0px)-16px)] z-[51] bg-white border-slate-200/90 select-none overflow-hidden flex flex-col pointer-events-auto`}
                        >
                            {/* Scrollable list of 5 rows with 12px padding */}
                            <div className="flex flex-col gap-1 p-3 overflow-y-auto max-h-full no-scrollbar">
                                {moreMenuItems.map((item, idx) => {
                                    const isActive = item.path && location.pathname.startsWith(item.path);

                                    return (
                                        <motion.button
                                            key={item.id}
                                            type="button"
                                            role="menuitem"
                                            data-tab-item={item.id}
                                            custom={idx}
                                            initial={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? -14 : 14, opacity: 0 }}
                                            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
                                            exit={shouldReduceMotion ? { opacity: 0 } : { x: isRtl ? -14 : 14, opacity: 0 }}
                                            transition={shouldReduceMotion ? { duration: 0.1 } : { delay: 0.04 + idx * 0.03, duration: 0.2 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoreItemClick(item);
                                            }}
                                            style={{ minHeight: `${sideTabDims.rowHeight}px` }}
                                            className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer select-none group ${
                                                isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'
                                            } ${
                                                isActive
                                                    ? 'bg-brand/10 text-brand-dark'
                                                    : 'hover:bg-slate-100/80 active:bg-slate-200/60 text-slate-800'
                                            } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
                                        >
                                            {/* Round Icon Button (40px-46px) */}
                                            <div
                                                style={{ width: `${sideTabDims.iconSize}px`, height: `${sideTabDims.iconSize}px` }}
                                                className={`rounded-full flex items-center justify-center shrink-0 relative transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
                                                isActive
                                                    ? 'bg-brand text-white shadow-md shadow-brand/30 ring-2 ring-brand/40'
                                                    : 'bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm group-hover:bg-brand group-hover:text-white group-hover:border-brand'
                                            }`}>
                                                <item.icon className="w-5 h-5 stroke-[2.2]" />
                                                {item.badge && item.badge > 0 ? (
                                                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce shadow-sm">
                                                        {item.badge}
                                                    </span>
                                                ) : null}
                                            </div>

                                            {/* Full Label (At least 14px, single line, never shortened) */}
                                            <span className={`text-sm tracking-tight leading-snug whitespace-nowrap transition-colors flex-1 ${
                                                isActive ? 'font-black text-brand-dark' : 'font-bold text-slate-800 group-hover:text-brand-dark'
                                            }`}>
                                                {item.name}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
                            <div className="h-24 px-6 border-b flex items-center justify-between shrink-0 bg-accent-peach/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><ShoppingCart className="w-5 h-5" /></div>
                                    <div><h2 className="font-black text-accent-brown text-xl leading-none">Your Cart</h2><p className="text-xs font-bold text-black mt-1">{totalItems} items</p></div>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50"><ShoppingCart className="w-16 h-16 mb-4" /><p className="text-sm font-bold">Your cart is empty.</p></div>
                                ) : (
                                    items.map((item, idx) => (
                                        <motion.div key={`${item.id}-${item.variant}-${item.size}-${idx}`} className={`flex gap-4 p-4 bg-white border-2 rounded-2xl relative transition-all ${selectedItems.has(`${item.id}-${item.variant}-${item.size}`) ? 'border-brand/20 shadow-sm' : 'border-brand-dark/5 opacity-60 grayscale-[0.5]'}`}>
                                            <div className="flex items-center"><button onClick={() => toggleSelection(`${item.id}-${item.variant}-${item.size}`)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedItems.has(`${item.id}-${item.variant}-${item.size}`) ? 'bg-brand border-brand text-white' : 'border-brand-dark/20 bg-white'}`}>{selectedItems.has(`${item.id}-${item.variant}-${item.size}`) && <Check className="w-3.5 h-3.5" />}</button></div>
                                            <button onClick={() => removeFromCart(item.id, item.variant, item.size)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                                            <div className="w-20 h-20 bg-accent-peach/10 rounded-xl p-2 flex items-center justify-center"><img src={item.image} className="w-full h-full object-contain" /></div>
                                            <div className="flex-1 flex flex-col">
                                                <h4 className="font-black text-xs text-accent-brown leading-tight mb-1">{item.name}</h4>
                                                {item.description && (
                                                    <p className="text-[10px] text-black/50 line-clamp-1 mb-1 font-medium">{item.description}</p>
                                                )}
                                                <p className="text-xs font-bold text-black mb-auto">{item.variant} • {item.size}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-black text-brand-dark">₱{item.price}</span>
                                                    <div className="flex items-center gap-1 bg-accent-peach/20 rounded-lg p-1">
                                                        <button onMouseDown={() => startCounter(item, false)} onMouseUp={stopCounter} onMouseLeave={stopCounter} className="w-6 h-6 bg-white rounded-md flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                                        <input type="text" value={item.quantity} onChange={(e) => handleQuantityInput(item, e.target.value)} className="text-xs font-black w-6 text-center bg-transparent outline-none" />
                                                        <button onMouseDown={() => startCounter(item, true)} onMouseUp={stopCounter} onMouseLeave={stopCounter} className="w-6 h-6 bg-white rounded-md flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                            {items.length > 0 && (
                                <div className="p-6 border-t bg-white">
                                    <div className="flex flex-col gap-2 mb-6">
                                        <div className="flex justify-between text-xs font-bold text-black"><span>Selected ({selectedCount})</span><span>Subtotal</span></div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-2">
                                                <button onClick={() => setSelectedItems(new Set(items.map(i => `${i.id}-${i.variant}-${i.size}`)))} className="text-xs font-bold hover:underline text-brand">All</button>
                                                <button onClick={() => setSelectedItems(new Set())} className="text-xs font-bold text-slate-500 hover:underline">None</button>
                                            </div>
                                            <span className="text-2xl font-black italic">₱{selectiveAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button
                                        disabled={hasStockError || selectedCount === 0}
                                        onClick={() => {
                                            const filteredItems = items.filter(i => selectedItems.has(`${i.id}-${i.variant}-${i.size}`));
                                            localStorage.setItem('hivet_checkout_filtered', JSON.stringify(filteredItems));
                                            setIsCartOpen(false);
                                            navigate('/dashboard/customer/checkout');
                                        }}
                                        className={`w-full py-4 rounded-xl font-black text-sm ${hasStockError || selectedCount === 0 ? 'bg-slate-100 text-slate-300' : 'bg-brand text-white shadow-lg shadow-brand/20'}`}
                                    >
                                        Checkout
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Support Bot Widget (Accessible via More Menu -> Chat Support or Floating Button) */}
            <SupportBot hideFloating={isMoreMenuOpen || isCartOpen || isLogoutModalOpen} />
            <ConfirmLogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
            />
            <PwaInstallModal
                isOpen={showPwaModal}
                onClose={() => setShowPwaModal(false)}
                initialRole={user?.role === 'business' ? 'business' : user?.role === 'rider' ? 'rider' : 'customer'}
            />
        </div>
    );
};

export default DashboardLayout;
