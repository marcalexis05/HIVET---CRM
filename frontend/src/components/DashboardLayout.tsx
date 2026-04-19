import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
    LogOut, LayoutDashboard, ShoppingBag, Users, Settings, Bell,
    Calendar, Award, ShoppingCart, X, Plus, Minus, Wallet,
    BarChart2, UserCircle, Menu, Store, Truck, Check, MapPin,
    ChevronRight, Search, Zap, HelpCircle, Clock, Package, Shield
} from 'lucide-react';
import { Logo } from './Logo';
import { Footer } from './Footer';

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
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<any[]>([]);

    const isCustomer = user?.role === 'customer';

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

    const businessLinks = [
        { name: 'Dashboard', path: '/dashboard/business', icon: LayoutDashboard },
        { 
            name: 'Reservations', 
            path: '/dashboard/business/reservations', 
            icon: Calendar,
            submenus: [
                { name: 'Schedule', path: '/dashboard/business/reservations?tab=hours', icon: Clock },
                { name: 'Overrides', path: '/dashboard/business/reservations?tab=special', icon: Zap },
                { 
                    name: 'Clinic Services', 
                    path: '/dashboard/business/reservations?tab=services',
                    icon: Settings,
                    submenus: [
                        { name: 'Launch New Service', path: '/dashboard/business/reservations?tab=services&action=launch', icon: Plus }
                    ]
                }
            ]
        },
        { name: 'Orders', path: '/dashboard/business/orders', icon: ShoppingBag },
        { 
            name: 'Store', 
            path: '/dashboard/business/catalog', 
            icon: Store,
            submenus: [
                { name: 'Add Product Item', path: '/dashboard/business/catalog/product/new', icon: Plus }
            ]
        },
        { name: 'Analytics', path: '/dashboard/business/analytics', icon: BarChart2 },
        { name: 'Account', path: '/dashboard/business/account', icon: UserCircle },
    ];

    const userLinks = [
        { name: 'Dashboard', path: '/dashboard/customer', icon: LayoutDashboard },
        { name: 'Store', path: '/dashboard/customer/catalog', icon: ShoppingBag },
        { name: 'Orders', path: '/dashboard/customer/orders', icon: ShoppingBag },
        { name: 'Visits', path: '/dashboard/customer/reservations', icon: Calendar },
        { name: 'Clinic Map', path: '/dashboard/customer/map', icon: MapPin },
        { name: 'Rewards', path: '/dashboard/customer/loyalty', icon: Award },
        { name: 'Alerts', path: '/dashboard/customer/alerts', icon: Bell },
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
        { name: 'Dashboard', path: '/dashboard/rider', icon: LayoutDashboard },
        { name: 'Orders', path: '/dashboard/rider/orders', icon: ShoppingBag },
        { name: 'Earnings', path: '/dashboard/rider/earnings', icon: Wallet },
        { name: 'System Alerts', path: '/dashboard/rider/alerts', icon: Bell },
        { name: 'Account', path: '/dashboard/rider/account', icon: UserCircle },
    ];

    const links = user?.role === 'super_admin' ? superAdminLinks :
        user?.role === 'system_admin' ? systemAdminLinks :
            user?.role === 'business' ? businessLinks :
                user?.role === 'rider' ? riderLinks :
                    userLinks;

    const basePath = ['super_admin', 'system_admin'].includes(user?.role || '') ? 'admin' : user?.role;
    const hasStockError = items.some(item => item.stock !== undefined && item.quantity > item.stock);
    const currentPathName = links.find(l => location.pathname === l.path)?.name || title;

    // --- RENDER SIDEBAR LAYOUT (For Business/Admin/Rider) ---
    if (!isCustomer && user) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex">
                <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-accent-brown/5 fixed inset-y-0 left-0 z-50 overflow-hidden shadow-2xl shadow-accent-brown/5">
                    <div className="p-8 pb-10">
                        <div className="flex items-center gap-3.5 group">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-xl shadow-brand/10 flex items-center justify-center p-2 border border-brand/5 group-hover:scale-105 transition-transform">
                                <Logo className="w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-accent-brown tracking-tighter leading-none mb-1">Hi-Vet</h2>
                                <p className="text-[10px] font-black text-brand-dark transition-all opacity-60 uppercase tracking-widest leading-none">
                                    {user?.role === 'super_admin' ? 'Super Admin' :
                                        user?.role === 'system_admin' ? 'System Admin' :
                                            user?.role === 'business' ? 'Partner Portal' :
                                                'Rider Portal'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-8">
                        {links.map((link) => {
                            const linkBase = link.path.split('?')[0];
                            const isParentActive = link.name === 'Dashboard' 
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
                                        className={() => `flex items-center gap-3 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all group relative ${isParentActive ? 'bg-brand text-white shadow-lg shadow-brand/20 ml-2' : 'text-accent-brown hover:text-brand hover:bg-brand/5'}`}
                                    >
                                        {() => (
                                            <>
                                                <link.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isParentActive ? 'text-white' : 'text-accent-brown/40 group-hover:text-brand'}`} />
                                                <span>{link.name}</span>
                                                {isParentActive && <motion.div layoutId="active-nav" className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1.5 h-8 bg-brand-dark rounded-r-full" />}
                                                {hasSubmenus && (
                                                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isParentActive ? 'rotate-90 text-white/50' : 'text-accent-brown/30'}`} />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                    
                                    <AnimatePresence>
                                        {hasSubmenus && isParentActive && (
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
                                                                <Link to={sub.path} className={`flex items-center gap-2.5 font-black text-xs uppercase tracking-widest transition-all ${(isSubActive && !isLaunchActive) || (isSubActive && !sub.submenus) ? 'text-brand drop-shadow-sm' : 'text-black opacity-80 hover:opacity-100 hover:text-brand'}`}>
                                                                    {sub.icon && <sub.icon className="w-4 h-4 opacity-70" />}
                                                                    {sub.name}
                                                                </Link>
                                                                
                                                                {/* Deep nested submenus */}
                                                                {sub.submenus && isSubActive && (
                                                                    <div className="ml-5 mt-3 space-y-3 border-l-2 border-brand/10 pl-4">
                                                                        {sub.submenus.map((deep: any) => {
                                                                            const deepActive = location.search.includes(deep.path.split('?')[1]);
                                                                            return (
                                                                                <Link key={deep.name} to={deep.path} className={`flex items-center gap-2 font-black text-[11px] uppercase tracking-widest transition-all ${deepActive ? 'text-brand' : 'text-black opacity-60 hover:opacity-100 hover:text-brand'}`}>
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

                    <div className="p-6 mt-auto">
                        <div className="bg-accent-peach/5 p-4 rounded-3xl border border-accent-peach/10 relative group overflow-hidden">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white border border-brand/5 shadow-sm flex items-center justify-center text-accent-brown overflow-hidden">
                                    {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full opacity-20 p-2" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black text-accent-brown truncate leading-none mb-1 text-xs">{user?.clinic_name || user?.name || 'My Account'}</p>
                                    <p className="text-[8px] font-bold text-accent-brown/40 uppercase tracking-widest truncate">{user?.email}</p>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-brand/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </div>
                        <button onClick={() => setIsLogoutModalOpen(true)} className="w-full mt-4 py-4 rounded-2xl flex items-center justify-center gap-3 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
                            <LogOut className="w-4 h-4" /> Log Out Portal
                        </button>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
                    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-accent-brown/5 sticky top-0 z-40 px-6 sm:px-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button className="lg:hidden p-2.5 bg-accent-peach/10 rounded-xl text-accent-brown" onClick={() => setIsMobileMenuOpen(true)}>
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest hidden xs:block">Hub</span>
                                <ChevronRight className="w-3 h-3 text-accent-brown/20 hidden xs:block" />
                                <h1 className="text-lg font-black text-accent-brown tracking-tighter uppercase whitespace-nowrap">{currentPathName}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-3 bg-accent-peach/5 border border-accent-brown/5 px-4 py-2.5 rounded-2xl w-64 group focus-within:border-brand/40 transition-all">
                                <Search className="w-4 h-4 text-accent-brown/30" />
                                <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/20 w-full" />
                            </div>
                            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-accent-brown/5 shadow-sm">
                                <button onClick={() => setIsNotificationsOpen(true)} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-accent-brown transition-all">
                                    <Bell className="w-4.5 h-4.5" />
                                </button>
                            </div>
                            {branchAction && <div className="hidden xl:block">{branchAction}</div>}
                        </div>
                    </header>
                    <main className="flex-1 p-6 sm:p-10">
                        {branchContext?.id && (
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-brand-dark rounded-3xl text-white flex items-center justify-between shadow-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><MapPin className="w-6 h-6" /></div>
                                    <div><p className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none mb-1">Active Hub</p><h4 className="text-sm font-black tracking-tight">{branchContext.name} | {branchContext.address}</h4></div>
                                </div>
                            </motion.div>
                        )}
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                            {children}
                        </motion.div>
                    </main>
                </div>
                {/* Reuse Original Notifications logic for Sidebar (simplified) */}
                <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} logout={handleLogout} />
            </div>
        );
    }

    // --- RENDER ORIGINAL TOP-NAV LAYOUT (Specifically for Customers) ---
    return (
        <div className={`min-h-screen flex flex-col ${user?.role === 'rider' ? 'bg-[#FAF9F6]' : 'bg-accent-peach/20'}`}>
            {/* Top Navigation Bar */}
            {!hideHeader && (
                <nav className="bg-white border-b border-accent-brown/5 shadow-xl shadow-accent-brown/5 fixed top-0 left-0 right-0 z-50 h-18 sm:h-22">
                    <div className="max-w-[1920px] mx-auto px-4 sm:px-8 h-full flex items-center justify-between gap-6">
                        {/* Brand */}
                        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 transition-opacity">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-xl shadow-md shadow-brand/10 flex items-center justify-center p-1.5 shrink-0 border border-brand/5">
                                <Logo className="w-full h-full" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h2 className="text-base sm:text-xl lg:text-[22px] font-black text-accent-brown tracking-tighter leading-none truncate">{user?.clinic_name || 'Hi-Vet'}</h2>
                                <p className="text-[10px] sm:text-[11px] lg:text-[12px] mt-0.5 font-bold text-black transition-all whitespace-nowrap opacity-60 uppercase tracking-widest">
                                    Customer
                                </p>
                            </div>
                        </div>

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
                        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                            {user?.role === 'customer' && (
                                <motion.button
                                    onClick={() => setIsCartOpen(true)}
                                    className="relative w-9 h-9 sm:w-12 sm:h-12 bg-brand-dark/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-dark hover:text-white hover:bg-brand hover:shadow-lg hover:shadow-brand/20 transition-all cursor-pointer"
                                >
                                    <ShoppingCart className="w-4.5 h-4.5" />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-dark text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                            {totalItems}
                                        </span>
                                    )}
                                </motion.button>
                            )}

                            <div className="relative">
                                <motion.button
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${isNotificationsOpen ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-100 text-black hover:text-accent-brown hover:bg-slate-200'}`}
                                >
                                    <Bell className="w-4.5 h-4.5" />
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 border-white ${isNotificationsOpen ? 'bg-white' : 'bg-rose-500 animate-pulse'}`}></span>
                                    )}
                                </motion.button>

                                <AnimatePresence>
                                    {isNotificationsOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 15, scale: 0.95, x: 'var(--notifications-x, 0)' }}
                                                animate={{ opacity: 1, y: 0, scale: 1, x: 'var(--notifications-x, 0)' }}
                                                exit={{ opacity: 0, y: 15, scale: 0.95, x: 'var(--notifications-x, 0)' }}
                                                style={{ '--notifications-x': '0px' } as any}
                                                className="fixed xs:absolute right-4 xs:right-0 top-[88px] xs:top-auto mt-2 w-[calc(100vw-2rem)] xs:w-[400px] bg-white rounded-3xl shadow-2xl border border-brand-dark/5 z-50 overflow-hidden origin-top-right"
                                            >
                                                <div className="p-5 sm:p-6 border-b border-accent-brown/5 flex items-center justify-between bg-accent-peach/10">
                                                    <div className="flex items-center gap-2">
                                                        <Bell className="w-3.5 h-3.5 text-brand" />
                                                        <h3 className="font-black text-black text-sm uppercase tracking-tighter italic">Notifications</h3>
                                                    </div>
                                                    {unreadCount > 0 && (
                                                        <button onClick={markAllAsRead} className="text-[9px] font-black text-black uppercase tracking-widest hover:underline bg-white px-3 py-1 rounded-full shadow-sm cursor-pointer">Mark all as read</button>
                                                    )}
                                                </div>
                                                <div className="max-h-[350px] sm:max-h-[450px] overflow-y-auto no-scrollbar">
                                                    {notifications?.length === 0 ? (
                                                        <div className="py-16 text-center">
                                                            <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                <Bell className="w-8 h-8 text-black/10" />
                                                            </div>
                                                            <p className="text-[10px] font-black text-black uppercase tracking-widest">No notifications yet</p>
                                                        </div>
                                                    ) : (
                                                        notifications?.map((n) => (
                                                            <motion.div
                                                                key={n?.id}
                                                                whileHover={{ x: 4, backgroundColor: 'rgba(255, 159, 28, 0.08)' }}
                                                                whileTap={{ scale: 0.99 }}
                                                                onClick={() => {
                                                                    if (!n?.read) markAsRead(n?.id);
                                                                    if (n?.link) navigate(n?.link);
                                                                    setIsNotificationsOpen(false);
                                                                }}
                                                                className={`p-4 sm:p-5 flex gap-4 cursor-pointer transition-all border-b border-brand-dark/5 last:border-0 relative ${n?.read ? 'hover:bg-accent-peach/5' : 'bg-brand/5 hover:bg-brand/10'}`}
                                                            >
                                                                {!n?.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />}
                                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shrink-0 flex items-center justify-center shadow-sm ${n?.type === 'System' ? 'bg-white text-brand' : 'bg-blue-50 text-blue-500'}`}>
                                                                    <Bell className="w-4 h-4 sm:w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                                        <span className="font-black text-[11px] sm:text-xs text-black truncate">{n?.title}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[8px] font-bold text-black uppercase shrink-0">Just now</span>
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.2, rotate: 90 }}
                                                                                whileTap={{ scale: 0.8 }}
                                                                                onClick={(e) => { e.stopPropagation(); deleteNotification(n?.id); }}
                                                                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 text-brand-dark/20 hover:text-red-500 transition-all cursor-pointer"
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </motion.button>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[10px] sm:text-[11px] text-black leading-relaxed line-clamp-2 font-medium">{n?.desc}</p>
                                                                </div>
                                                            </motion.div>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

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

                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden w-9 h-9 sm:w-11 sm:h-11 bg-white border border-brand-dark/10 rounded-xl flex items-center justify-center text-brand-dark/60"
                            >
                                <Menu className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            <main className={`flex-1 flex flex-col w-full px-2 sm:px-4 lg:px-6 ${hideHeader ? 'pt-6' : 'pt-24 sm:pt-28 lg:pt-30'} pb-10 lg:pb-16`}>
                {title && (
                    <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-accent-brown tracking-tighter leading-tight">{title}</h1>
                            {branchContext?.id && (
                                <div className="flex items-center gap-1.5 text-brand-dark font-black text-[10px] uppercase tracking-widest bg-brand/10 px-3 py-1 rounded-full self-start mt-4">
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

            {!hideFooter && !isCartOpen && <Footer />}

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-brand-dark/60 backdrop-blur-md z-[60]" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-[280px] bg-white z-[70] flex flex-col">
                            <div className="p-6 flex items-center justify-between border-b border-brand-dark/5 bg-accent-peach/10">
                                <span className="font-black text-xs uppercase tracking-widest text-black/50">Navigation</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex-1 p-4 space-y-2">
                                {links?.map((link) => (
                                    <NavLink
                                        key={link?.name}
                                        to={link?.path || '#'}
                                        end={link?.name === 'Dashboard'}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) => `flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${isActive ? 'bg-brand-dark text-white' : 'text-brand-dark hover:bg-brand hover:text-white'}`}
                                    >
                                        <link.icon className="w-4 h-4" /> {link?.name}
                                    </NavLink>
                                ))}
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
                                    <div><h2 className="font-black text-accent-brown text-xl leading-none">Your Cart</h2><p className="text-[10px] uppercase font-black text-black mt-1">{totalItems} items</p></div>
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
                                                <p className="text-[9px] font-black uppercase tracking-widest text-black mb-auto">{item.variant} • {item.size}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-black text-brand-dark">₱{item.price}</span>
                                                    <div className="flex items-center gap-1 bg-accent-peach/20 rounded-lg p-1">
                                                        <button onMouseDown={() => startCounter(item, false)} onMouseUp={stopCounter} onMouseLeave={stopCounter} className="w-6 h-6 bg-white rounded-md flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                                        <input type="text" value={item.quantity} onChange={(e) => handleQuantityInput(item, e.target.value)} className="text-[10px] font-black w-6 text-center bg-transparent outline-none" />
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
                                        <div className="flex justify-between text-[10px] font-black uppercase"><span>Selected ({selectedCount})</span><span>Subtotal</span></div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-2">
                                                <button onClick={() => setSelectedItems(new Set(items.map(i => `${i.id}-${i.variant}-${i.size}`)))} className="text-[9px] font-black hover:underline uppercase">All</button>
                                                <button onClick={() => setSelectedItems(new Set())} className="text-[9px] font-black opacity-40 uppercase">None</button>
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
                                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest ${hasStockError || selectedCount === 0 ? 'bg-slate-100 text-slate-300' : 'bg-brand text-white shadow-lg shadow-brand/20'}`}
                                    >
                                        Checkout
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} logout={handleLogout} />
        </div>
    );
};

const LogoutModal = ({ isOpen, onClose, logout }: any) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-accent-brown/20 backdrop-blur-md" />
                <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center relative z-10">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8"><LogOut className="w-10 h-10" /></div>
                    <h3 className="text-3xl font-black italic uppercase leading-none mb-4">Log Out?</h3>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button onClick={onClose} className="py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase">No</button>
                        <button onClick={logout} className="py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase">Yes</button>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

export default DashboardLayout;
