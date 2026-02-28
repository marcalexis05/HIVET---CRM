import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LogOut, LayoutDashboard, ShoppingBag, Users, Settings, Bell, Calendar, Award, ShoppingCart, X, Plus, Minus, CreditCard } from 'lucide-react';
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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const adminLinks = [
        { name: 'Business Overview', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Order Management', path: '/dashboard/admin/orders', icon: ShoppingBag },
        { name: 'Catalog Control', path: '/dashboard/admin/catalog', icon: Settings },
        { name: 'Customer Data', path: '/dashboard/admin/customers', icon: Users },
    ];

    const userLinks = [
        { name: 'My Hub', path: '/dashboard/user', icon: LayoutDashboard },
        { name: 'Product Catalog', path: '/dashboard/user/catalog', icon: ShoppingBag },
        { name: 'Reservations', path: '/dashboard/user/reservations', icon: Calendar },
        { name: 'Loyalty Rewards', path: '/dashboard/user/loyalty', icon: Award },
        { name: 'Alert Center', path: '/dashboard/user/alerts', icon: Bell },
    ];

    const links = user?.role === 'admin' ? adminLinks : userLinks;

    return (
        <div className="min-h-screen bg-accent-peach/20 flex flex-col">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-accent-brown/5 shadow-xl shadow-accent-brown/5 fixed top-0 left-0 right-0 z-50">
                <div className="container mx-auto px-6 h-24 flex items-center justify-between gap-8">
                    {/* Brand */}
                    <Link to={`/dashboard/${user?.role}`} className="flex items-center gap-4 shrink-0 hover:opacity-80 transition-opacity">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-md shadow-brand/10 flex items-center justify-center p-1">
                            <Logo className="w-full h-full" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-accent-brown tracking-tight leading-none">Hi-Vet</h2>
                            <p className="text-[9px] mt-1 font-black uppercase tracking-widest text-brand-dark">
                                {user?.role === 'admin' ? 'Business Portal' : 'Patient Portal'}
                            </p>
                        </div>
                    </Link>

                    {/* Center Links (Desktop) */}
                    <div className="hidden lg:flex items-center justify-center flex-1 gap-2">
                        {links.map((link) => (
                            <NavLink
                                key={link.name}
                                to={link.path}
                                end={link.path === `/dashboard/${user?.role}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest transition-all ${isActive
                                        ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                        : 'text-accent-brown/50 hover:bg-accent-peach/50 hover:text-accent-brown'
                                    }`
                                }
                            >
                                <link.icon className="w-4 h-4" />
                                {link.name}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-6 shrink-0">
                        {user?.role === 'user' && (
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative w-12 h-12 bg-accent-peach/30 rounded-2xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-dark text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                        {totalItems}
                                    </span>
                                )}
                            </button>
                        )}
                        <button className="relative w-12 h-12 bg-accent-peach/30 rounded-2xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-dark rounded-full border-2 border-white"></span>
                        </button>

                        <div className="w-[1px] h-8 bg-accent-brown/10 hidden sm:block"></div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Logged in</span>
                                <span className="text-[11px] font-bold text-accent-brown truncate max-w-[150px]">{user?.email}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all cursor-pointer"
                                title="Log Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col container mx-auto px-6 pt-32 pb-10 lg:pt-36 lg:pb-16 w-full relative z-10">
                {/* Secondary Header */}
                <div className="mb-10 space-y-8">
                    {/* Mobile Navigation (Horizontal scrollable) */}
                    <div className="flex lg:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-4 border-b border-accent-brown/5 -mx-6 px-6">
                        {links.map((link) => (
                            <NavLink
                                key={link.name}
                                to={link.path}
                                end={link.path === `/dashboard/${user?.role}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${isActive
                                        ? 'bg-brand text-white shadow-md shadow-brand/20'
                                        : 'bg-white text-accent-brown/50 hover:bg-accent-peach/30'
                                    }`
                                }
                            >
                                <link.icon className="w-3.5 h-3.5" />
                                {link.name}
                            </NavLink>
                        ))}
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-accent-brown tracking-tighter leading-none">
                        {title}
                    </h1>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {children}
                </motion.div>
            </main>

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
