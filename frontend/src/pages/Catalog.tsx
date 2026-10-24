import { toTitleCase } from '../utils/textFormatters';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Tag, Star, Search, ArrowLeft, ArrowRight, Heart, Filter as FilterIcon, X } from 'lucide-react';
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
            <div className="container mx-auto px-4 xs:px-6 sm:px-10 lg:px-12 relative z-10 pt-6 sm:pt-10 lg:pt-14 pb-4 sm:pb-6">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-dark transition-all font-bold text-sm mb-3 sm:mb-4 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>{MAIN_LANDING_TEXT.catalogPage.backToHome}</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-end gap-3 sm:gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black text-accent-brown tracking-tight leading-[0.95]">
                            {MAIN_LANDING_TEXT.catalogPage.titlePrefix} <br />
                            <span className="text-brand-dark italic font-outfit">{MAIN_LANDING_TEXT.catalogPage.titleHighlight}</span>
                        </h1>
                    </div>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-normal max-w-xl leading-relaxed italic">
                        "{MAIN_LANDING_TEXT.catalogPage.subtitle}"
                    </p>
                </div>
            </div>

            {/* Filter Architecture - Strictly 2 Rows */}
            <div className="container mx-auto px-4 xs:px-6 sm:px-10 lg:px-12 mb-6 sm:mb-8">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-sm border border-accent-brown/10 flex flex-col gap-3">
                    {/* Row 1: Search Field */}
                    <div className="relative flex items-center min-h-[46px] sm:min-h-[50px] bg-[#F7F6F2] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-xl overflow-hidden transition-all w-full">
                        <Search className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark ml-3.5 mr-2.5 shrink-0 transition-colors" />
                        <input
                            type="text"
                            placeholder={MAIN_LANDING_TEXT.catalogPage.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent py-2.5 pr-3 text-accent-brown font-bold text-sm sm:text-base placeholder:text-slate-500 outline-none leading-normal"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 mr-2 shrink-0 cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Row 2: Filter Strips (Single scrolling row) */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Pet:</span>
                        {(['All', 'Cats', 'Dogs'] as const).map((pet) => (
                            <button
                                key={pet}
                                onClick={() => setPetFilter(pet)}
                                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                                    petFilter === pet
                                        ? 'bg-brand-dark text-white shadow-sm shadow-brand-dark/20'
                                        : 'bg-[#F7F6F2] hover:bg-slate-200/60 text-slate-700 border border-accent-brown/10'
                                }`}
                            >
                                {pet === 'All' ? 'All Pets' : pet}
                            </button>
                        ))}

                        <div className="w-[1px] h-5 bg-accent-brown/15 shrink-0 mx-1" />

                        <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Category:</span>
                        {(['All', 'Food', 'Accessories', 'Vitamins'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setTypeFilter(type);
                                    setSearchParams(type === 'All' ? {} : { type });
                                }}
                                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                                    typeFilter === type
                                        ? 'bg-brand-dark text-white shadow-sm shadow-brand-dark/20'
                                        : 'bg-[#F7F6F2] hover:bg-slate-200/60 text-slate-700 border border-accent-brown/10'
                                }`}
                            >
                                {type === 'All' ? 'All Categories' : type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results Count & Clear Button */}
                <div className="mt-4 sm:mt-6 flex items-center justify-between px-2 sm:px-4 flex-wrap gap-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-600">
                        Showing <span className="font-bold text-accent-brown">{MAIN_LANDING_TEXT.catalogPage.resultsCount(filteredProducts.length)}</span>
                    </p>
                    {(petFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '') && (
                        <button
                            onClick={resetFilters}
                            className="text-xs sm:text-sm font-bold text-brand-dark hover:text-accent-brown hover:underline transition-colors cursor-pointer"
                        >
                            {MAIN_LANDING_TEXT.catalogPage.clearFilters}
                        </button>
                    )}
                </div>
            </div>

            {/* Grid Architecture */}
            <div className="container mx-auto px-4 xs:px-6 sm:px-10 lg:px-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="group flex flex-col bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-accent-brown/10 hover:border-brand-dark/30 transition-all hover:shadow-xl hover:shadow-brand-dark/5 relative overflow-hidden h-full"
                            >
                                {/* Item Tag */}
                                <div className="absolute top-4 left-4 z-20">
                                    <div className="bg-brand-dark text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" />
                                        <span className="text-[11px] font-bold leading-none">{toTitleCase(p.tag)}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    aria-label="Add to favorites"
                                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-xs flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-brand-dark cursor-pointer"
                                >
                                    <Heart className="w-4 h-4" />
                                </button>

                                {/* Visual Panel */}
                                <div className="aspect-square sm:aspect-[4/5] rounded-2xl mb-5 bg-[#F7F6F2] relative overflow-hidden">
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                    {/* Action Reveal Overlay */}
                                    <div className="absolute inset-0 bg-accent-brown/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] flex items-center justify-center p-6">
                                        <button 
                                            onClick={(e) => {
                                                triggerFlyAnimation(e, p.image);
                                                addToCart({
                                                    id: p.id,
                                                    business_id: 1,
                                                    name: p.name,
                                                    price: String(p.price),
                                                    image: p.image,
                                                    quantity: 1,
                                                    variant: 'Standard',
                                                    size: 'Medium',
                                                    stock: 100
                                                });
                                                setTimeout(() => navigate('/login'), 400);
                                            }}
                                            className="bg-white text-accent-brown w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-brand-dark hover:text-white transition-all cursor-pointer"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            <span>{MAIN_LANDING_TEXT.catalogPage.addToCart}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{p.type} • {p.category}</p>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 ${i < p.stars ? 'text-brand-dark fill-brand-dark' : 'text-slate-200 fill-slate-200'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-accent-brown leading-snug group-hover:text-brand-dark transition-colors">{p.name}</h3>
                                    </div>

                                    <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed line-clamp-2">
                                        {p.description}
                                    </p>

                                    <div className="pt-4 mt-auto border-t border-accent-brown/10 flex items-center justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-medium text-slate-400">{MAIN_LANDING_TEXT.catalogPage.priceLabel}</span>
                                            <p className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight">₱{parseFloat(p.price as string).toFixed(2)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`Buy ${p.name}`}
                                            onClick={(e) => {
                                                triggerFlyAnimation(e, p.image);
                                                addToCart({
                                                    id: p.id,
                                                    business_id: 1,
                                                    name: p.name,
                                                    price: String(p.price),
                                                    image: p.image,
                                                    quantity: 1,
                                                    variant: 'Standard',
                                                    size: 'Medium',
                                                    stock: 100
                                                });
                                                setTimeout(() => navigate('/login'), 400);
                                            }}
                                            className="w-11 h-11 bg-brand-dark hover:bg-brand text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-brand-dark/20 cursor-pointer shrink-0"
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
                        className="py-24 text-center"
                    >
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-accent-brown/10 text-slate-400">
                            <FilterIcon className="w-8 h-8 text-accent-brown/30" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-accent-brown tracking-normal mb-2">{MAIN_LANDING_TEXT.catalogPage.noResultsTitle}</h2>
                        <p className="text-sm text-slate-600 font-normal max-w-sm mx-auto">{MAIN_LANDING_TEXT.catalogPage.noResultsDesc}</p>
                        <button
                            onClick={resetFilters}
                            className="mt-6 bg-brand-dark hover:bg-brand text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md shadow-brand-dark/20 transition-all cursor-pointer"
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
