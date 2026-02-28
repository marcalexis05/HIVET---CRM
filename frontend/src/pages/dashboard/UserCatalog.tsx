
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Tag, Star, Search, Filter as FilterIcon, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { products } from '../../data/products';
import { useCart } from '../../context/CartContext';

const UserCatalog = () => {
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();
    const [petFilter, setPetFilter] = useState<'All' | 'Cats' | 'Dogs'>('All');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Accessories' | 'Vitamins'>('All');
    const [searchQuery, setSearchQuery] = useState('');

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
    };

    return (
        <DashboardLayout title="Catalog & Ordering">
            <div className="space-y-8">
                {/* Search and Filters Header */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white flex flex-col lg:flex-row gap-6 justify-between items-center">
                    {/* Search Bar */}
                    <div className="relative group w-full lg:w-96">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/30 group-focus-within:text-brand transition-colors" />
                        <input
                            type="text"
                            placeholder="Search catalog..."
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
                                <button
                                    key={cat}
                                    onClick={() => setPetFilter(cat as any)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${petFilter === cat
                                        ? 'bg-brand text-white shadow-md'
                                        : 'text-accent-brown/60 hover:text-accent-brown hover:bg-white/50'
                                        }`}
                                >
                                    {cat === 'Cats' && <span>🐱</span>}
                                    {cat === 'Dogs' && <span>🐶</span>}
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Type Filter */}
                        <div className="flex bg-accent-peach/20 p-1.5 rounded-2xl border border-transparent overflow-x-auto no-scrollbar">
                            {['All', 'Food', 'Accessories', 'Vitamins'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type as any)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${typeFilter === type
                                        ? 'bg-accent-brown text-white shadow-md'
                                        : 'text-accent-brown/60 hover:text-accent-brown hover:bg-white/50'
                                        }`}
                                >
                                    {type}
                                </button>
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

                {/* Product Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                onClick={() => navigate(`/dashboard/user/catalog/${p.id}`)}
                                className="group flex flex-col bg-white rounded-[2rem] p-5 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all relative cursor-pointer"
                            >
                                {/* Active Tag */}
                                <div className="absolute top-5 left-5 z-20">
                                    <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-brand/10">
                                        <Tag className="w-3 h-3 text-brand-dark" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown">{p.tag}</span>
                                    </div>
                                </div>

                                {/* Image */}
                                <div className="w-full aspect-square rounded-[1.5rem] mb-4 bg-accent-peach/10 relative overflow-hidden flex items-center justify-center p-4">
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 ease-out"
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">{p.type} • {p.category}</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-2.5 h-2.5 ${i < p.stars ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                            ))}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-black text-accent-brown leading-tight tracking-tight mb-2 line-clamp-2">{p.name}</h3>
                                    <p className="text-xs text-accent-brown/50 font-medium line-clamp-2 mb-4">
                                        {p.description}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-accent-brown/5 flex items-center justify-between gap-3">
                                        <p className="font-black text-accent-brown tracking-tighter text-sm">₱{p.price}</p>
                                        <div className="flex items-center gap-1 text-brand">
                                            <Award className="w-3 h-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">+{Math.floor(Number(p.price) * 0.10)} Pts</span>
                                        </div>
                                        <div className="flex items-center gap-2 relative z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart({
                                                        id: p.id,
                                                        name: p.name,
                                                        price: p.price,
                                                        image: p.image,
                                                        quantity: 1,
                                                        variant: 'Standard',
                                                        size: 'Medium'
                                                    });
                                                    navigate('/dashboard/user/checkout');
                                                }}
                                                className="bg-brand text-brand-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all shadow-lg shadow-brand/20 whitespace-nowrap"
                                            >
                                                Buy Now
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
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
                                                }}
                                                className="bg-accent-peach/30 text-brand-dark w-10 h-10 shrink-0 rounded-xl flex items-center justify-center hover:bg-brand-dark hover:text-white transition-all shadow-sm"
                                            >
                                                <ShoppingCart className="w-4 h-4" />
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
        </DashboardLayout>
    );
};

export default UserCatalog;
