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
        <DashboardLayout title="Product Catalog">
            <div className="space-y-6">

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm bg-green-600 text-white">
                            <Check className="w-4 h-4" /> {toast}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Controls */}
                <div className="bg-white rounded-3xl p-5 shadow-xl shadow-accent-brown/5 border border-white flex flex-col lg:flex-row gap-6 justify-between items-center">
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-stretch sm:items-center">
                        <div className="relative group w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand transition-colors" />
                            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search products, SKU..."
                                className="w-full pl-11 pr-4 py-3 bg-accent-peach/20 rounded-xl border-2 border-transparent focus:border-brand/30 outline-none transition-all font-medium text-accent-brown placeholder:text-accent-brown/30 shadow-sm" />
                        </div>

                        {token && (
                            <div className="flex-shrink-0">
                                <BranchSelector
                                    token={token}
                                    currentBranchId={branchId}
                                    onBranchChange={setBranchId}
                                    allowAllBranches={true}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 w-full lg:w-auto items-start md:items-center px-4 overflow-hidden">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0 w-full md:w-auto">
                            {['All', ...categories].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setPetFilter(cat)}
                                    className={`px-6 py-2 rounded-full text-xs uppercase font-black tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0 ${petFilter === cat
                                        ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                        : 'text-accent-brown/40 hover:text-accent-brown hover:bg-white/50'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="hidden md:block w-[1px] h-6 bg-accent-brown/10 flex-shrink-0"></div>

                        <div className="flex items-center gap-3 flex-wrap pb-2 md:pb-0 w-full md:w-auto">
                            {['All', ...types.slice(0, 3)].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`px-6 py-2 rounded-full text-xs uppercase font-black tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0 ${typeFilter === type
                                        ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20'
                                        : 'text-accent-brown/40 hover:text-accent-brown hover:bg-white/50'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}

                            {typeFilter !== 'All' && !['All', ...types.slice(0, 3)].includes(typeFilter) && (
                                <button
                                    onClick={() => setTypeFilter(typeFilter)}
                                    className="px-6 py-2 rounded-full text-xs uppercase font-black tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0 bg-brand-dark text-white shadow-lg shadow-brand-dark/20"
                                >
                                    {typeFilter}
                                </button>
                            )}

                            {types.length > 3 && (
                                <button
                                    onClick={() => setShowMoreCategoriesModal(true)}
                                    className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex items-center gap-1 flex-shrink-0 text-brand-dark hover:bg-white/50"
                                >
                                    + {types.length - 3} More
                                </button>
                            )}
                        </div>
                    </div>

                    <button onClick={openAdd}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shrink-0 shadow-lg shadow-brand-dark/20">
                        <Plus className="w-4 h-4" /> Add Product
                    </button>
                </div>

                {/* Products grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                        <Loader2 className="w-10 h-10 animate-spin text-brand" />
                        <p className="font-bold text-sm tracking-widest uppercase">Loading professional catalog...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map((p, i) => (
                            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border-2 border-transparent hover:border-brand/20 transition-all group flex flex-col relative overflow-hidden">
                                <div className="aspect-square rounded-2xl bg-accent-peach/10 mb-5 relative overflow-hidden flex items-center justify-center p-6 sm:p-8">
                                    {p.image ? (
                                        <img src={p.image} alt={p.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Package className="w-12 h-12 text-brand-dark/20" />
                                    )}
                                </div>
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black text-brand-dark uppercase tracking-widest">{p.type} • {p.category}</p>
                                        <span className={`text-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-500' : p.stock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {p.stock === 0 ? 'Out' : `In Stock: ${p.stock}`}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-accent-brown text-lg leading-tight tracking-tight mb-1 line-clamp-2">{p.name}</h4>
                                    <button
                                        onClick={() => fetchProductReviews(p)}
                                        className="flex items-center gap-2 mb-2 h-4 hover:opacity-70 transition-opacity"
                                    >
                                        {(p.stars && p.stars > 0) ? (
                                            <>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, si) => (
                                                        <Star key={si} className={`w-2.5 h-2.5 ${si < Math.round(p.stars || 0) ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-black text-accent-brown/30">{(p.stars || 0).toFixed(1)}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs font-bold text-accent-brown/20 uppercase tracking-widest">No reviews yet</span>
                                        )}
                                    </button>
                                    <p className="text-xs font-black uppercase tracking-widest text-accent-brown/30 mb-4">{p.sku}</p>

                                    <div className="mt-auto pt-4 border-t border-accent-brown/5 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-xl font-black text-accent-brown tracking-tight">₱{p.price.toLocaleString()}</p>
                                            <div className="flex items-center gap-1 text-brand">
                                                <Award className="w-3 h-3" />
                                                <span className="text-xs font-black uppercase tracking-widest">+{p.loyalty_points || 0} Pts</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(p)} className="w-9 h-9 bg-accent-peach/40 hover:bg-brand hover:text-white text-accent-brown rounded-xl flex items-center justify-center transition-all"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(p.id)} className="w-9 h-9 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-xl flex items-center justify-center transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center gap-3 text-accent-brown/30">
                                <AlertCircle className="w-8 h-8" />
                                <p className="font-bold text-sm">No products found.</p>
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
                                className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-left relative">
                                    <div className="flex items-center justify-between mb-8 shrink-0">
                                        <div>
                                            <h3 className="text-2xl font-black text-accent-brown tracking-tight">Customer Reviews</h3>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-brown/30 mt-1">
                                                Showing feedback for <span className="text-brand-dark">{reviewProduct?.name}</span>
                                            </p>
                                        </div>
                                        <button onClick={() => setShowReviewModal(false)} className="w-10 h-10 bg-accent-peach/30 rounded-2xl flex items-center justify-center text-accent-brown hover:bg-white transition-all shadow-sm">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {loadingReviews ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                            <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                            <p className="font-bold text-xs tracking-widest uppercase">Fetching customer honest feedback...</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                                            {selectedProductReviews.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-accent-brown/20 border-2 border-dashed border-accent-peach/20 rounded-[2rem]">
                                                    <MessageCircle className="w-10 h-10" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">No reviews found for this product.</p>
                                                </div>
                                            ) : (
                                                selectedProductReviews.map((rev, i) => (
                                                    <motion.div key={rev.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                                        className="bg-accent-peach/5 rounded-3xl p-6 border border-accent-peach/10">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-brand font-black text-xs shadow-sm">
                                                                    {rev.customer_name?.[0] || 'C'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest text-accent-brown">{rev.customer_name}</p>
                                                                    <div className="flex gap-0.5">
                                                                        {[...Array(5)].map((_, si) => (
                                                                            <Star key={si} className={`w-2.5 h-2.5 ${si < rev.rating ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-accent-brown/30 uppercase tracking-widest">
                                                                {new Date(rev.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-medium text-accent-brown/60 italic leading-relaxed mb-4">"{rev.comment}"</p>
                                                        {rev.image_url && (
                                                            <button onClick={() => setZoomedImage(rev.image_url)} className="relative w-32 aspect-square rounded-2xl overflow-hidden group border border-accent-peach/20 shadow-sm">
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
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-10 cursor-zoom-out">
                            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                onClick={e => e.stopPropagation()} className="relative max-w-sm max-h-[80vh] rounded-[2rem] overflow-hidden shadow-2xl bg-white p-2">
                                <img src={zoomedImage} alt="Zoomed Review" className="w-full h-full object-contain rounded-2xl" />
                                <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"><X className="w-5 h-5" /></button>
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
                                className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-left relative">
                                    <div className="flex items-center justify-between mb-8 shrink-0">
                                        <div>
                                            <h3 className="text-2xl font-black text-accent-brown tracking-tight">All Item Types</h3>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-brown/30 mt-1">Select an item category to filter the catalog</p>
                                        </div>
                                        <button onClick={() => setShowMoreCategoriesModal(false)} className="w-10 h-10 bg-accent-peach/30 rounded-2xl flex items-center justify-center text-accent-brown hover:bg-white transition-all shadow-sm"><X className="w-5 h-5" /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <div className="flex flex-wrap gap-3">
                                            {['All', ...types].map((type) => (
                                                <button key={type} onClick={() => { setTypeFilter(type); setShowMoreCategoriesModal(false); }}
                                                    className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${typeFilter === type ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' : 'bg-accent-peach/5 border border-accent-peach/20 text-accent-brown/60 hover:bg-brand/10 hover:text-brand hover:border-brand/30'}`}>{type}</button>
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
