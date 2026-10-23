import { toTitleCase } from '../utils/textFormatters';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Tag, Star, Search, ArrowLeft, ArrowRight, Heart, Filter as FilterIcon } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { MAIN_LANDING_TEXT } from '../constants/mainLandingWording';

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
        <div className="min-h-screen bg-[#FAF9F6] pb-24 relative font-brand">
            {/* Header / Intro Section */}
            <div className="container mx-auto px-6 xs:px-12 relative z-10 pt-32 pb-16">
                <Link to="/" className="inline-flex items-center gap-2 text-brand-dark/60 hover:text-brand-dark transition-all font-bold text-xs mb-12 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {MAIN_LANDING_TEXT.catalogPage.backToHome}
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-end gap-12">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 text-brand-dark text-xs font-bold">
                            <div className="w-8 h-[2px] bg-brand-dark" />
                            {MAIN_LANDING_TEXT.catalogPage.tag}
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-accent-brown tracking-tight leading-[0.95]">
                            {MAIN_LANDING_TEXT.catalogPage.titlePrefix} <br />
                            <span className="text-brand-dark italic font-outfit">{MAIN_LANDING_TEXT.catalogPage.titleHighlight}</span>
                        </h1>
                    </div>
                    <p className="text-xl text-accent-brown/50 font-medium max-w-xl leading-relaxed italic">
                        "{MAIN_LANDING_TEXT.catalogPage.subtitle}"
                    </p>
                </div>
            </div>

            {/* Filter Architecture */}
            <div className="container mx-auto px-6 mb-16">
                <div className="bg-white rounded-[3.5rem] p-3 sm:p-4 shadow-[0_20px_50px_rgba(45,34,27,0.05)] border border-accent-brown/5 flex flex-col lg:flex-row gap-4 items-center">
                    {/* Search Field */}
                    <div className="relative group w-full lg:w-1/3">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/30 group-focus-within:text-brand-dark transition-colors" />
                        <input
                            type="text"
                            placeholder={MAIN_LANDING_TEXT.catalogPage.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-8 py-5 bg-[#F7F6F2] rounded-full border border-transparent focus:bg-white focus:border-brand-dark/20 outline-none transition-all font-medium text-accent-brown text-sm"
                        />
                    </div>

                    <div className="hidden lg:block w-[1px] h-10 bg-accent-brown/10 mx-2" />

                    {/* Filter Tabs */}
                    <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto items-center overflow-x-auto no-scrollbar py-2 lg:py-0">
                        <div className="flex items-center gap-4">
                            {['All', 'Cats', 'Dogs'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setPetFilter(cat as any)}
                                    className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                                        petFilter === cat
                                        ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/20'
                                        : 'text-accent-brown/40 hover:text-brand-dark'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="hidden sm:block w-[1px] h-6 bg-accent-brown/10" />

                        <div className="flex items-center gap-4">
                            {['All', 'Food', 'Accessories', 'Vitamins'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setTypeFilter(type as any);
                                        setSearchParams(type === 'All' ? {} : { type });
                                    }}
                                    className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                                        typeFilter === type
                                        ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/20'
                                        : 'text-accent-brown/40 hover:text-brand-dark'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between px-6">
                    <p className="text-xs font-medium text-slate-500">
                        Showing <span className="text-accent-brown">{MAIN_LANDING_TEXT.catalogPage.resultsCount(filteredProducts.length)}</span>
                    </p>
                    {(petFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '') && (
                        <button onClick={resetFilters} className="text-xs font-bold text-brand-dark hover:text-accent-brown transition-colors">
                            {MAIN_LANDING_TEXT.catalogPage.clearFilters}
                        </button>
                    )}
                </div>
            </div>

            {/* Grid Architecture */}
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="group flex flex-col bg-white rounded-[3.5rem] p-7 shadow-[0_10px_40px_rgba(45,34,27,0.03)] border border-accent-brown/5 hover:border-brand-dark/20 transition-all hover:shadow-2xl hover:shadow-brand-dark/10 relative overflow-hidden h-full"
                            >
                                {/* Item Tag */}
                                <div className="absolute top-5 left-5 z-20">
                                    <div className="bg-brand-dark text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                                        <Tag className="w-2.5 h-2.5" />
                                        <span className="text-[11px] font-bold leading-none">{toTitleCase(p.tag)}</span>
                                    </div>
                                </div>

                                <button className="absolute top-8 right-8 z-20 w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-all text-accent-brown/10 hover:text-brand-dark">
                                    <Heart className="w-5 h-5" />
                                </button>

                                {/* Visual Panel */}
                                <div className="aspect-[4/5] rounded-[2.5rem] mb-8 bg-[#F7F6F2] relative overflow-hidden">
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 ease-out"
                                    />
                                    {/* Action Reveal Overlay */}
                                    <div className="absolute inset-0 bg-accent-brown/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] flex items-center justify-center p-8">
                                        <button 
                                            onClick={(e) => {
                                                triggerFlyAnimation(e, p.image);
                                                addToCart({
                                                    id: p.id,
                                                    business_id: 1,
                                                    name: p.name,
                                                    price: p.price,
                                                    image: p.image,
                                                    quantity: 1,
                                                    variant: 'Standard',
                                                    size: 'Medium',
                                                    stock: 100
                                                });
                                                setTimeout(() => navigate('/login'), 400);
                                            }}
                                            className="bg-white text-accent-brown w-full py-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 delay-100"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            {MAIN_LANDING_TEXT.catalogPage.addToCart}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col space-y-4 px-2">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.25em]">{p.type} • {p.category}</p>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 ${i < p.stars ? 'text-brand-dark fill-brand-dark' : 'text-accent-brown/10'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-accent-brown leading-none tracking-tighter group-hover:text-brand-dark transition-colors">{p.name}</h3>
                                    </div>

                                    <p className="text-sm text-accent-brown/40 font-medium leading-relaxed line-clamp-2 italic">
                                        {p.description}
                                    </p>

                                    <div className="pt-6 mt-auto border-t border-accent-brown/5 flex items-center justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-400">{MAIN_LANDING_TEXT.catalogPage.priceLabel}</span>
                                            <p className="text-3xl font-black text-accent-brown/80 tracking-tighter leading-none">₱{p.price}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                triggerFlyAnimation(e, p.image);
                                                addToCart({
                                                    id: p.id,
                                                    business_id: 1,
                                                    name: p.name,
                                                    price: p.price,
                                                    image: p.image,
                                                    quantity: 1,
                                                    variant: 'Standard',
                                                    size: 'Medium',
                                                    stock: 100
                                                });
                                                setTimeout(() => navigate('/login'), 400);
                                            }}
                                            className="bg-brand-dark text-white p-4 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-brand-dark/20"
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
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
                        <div className="w-32 h-32 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-accent-brown/5 text-4xl">
                            <FilterIcon className="w-10 h-10 text-accent-brown/10" />
                        </div>
                        <h2 className="text-2xl font-bold text-accent-brown tracking-tight mb-3">{MAIN_LANDING_TEXT.catalogPage.noResultsTitle}</h2>
                        <p className="text-accent-brown/40 font-medium max-w-sm mx-auto">{MAIN_LANDING_TEXT.catalogPage.noResultsDesc}</p>
                        <button
                            onClick={resetFilters}
                            className="mt-8 bg-brand-dark text-white px-8 py-3.5 rounded-full font-bold text-xs hover:shadow-xl transition-all"
                        >
                            {MAIN_LANDING_TEXT.catalogPage.clearFilters}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Catalog;
