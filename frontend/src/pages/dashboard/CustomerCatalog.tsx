import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Search, Filter as FilterIcon, 
    Award, ArrowUp, ArrowDown, Loader2, Minus, Plus, X,
    ChevronRight, Star, TrendingUp, Store
} from 'lucide-react';
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
    const productsRef = useRef<HTMLDivElement>(null);
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
            const prodResp = await fetch(`${API}/api/catalog`);
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

    const updateQuantity = (productId: number, increment: boolean) => {
        setItemQuantities(prev => {
            const current = prev[productId] || 1;
            const product = products.find(p => p.id === productId);
            if (increment) {
                if (product && current < product.stock) {
                    return { ...prev, [productId]: current + 1 };
                }
                return prev;
            } else {
                return { ...prev, [productId]: Math.max(1, current - 1) };
            }
        });
    };

    const itemQuantitiesRef = useRef(itemQuantities);
    useEffect(() => {
        itemQuantitiesRef.current = itemQuantities;
    }, [itemQuantities]);

    const handleQuantityInput = (productId: number, value: string) => {
        const product = products.find(p => p.id === productId);
        const maxStock = product?.stock || 999;
        
        let num = parseInt(value.replace(/[^0-9]/g, ''));
        if (isNaN(num)) num = 1;
        
        const finalNum = Math.min(Math.max(1, num), maxStock);
        setItemQuantities(prev => ({ ...prev, [productId]: finalNum }));
    };

    // Long press logic
    const timerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    const startCounter = (productId: number, increment: boolean) => {
        updateQuantity(productId, increment); // Initial click
        
        timerRef.current = setTimeout(() => {
            let speed = 100;
            const run = () => {
                updateQuantity(productId, increment);
                intervalRef.current = setTimeout(run, speed);
                if (speed > 30) speed -= 10; // Accelerate
            };
            run();
        }, 500); // 500ms delay before auto-run
    };

    const stopCounter = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearTimeout(intervalRef.current);
    };

    return (
        <DashboardLayout title="">
            <div className="max-w-[1920px] mx-auto space-y-16 pb-20 px-4 sm:px-6 lg:px-8">
                

                {/* SEARCH & FILTERS HUB */}
                <div className="bg-white rounded-[3rem] p-8 border border-accent-brown/10 shadow-sm">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* Search Bar */}
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/30 group-focus-within:text-brand transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search our premium catalog..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-accent-brown/5 h-20 pl-16 pr-8 rounded-[2rem] text-sm font-black text-accent-brown placeholder:text-accent-brown/20 outline-none border border-transparent focus:border-brand focus:bg-white focus:shadow-xl transition-all"
                            />
                        </div>

                        {/* Category Selector */}
                        <div className="flex items-center gap-3 p-2 bg-accent-brown/5 rounded-[2rem] border border-transparent self-stretch lg:self-auto">
                            {['All', ...categories].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setPetFilter(cat)}
                                    className={`px-10 py-4 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${petFilter === cat ? 'bg-white text-accent-brown shadow-xl' : 'text-accent-brown/40 hover:text-brand'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-8 pt-8 border-t border-accent-brown/5 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/20 mr-4 italic">Filter by Type:</span>
                        {['All', ...types.slice(0, 6)].map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    typeFilter === type 
                                    ? 'bg-brand text-white shadow-md shadow-brand/20' 
                                    : 'bg-white text-accent-brown/40 border border-accent-brown/10 hover:border-brand hover:text-brand'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                        
                        {types.length > 6 && (
                            <button
                                onClick={() => setShowMoreCategoriesModal(true)}
                                className="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-brand border border-brand/20 hover:bg-brand hover:text-white transition-all ml-auto"
                            >
                                More Options +{types.length - 6}
                            </button>
                        )}
                        
                        {(petFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '') && (
                            <button 
                                onClick={resetFilters}
                                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors ml-6"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* PRODUCT LISTING */}
                <div ref={productsRef} className="pt-4">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="aspect-[3/4] bg-white rounded-[3rem] border border-accent-brown/5 animate-pulse"></div>
                            ))}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white py-40 rounded-[4rem] text-center border border-accent-brown/5 shadow-sm"
                        >
                            <div className="w-24 h-24 bg-accent-brown/5 rounded-full flex items-center justify-center mx-auto mb-8 text-accent-brown/10">
                                <Search className="w-10 h-10" />
                            </div>
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter mb-4 uppercase italic">No Products Found</h3>
                            <p className="text-sm font-medium text-accent-brown/40 max-w-md mx-auto px-6">We couldn't find any products matching your current filters. Please try searching for something else.</p>
                            <button 
                                onClick={resetFilters}
                                className="mt-10 px-12 py-5 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-brand/20"
                            >
                                Clear All Search Filters
                            </button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            <AnimatePresence mode="popLayout">
                                {filteredProducts.map((p, i) => (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        whileHover={{ y: -8 }}
                                        className="group bg-white rounded-[2.5rem] p-7 border border-accent-brown/10 hover:border-brand/40 transition-all duration-500 flex flex-col relative overflow-hidden"
                                    >
                                        {/* Product Image */}
                                        <div 
                                            onClick={() => navigate(`/dashboard/customer/catalog/${p.id}`)}
                                            className="relative aspect-square rounded-[2rem] bg-accent-brown/5 mb-8 flex items-center justify-center p-8 cursor-pointer group-hover:bg-white transition-all duration-500 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-accent-brown/5 group-hover:bg-brand/5 transition-colors" />
                                            <img
                                                src={p.image}
                                                alt={p.name}
                                                className="relative z-10 w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                                            />
                                            
                                            {/* Top-Left: Product Tag Reveal */}
                                            {p.tag && (
                                                <div className="absolute top-4 left-4 -translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20">
                                                    <div className="bg-accent-brown/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg border border-white/10">
                                                        <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">{p.tag}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top-Right: Loyalty Points Reveal */}
                                            {p.loyalty_points > 0 && (
                                                <div className="absolute top-4 right-4 -translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 delay-75">
                                                    <div className="bg-brand/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-white/10 flex items-center gap-1.5">
                                                        <Award className="w-3 h-3 text-white" />
                                                        <span className="text-[9px] font-black text-white uppercase tracking-tighter">+{p.loyalty_points} Pts</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Clinic Name Hover Reveal (Restored) */}
                                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
                                                <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-brand/10 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                                                        <Store className="w-4 h-4 text-brand" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black text-brand uppercase tracking-widest leading-none mb-1">Clinic Provider</p>
                                                        <p className="text-[11px] font-black text-accent-brown truncate uppercase tracking-tighter">{p.clinic_name || 'Hi-Vet Official'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-8 px-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[9px] font-black text-brand uppercase tracking-widest">{p.category}</span>
                                                <div className="w-1 h-1 rounded-full bg-accent-brown/20" />
                                                <span className="text-[9px] font-medium text-accent-brown/30 uppercase tracking-widest">{p.type}</span>
                                            </div>
                                            <h4 className="text-xl font-black text-accent-brown tracking-tighter leading-tight group-hover:text-brand transition-colors line-clamp-2 min-h-[3rem] uppercase italic">
                                                {p.name}
                                            </h4>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-accent-brown/5 flex items-end justify-between px-2">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-accent-brown/30 uppercase tracking-[0.2em]">Retail Price</p>
                                                <div className="flex items-baseline gap-1.5 font-black text-accent-brown">
                                                    <span className="text-xs">₱</span>
                                                    <span className="text-3xl tracking-tighter tabular-nums">{p.price.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-accent-brown/5 rounded-2xl p-1 border border-accent-brown/5">
                                                    <button 
                                                        onMouseDown={(e) => { e.stopPropagation(); startCounter(p.id, false); }}
                                                        onMouseUp={stopCounter}
                                                        onMouseLeave={stopCounter}
                                                        onTouchStart={(e) => { e.stopPropagation(); startCounter(p.id, false); }}
                                                        onTouchEnd={stopCounter}
                                                        className="w-10 h-10 flex items-center justify-center text-accent-brown/30 hover:text-brand transition-colors select-none"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={itemQuantities[p.id] || 1}
                                                        onChange={(e) => handleQuantityInput(p.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-10 h-10 bg-transparent text-center text-[11px] font-black text-accent-brown outline-none"
                                                    />

                                                    <button 
                                                        onMouseDown={(e) => { e.stopPropagation(); startCounter(p.id, true); }}
                                                        onMouseUp={stopCounter}
                                                        onMouseLeave={stopCounter}
                                                        onTouchStart={(e) => { e.stopPropagation(); startCounter(p.id, true); }}
                                                        onTouchEnd={stopCounter}
                                                        className="w-10 h-10 flex items-center justify-center text-accent-brown/30 hover:text-brand transition-colors select-none"
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
                                                                quantity: itemQuantities[p.id] || 1,
                                                                variant: 'Standard',
                                                                size: 'Medium',
                                                                stock: p.stock || 0
                                                            });
                                                        }
                                                    }}
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                                                        p.stock > 0 
                                                        ? "bg-brand text-white hover:bg-black shadow-brand/20" 
                                                        : "bg-accent-brown/5 text-accent-brown/20 cursor-not-allowed"
                                                    }`}
                                                >
                                                    <ShoppingCart className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Scroll Link (Floating Down Button) */}
            <AnimatePresence>
                {!showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
                        className="fixed bottom-12 right-12 z-[100] w-12 h-12 bg-brand text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white"
                    >
                        <ArrowDown className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Scroll to Top (Appears when scrolled down) */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-12 right-12 z-[100] w-12 h-12 bg-white text-brand rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-brand"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Sub-Category Filter Modal */}
            {createPortal(
                <AnimatePresence>
                    {showMoreCategoriesModal && (
                        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-accent-brown/60 backdrop-blur-xl" onClick={() => setShowMoreCategoriesModal(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[75vh] overflow-hidden text-left border border-accent-brown/10 relative mt-12"
                            >
                                <div className="flex items-center justify-between mb-6 shrink-0">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-brand italic">Catalog Categories</p>
                                        <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tighter uppercase italic leading-none">Find Exactly What You Need</h3>
                                    </div>
                                    <button 
                                        onClick={() => setShowMoreCategoriesModal(false)} 
                                        className="w-10 h-10 bg-accent-brown/5 rounded-xl flex items-center justify-center text-accent-brown hover:bg-black hover:text-white transition-all group shrink-0 ml-4"
                                    >
                                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                                    {['All', ...types].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setTypeFilter(type);
                                                setShowMoreCategoriesModal(false);
                                            }}
                                            className={`p-4 rounded-2xl text-left transition-all duration-500 border-2 ${
                                                typeFilter === type
                                                ? 'bg-brand border-brand text-white shadow-xl shadow-brand/20'
                                                : 'bg-white border-accent-brown/5 text-accent-brown/60 hover:border-brand hover:text-brand shadow-sm'
                                            }`}
                                        >
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-1 opacity-40">Selection</p>
                                            <p className="text-sm font-black tracking-tight uppercase italic leading-tight">{type}</p>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default CustomerCatalog;
