import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Package, X, Check, Loader2, AlertCircle, Award, Upload, Star, MessageCircle, ZoomIn, Image as ImageIcon, MapPin } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import ModernModal from '../../components/ModernModal';
import { useAuth } from '../../context/AuthContext';
import { useMemo } from 'react';
import BranchSelector from '../../components/BranchSelector';

interface Product {
    id: number;
    name: string;
    category: string;
    type: string;
    price: number;
    stock: number;
    sku: string;
    image?: string;
    description?: string;
    tag?: string;
    loyalty_points: number;
    stars?: number;
}

const BusinessCatalog = () => {
    const navigate = useNavigate();
    const [branchId, setBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (!saved || saved === 'all') return null;
        return parseInt(saved);
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [petFilter, setPetFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [showMoreCategoriesModal, setShowMoreCategoriesModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Review Modal States
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedProductReviews, setSelectedProductReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const { user } = useAuth();
    const token = user?.token;

    useEffect(() => {
        if (token) {
            fetchProducts();
        } else if (!loading) {
            setLoading(false);
        }
    }, [token, branchId]);

    const fetchProducts = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const url = branchId !== null
                ? `http://localhost:8000/api/business/catalog?branch_id=${branchId}`
                : `http://localhost:8000/api/business/catalog`;
            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (zoomedImage) setZoomedImage(null);
                else if (showReviewModal) setShowReviewModal(false);
                else if (showMoreCategoriesModal) setShowMoreCategoriesModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [zoomedImage, showReviewModal, showMoreCategoriesModal]);

    const fetchProductReviews = async (p: Product) => {
        setReviewProduct(p);
        setShowReviewModal(true);
        setLoadingReviews(true);
        try {
            const resp = await fetch(`http://localhost:8000/api/catalog/${p.id}/reviews`);
            if (resp.ok) {
                const data = await resp.json();
                setSelectedProductReviews(data);
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleDelete = async (id: number) => {
        setModal({
            isOpen: true,
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                setModal(m => ({ ...m, isOpen: false }));
                try {
                    const resp = await fetch(`http://localhost:8000/api/business/catalog/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (resp.ok) {
                        setProducts(ps => ps.filter(p => p.id !== id));
                        showToast('Product removed');
                    }
                } catch (err) {
                    showToast('Failed to delete product');
                }
            }
        });
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

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const filtered = products.filter(p => {
        const matchPet = petFilter === 'All' || p.category === petFilter;
        const matchType = typeFilter === 'All' || p.type === typeFilter;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
        return matchPet && matchType && matchSearch;
    });

    const openAdd = () => navigate('/dashboard/business/catalog/product/new');
    const openEdit = (p: Product) => navigate(`/dashboard/business/catalog/product/${p.id}`);

    return (
        <DashboardLayout title="Store">
            <div className="w-full max-w-[1280px] mx-auto space-y-4 sm:space-y-5 lg:space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">

                {/* Visually hidden heading for a11y */}
                <h1 className="sr-only">Store</h1>

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm bg-green-600 text-white">
                            <Check className="w-4 h-4" /> {toast}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filter Card */}
                <div className="bg-white rounded-[20px] p-4 sm:p-5 shadow-sm border border-accent-brown/10 flex flex-col gap-4">
                    {/* Top row: Search, Branch Selector, Add Product */}
                    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
                        <div className="relative group flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors pointer-events-none" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                type="text"
                                placeholder="Search products, SKU..."
                                className="w-full pl-11 pr-4 min-h-[48px] h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand focus:bg-white text-base text-accent-brown placeholder:text-slate-400 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {token && (
                            <div className="w-full md:w-[260px] lg:w-[300px] shrink-0">
                                <BranchSelector
                                    token={token}
                                    currentBranchId={branchId}
                                    onBranchChange={setBranchId}
                                    allowAllBranches={true}
                                />
                            </div>
                        )}

                        <button
                            onClick={openAdd}
                            className="w-full md:w-auto min-h-[48px] h-12 px-5 sm:px-6 rounded-xl font-bold text-sm tracking-wider uppercase bg-brand text-white hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Add Product</span>
                        </button>
                    </div>

                    {/* Filters: Pet type and Category tabs */}
                    <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                        {/* Pet type filters */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 hidden sm:inline">Pet:</span>
                            {['All', ...categories].map((cat) => {
                                const isActive = petFilter === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setPetFilter(cat)}
                                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center justify-center ${
                                            isActive
                                                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 active:bg-slate-200'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Category / Type filters */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 hidden sm:inline">Type:</span>
                            {['All', ...types.slice(0, 3)].map((type) => {
                                const isActive = typeFilter === type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(type)}
                                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center justify-center ${
                                            isActive
                                                ? 'bg-accent-brown text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 active:bg-slate-200'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                );
                            })}

                            {typeFilter !== 'All' && !['All', ...types.slice(0, 3)].includes(typeFilter) && (
                                <button
                                    onClick={() => setTypeFilter(typeFilter)}
                                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center justify-center bg-accent-brown text-white shadow-sm"
                                >
                                    {typeFilter}
                                </button>
                            )}

                            {types.length > 3 && (
                                <button
                                    onClick={() => setShowMoreCategoriesModal(true)}
                                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-brand hover:bg-brand/10 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
                                >
                                    + {types.length - 3} More
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin text-brand" />
                        <p className="font-bold text-sm tracking-widest uppercase text-slate-500">Loading products...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1360px]:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 items-stretch">
                        {filtered.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                className="bg-white rounded-[20px] p-2.5 min-[400px]:p-3 sm:p-4 border border-accent-brown/10 shadow-sm hover:shadow-md hover:border-brand/30 transition-all group flex flex-col justify-between h-full relative"
                            >
                                <div>
                                    {/* Product Image Area */}
                                    <div
                                        onClick={() => p.image && setZoomedImage(p.image)}
                                        className="aspect-square rounded-[16px] bg-slate-50 relative overflow-hidden flex items-center justify-center p-3 sm:p-4 mb-2.5 sm:mb-3 border border-slate-100 cursor-pointer"
                                        title={p.image ? 'Click to enlarge' : undefined}
                                    >
                                        {p.image ? (
                                            <img
                                                src={p.image}
                                                alt={p.name}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <Package className="w-10 h-10 text-slate-300" />
                                        )}

                                        {/* Stock Badge */}
                                        <span
                                            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-xs ${
                                                p.stock === 0
                                                    ? 'bg-red-500 text-white'
                                                    : p.stock <= 10
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-emerald-600 text-white'
                                            }`}
                                        >
                                            {p.stock === 0 ? 'Out' : `In Stock: ${p.stock}`}
                                        </span>
                                    </div>

                                    {/* Product Details */}
                                    <p className="text-[11px] sm:text-xs font-bold text-brand uppercase tracking-wider mb-1 truncate">
                                        {p.type} • {p.category}
                                    </p>
                                    <h4
                                        className="font-bold text-accent-brown text-sm sm:text-base leading-snug tracking-tight mb-1 line-clamp-2 min-h-[2.4rem]"
                                        title={p.name}
                                    >
                                        {p.name}
                                    </h4>

                                    {/* Reviews Button */}
                                    <button
                                        type="button"
                                        onClick={() => fetchProductReviews(p)}
                                        className="flex items-center gap-1.5 mb-1.5 min-h-[22px] hover:opacity-80 transition-opacity text-left"
                                    >
                                        {p.stars && p.stars > 0 ? (
                                            <>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, si) => (
                                                        <Star
                                                            key={si}
                                                            className={`w-3 h-3 ${
                                                                si < Math.round(p.stars || 0)
                                                                    ? 'text-amber-400 fill-amber-400'
                                                                    : 'text-slate-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">
                                                    {(p.stars || 0).toFixed(1)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-brand">
                                                No reviews yet
                                            </span>
                                        )}
                                    </button>

                                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 truncate">
                                        SKU: {p.sku}
                                    </p>
                                </div>

                                {/* Footer with Price and Actions */}
                                <div className="mt-auto pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-base sm:text-lg lg:text-xl font-black text-accent-brown tracking-tight truncate">
                                            ₱{p.price.toLocaleString()}
                                        </p>
                                        <div className="flex items-center gap-1 text-brand text-[11px] sm:text-xs font-bold">
                                            <Award className="w-3 h-3 shrink-0" />
                                            <span className="truncate">+{p.loyalty_points || 0} Pts</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(p)}
                                            aria-label={`Edit ${p.name}`}
                                            className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] bg-slate-100 hover:bg-brand hover:text-white text-slate-700 rounded-xl flex items-center justify-center transition-all shadow-xs"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(p.id)}
                                            aria-label={`Delete ${p.name}`}
                                            className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl flex items-center justify-center transition-all shadow-xs"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full py-16 px-4 bg-white rounded-[20px] border border-accent-brown/10 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                                <AlertCircle className="w-10 h-10 text-slate-300" />
                                <p className="font-bold text-accent-brown text-base">No products found</p>
                                <p className="text-sm text-slate-500 max-w-sm">No items match your selected filters or search query.</p>
                                {(search || petFilter !== 'All' || typeFilter !== 'All') && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearch(''); setPetFilter('All'); setTypeFilter('All'); }}
                                        className="mt-2 min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-accent-brown transition-all"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Reviews Modal */}
                <AnimatePresence>
                    {showReviewModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowReviewModal(false)} className="fixed inset-0 bg-accent-brown/30 backdrop-blur-sm z-[60]" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
                                <div className="bg-white rounded-[24px] sm:rounded-[2.5rem] p-5 sm:p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-left relative">
                                    <div className="flex items-center justify-between mb-6 sm:mb-8 shrink-0 gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight">Customer Reviews</h3>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-brown/40 mt-1 truncate">
                                                Showing feedback for <span className="text-brand-dark">{reviewProduct?.name}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            aria-label="Close reviews"
                                            className="w-11 h-11 min-w-[44px] min-h-[44px] bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown hover:bg-slate-100 transition-all shadow-sm shrink-0"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {loadingReviews ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                            <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                            <p className="font-bold text-xs tracking-widest uppercase">Fetching customer honest feedback...</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 sm:space-y-6">
                                            {selectedProductReviews.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-accent-brown/20 border-2 border-dashed border-accent-peach/20 rounded-[2rem]">
                                                    <MessageCircle className="w-10 h-10" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">No reviews found for this product.</p>
                                                </div>
                                            ) : (
                                                selectedProductReviews.map((rev, i) => (
                                                    <motion.div key={rev.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                                        className="bg-accent-peach/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-accent-peach/10">
                                                        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-brand font-black text-xs shadow-sm shrink-0">
                                                                    {rev.customer_name?.[0] || 'C'}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-black uppercase tracking-widest text-accent-brown truncate">{rev.customer_name}</p>
                                                                    <div className="flex gap-0.5">
                                                                        {[...Array(5)].map((_, si) => (
                                                                            <Star key={si} className={`w-2.5 h-2.5 ${si < rev.rating ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="text-[11px] sm:text-xs font-bold text-accent-brown/30 uppercase tracking-widest shrink-0">
                                                                {new Date(rev.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-medium text-accent-brown/70 italic leading-relaxed mb-3 sm:mb-4">"{rev.comment}"</p>
                                                        {rev.image_url && (
                                                            <button onClick={() => setZoomedImage(rev.image_url)} className="relative w-28 sm:w-32 aspect-square rounded-2xl overflow-hidden group border border-accent-peach/20 shadow-sm">
                                                                <img src={rev.image_url} alt="Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                                                                    <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all drop-shadow-md" />
                                                                </div>
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Lightbox */}
                <AnimatePresence>
                    {zoomedImage && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoomedImage(null)}
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 cursor-zoom-out">
                            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                onClick={e => e.stopPropagation()} className="relative max-w-sm max-h-[80vh] rounded-[2rem] overflow-hidden shadow-2xl bg-white p-2">
                                <img src={zoomedImage} alt="Zoomed Review" className="w-full h-full object-contain rounded-2xl" />
                                <button
                                    onClick={() => setZoomedImage(null)}
                                    aria-label="Close image preview"
                                    className="absolute top-4 right-4 w-11 h-11 min-w-[44px] min-h-[44px] bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* More Categories Modal */}
                <AnimatePresence>
                    {showMoreCategoriesModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMoreCategoriesModal(false)} className="fixed inset-0 bg-accent-brown/30 backdrop-blur-sm z-[100]" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
                                <div className="bg-white rounded-[24px] sm:rounded-[2.5rem] p-5 sm:p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-left relative">
                                    <div className="flex items-center justify-between mb-6 sm:mb-8 shrink-0 gap-3">
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight">All Item Types</h3>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-brown/40 mt-1">Select a category to filter products</p>
                                        </div>
                                        <button
                                            onClick={() => setShowMoreCategoriesModal(false)}
                                            aria-label="Close category picker"
                                            className="w-11 h-11 min-w-[44px] min-h-[44px] bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown hover:bg-slate-100 transition-all shadow-sm shrink-0"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <div className="flex flex-wrap gap-2 sm:gap-3">
                                            {['All', ...types].map((type) => (
                                                <button key={type} onClick={() => { setTypeFilter(type); setShowMoreCategoriesModal(false); }}
                                                    className={`min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl sm:rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${typeFilter === type ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' : 'bg-accent-peach/5 border border-accent-peach/20 text-accent-brown/70 hover:bg-brand/10 hover:text-brand hover:border-brand/30'}`}>{type}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            </div>
            <ModernModal isOpen={modal.isOpen} onClose={() => setModal(m => ({ ...m, isOpen: false }))} onConfirm={modal.onConfirm} title={modal.title} message={modal.message} type={modal.type} />
        </DashboardLayout>
    );
};

export default BusinessCatalog;
