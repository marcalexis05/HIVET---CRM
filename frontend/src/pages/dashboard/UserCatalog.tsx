import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Tag, Star, Search, Filter as FilterIcon, Award, ArrowUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UserCatalog = () => {
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();
    const [petFilter, setPetFilter] = useState<'All' | 'Cats' | 'Dogs'>('All');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Accessories' | 'Vitamins'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        fetchProducts();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${API}/api/catalog`);
            if (resp.ok) {
                const data = await resp.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesPet = petFilter === 'All' || p.category === petFilter;
            const matchesType = typeFilter === 'All' || p.type === typeFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.tag || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesPet && matchesType && matchesSearch;
        });
    }, [petFilter, typeFilter, searchQuery, products]);

    const resetFilters = () => {
        setPetFilter('All');
        setTypeFilter('All');
        setSearchQuery('');
    };

    return (
        <DashboardLayout title="Catalog & Ordering">
            <div className="space-y-8">
                {/* Search and Filters Header */}
                <div className="bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col lg:flex-row gap-4 sm:gap-6 justify-between items-center">
                    {/* Search Bar */}
                    <div className="relative group w-full lg:w-96">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/30 group-focus-within:text-brand transition-colors" />
                        <input
                            type="text"
                            placeholder="Search catalog or rewards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-accent-peach/20 rounded-2xl border-2 border-transparent focus:border-brand/30 outline-none transition-all font-medium text-accent-brown placeholder:text-accent-brown/30"
                        />
                    </div>

                    {/* Dual Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        {/* Pet Filter */}
                        <div className="flex bg-accent-peach/20 p-1.5 rounded-2xl border border-transparent">
                            {['All', 'Cats', 'Dogs'].map((cat) => (
                                <motion.button
                                    key={cat}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setPetFilter(cat as any)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer ${petFilter === cat
                                        ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/20 border-2 border-brand-dark'
                                        : 'bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20 border-2 border-transparent'
                                        }`}
                                >
                                    {cat === 'Cats' && <span>🐱</span>}
                                    {cat === 'Dogs' && <span>🐶</span>}
                                    {cat}
                                </motion.button>
                            ))}
                        </div>

                        {/* Type Filter */}
                        <div className="grid grid-cols-2 sm:flex bg-accent-peach/20 p-1.5 rounded-2xl border border-transparent w-full sm:w-auto gap-1">
                            {['All', 'Food', 'Accessories', 'Vitamins'].map((type) => (
                                <motion.button
                                    key={type}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setTypeFilter(type as any)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex-1 sm:flex-none justify-center cursor-pointer ${typeFilter === type
                                        ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/20 border-2 border-brand-dark'
                                        : 'bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20 border-2 border-transparent'
                                        }`}
                                >
                                    {type}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Filter Summary */}
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm font-bold text-accent-brown/50">
                        Showing <span className="text-accent-brown">{filteredProducts.length}</span> results
                    </p>
                    {(petFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '') && (
                        <button onClick={resetFilters} className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors">
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                        <Loader2 className="w-10 h-10 animate-spin text-brand" />
                        <p className="font-bold text-sm tracking-widest uppercase">Fetching Latest Items...</p>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                whileHover={{ scale: 1.02, y: -8, borderColor: '#ff9f1c', boxShadow: '0 25px 50px -12px rgba(61, 43, 31, 0.15)' }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.3 }}
                                onClick={() => navigate(`/dashboard/user/catalog/${p.id}`)}
                                className="group flex flex-col bg-white rounded-3xl sm:rounded-[2rem] p-4 sm:p-5 shadow-xl shadow-accent-brown/5 border border-white cursor-pointer transition-all relative"
                            >
                                {/* Active Tag */}
                                <div className="absolute top-5 left-5 z-20">
                                    <div className="bg-white/90 text-accent-brown backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-brand/10">
                                        <Tag className="w-3 h-3 text-brand-dark" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{p.tag}</span>
                                    </div>
                                </div>

                                {/* Image */}
                                <div className="w-full aspect-square bg-accent-peach/10 rounded-[1.5rem] mb-4 relative overflow-hidden flex items-center justify-center p-4">
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 ease-out"
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">{p.type} {p.category && `• ${p.category}`}</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-2.5 h-2.5 ${i < p.stars ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                            ))}
                                        </div>
                                    </div>

                                    <h3 className="text-base sm:text-lg font-black text-accent-brown leading-tight tracking-tight mb-2 line-clamp-2">{p.name}</h3>
                                    <p className="text-xs text-accent-brown/50 font-medium line-clamp-2 mb-4">
                                        {p.description}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-accent-brown/5 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-black text-accent-brown tracking-tighter text-sm">₱{p.price}</p>
                                            {p.stock !== undefined && (
                                                <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${p.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                                                    {p.stock > 0 ? `${p.stock} In Stock` : 'Out of Stock'}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1 text-brand">
                                            <Award className="w-3 h-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">+{p.loyalty_points || 0} Pts</span>
                                        </div>

                                        <div className="flex items-center gap-2 relative z-10">
                                            <motion.button
                                                disabled={p.stock <= 0}
                                                whileHover={p.stock > 0 ? { scale: 1.05 } : {}}
                                                whileTap={p.stock > 0 ? { scale: 0.95 } : {}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart({
                                                        id: p.id,
                                                        business_id: p.business_id,
                                                        name: p.name,
                                                        price: p.price,
                                                        image: p.image,
                                                        quantity: 1,
                                                        variant: 'Standard',
                                                        size: 'Medium'
                                                    });
                                                    navigate('/dashboard/user/checkout');
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg whitespace-nowrap ${p.stock > 0 ? "bg-brand text-white hover:bg-brand-dark shadow-brand/20" : "bg-accent-brown/20 text-accent-brown/40 cursor-not-allowed"}`}
                                            >
                                                {p.stock > 0 ? "Buy Now" : "Sold Out"}
                                            </motion.button>
                                            <motion.button
                                                disabled={p.stock <= 0}
                                                whileHover={p.stock > 0 ? { scale: 1.1, rotate: 5 } : {}}
                                                whileTap={p.stock > 0 ? { scale: 0.9, rotate: -5 } : {}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerFlyAnimation(e, p.image);
                                                    addToCart({
                                                        id: p.id,
                                                        business_id: p.business_id,
                                                        name: p.name,
                                                        price: p.price,
                                                        image: p.image,
                                                        quantity: 1,
                                                        variant: 'Standard',
                                                        size: 'Medium'
                                                    });
                                                }}
                                                className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-sm ${p.stock > 0 ? "bg-accent-peach/30 text-brand-dark hover:bg-brand-dark hover:text-white" : "bg-accent-brown/10 text-accent-brown/40 cursor-not-allowed"}`}
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                )}

                {/* Empty State */}
                {filteredProducts.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center"
                    >
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-accent-brown/5">
                            <FilterIcon className="w-8 h-8 text-accent-brown/20" />
                        </div>
                        <h2 className="text-2xl font-black text-accent-brown mb-2">No items found</h2>
                        <p className="text-accent-brown/40 text-sm font-medium">Try adjusting your filters to see more products.</p>
                        <button
                            onClick={resetFilters}
                            className="mt-6 text-brand-dark font-black uppercase tracking-widest text-[10px] hover:underline"
                        >
                            Reset filters
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Scroll to Top Button */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-6 md:bottom-12 md:right-10 z-[60] w-12 h-12 md:w-16 md:h-16 bg-brand-dark text-white rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                        <ArrowUp className="w-5 h-5 md:w-6 md:h-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default UserCatalog;
