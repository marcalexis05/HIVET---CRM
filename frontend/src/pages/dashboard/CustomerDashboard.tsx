import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import {
    Package, Award, Calendar, Bell, MapPin,
    Gift, ShoppingBag, Heart, ChevronRight, ShoppingCart,
    Activity, ArrowRight, Dog, Plus, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import LoyaltyAnimation from '../../components/LoyaltyAnimation';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Product {
    id: number;
    business_id: number;
    clinic_name?: string;
    name: string;
    category: string;
    type: string;
    price: number;
    stock: number;
    sku: string;
    image: string;
    description?: string;
    tag?: string;
    loyalty_points: number;
    stars?: number;
    review_count?: number;
}

const Truck = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><circle cx="7" cy="18" r="2" /><path d="M9 18h4" /><circle cx="18" cy="18" r="2" /><path d="M20 18h2a1 1 0 0 0 1-1v-5l-3-4h-3v10Z" />
    </svg>
);

interface DashboardStats {
    loyalty: {
        points: number;
        tier: string;
        next_tier: string;
        next_points: number;
        points_to_next: number;
    };
    recent_order: {
        id: string;
        status: string;
        item_summary: string;
        location: string;
        created_at: string;
    } | null;
    pets: {
        name: string;
        next: string;
        icon: string;
    }[];
    alerts: {
        id: number;
        type: string;
        title: string;
        desc: string;
        created_at: string;
    }[];
    unread_count: number;
    insight: string;
    clinic_checkup: {
        pet_name: string;
        service: string;
        clinic_name: string;
        date: string;
        time: string;
        status: string;
    } | null;
    medical_metrics?: {
        total_visits: number;
        completed_visits: number;
    };
}

// --- Sub-component for product card to handle local quantity state ---
const DashboardProductCard = ({ p, navigate, triggerFlyAnimation, addToCart }: { p: Product, navigate: any, triggerFlyAnimation: any, addToCart: any }) => {
    const [qty, setQty] = useState(1);

    return (
        <motion.div
            whileHover={{ y: -8 }}
            className="bg-white rounded-[3.5rem] p-8 border border-accent-brown/10 hover:border-brand/40 transition-all duration-500 group flex flex-col relative h-full shadow-sm hover:shadow-2xl hover:shadow-accent-brown/10"
        >
            {/* Image Section */}
            <div
                onClick={() => navigate(`/dashboard/customer/catalog/${p.id}`)}
                className="relative aspect-square rounded-[3rem] bg-accent-brown/5 mb-8 flex items-center justify-center p-8 cursor-pointer overflow-hidden group/img"
            >
                <div className="absolute inset-0 bg-accent-brown/5 group-hover/img:bg-brand/5 transition-colors" />
                <img
                    src={p.image}
                    alt={p.name}
                    className="relative z-10 w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-700"
                />

                {/* Float-over Clinic Provider Badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-[2rem] p-4 shadow-xl flex items-center gap-4 border border-white/50 z-20 translate-y-2 group-hover/img:translate-y-0 opacity-0 group-hover/img:opacity-100 transition-all duration-500">
                    <div className="w-10 h-10 bg-brand/10 rounded-2xl flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-brand" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-brand uppercase tracking-widest leading-none mb-1 text-left">Clinic Provider</p>
                        <p className="text-[11px] font-black text-black uppercase truncate text-left">{p.clinic_name || 'Hivet Partner'}</p>
                    </div>
                </div>

                {p.tag && (
                    <div className="absolute top-6 left-6 bg-accent-brown/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg z-20">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{p.tag}</span>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="mb-8 flex-1">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black text-brand uppercase tracking-widest italic">{p.category || 'Dogs'}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-brown/10" />
                    <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">{p.type || 'Food'}</span>
                </div>
                <h4 className="text-xl font-black text-brand tracking-tighter leading-tight group-hover:scale-[1.02] origin-left transition-transform line-clamp-2 uppercase italic">
                    {p.name}
                </h4>
            </div>

            {/* Footer Section */}
            <div className="mt-auto pt-8 border-t border-accent-brown/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.3em] mb-2">Retail Price</p>
                    <div className="flex items-baseline gap-1 font-black text-accent-brown">
                        <span className="text-xs uppercase">₱</span>
                        <span className="text-3xl tracking-tighter italic">{p.price.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Quantity Selector Pill */}
                    <div className="flex items-center bg-accent-brown/5 rounded-full p-1.5 border border-accent-brown/10 shadow-inner">
                        <button
                            onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                            className="w-10 h-10 flex items-center justify-center text-accent-brown hover:text-brand hover:bg-white rounded-full transition-all active:scale-90"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-accent-brown italic">{qty}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                            className="w-10 h-10 flex items-center justify-center text-accent-brown hover:text-brand hover:bg-white rounded-full transition-all active:scale-90"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (p.stock > 0) {
                                triggerFlyAnimation(e, p.image);
                                addToCart({
                                    id: p.id,
                                    name: p.name,
                                    price: String(p.price),
                                    business_id: p.business_id,
                                    image: p.image,
                                    quantity: qty,
                                    variant: 'Standard',
                                    size: 'Medium',
                                    stock: p.stock || 0
                                });
                                setQty(1); // Reset after adding
                            }
                        }}
                        className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90 shadow-xl ${p.stock > 0
                            ? "bg-brand text-white shadow-brand/40 hover:bg-black hover:shadow-black/20"
                            : "bg-accent-brown/5 text-accent-brown/20 cursor-not-allowed"
                            }`}
                    >
                        <ShoppingCart className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const CustomerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const firstName = user?.name?.split(' ')[0] ?? 'Partner';

    useEffect(() => {
        if (products.length > 0) {
            const timer = setInterval(() => {
                const totalSlides = Math.ceil((products.length + 1) / 4); // +1 for the "View All" card
                setCurrentSlide((prev) => (prev + 1) % totalSlides);
            }, 6000); // Slightly slower for better readability
            return () => clearInterval(timer);
        }
    }, [products.length]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch(`${API}/api/customer/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchProducts = async () => {
            try {
                const res = await fetch(`${API}/api/catalog`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data);
                }
            } catch (err) {
                console.error('Error fetching catalog products:', err);
            } finally {
                setProductsLoading(false);
            }
        };

        fetchStats();
        fetchProducts();
    }, [user?.token]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'ready':
            case 'ready for pickup': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-orange-50 text-brand';
        }
    };

    const formatDateReadable = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getProgressIndex = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('pending') || s === 'ordered') return 0;
        if (s.includes('processing') || s.includes('confirmed')) return 1;
        if (s.includes('out for delivery') || s.includes('ready')) return 2;
        if (s.includes('completed') || s.includes('delivered')) return 3;
        return 0;
    };

    if (loading) {
        return (
            <DashboardLayout title="">
                <div className="flex items-center justify-center min-h-[600px]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-t-4 border-brand rounded-full"
                    />
                </div>
            </DashboardLayout>
        );
    }

    // Mock Pet Data for CRM Feel - Now empty to favor real data from stats
    const myPets = stats?.pets || [];

    return (
        <DashboardLayout title="" hideHeader={false}>
            <div className="space-y-6 w-full -mt-4 lg:-mt-6">

                {/* Top Desktop Bento Grid: User Summary, Active Session, Loyalty */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* 1. Identity & Quick Overview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                            <Heart size={140} className="fill-brand text-brand" />
                        </div>

                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full mb-4">
                                    <Award className="w-3.5 h-3.5 text-brand" />
                                    <span className="text-[9px] font-black text-brand uppercase tracking-[0.2em]">
                                        {stats?.loyalty?.tier || 'BRONZE'} Elite Member
                                    </span>
                                </div>
                                <h1 className="text-4xl sm:text-5xl font-black text-accent-brown tracking-tighter leading-[0.9] mb-4">
                                    Welcome back, <br />
                                    <span className="text-brand uppercase italic">{user?.name || 'Partner'}.</span>
                                </h1>
                                <p className="text-xs font-bold text-black/40 uppercase tracking-widest italic">Personal Dashboard</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] mb-1">Rewards</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-accent-brown">{stats?.loyalty?.points || 0}</span>
                                    <span className="text-[10px] font-black text-black/40 uppercase">Pts</span>
                                </div>
                            </div>
                        </div>

                        {/* Pet Profiles - Essential CRM Feature */}
                        <div className="mt-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-4">Your Family</h3>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                {myPets.map((pet, idx) => (
                                    <div key={idx} className="flex-shrink-0 bg-accent-peach/5 border border-accent-brown/5 rounded-[1.5rem] p-4 flex items-center gap-4 w-48 hover:border-brand/30 transition-all cursor-pointer group hover:bg-white hover:shadow-lg hover:shadow-accent-brown/5">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm border border-accent-brown/5 group-hover:scale-110 transition-transform">
                                            <span className="text-2xl">{pet.icon}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-accent-brown truncate">{pet.name}</p>
                                            <p className="text-[10px] font-bold text-black/40 truncate">Next: {pet.next !== 'None' ? formatDateReadable(pet.next) : 'None'}</p>
                                        </div>
                                    </div>
                                ))}
                                <button className="flex-shrink-0 w-12 h-12 border-2 border-dashed border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-brand hover:border-brand transition-all hover:bg-brand/5">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Active Shipment / Activity - Compact */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white relative overflow-hidden flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-brand">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-black text-accent-brown tracking-tight">Order Status</h2>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard/customer/orders')}
                                className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
                            >
                                Details
                            </button>
                        </div>

                        {stats?.recent_order ? (
                            <div className="space-y-6 flex-1 flex flex-col justify-center">
                                <div className="p-5 bg-accent-peach/5 rounded-[1.5rem] border border-accent-brown/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusColor(stats.recent_order.status).includes('green') ? 'bg-green-500' : 'bg-brand'}`} />
                                        <span className="text-[10px] font-black text-accent-brown uppercase tracking-widest truncate">{stats.recent_order.id}</span>
                                    </div>
                                    <h4 className="text-sm font-black text-accent-brown truncate mb-2 leading-tight">{stats.recent_order.item_summary}</h4>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{stats.recent_order.status}</p>
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.1em]">
                                            {formatDateReadable(stats.recent_order.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-accent-brown/50">
                                        <span>Status</span>
                                        <span>{((getProgressIndex(stats?.recent_order?.status || '') + 1) / 4 * 100)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-1">
                                        {[0, 1, 2, 3].map((idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${idx <= getProgressIndex(stats?.recent_order?.status || '')
                                                    ? 'bg-brand'
                                                    : 'bg-accent-brown/5'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10">
                                <Package size={48} strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Everything Delivered</p>
                            </div>
                        )}
                    </motion.div>

                    {/* 3. Loyalty & Action Hub */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#0A0A0A] rounded-[2.5rem] p-8 shadow-2xl border border-white/5 text-white flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Loyalty Perk</span>
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                            <LoyaltyAnimation />
                        </div>

                        <div>
                            <p className="text-sm font-bold text-white/80 italic mb-8 leading-relaxed">
                                "{stats?.insight || "Unlock exclusive rewards for your pets."}"
                            </p>
                            <button
                                onClick={() => navigate('/dashboard/customer/loyalty')}
                                className="w-full py-5 bg-brand text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:brightness-110 shadow-xl shadow-brand/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                Redeem Points <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Second Row: Health Pulse & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* 4. Health Pulse (CRM Schedule focus) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-accent-brown tracking-tight">Checkup</h2>
                                    <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">Pet Schedule</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard/customer/reservations')}
                                className="px-6 py-4 bg-accent-peach/10 hover:bg-brand hover:text-white rounded-2xl text-[10px] font-black text-accent-brown uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-sm border border-accent-brown/5"
                            >
                                Schedule Visit <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats?.clinic_checkup ? (
                                <div className="lg:col-span-2 p-5 bg-brand/5 border border-brand/10 rounded-[1.5rem] flex items-center gap-6 group hover:bg-white hover:shadow-xl hover:shadow-brand/5 transition-all">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand shadow-sm border border-brand/10 group-hover:scale-110 transition-transform">
                                        <Calendar className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-black text-brand uppercase tracking-widest bg-brand/10 px-2 py-0.5 rounded-full inline-block mb-2">Confirmed Booking</span>
                                        <h4 className="text-base font-black text-accent-brown truncate leading-none mb-1">{stats.clinic_checkup.service}</h4>
                                        <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest mb-1 truncate">{stats.clinic_checkup.clinic_name}</p>
                                        <p className="text-[10px] font-black text-accent-brown tracking-widest uppercase">
                                            {formatDateReadable(stats.clinic_checkup.date)} • {stats.clinic_checkup.time}
                                        </p>
                                    </div>
                                    <button className="w-10 h-10 rounded-full hover:bg-brand hover:text-white flex items-center justify-center text-accent-brown/20 transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="lg:col-span-2 p-6 bg-accent-peach/5 border border-dashed border-accent-brown/10 rounded-[1.5rem] flex flex-col items-center justify-center text-center py-10">
                                    <div className="w-12 h-12 rounded-full border border-accent-brown/10 flex items-center justify-center mb-4 opacity-30">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">No upcoming visits</p>
                                </div>
                            )}

                            {/* Rapid Insights Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Total Appointments</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-accent-brown tracking-tight">
                                            {stats?.medical_metrics?.total_visits || '0'}
                                        </span>
                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Total</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-brand/5 border border-brand/5 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[9px] font-black text-brand uppercase tracking-widest mb-1">Successful Visits</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-brand tracking-tight">
                                            {stats?.medical_metrics?.completed_visits || '0'}
                                        </span>
                                        <span className="text-[10px] font-bold text-brand/40 uppercase tracking-widest">Done</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 5. Alerts Center - Compact Scrollable */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col max-h-[400px]"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-brand" />
                                <h2 className="text-lg font-black text-accent-brown tracking-tight">Alerts</h2>
                            </div>
                            <span className="px-3 py-1 bg-black text-white text-[10px] font-black rounded-full leading-none">
                                {stats?.unread_count || 0}
                            </span>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-1">
                            {stats?.alerts && stats.alerts.length > 0 ? (
                                stats.alerts.map((alert, i) => (
                                    <div key={alert.id} className="flex gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.type === 'System' ? 'bg-orange-500' : 'bg-blue-500 shadow-lg shadow-blue-500/20'}`} />
                                        <div className="min-w-0">
                                            <h4 className="font-black text-xs text-accent-brown leading-tight group-hover:text-brand transition-colors truncate mb-1">
                                                {alert.title}
                                            </h4>
                                            <p className="text-[10px] font-medium text-black/40 line-clamp-1 truncate">{alert.desc}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-10 py-10">
                                    <Bell size={48} strokeWidth={1} />
                                    <p className="mt-4 font-black text-[10px] uppercase tracking-[0.2em]">All Caught Up</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => navigate('/dashboard/customer/alerts')}
                            className="mt-6 pt-6 border-t border-accent-brown/5 text-[10px] font-black text-accent-brown/40 uppercase tracking-widest hover:text-brand transition-all text-center w-full"
                        >
                            View All Activity
                        </button>
                    </motion.div>
                </div>

                {/* 6. Stores Slideshow - Replacing Premium Marketplace */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6 pt-4 overflow-hidden"
                >
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-2">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-accent-brown tracking-tighter uppercase italic">Our <span className="text-brand">Stores</span></h2>
                                <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Premium supplies for your family</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex gap-1">
                                {products.length > 0 && [...Array(Math.ceil((products.length + 1) / 4))].map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`w-8 h-1 rounded-full transition-all ${currentSlide === idx ? 'bg-brand' : 'bg-accent-brown/10'}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => navigate('/dashboard/customer/catalog')}
                                className="text-[11px] font-black text-brand uppercase tracking-widest flex items-center gap-3 hover:gap-4 transition-all pb-1"
                            >
                                Full Store <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="overflow-hidden px-2 -mx-2">
                            <motion.div
                                animate={{ x: `-${currentSlide * 100}%` }}
                                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                                className="flex"
                            >
                                {productsLoading ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="min-w-[calc(25%-18px)] w-[calc(25%-18px)] mx-[9px] h-[380px] bg-white rounded-[2.5rem] border border-accent-brown/5 animate-pulse" />
                                    ))
                                ) : (
                                    <>
                                        {products.map((p, i) => (
                                            <div key={p.id} className="min-w-full sm:min-w-[50%] lg:min-w-[25%] p-4">
                                                <DashboardProductCard
                                                    p={p}
                                                    navigate={navigate}
                                                    triggerFlyAnimation={triggerFlyAnimation}
                                                    addToCart={addToCart}
                                                />
                                            </div>
                                        ))}
                                        {/* Final View All Slide */}
                                        <div className="min-w-full sm:min-w-[50%] lg:min-w-[25%] p-2">
                                            <motion.div
                                                onClick={() => navigate('/dashboard/customer/catalog')}
                                                className="h-full bg-accent-peach/5 border-2 border-dashed border-accent-brown/10 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-brand/5 hover:border-brand/30 transition-all group"
                                            >
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-brand shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                                    <ArrowRight className="w-8 h-8" />
                                                </div>
                                                <p className="text-[10px] font-black text-accent-brown uppercase tracking-widest leading-loose">View All<br />Products</p>
                                            </motion.div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

            </div>
        </DashboardLayout>
    );
};

export default CustomerDashboard;
