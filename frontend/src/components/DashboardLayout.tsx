import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LogOut, LayoutDashboard, ShoppingBag, Users, Settings, Bell, Calendar, Award, ShoppingCart, X, Plus, Minus, CreditCard, BarChart2, UserCircle, Menu } from 'lucide-react';
import { Logo } from './Logo';

interface DashboardLayoutProps {
    children: ReactNode;
    title: string;
}

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const { items, totalItems, totalAmount, removeFromCart, updateQuantity } = useCart();
    const navigate = useNavigate();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = async () => {
        const token = localStorage.getItem('hivet_token');
        if (!token) return;
        try {
            const res = await fetch('http://localhost:8000/api/notifications', {
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
        const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

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

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const businessLinks = [
        { name: 'Overview', path: '/dashboard/business', icon: LayoutDashboard },
        { name: 'Orders', path: '/dashboard/business/orders', icon: ShoppingBag },
        { name: 'Catalog', path: '/dashboard/business/catalog', icon: Settings },
        { name: 'Analytics', path: '/dashboard/business/analytics', icon: BarChart2 },
        { name: 'Account', path: '/dashboard/business/account', icon: UserCircle },
    ];

    const userLinks = [
        { name: 'My Hub', path: '/dashboard/user', icon: LayoutDashboard },
        { name: 'Product Catalog', path: '/dashboard/user/catalog', icon: ShoppingBag },
        { name: 'My Orders', path: '/dashboard/user/orders', icon: ShoppingBag },
        { name: 'Reservations', path: '/dashboard/user/reservations', icon: Calendar },
        { name: 'Loyalty Rewards', path: '/dashboard/user/loyalty', icon: Award },
        { name: 'Alert Center', path: '/dashboard/user/alerts', icon: Bell },
        { name: 'Account', path: '/dashboard/user/account', icon: UserCircle },
    ];

    const adminLinks = [
        { name: 'Platform Overview', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Partner Businesses', path: '/dashboard/admin/businesses', icon: ShoppingBag },
        { name: 'Global Users', path: '/dashboard/admin/users', icon: Users },
        { name: 'Account', path: '/dashboard/admin/account', icon: UserCircle },
    ];

    const links = user?.role === 'admin' ? adminLinks : user?.role === 'business' ? businessLinks : userLinks;

    return (
        <div className="min-h-screen bg-accent-peach/20 flex flex-col">
            {/* Top Navigation Bar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-accent-brown/5 shadow-xl shadow-accent-brown/5 fixed top-0 left-0 right-0 z-50 h-20 sm:h-24">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
                    {/* Brand */}
                    <Link to={`/dashboard/${user?.role}`} className="flex items-center gap-2 sm:gap-3 shrink-0 hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-xl shadow-md shadow-brand/10 flex items-center justify-center p-1 shrink-0">
                            <Logo className="w-full h-full" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-accent-brown tracking-tight leading-none truncate">Hi-Vet</h2>
                            <p className="text-[6px] sm:text-[8px] lg:text-[9px] mt-0.5 sm:mt-1 font-black uppercase tracking-widest text-brand-dark transition-all whitespace-nowrap">
                                {user?.role === 'admin' ? 'Super Admin Portal' : user?.role === 'business' ? 'Partner Portal' : 'Customer Portal'}
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden lg:flex items-center justify-center flex-1 gap-1">
                        {links.map((link) => (
                            <NavLink
                                key={link.name}
                                to={link.path}
                                end={link.path === `/dashboard/${user?.role}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-3 xl:px-4 py-2.5 rounded-full font-black text-[9px] xl:text-[10px] uppercase tracking-widest transition-all ${isActive
                                        ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                        : 'text-accent-brown/50 hover:bg-accent-peach/50 hover:text-accent-brown'
                                    }`
                                }
                            >
                                <link.icon className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">{link.name}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                        {user?.role === 'user' && (
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative w-10 h-10 sm:w-12 sm:h-12 bg-accent-peach/30 rounded-xl sm:rounded-2xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-dark text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                        {totalItems}
                                    </span>
                                )}
                            </button>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors ${isNotificationsOpen ? 'bg-brand shadow-lg shadow-brand/20 text-white' : 'bg-accent-peach/30 text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60'
                                    }`}
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-brand-dark rounded-full border-2 border-white"></span>
                                )}
                            </button>

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
                                            className="fixed xs:absolute right-4 xs:right-0 top-[88px] xs:top-auto mt-2 w-[calc(100vw-2rem)] xs:w-[400px] bg-white rounded-3xl shadow-2xl border border-accent-brown/5 z-50 overflow-hidden origin-top-right"
                                        >
                                            <div className="p-5 sm:p-6 border-b border-accent-brown/5 flex items-center justify-between bg-accent-peach/10">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="w-3.5 h-3.5 text-brand-dark" />
                                                    <h3 className="font-black text-accent-brown uppercase tracking-widest text-[10px]">Alert Center</h3>
                                                </div>
                                                {unreadCount > 0 && (
                                                    <button onClick={markAllAsRead} className="text-[9px] font-black text-brand-dark uppercase tracking-widest hover:underline bg-white px-3 py-1 rounded-full shadow-sm">Mark all read</button>
                                                )}
                                            </div>
                                            <div className="max-h-[350px] sm:max-h-[450px] overflow-y-auto no-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <div className="py-16 text-center">
                                                        <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <Bell className="w-8 h-8 text-accent-brown/10" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">No notifications yet</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((n) => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => {
                                                                if (!n.read) markAsRead(n.id);
                                                                if (n.link) navigate(n.link);
                                                                setIsNotificationsOpen(false);
                                                            }}
                                                            className={`p-4 sm:p-5 flex gap-4 cursor-pointer transition-all border-b border-accent-brown/5 last:border-0 relative ${n.read ? 'hover:bg-accent-peach/5' : 'bg-brand/5 hover:bg-brand/10'}`}
                                                        >
                                                            {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-dark" />}
                                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shrink-0 flex items-center justify-center shadow-sm ${n.type === 'System' ? 'bg-white text-brand-dark' : 'bg-blue-50 text-blue-500'}`}>
                                                                <Bell className="w-4 h-4 sm:w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="font-black text-[11px] sm:text-xs text-accent-brown truncate">{n.title}</span>
                                                                    <span className="text-[8px] font-bold text-accent-brown/30 uppercase shrink-0">Just now</span>
                                                                </div>
                                                                <p className="text-[10px] sm:text-[11px] text-accent-brown/60 leading-relaxed line-clamp-2 font-medium">{n.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-4 bg-accent-peach/5 text-center border-t border-accent-brown/5">
                                                <Link
                                                    to="/dashboard/user/alerts"
                                                    onClick={() => setIsNotificationsOpen(false)}
                                                    className="inline-flex items-center gap-2 text-[10px] font-black text-brand-dark uppercase tracking-widest hover:gap-3 transition-all"
                                                >
                                                    View Alert Center <Plus className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-[1px] h-6 sm:h-8 bg-accent-brown/10 hidden xs:block"></div>

                        {/* Desktop User Info & Logout */}
                        <div className="hidden lg:flex items-center gap-2 xl:gap-4">
                            <div className="hidden xl:flex flex-col items-end min-w-0">
                                <span className="text-[7px] font-black uppercase tracking-widest text-accent-brown/40 leading-none">Welcome back,</span>
                                <span className="text-[10px] font-bold text-accent-brown truncate max-w-[120px]">{user?.name ?? user?.email}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-9 h-9 sm:w-11 sm:h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all cursor-pointer shrink-0"
                                title="Log Out"
                            >
                                <LogOut className="w-4.5 h-4.5 sm:w-5 h-5" />
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden w-9 h-9 sm:w-11 sm:h-11 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark transition-colors shrink-0"
                        >
                            <Menu className="w-4.5 h-4.5 sm:w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto px-3 sm:px-8 xl:px-12 pt-24 sm:pt-28 pb-10 lg:pt-32 lg:pb-16 relative z-10 transition-all">

                <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-accent-brown tracking-tighter leading-none">
                        {title}
                    </h1>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                >
                    {children}
                </motion.div>
            </main>

            {/* Mobile Navigation Sidebar */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-accent-brown/60 backdrop-blur-md z-[60]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-[280px] bg-white z-[70] shadow-2xl flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between border-b border-accent-brown/5 bg-accent-peach/10">
                                <span className="font-black text-xs uppercase tracking-widest text-accent-brown/40">Navigation</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-accent-brown/40 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {links.map((link) => (
                                    <NavLink
                                        key={link.name}
                                        to={link.path}
                                        end={link.path === `/dashboard/${user?.role}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isActive ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-accent-brown/60 hover:bg-accent-peach/30 hover:text-accent-brown'}`
                                        }
                                    >
                                        <link.icon className="w-4 h-4" />
                                        {link.name}
                                    </NavLink>
                                ))}
                            </div>
                            <div className="p-6 border-t border-accent-brown/5 space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-accent-peach/10 rounded-2xl">
                                    <div className="w-10 h-10 bg-white rounded-xl border border-accent-brown/5 flex items-center justify-center text-accent-brown shadow-sm overflow-hidden">
                                        <UserCircle className="w-full h-full" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-accent-brown truncate">{user?.name || user?.email}</p>
                                        <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest">Logged In</p>
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
                            className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="h-24 px-6 border-b border-accent-brown/5 flex items-center justify-between shrink-0 bg-accent-peach/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-dark shadow-sm">
                                        <ShoppingCart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-accent-brown text-xl leading-none tracking-tight">Your Cart</h2>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-accent-brown/40 mt-1">{totalItems} items</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-10 h-10 bg-white hover:bg-red-50 text-accent-brown/40 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                        <ShoppingCart className="w-16 h-16 text-accent-brown/20 mb-4" />
                                        <p className="text-sm font-bold text-accent-brown">Your cart is empty.</p>
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <motion.div
                                            key={`${item.id}-${item.variant}-${item.size}-${idx}`}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex gap-4 p-4 bg-white border-2 border-accent-brown/5 rounded-2xl relative group"
                                        >
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
                                                <h4 className="font-black text-xs text-accent-brown line-clamp-2 leading-tight mb-1">{item.name}</h4>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 mb-auto">
                                                    {item.variant} • {item.size}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-black text-accent-brown">₱{item.price}</span>
                                                    <div className="flex items-center gap-2 bg-accent-peach/20 rounded-lg p-1">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant, item.size)}
                                                            className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-accent-brown shadow-sm"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-black text-brand-dark w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant, item.size)}
                                                            className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-accent-brown shadow-sm"
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
                                <div className="p-6 bg-white border-t border-accent-brown/5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-accent-brown/40 uppercase tracking-widest">Subtotal</span>
                                        <span className="text-2xl font-black text-accent-brown tracking-tighter">₱{totalAmount.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            navigate('/dashboard/user/checkout');
                                        }}
                                        className="w-full bg-brand-dark hover:bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Checkout Now
                                    </button>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="w-full mt-3 text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-accent-brown transition-colors"
                                    >
                                        Continue Shopping
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
