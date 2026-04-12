import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Tag, Star, Search, Filter as FilterIcon, Award, ArrowUp, Loader2, Store, Minus, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';

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

const CustomerCatalog = () => {
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();
    const [petFilter, setPetFilter] = useState<string>('All');
    const [typeFilter, setTypeFilter] = useState<string>('All');
    const [showMoreCategoriesModal, setShowMoreCategoriesModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});

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
            const [prodResp] = await Promise.all([
                fetch(`${API}/api/catalog`)
            ]);

            if (prodResp.ok) {
                const data = await prodResp.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const base = ['Cats', 'Dogs'];
        const existing = products.map(p => p.category);
        return Array.from(new Set([...base, ...existing])).filter(Boolean);
    }, [products]);

    const types = useMemo(() => {
        const base = [
            'Food', 'Accessories', 'Vitamins',
            'Health & Wellness', 'Grooming', 'Toys', 'Bedding',
            'Apparel', 'Training', 'Hygiene', 'Furniture'
        ];
        const existing = products.map(p => p.type);
        return Array.from(new Set([...base, ...existing])).filter(Boolean);
    }, [products]);

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
        <>
            <DashboardLayout title="Catalog & Ordering">
                <div className="space-y-8">
                    {/* Search and Filters Header (Pill Style) */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[3rem] p-2 sm:p-3 shadow-2xl shadow-accent-brown/5 flex flex-col lg:flex-row gap-4 items-center">
                        {/* Search Bar Section */}
                        <div className="relative group w-full lg:w-[35%]">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand transition-colors" />
                            <input
                                type="text"
                                placeholder="Search catalog or rewards..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-accent-peach/10 rounded-full border border-transparent focus:bg-white outline-none transition-all font-medium text-accent-brown placeholder:text-accent-brown/20 text-sm"
                            />
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-[1px] h-10 bg-accent-brown/10 mx-2"></div>

                        {/* Dual Filters Section */}
                        <div className="flex flex-col md:flex-row gap-6 w-full lg:w-auto items-start md:items-center px-4 py-2 lg:py-0">
                            {/* Pet Filter */}
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0 w-full md:w-auto">
                                {['All', ...categories].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setPetFilter(cat)}
                                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0 ${petFilter === cat
                                            ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                            : 'text-accent-brown/40 hover:text-accent-brown hover:bg-white/50'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="hidden md:block w-[1px] h-6 bg-accent-brown/10 flex-shrink-0"></div>

                            {/* Type Filter */}
                            <div className="flex items-center gap-3 flex-wrap pb-2 md:pb-0 w-full md:w-auto">
                                {['All', ...types.slice(0, 3)].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(type)}
                                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0 ${typeFilter === type
                                            ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20'
                                            : 'text-accent-brown/40 hover:text-accent-brown hover:bg-white/50'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}

                                {/* Selected Overflow Category */}
                                {typeFilter !== 'All' && !['All', ...types.slice(0, 3)].includes(typeFilter) && (
                                    <button
                                        onClick={() => setTypeFilter(typeFilter)}
                                        className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0 bg-brand-dark text-white shadow-lg shadow-brand-dark/20"
                                    >
                                        {typeFilter}
                                    </button>
                                )}

                                {/* Always visible View More button */}
                                {types.length > 3 && (
                                    <button
                                        onClick={() => setShowMoreCategoriesModal(true)}
                                        className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex items-center gap-1 flex-shrink-0 text-brand-dark hover:bg-white/50"
                                    >
                                        + {types.length - 3} More
                                    </button>
                                )}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            <AnimatePresence mode="popLayout">
                                {filteredProducts.map((p) => (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        whileHover={{ y: -10 }}
                                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className="group relative flex flex-col bg-white rounded-[2.5rem] p-4 shadow-xl shadow-accent-brown/5 border border-accent-brown/5 hover:border-brand/20 hover:shadow-2xl transition-all duration-500"
                                    >
                                        {/* Top Badges */}
                                        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
                                            {p.tag ? (
                                                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-brand/10 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-500">
                                                    <Tag className="w-3 h-3 text-brand" />
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-accent-brown">{p.tag}</span>
                                                </div>
                                            ) : <div />}

                                            {p.loyalty_points > 0 && (
                                                <div className="bg-brand/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-brand/20 flex items-center gap-1.5">
                                                    <Award className="w-3 h-3 text-brand" />
                                                    <span className="text-[9px] font-black text-brand uppercase tracking-tighter">+{p.loyalty_points} Pts</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Image Section */}
                                        <div
                                            onClick={() => navigate(`/dashboard/customer/catalog/${p.id}`)}
                                            className="relative aspect-square rounded-[2rem] bg-accent-peach/5 mb-5 overflow-hidden flex items-center justify-center p-6 cursor-pointer"
                                        >
                                            <img
                                                src={p.image}
                                                alt={p.name}
                                                className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-700 ease-out"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />

                                            {p.clinic_name && (
                                                <div className="absolute bottom-4 inset-x-4">
                                                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-accent-brown/5 flex items-center gap-2 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                                        <Store className="w-3.5 h-3.5 text-brand" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown truncate">{p.clinic_name}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 flex flex-col px-2">
                                            <div className="flex items-center justify-between mb-2 h-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand/60">{p.type}</span>
                                                {(p.stars && p.stars > 0) ? (
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < Math.round(p.stars || 0) ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[8px] font-bold text-accent-brown/20 uppercase tracking-widest">No reviews yet</span>
                                                )}
                                            </div>

                                            <h3
                                                onClick={() => navigate(`/dashboard/customer/catalog/${p.id}`)}
                                                className="text-lg font-black text-accent-brown leading-tight tracking-tight mb-2 hover:text-brand transition-colors cursor-pointer line-clamp-1"
                                            >
                                                {p.name}
                                            </h3>

                                            <p className="text-xs text-accent-brown/40 font-medium line-clamp-2 mb-4 leading-relaxed">
                                                {p.description}
                                            </p>

                                            {/* Footer Section */}
                                            <div className="mt-auto space-y-4">
                                                <div className="flex items-end justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-2xl font-black text-accent-brown tracking-tighter">₱{p.price}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${p.stock > 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                            {p.stock > 0 ? `${p.stock} Units ready` : 'Currently Unavailable'}
                                                        </span>
                                                    </div>

                                                    {/* Compact Quantity Selector */}
                                                    <div className="flex items-center gap-3 bg-accent-peach/10 rounded-xl p-1 border border-accent-brown/5 scale-90 origin-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setItemQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }));
                                                            }}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown hover:bg-white transition-all active:scale-95"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="text-sm font-black text-accent-brown min-w-[20px] text-center">{itemQuantities[p.id] || 1}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const currentQty = itemQuantities[p.id] || 1;
                                                                if (currentQty < (p.stock || 0)) {
                                                                    setItemQuantities(prev => ({ ...prev, [p.id]: currentQty + 1 }));
                                                                }
                                                            }}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown hover:bg-white transition-all active:scale-95"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-3">
                                                    <motion.button
                                                        disabled={p.stock <= 0 || (itemQuantities[p.id] || 1) > p.stock}
                                                        whileHover={p.stock > 0 ? { scale: 1.02 } : {}}
                                                        whileTap={p.stock > 0 ? { scale: 0.98 } : {}}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart({
                                                                id: p.id,
                                                                business_id: p.business_id,
                                                                name: p.name,
                                                                price: String(p.price),
                                                                image: p.image,
                                                                quantity: itemQuantities[p.id] || 1,
                                                                variant: 'Standard',
                                                                size: 'Medium',
                                                                stock: p.stock || 0
                                                            });
                                                            navigate('/dashboard/customer/checkout');
                                                        }}
                                                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${p.stock > 0 ? "bg-brand text-white shadow-brand/20 hover:bg-brand-dark" : "bg-accent-brown/10 text-accent-brown/30 cursor-not-allowed"}`}
                                                    >
                                                        Buy Now
                                                    </motion.button>

                                                    <motion.button
                                                        disabled={p.stock <= 0 || (itemQuantities[p.id] || 1) > p.stock}
                                                        whileHover={p.stock > 0 ? { scale: 1.02 } : {}}
                                                        whileTap={p.stock > 0 ? { scale: 0.98 } : {}}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            triggerFlyAnimation(e, p.image);
                                                            addToCart({
                                                                id: p.id,
                                                                business_id: p.business_id,
                                                                name: p.name,
                                                                price: String(p.price),
                                                                image: p.image,
                                                                quantity: itemQuantities[p.id] || 1,
                                                                variant: 'Standard',
                                                                size: 'Medium',
                                                                stock: p.stock || 0
                                                            });
                                                        }}
                                                        className={`w-14 rounded-2xl flex items-center justify-center transition-all ${p.stock > 0 ? "bg-brand-dark text-white shadow-lg shadow-brand-dark/20 hover:bg-black" : "bg-accent-brown/10 text-accent-brown/30 cursor-not-allowed"}`}
                                                    >
                                                        <ShoppingCart className="w-5 h-5" />
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

            {/* More Categories Modal */}
            <AnimatePresence>
                {showMoreCategoriesModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMoreCategoriesModal(false)}
                            className="fixed inset-0 bg-accent-brown/30 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        >
                            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-left relative">
                                <div className="flex items-center justify-between mb-8 shrink-0">
                                    <div>
                                        <h3 className="text-2xl font-black text-accent-brown tracking-tight">All Item Types</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mt-1">
                                            Select an item category to filter the catalog
                                        </p>
                                    </div>
                                    <button onClick={() => setShowMoreCategoriesModal(false)} className="w-10 h-10 bg-accent-peach/30 rounded-2xl flex items-center justify-center text-accent-brown hover:bg-white transition-all shadow-sm">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar">
                                    <div className="flex flex-wrap gap-3">
                                        {['All', ...types].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setTypeFilter(type);
                                                    setShowMoreCategoriesModal(false);
                                                }}
                                                className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${typeFilter === type
                                                    ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20'
                                                    : 'bg-accent-peach/5 border border-accent-peach/20 text-accent-brown/60 hover:bg-brand/10 hover:text-brand hover:border-brand/30'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default CustomerCatalog;
