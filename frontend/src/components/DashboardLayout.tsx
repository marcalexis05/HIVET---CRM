import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LogOut, LayoutDashboard, ShoppingBag, Users, Settings, Bell, Calendar, Award, ShoppingCart, X, Plus, Minus, Wallet, BarChart2, UserCircle, Menu, Store, Truck, Check, MapPin } from 'lucide-react';
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
    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const handleQuantityInput = (item: any, value: string) => {
        let num = parseInt(value.replace(/[^0-9]/g, ''));
        if (isNaN(num)) num = 1;
        updateQuantity(item.id, num, item.variant, item.size);
    };

    // Long press logic
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

    // Initialize/Sync selection when items change
    useEffect(() => {
        const newSelection = new Set(selectedItems);
        items.forEach(item => {
            const key = `${item.id}-${item.variant}-${item.size}`;
            if (!newSelection.has(key)) {
                newSelection.add(key);
            }
        });
        // Remove selection for items no longer in cart
        const currentKeys = new Set(items.map(item => `${item.id}-${item.variant}-${item.size}`));
        Array.from(newSelection).forEach(key => {
            if (!currentKeys.has(key)) newSelection.delete(key);
        });
        
        setSelectedItems(newSelection);
    }, [items.length]);

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
        { name: 'Reservations', path: '/dashboard/business/reservations', icon: Calendar },
        { name: 'Orders', path: '/dashboard/business/orders', icon: ShoppingBag },
        { name: 'Store', path: '/dashboard/business/catalog', icon: Settings },
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
        { name: 'Clinic Compliance', path: '/dashboard/admin/compliance?tab=clinics', icon: Store },
        { name: 'Rider Compliance', path: '/dashboard/admin/compliance?tab=riders', icon: Truck },
        { name: 'Global Users', path: '/dashboard/admin/users', icon: Users },
        { name: 'System Alerts', path: '/dashboard/admin/alerts', icon: Bell },
    ];

    const systemAdminLinks = [
        { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Clinic Compliance', path: '/dashboard/admin/compliance?tab=clinics', icon: Store },
        { name: 'Rider Compliance', path: '/dashboard/admin/compliance?tab=riders', icon: Truck },
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

    return (
        <div className={`min-h-screen flex flex-col ${user?.role === 'rider' ? 'bg-[#FAF9F6]' : 'bg-accent-peach/20'}`}>
            {/* Top Navigation Bar */}
            {!hideHeader && (
                <nav className="bg-white border-b border-accent-brown/5 shadow-xl shadow-accent-brown/5 fixed top-0 left-0 right-0 z-50 h-18 sm:h-22">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-8 h-full flex items-center justify-between gap-6">
                    {/* Brand */}
                    <MotionLink 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        to={`/dashboard/${basePath}`} 
                        className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 transition-opacity cursor-pointer"
                    >
                        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-xl shadow-md shadow-brand/10 flex items-center justify-center p-1.5 shrink-0 border border-brand/5">
                            <Logo className="w-full h-full" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-base sm:text-xl lg:text-[22px] font-black text-accent-brown tracking-tighter leading-none truncate">{user?.clinic_name || 'Hi-Vet'}</h2>
                            <p className="text-[10px] sm:text-[11px] lg:text-[12px] mt-0.5 font-bold text-black transition-all whitespace-nowrap opacity-60 uppercase tracking-widest">
                                {user?.role === 'super_admin' ? 'Super Admin' : 
                                 user?.role === 'system_admin' ? 'System Admin' : 
                                 user?.role === 'business' ? 'Partner' : 
                                 user?.role === 'rider' ? 'Rider' : 
                                 'Customer'}
                            </p>
                        </div>
                    </MotionLink>

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

                        {branchAction && (
                            <div className="hidden lg:block">
                                {branchAction}
                            </div>
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
                                            style={{
                                                '--notifications-x': '0px',
                                            } as any}
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
                                                        <p className="text-[10px] font-black text-black uppercase tracking-widest">
                                                            {basePath === 'admin' ? "No pending applications" : "No notifications yet"}
                                                        </p>
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
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                deleteNotification(n?.id);
                                                                            }}
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
                                            <div className="p-4 bg-accent-peach/5 text-center border-t border-accent-brown/5">
                                                <Link
                                                    to={`/dashboard/${basePath}/alerts`}
                                                    onClick={() => setIsNotificationsOpen(false)}
                                                    className="inline-flex items-center gap-2 text-[10px] font-black text-black uppercase tracking-widest hover:gap-3 transition-all cursor-pointer"
                                                >
                                                    View All Notifications <Plus className="w-3 h-3 text-brand" />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-[1px] h-6 sm:h-8 bg-brand-dark/10 hidden xs:block"></div>

                        {/* Desktop Logout Button */}
                        <div className="hidden lg:flex items-center">
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                whileTap={{ scale: 0.9, rotate: 5 }}
                                onClick={() => setIsLogoutModalOpen(true)}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-xl hover:shadow-red-500/20 transition-all cursor-pointer shrink-0"
                                title="Log Out"
                            >
                                <LogOut className="w-4.5 h-4.5 sm:w-5 h-5" />
                            </motion.button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden w-9 h-9 sm:w-11 sm:h-11 bg-white border border-brand-dark/10 rounded-xl flex items-center justify-center text-brand-dark/60 hover:text-brand-dark transition-colors shrink-0 cursor-pointer"
                        >
                            <Menu className="w-4.5 h-4.5 sm:w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>
            )}

            {/* Main Content */}
            <main className={`flex-1 flex flex-col w-full px-2 sm:px-4 lg:px-6 ${hideHeader ? 'pt-6' : 'pt-24 sm:pt-28 lg:pt-30'} pb-10 lg:pb-16`}>

                {title && (
                    <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black text-accent-brown tracking-tighter leading-tight ${user?.role === 'rider' ? 'tracking-[-0.02em]' : ''}`}>
                                {title}
                            </h1>
                            {branchContext?.id && (
                                <div className="flex items-center gap-1.5 text-brand-dark font-black text-[10px] uppercase tracking-widest bg-brand/10 px-3 py-1 rounded-full self-start mt-4">
                                    <MapPin className="w-3 h-3" />
                                    {branchContext?.name}
                                    {branchContext?.address && (
                                        <span className="text-brand-dark/70 font-bold normal-case ml-1">| {branchContext?.address}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                >
                    {children}
                </motion.div>
            </main>

            {/* Dashboard Footer */}
            {user?.role === 'customer' && !hideFooter && !isCartOpen && !isNotificationsOpen && <Footer />}

            {/* Mobile Navigation Sidebar */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-brand-dark/60 backdrop-blur-md z-[60]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-[280px] bg-white z-[70] shadow-2xl flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between border-b border-brand-dark/5 bg-accent-peach/10">
                                <span className="font-black text-xs uppercase tracking-widest text-black/50">Navigation</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-brand-dark/40 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {links?.map((link) => (
                                    <NavLink
                                        key={link?.name}
                                        to={link?.path || '#'}
                                        end={link?.path === `/dashboard/${basePath}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) => {
                                            const hasSearch = link?.path?.includes('?') || false;
                                            const actuallyActive = hasSearch ? (location.pathname + location.search === link?.path) : isActive;
                                            return `flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${actuallyActive ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' : 'text-brand-dark hover:bg-brand hover:text-white hover:shadow-lg hover:shadow-brand/20'}`;
                                        }}
                                    >
                                        <link.icon className="w-4 h-4" />
                                        {link?.name}
                                    </NavLink>
                                ))}
                            </div>
                            <div className="p-6 border-t border-brand-dark/5 space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-accent-peach/10 rounded-2xl">
                                    <div className="w-10 h-10 bg-white rounded-xl border border-brand-dark/5 flex items-center justify-center text-brand-dark shadow-sm overflow-hidden">
                                        <UserCircle className="w-full h-full" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-brand-dark truncate">{user?.name || user?.email}</p>
                                        <p className="text-[9px] font-bold text-black uppercase tracking-widest">Logged In</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full h-14 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Log Out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="h-24 px-6 border-b border-brand-dark/5 flex items-center justify-between shrink-0 bg-accent-peach/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-dark shadow-sm">
                                        <ShoppingCart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-accent-brown text-xl leading-none tracking-tight">Your Cart</h2>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-black mt-1">{totalItems} items</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-10 h-10 bg-white hover:bg-red-50 text-black hover:text-red-500 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                        <ShoppingCart className="w-16 h-16 text-brand-dark/20 mb-4" />
                                        <p className="text-sm font-bold text-brand-dark">Your cart is empty.</p>
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <motion.div
                                            key={`${item.id}-${item.variant}-${item.size}-${idx}`}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={`flex gap-4 p-4 bg-white border-2 rounded-2xl relative group transition-all ${selectedItems.has(`${item.id}-${item.variant}-${item.size}`) ? 'border-brand/20 shadow-sm' : 'border-brand-dark/5 opacity-60 grayscale-[0.5]'}`}
                                        >
                                            <div className="flex items-center pt-1">
                                                <button 
                                                    onClick={() => toggleSelection(`${item.id}-${item.variant}-${item.size}`)}
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedItems.has(`${item.id}-${item.variant}-${item.size}`) ? 'bg-brand border-brand text-white' : 'border-brand-dark/20 bg-white'}`}
                                                >
                                                    {selectedItems.has(`${item.id}-${item.variant}-${item.size}`) && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.variant, item.size)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                            <div className="w-20 h-20 shrink-0 bg-accent-peach/10 rounded-xl p-2 flex items-center justify-center">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                            </div>
                                    <div className="flex-1 flex flex-col">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-black text-xs text-accent-brown line-clamp-2 leading-tight mb-1">{item.name}</h4>
                                                    {item.quantity > item.stock && (
                                                        <span className="text-[7px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0 mb-auto mt-0.5">Stock Issue</span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-black mb-auto">
                                                    {item.variant} • {item.size}
                                                </p>
                                                {item.quantity > item.stock && (
                                                    <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest mt-1">Exceeds available stock: {item.stock}</p>
                                                )}
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-black text-brand-dark">₱{item.price}</span>
                                                    <div className="flex items-center gap-1 bg-accent-peach/20 rounded-lg p-1">
                                                        <button
                                                            onMouseDown={() => startCounter(item, false)}
                                                            onMouseUp={stopCounter}
                                                            onMouseLeave={stopCounter}
                                                            onTouchStart={() => startCounter(item, false)}
                                                            onTouchEnd={stopCounter}
                                                            className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-brand-dark shadow-sm select-none"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <input 
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={item.quantity}
                                                            onChange={(e) => handleQuantityInput(item, e.target.value)}
                                                            className="text-[10px] font-black text-brand-dark w-6 bg-transparent text-center outline-none"
                                                        />
                                                        <button
                                                            onMouseDown={() => startCounter(item, true)}
                                                            onMouseUp={stopCounter}
                                                            onMouseLeave={stopCounter}
                                                            onTouchStart={() => startCounter(item, true)}
                                                            onTouchEnd={stopCounter}
                                                            className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-brand-dark shadow-sm select-none"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            {/* Drawer Footer */}
                            {items.length > 0 && (
                                <div className="p-6 bg-white border-t border-brand-dark/5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                                    <div className="flex flex-col gap-2 mb-6">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-black">
                                            <span>Selected ({selectedCount})</span>
                                            <span>Subtotal</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-1.5">
                                                <button 
                                                    onClick={() => setSelectedItems(new Set(items.map(i => `${i.id}-${i.variant}-${i.size}`)))}
                                                    className="text-[9px] font-black text-black hover:underline uppercase"
                                                >
                                                    Select All
                                                </button>
                                                <span className="text-brand-dark/10">|</span>
                                                <button 
                                                    onClick={() => setSelectedItems(new Set())}
                                                    className="text-[9px] font-black text-black/40 hover:text-red-500 hover:underline uppercase"
                                                >
                                                    Clear Selection
                                                </button>
                                            </div>
                                            <span className="text-2xl font-black text-accent-brown tracking-tighter">₱{selectiveAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button
                                        disabled={hasStockError || selectedCount === 0}
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            // Clear any old resume-payment state
                                            localStorage.removeItem('hivet_checkout_paying_order');
                                            // Filter items to only selected ones before navigating
                                            const checkoutItems = items.filter(i => selectedItems.has(`${i.id}-${i.variant}-${i.size}`));
                                            localStorage.setItem('hivet_checkout_filtered', JSON.stringify(checkoutItems));
                                            navigate('/dashboard/customer/checkout');
                                        }}
                                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${hasStockError || selectedCount === 0 ? 'bg-brand-dark/10 text-brand-dark/30 cursor-not-allowed shadow-none' : 'bg-brand-dark hover:brightness-110 text-white shadow-brand-dark/20'}`}
                                    >
                                        <Wallet className="w-4 h-4" />
                                        {hasStockError ? 'Resolve Stock Issues' : selectedCount === 0 ? 'Select items to checkout' : `Checkout ${selectedCount} ${selectedCount === 1 ? 'Item' : 'Items'}`}
                                    </button>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="w-full mt-3 text-[10px] font-black uppercase tracking-widest text-black hover:text-brand-dark transition-colors"
                                    >
                                        Continue Shopping
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Bottom Navigation - Mirror Website Functions */}
            {!hideHeader && user && !['super_admin', 'system_admin'].includes(user.role || '') && (
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-brand/5 z-40 px-2 pb-safe-bottom">
                    <div className="flex h-20 items-center justify-between">
                        {links.slice(0, 4).map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                end={link.path === `/dashboard/${basePath}`}
                                className={({ isActive }) => `flex-1 flex flex-col items-center gap-1.5 transition-all ${
                                    isActive ? 'text-brand-dark' : 'text-brand-dark/40 hover:text-brand'
                                }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <link.icon size={22} className={isActive ? 'fill-current text-brand-dark' : 'text-brand-dark/40'} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">{link.name}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            )}
            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {isLogoutModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsLogoutModalOpen(false)}
                            className="absolute inset-0 bg-accent-brown/20 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl relative z-10 border border-brand/5"
                        >
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                                <LogOut className="w-10 h-10" />
                            </div>
                            <h3 className="text-3xl font-black text-accent-brown tracking-tighter mb-4 italic uppercase leading-none">Log Out?</h3>
                            <p className="text-[12px] font-bold text-black/40 uppercase tracking-widest leading-relaxed mb-10">
                                Are you sure you want to log out of your Hi-Vet account?
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-black hover:bg-slate-200 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-black hover:shadow-black/20 transition-all cursor-pointer"
                                >
                                    Log Out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
