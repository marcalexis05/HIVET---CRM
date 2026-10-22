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
import { toTitleCase, toSentenceCase, formatName } from '../../utils/textFormatters';

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
                        <p className="text-[10px] font-bold text-brand leading-none mb-1 text-left">Clinic Provider</p>
                        <p className="text-xs font-black text-black truncate text-left">{formatName(p.clinic_name) || 'Hi-Vet Partner'}</p>
                    </div>
                </div>

                {p.tag && (
                    <div className="absolute top-4 left-4 bg-accent-brown/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm z-20">
                        <span className="text-[8px] font-black text-white">{toTitleCase(p.tag)}</span>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="mb-8 flex-1">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-brand italic">{toTitleCase(p.category || 'Dogs')}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-brown/10" />
                    <span className="text-xs font-bold text-black/50">{toTitleCase(p.type || 'Food')}</span>
                </div>
                <h4 className="text-xl font-black text-brand tracking-tight leading-tight group-hover:scale-[1.02] origin-left transition-transform line-clamp-2 italic">
                    {p.name}
                </h4>
            </div>

            {/* Footer Section */}
            <div className="mt-auto pt-8 border-t border-accent-brown/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <p className="text-xs font-bold text-black/40 mb-1">Retail price</p>
                    <div className="flex items-baseline gap-1 font-black text-accent-brown">
                        <span className="text-xs">₱</span>
                        <span className="text-3xl tracking-tight italic">{p.price.toLocaleString()}</span>
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

    const formatItemSummary = (summary?: string) => {
        if (!summary) return 'Order items';
        return summary.replace(/\((\d+)\s+items?\)/gi, (_, count) => {
            const n = parseInt(count, 10);
            return `(${n} ${n === 1 ? 'item' : 'items'})`;
        });
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
            <div className="space-y-4 sm:space-y-6 w-full -mt-4 lg:-mt-6 pb-28 sm:pb-24 lg:pb-16 px-1 sm:px-2">

                {/* Top Desktop Bento Grid: User Summary (~60%) and Order Status (~40%) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">

                    {/* 1. Identity & Quick Overview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:col-span-7 lg:col-span-7 bg-white rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-7 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between relative overflow-hidden group"
                    >
                        <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:scale-105 transition-transform pointer-events-none select-none">
                            <Heart size={140} className="fill-brand text-brand" />
                        </div>

                        <div>
                            {/* Member Badge & Rewards Points in ONE row at the top */}
                            <div className="relative z-10 flex items-center justify-between gap-3 mb-4 sm:mb-5">
                                <div className="inline-flex items-center gap-1.5 bg-orange-50/90 border border-brand/10 px-3 py-1.5 rounded-full shrink-0">
                                    <Award className="w-3.5 h-3.5 text-brand shrink-0" />
                                    <span className="text-xs font-black text-brand">
                                        {toTitleCase(stats?.loyalty?.tier || 'Bronze')} Elite Member
                                    </span>
                                </div>
                                <div 
                                    className="flex items-baseline gap-1 shrink-0 whitespace-nowrap" 
                                    aria-label={`${stats?.loyalty?.points || 0} points`}
                                >
                                    <span className="text-xs font-bold text-black/40 hidden xs:inline">Rewards:</span>
                                    <span className="text-2xl sm:text-3xl font-black text-accent-brown tabular-nums leading-none">
                                        {stats?.loyalty?.points || 0}
                                    </span>
                                    <span className="text-xs font-bold text-black/50 ml-0.5">pts</span>
                                </div>
                            </div>

                            {/* Scaling Greeting below the top row */}
                            <div className="relative z-10 w-full mb-6 sm:mb-8">
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-accent-brown tracking-tight leading-tight">
                                    Welcome back,{' '}
                                    <span className="text-brand italic block sm:inline text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight break-words">
                                        {formatName(user?.name) || 'Partner'}.
                                    </span>
                                </h1>
                                <p className="text-xs font-bold text-black/50 mt-1.5">
                                    Personal dashboard
                                </p>
                            </div>
                        </div>

                        {/* Pet Profiles - Essential CRM Feature */}
                        <div className="relative z-10 mt-2 sm:mt-4">
                            <h3 className="text-xs font-black text-black/50 mb-3">Your family</h3>
                            <div 
                                tabIndex={0}
                                aria-label="Your pet profiles"
                                className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible no-scrollbar pb-1 -mx-1 px-1 md:mx-0 md:px-0 snap-x snap-mandatory focus:outline-none focus:ring-2 focus:ring-brand/20 rounded-2xl"
                            >
                                {myPets.map((pet, idx) => {
                                    const isSinglePet = myPets.length <= 1;
                                    return (
                                        <div 
                                            key={idx} 
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Pet: ${pet.name}, Next appointment: ${pet.next !== 'None' ? formatDateReadable(pet.next) : 'None'}`}
                                            className={`shrink-0 snap-start bg-accent-peach/5 border border-accent-brown/10 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 hover:border-brand/30 transition-all cursor-pointer group hover:bg-white hover:shadow-md min-h-[64px] focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                                                isSinglePet ? 'w-[calc(100%-3.5rem)] xs:w-[calc(100%-4rem)] md:w-auto' : 'w-[78%] xs:w-[80%] md:w-auto'
                                            }`}
                                        >
                                            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm border border-accent-brown/5 group-hover:scale-105 transition-transform shrink-0">
                                                <span className="text-xl">{pet.icon}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-accent-brown line-clamp-2 leading-tight break-words">{pet.name}</p>
                                                <p className="text-xs font-bold text-black/50 line-clamp-2 leading-tight break-words mt-0.5">
                                                    Next: {pet.next !== 'None' ? formatDateReadable(pet.next) : 'None'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button 
                                    type="button"
                                    aria-label="Add new pet"
                                    className="shrink-0 snap-start min-h-[64px] w-12 md:w-full border-2 border-dashed border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-brand hover:border-brand transition-all hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand/30"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Order Status Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-5 lg:col-span-5 bg-white rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-7 shadow-xl shadow-accent-brown/5 border border-white relative overflow-hidden flex flex-col justify-between"
                    >
                        <div>
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-brand shrink-0">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-black text-accent-brown tracking-tight">Order Status</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard/customer/orders')}
                                    className="min-h-[44px] min-w-[44px] px-3 py-2 -mr-2 rounded-xl flex items-center justify-center text-xs font-bold text-brand hover:underline"
                                >
                                    Details
                                </button>
                            </div>

                            {stats?.recent_order ? (
                                <div className="space-y-4 sm:space-y-5">
                                    {/* Order Box */}
                                    <div className="p-4 sm:p-5 bg-accent-peach/5 rounded-2xl sm:rounded-[1.5rem] border border-accent-brown/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(stats.recent_order.status).includes('green') ? 'bg-green-500' : 'bg-brand'}`} />
                                            <span className="text-xs font-black text-accent-brown">{stats.recent_order.id}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-accent-brown line-clamp-2 leading-snug mb-3 break-words">
                                            {formatItemSummary(stats.recent_order.item_summary)}
                                        </h4>
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2.5 border-t border-accent-brown/10">
                                            <span className="text-xs font-black text-brand">
                                                {toTitleCase(stats.recent_order.status)}
                                            </span>
                                            <span className="text-xs font-bold text-black/50">
                                                {formatDateReadable(stats.recent_order.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between text-xs font-black">
                                            <span className="flex items-center gap-1.5 text-black/60">
                                                <span>Status:</span>
                                                <span className="text-brand font-black">{toTitleCase(stats.recent_order.status || 'Pending')}</span>
                                            </span>
                                            <span className="text-xs font-black text-accent-brown tabular-nums">
                                                {Math.round(((getProgressIndex(stats?.recent_order?.status || '') + 1) / 4) * 100)}%
                                            </span>
                                        </div>
                                        <div 
                                            className="flex items-center gap-1.5"
                                            role="progressbar"
                                            aria-valuenow={Math.round(((getProgressIndex(stats?.recent_order?.status || '') + 1) / 4) * 100)}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`Order status: ${stats.recent_order.status || 'Pending'}, ${Math.round(((getProgressIndex(stats?.recent_order?.status || '') + 1) / 4) * 100)}% complete`}
                                        >
                                            {[0, 1, 2, 3].map((idx) => (
                                                <div
                                                    key={idx}
                                                    className={`h-2 min-h-[6px] flex-1 rounded-full transition-all duration-700 ${
                                                        idx <= getProgressIndex(stats?.recent_order?.status || '')
                                                            ? 'bg-brand shadow-sm shadow-brand/20'
                                                            : 'bg-accent-brown/10'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                                    <Package size={48} strokeWidth={1} />
                                    <p className="text-xs font-bold mt-4 text-slate-700">Everything Delivered</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Second Row: Health Pulse / Checkup (Full Width) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="col-span-12 bg-white rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-7 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">Checkup</h2>
                                    <p className="text-xs font-semibold text-slate-500">Pet Schedule</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/customer/reservations')}
                                className="min-h-[44px] px-5 py-2.5 bg-accent-peach/10 hover:bg-brand hover:text-white rounded-2xl text-xs font-bold text-accent-brown transition-all flex items-center justify-center gap-2.5 shadow-sm border border-accent-brown/5 active:scale-95"
                            >
                                Schedule Visit <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats?.clinic_checkup ? (
                                <div className="lg:col-span-2 p-4 sm:p-5 bg-brand/5 border border-brand/10 rounded-2xl sm:rounded-[1.5rem] flex items-center gap-4 sm:gap-6 group hover:bg-white hover:shadow-xl hover:shadow-brand/5 transition-all">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center text-brand shadow-sm border border-brand/10 group-hover:scale-105 transition-transform shrink-0">
                                        <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full inline-block mb-1.5">Confirmed booking</span>
                                        <h4 className="text-sm sm:text-base font-black text-accent-brown truncate leading-none mb-1">{stats.clinic_checkup.service}</h4>
                                        <p className="text-xs font-bold text-black/50 mb-1 truncate">{formatName(stats.clinic_checkup.clinic_name)}</p>
                                        <p className="text-xs font-black text-accent-brown">
                                            {formatDateReadable(stats.clinic_checkup.date)} • {stats.clinic_checkup.time}
                                        </p>
                                    </div>
                                    <button 
                                        type="button"
                                        aria-label="View appointment details"
                                        onClick={() => navigate('/dashboard/customer/reservations')}
                                        className="w-10 h-10 rounded-full hover:bg-brand hover:text-white flex items-center justify-center text-accent-brown/30 transition-all shrink-0 cursor-pointer"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="lg:col-span-2 p-6 bg-accent-peach/5 border border-dashed border-accent-brown/10 rounded-2xl sm:rounded-[1.5rem] flex flex-col items-center justify-center text-center py-8 sm:py-10">
                                    <div className="w-12 h-12 rounded-full border border-accent-brown/10 flex items-center justify-center mb-3 opacity-30">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-bold text-black/50">No upcoming visits</p>
                                </div>
                            )}

                            {/* Rapid Insights Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
                                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center">
                                    <span className="text-xs font-bold text-black/50 mb-1">Total appointments</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight">
                                            {stats?.medical_metrics?.total_visits || '0'}
                                        </span>
                                        <span className="text-[10px] font-bold text-black/40">Total</span>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-5 bg-brand/5 border border-brand/5 rounded-2xl flex flex-col justify-center">
                                    <span className="text-xs font-bold text-brand mb-1">Successful visits</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-black text-brand tracking-tight">
                                            {stats?.medical_metrics?.completed_visits || '0'}
                                        </span>
                                        <span className="text-[10px] font-bold text-brand/40">Done</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Third Row: Loyalty Perk Hub and Alerts Center */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                    {/* 3. Loyalty & Action Hub */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="col-span-12 md:col-span-6 bg-[#0A0A0A] rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-7 shadow-2xl border border-white/5 text-white flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-white/60">Loyalty perk</span>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-4">
                            <LoyaltyAnimation />
                        </div>

                        <div className="mt-4">
                            <p className="text-xs sm:text-sm font-bold text-white/80 italic mb-6 leading-relaxed">
                                "{stats?.insight || "Unlock exclusive rewards for your pets."}"
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/customer/loyalty')}
                                className="w-full min-h-[44px] py-4 bg-brand text-white rounded-2xl font-black text-xs hover:brightness-110 shadow-xl shadow-brand/20 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                            >
                                Redeem Points <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>

                    {/* 4. Alerts Center - Compact Scrollable */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="col-span-12 md:col-span-6 bg-white rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-7 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-brand shrink-0">
                                        <Bell className="w-5 h-5 text-brand" />
                                    </div>
                                    <h2 className="text-lg font-black text-accent-brown tracking-tight">Alerts</h2>
                                </div>
                                <span className="px-3 py-1 bg-black text-white text-xs font-black rounded-full leading-none">
                                    {stats?.unread_count || 0}
                                </span>
                            </div>

                            <div className="space-y-4 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                                {stats?.alerts && stats.alerts.length > 0 ? (
                                    stats.alerts.map((alert) => (
                                        <div key={alert.id} className="flex gap-3.5 group cursor-pointer hover:translate-x-1 transition-transform">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.type === 'System' ? 'bg-orange-500' : 'bg-blue-500 shadow-md shadow-blue-500/20'}`} />
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-black text-xs text-accent-brown leading-tight group-hover:text-brand transition-colors truncate mb-1">
                                                    {alert.title}
                                                </h4>
                                                <p className="text-xs font-medium text-black/50 line-clamp-1 truncate">{alert.desc}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center opacity-30 text-center">
                                        <Bell size={40} strokeWidth={1} />
                                        <p className="mt-3 font-bold text-xs text-black/50">All caught up</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/customer/alerts')}
                            className="mt-6 pt-4 border-t border-accent-brown/10 text-xs font-bold text-accent-brown/60 hover:text-brand transition-all text-center w-full min-h-[44px] flex items-center justify-center cursor-pointer"
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
                                <h2 className="text-2xl font-black text-accent-brown tracking-tight italic">Our <span className="text-brand">Stores</span></h2>
                                <p className="text-xs font-medium text-black/50">Premium supplies for your family</p>
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
                                className="text-xs font-bold text-brand flex items-center gap-2 hover:gap-3 transition-all pb-1 cursor-pointer"
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
                                                <p className="text-xs font-bold text-accent-brown leading-tight">View All<br />Products</p>
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
