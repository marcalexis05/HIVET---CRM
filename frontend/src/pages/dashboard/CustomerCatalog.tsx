import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Search, Filter as FilterIcon, 
    Award, Loader2, Minus, Plus, X,
    ChevronRight, Star, TrendingUp, Store,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import ProductCard from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import { toTitleCase, toSentenceCase, formatName, formatUnit } from '../../utils/textFormatters';

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
    const [isTypeExpanded, setIsTypeExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const typeChipsContainerRef = useRef<HTMLDivElement>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});

    useEffect(() => {
        fetchProducts();
    }, []);

    // Handle Escape key to collapse expanded categories without resetting filter
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isTypeExpanded) {
                setIsTypeExpanded(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTypeExpanded]);

    // Auto-scroll selected type chip into view
    useEffect(() => {
        if (isTypeExpanded) return;
        const timer = setTimeout(() => {
            if (!typeChipsContainerRef.current) return;
            const selectedBtn = typeChipsContainerRef.current.querySelector<HTMLElement>(`[data-type="${typeFilter}"]`);
            if (selectedBtn) {
                const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                selectedBtn.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    inline: 'center',
                    block: 'nearest'
                });
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [typeFilter, isTypeExpanded]);

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

    // Collapsed row chips on mobile: first 6, plus active typeFilter if not already in top 6
    const collapsedTypes = useMemo(() => {
        const top = types.slice(0, 6);
        if (typeFilter !== 'All' && !top.includes(typeFilter)) {
            return [...top, typeFilter];
        }
        return top;
    }, [types, typeFilter]);

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
        setIsTypeExpanded(false);
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
            <div className="max-w-[1920px] mx-auto space-y-4 sm:space-y-8 pb-10 px-2 sm:px-6 lg:px-8">
                

                {/* SEARCH & FILTERS HUB */}
                <div className="bg-white rounded-3xl sm:rounded-[3rem] p-4 xs:p-5 sm:p-6 lg:p-8 border border-accent-brown/10 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 lg:gap-6">
                        {/* Search Bar */}
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 h-5 text-accent-brown/60 group-focus-within:text-brand transition-colors pointer-events-none" />
                            <input 
                                type="text" 
                                placeholder="Search products" 
                                aria-label="Search our premium store products"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-accent-brown/5 min-h-[48px] h-12 sm:h-14 pl-11 sm:pl-14 pr-10 sm:pr-12 rounded-2xl sm:rounded-[2rem] text-base font-bold text-accent-brown placeholder:text-accent-brown/50 outline-none border border-transparent focus:border-brand focus:bg-white focus:shadow-md transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black/60 transition-colors"
                                    aria-label="Clear search query"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Pet Category Selector */}
                        <div className="w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px] p-1.5 bg-accent-brown/5 rounded-2xl sm:rounded-[2rem] border border-transparent shrink-0">
                            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                                {['All', ...categories].map((cat) => {
                                    const isSelected = petFilter === cat;
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setPetFilter(cat)}
                                            className={`min-h-[44px] px-2 xs:px-3 py-2 rounded-xl sm:rounded-[1.4rem] text-xs font-bold transition-all flex items-center justify-center text-center ${
                                                isSelected
                                                    ? 'bg-white text-accent-brown shadow-md shadow-accent-brown/5 font-black'
                                                    : 'text-black hover:text-brand hover:bg-white/40'
                                            }`}
                                        >
                                            <span className="truncate">{toTitleCase(cat)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Type Filters: Inline wrapped on tablet/desktop, collapsible single row / expanding grid on mobile */}
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-accent-brown/5">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <span className="text-xs font-bold text-black">Filter by type:</span>
                            {(petFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '') && (
                                <button 
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>

                        {/* Screen reader live announcement */}
                        <div className="sr-only" aria-live="polite" role="status">
                            {typeFilter === 'All' ? 'Showing all product categories' : `Filtered by ${typeFilter}`}
                        </div>

                        {/* Tablet & Desktop: Show all categories wrapped in a tidy row from the start */}
                        <div className="hidden sm:flex sm:flex-wrap items-center gap-2 py-1">
                            {['All', ...types].map((type) => {
                                const isSelected = typeFilter === type;
                                return (
                                    <button
                                        key={`desktop-${type}`}
                                        type="button"
                                        onClick={() => setTypeFilter(type)}
                                        className={`min-h-[44px] px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                                            isSelected 
                                                ? 'bg-brand text-white shadow-md shadow-brand/20 font-black' 
                                                : 'bg-white text-black border border-accent-brown/10 hover:border-brand hover:text-brand'
                                        }`}
                                    >
                                        {toTitleCase(type)}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mobile (< 640px): Single swipeable row expanding inline into wrapped grid */}
                        <div className="block sm:hidden">
                            <AnimatePresence initial={false} mode="wait">
                                {!isTypeExpanded ? (
                                    <motion.div
                                        key="collapsed-row"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        ref={typeChipsContainerRef}
                                        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 -mx-1 px-1"
                                    >
                                        {['All', ...collapsedTypes].map((type) => {
                                            const isSelected = typeFilter === type;
                                            return (
                                                <button
                                                    key={`mobile-collapsed-${type}`}
                                                    data-type={type}
                                                    type="button"
                                                    onClick={() => setTypeFilter(type)}
                                                    className={`min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all snap-start shrink-0 cursor-pointer ${
                                                        isSelected 
                                                            ? 'bg-brand text-white shadow-md shadow-brand/20 font-black' 
                                                            : 'bg-white text-black border border-accent-brown/10 hover:border-brand hover:text-brand'
                                                    }`}
                                                >
                                                    {toTitleCase(type)}
                                                </button>
                                            );
                                        })}
                                        
                                        {types.length > collapsedTypes.length && (
                                            <button
                                                type="button"
                                                onClick={() => setIsTypeExpanded(true)}
                                                aria-expanded={false}
                                                aria-controls="mobile-category-expansion"
                                                className="min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold text-brand border border-brand/30 bg-brand/5 hover:bg-brand hover:text-white transition-all whitespace-nowrap snap-start shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                            >
                                                <span>More options +{types.length - collapsedTypes.length}</span>
                                                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                            </button>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="expanded-grid"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22, ease: "easeOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div 
                                            id="mobile-category-expansion"
                                            className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto no-scrollbar py-1"
                                        >
                                            {['All', ...types].map((type) => {
                                                const isSelected = typeFilter === type;
                                                return (
                                                    <button
                                                        key={`mobile-expanded-${type}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setTypeFilter(type);
                                                            setIsTypeExpanded(false);
                                                        }}
                                                        className={`min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-brand text-white shadow-md shadow-brand/20 font-black' 
                                                                : 'bg-white text-black border border-accent-brown/10 hover:border-brand hover:text-brand'
                                                        }`}
                                                    >
                                                        {toTitleCase(type)}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                type="button"
                                                onClick={() => setIsTypeExpanded(false)}
                                                aria-expanded={true}
                                                aria-controls="mobile-category-expansion"
                                                className="min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold text-accent-brown border border-accent-brown/20 bg-accent-brown/5 hover:bg-accent-brown hover:text-white transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                            >
                                                <span>Fewer options</span>
                                                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* PRODUCT LISTING */}
                <div className="pt-2 sm:pt-4">
                    {loading ? (
                        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 lg:gap-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="aspect-[3/4] bg-white rounded-3xl sm:rounded-[3rem] border border-accent-brown/5 animate-pulse"></div>
                            ))}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white py-24 sm:py-40 rounded-3xl sm:rounded-[4rem] text-center border border-accent-brown/5 shadow-sm px-4"
                        >
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-accent-brown/5 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 text-black/10">
                                <Search className="w-8 h-8 sm:w-10 sm:h-10" />
                            </div>
                            <h3 className="text-2xl sm:text-4xl font-black text-accent-brown tracking-tighter mb-3 sm:mb-4">No Products Found</h3>
                            <p className="text-xs sm:text-sm font-medium text-black max-w-md mx-auto px-4">We couldn't find any products matching your current filters. Please try searching for something else.</p>
                            <button 
                                onClick={resetFilters}
                                className="mt-8 sm:mt-10 min-h-[44px] px-8 sm:px-12 py-3.5 sm:py-5 bg-brand text-white rounded-2xl text-xs font-black tracking-wide hover:bg-black transition-all shadow-xl shadow-brand/20"
                            >
                                Clear All Search Filters
                            </button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 lg:gap-8 pb-32 sm:pb-36">
                            <AnimatePresence mode="popLayout">
                                {filteredProducts.map((p, i) => (
                                    <ProductCard 
                                        key={p.id}
                                        product={p}
                                        index={i}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CustomerCatalog;
