import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Tag, Star, Search, ArrowLeft, Heart, Filter as FilterIcon } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';

const Catalog = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();

    // Filters
    const [petFilter, setPetFilter] = useState<'All' | 'Cats' | 'Dogs'>('All');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Accessories' | 'Vitamins'>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Handle initial URL params
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam && ['Food', 'Accessories', 'Vitamins'].includes(typeParam)) {
            setTypeFilter(typeParam as any);
        }
    }, [searchParams]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesPet = petFilter === 'All' || p.category === petFilter;
            const matchesType = typeFilter === 'All' || p.type === typeFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.tag.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesPet && matchesType && matchesSearch;
        });
    }, [petFilter, typeFilter, searchQuery]);

    const resetFilters = () => {
        setPetFilter('All');
        setTypeFilter('All');
        setSearchQuery('');
        setSearchParams({});
    };

    return (
        <div className="min-h-screen bg-accent-peach/30 pt-16 md:pt-20 pb-24">
            <div className="container mx-auto px-8 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between mb-16 gap-12">
                    <div className="space-y-6">
                        <Link to="/" className="inline-flex items-center gap-2 text-accent-brown/40 hover:text-brand-dark transition-colors font-black uppercase tracking-widest text-xs">
                            <ArrowLeft className="w-4 h-4" />
                            Return Home
                        </Link>
                        <h1 className="text-6xl md:text-8xl font-black text-accent-brown tracking-tighter leading-none">
                            Our <br />
                            <span className="text-brand-dark italic">Collections</span>
                        </h1>
                        <p className="text-xl text-accent-brown/60 font-medium max-w-xl leading-relaxed">
                            Discover {products.length} premium solutions crafted for perfection. Every item in our curated database is verified for quality and safety.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6 w-full xl:w-auto">
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                            <input
                                type="text"
                                placeholder="Search products, tags, or features..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full xl:w-[32rem] pl-14 pr-8 py-5 bg-white rounded-[2rem] border-2 border-transparent focus:border-brand/20 outline-none shadow-2xl shadow-accent-brown/5 transition-all font-medium text-accent-brown placeholder:text-accent-brown/20"
                            />
                        </div>

                        {/* Dual Filters */}
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Pet Filter */}
                            <div className="flex bg-white p-1.5 rounded-full border border-white shadow-xl shadow-accent-brown/5 shrink-0">
                                {['All', 'Cats', 'Dogs'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setPetFilter(cat as any)}
                                        className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${petFilter === cat
                                            ? 'bg-brand-dark text-white shadow-lg shadow-brand/20'
                                            : 'text-accent-brown/40 hover:text-accent-brown hover:bg-accent-peach/20'
                                            }`}
                                    >
                                        {cat === 'Cats' && <span>🐱</span>}
                                        {cat === 'Dogs' && <span>🐶</span>}
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Type Filter */}
                            <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-white shadow-xl shadow-accent-brown/5 overflow-x-auto no-scrollbar">
                                {['All', 'Food', 'Accessories', 'Vitamins'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setTypeFilter(type as any);
                                            setSearchParams(type === 'All' ? {} : { type });
                                        }}
                                        className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${typeFilter === type
                                            ? 'bg-accent-brown text-white shadow-lg'
                                            : 'text-accent-brown/40 hover:text-accent-brown hover:bg-white/50'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Summary */}
                <div className="mb-8 flex items-center justify-between px-2">
                    <p className="text-sm font-bold text-accent-brown/40">
                        Showing <span className="text-accent-brown">{filteredProducts.length}</span> results
                        {typeFilter !== 'All' && <span> in <span className="text-brand-dark">{typeFilter}</span></span>}
                        {petFilter !== 'All' && <span> for <span className="text-brand-dark">{petFilter}</span></span>}
                    </p>
                    {(petFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '') && (
                        <button onClick={resetFilters} className="text-xs font-black uppercase tracking-widest text-brand-dark hover:underline flex items-center gap-2">
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.5, ease: 'backOut' }}
                                className="group flex flex-col bg-white rounded-[3rem] p-6 shadow-2xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all hover:shadow-brand/10 relative overflow-hidden h-full"
                            >
                                {/* Floating Badges */}
                                <div className="absolute top-8 left-8 z-20 flex flex-col gap-2">
                                    <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center gap-2 border border-brand/5">
                                        <Tag className="w-3.5 h-3.5 text-brand-dark" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown">{p.tag}</span>
                                    </div>
                                </div>

                                <button className="absolute top-8 right-8 z-20 w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-accent-brown/20 hover:text-brand-dark">
                                    <Heart className="w-5 h-5" />
                                </button>

                                {/* Image Section */}
                                <div className="arch-card w-full !aspect-[4/5] !rounded-[2rem] mb-8 bg-accent-peach/10 group-hover:bg-accent-peach/30 transition-colors relative overflow-hidden">
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-brand/5 group-hover:bg-transparent transition-colors" />

                                    {/* Action Reveal */}
                                    <div className="absolute inset-0 bg-accent-brown/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] flex items-center justify-center p-8">
                                        <button className="bg-white text-accent-brown w-full py-5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                                            <ShoppingCart className="w-4 h-4" />
                                            Add to Bag
                                        </button>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="flex-1 flex flex-col space-y-4 px-3">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.25em]">{p.type} • {p.category}</p>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 ${i < p.stars ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-accent-brown leading-tight tracking-tight group-hover:text-brand-dark transition-colors">{p.name}</h3>
                                    </div>

                                    <p className="text-xs text-accent-brown/50 font-medium leading-relaxed line-clamp-2">
                                        {p.description}
                                    </p>

                                    <div className="pt-4 mt-auto border-t border-accent-brown/5 flex items-center justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Pricing</span>
                                            <p className="text-2xl font-black text-accent-brown/80 tracking-tighter">₱{p.price}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    triggerFlyAnimation(e, p.image);
                                                    addToCart({
                                                        id: p.id,
                                                        name: p.name,
                                                        price: p.price,
                                                        image: p.image,
                                                        quantity: 1,
                                                        variant: 'Standard',
                                                        size: 'Medium'
                                                    });
                                                    setTimeout(() => navigate('/login'), 400);
                                                }}
                                                className="bg-brand text-brand-dark px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all shadow-lg shadow-brand/20 whitespace-nowrap block"
                                            >
                                                Buy Now
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    triggerFlyAnimation(e, p.image);
                                                    addToCart({
                                                        id: p.id,
                                                        name: p.name,
                                                        price: p.price,
                                                        image: p.image,
                                                        quantity: 1,
                                                        variant: 'Standard',
                                                        size: 'Medium'
                                                    });
                                                    setTimeout(() => navigate('/login'), 400);
                                                }}
                                                className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all shrink-0 sm:w-12 sm:h-12 sm:rounded-2xl"
                                            >
                                                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredProducts.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-32 text-center"
                    >
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-accent-brown/5 text-4xl">
                            <FilterIcon className="w-10 h-10 text-accent-brown/20" />
                        </div>
                        <h2 className="text-3xl font-black text-accent-brown mb-4">No matching items</h2>
                        <p className="text-accent-brown/40 font-medium max-w-sm mx-auto">We couldn't find any products matching those filters in our professional database.</p>
                        <button
                            onClick={resetFilters}
                            className="mt-8 bg-brand-dark text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-[10px] hover:shadow-xl hover:shadow-brand/20 transition-all"
                        >
                            Reset all filters
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Background Decorative Blobs */}
            <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[80%] bg-brand/5 rounded-full blur-[150px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-brand-dark/5 rounded-full blur-[150px] pointer-events-none -z-10" />
        </div>
    );
};

export default Catalog;
