import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Package, X, Check, Loader2, AlertCircle, Award, Upload } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { CustomDropdown } from '../../components/CustomDropdown';

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
    variants_json?: string;
    sizes_json?: string;
}

const PET_CATS = ['All', 'Cats', 'Dogs'];
const TYPE_CATS = ['All', 'Food', 'Accessories', 'Vitamins'];

const EMPTY_FORM = { 
    name: '', 
    category: 'Dogs', 
    type: 'Food', 
    price: '', 
    stock: '', 
    sku: '', 
    description: '', 
    tag: '', 
    loyalty_points: '', 
    image: '/images/product_placeholder.png', 
    variants: [] as {name: string, price: string, image?: string, sizes: {name: string, price: string, stock: string}[]}[], 
    sizes: [] as {name: string, price: string, stock: string}[] 
};

const BusinessCatalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [petFilter, setPetFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editId, setEditId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const { user } = useAuth();
    const token = user?.token;

    useEffect(() => {
        if (token) {
            fetchProducts();
        } else if (!loading) {
            // If we're not loading and token is still missing after hydration
            setLoading(false);
        }
    }, [token]);

    const fetchProducts = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const resp = await fetch('http://localhost:8000/api/business/catalog', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                setProducts(data);
            } else if (resp.status === 401) {
                console.error('Unauthorized access to catalog');
                setProducts([]);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const filtered = products.filter(p => {
        const matchPet = petFilter === 'All' || p.category === petFilter;
        const matchType = typeFilter === 'All' || p.type === typeFilter;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
        return matchPet && matchType && matchSearch;
    });

    const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
    const openEdit = (p: Product) => {
        setForm({ 
            name: p.name, 
            category: p.category, 
            type: p.type,
            price: String(p.price), 
            stock: String(p.stock), 
            sku: p.sku,
            description: p.description || '',
            tag: p.tag || '',
            loyalty_points: String(p.loyalty_points || 0),
            image: p.image || '/images/product_placeholder.png',
            variants: p.variants_json ? JSON.parse(p.variants_json).map((v: any) => ({ ...v, sizes: v.sizes || [] })) : [],
            sizes: p.sizes_json ? JSON.parse(p.sizes_json) : []
        });
        setEditId(p.id);
        setShowModal(true);
    };
    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
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
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target?: { type: 'variant' | 'size', index: number }) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await fetch('http://localhost:8000/api/business/upload-product-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (resp.ok) {
                const data = await resp.json();
                if (target && target.type === 'variant') {
                    const list = [...form.variants];
                    list[target.index].image = data.url;
                    setForm(f => ({ ...f, variants: list }));
                } else if (!target) {
                    setForm(f => ({ ...f, image: data.url }));
                }
                showToast('Image uploaded successfully');
            } else {
                showToast('Failed to upload image');
            }
        } catch (err) {
            showToast('Upload error');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.price || !form.stock || !form.sku) return;
        setSaving(true);
        try {
            const url = editId 
                ? `http://localhost:8000/api/business/catalog/${editId}` 
                : 'http://localhost:8000/api/business/catalog';
            const method = editId ? 'PUT' : 'POST';
            
            const resp = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    name: form.name,
                    category: form.category,
                    type: form.type,
                    price: parseFloat(form.price),
                    stock: parseInt(form.stock),
                    sku: form.sku,
                    image: form.image,
                    description: form.description,
                    tag: form.tag,
                    loyalty_points: parseInt(form.loyalty_points) || 0,
                    variants_json: JSON.stringify(form.variants),
                    sizes_json: JSON.stringify(form.sizes)
                })
            });

            if (resp.ok) {
                await fetchProducts();
                showToast(editId ? 'Product updated' : 'Product added');
                setShowModal(false);
            } else {
                showToast('Error saving product');
            }
        } catch (err) {
            showToast('Network error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout title="Product Catalog" hideHeader={showModal}>
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
                    <div className="relative group w-full lg:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand transition-colors" />
                        <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search products, SKU..."
                            className="w-full pl-11 pr-4 py-3 bg-accent-peach/20 rounded-xl border-2 border-transparent focus:border-brand/30 outline-none transition-all font-medium text-accent-brown placeholder:text-accent-brown/30 shadow-sm" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="flex bg-accent-peach/20 p-1 rounded-xl border border-transparent">
                            {PET_CATS.map(c => (
                                <button key={c} onClick={() => setPetFilter(c)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${petFilter === c ? 'bg-brand text-white shadow-md' : 'text-accent-brown/50 hover:bg-white/50'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-accent-peach/20 p-1 rounded-xl border border-transparent overflow-x-auto gap-1">
                            {TYPE_CATS.map(c => (
                                <button key={c} onClick={() => setTypeFilter(c)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === c ? 'bg-accent-brown text-white shadow-md' : 'text-accent-brown/50 hover:bg-white/50'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={openAdd}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shrink-0">
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
                            
                            {/* Product Image */}
                            <div className="aspect-square rounded-2xl bg-accent-peach/10 mb-5 relative overflow-hidden flex items-center justify-center p-6 sm:p-8">
                                {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <Package className="w-12 h-12 text-brand-dark/20" />
                                )}
                            </div>

                            <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">{p.type} • {p.category}</p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-500' : p.stock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {p.stock === 0 ? 'Out' : `In Stock: ${p.stock}`}
                                    </span>
                                </div>
                                <h4 className="font-black text-accent-brown text-lg leading-tight tracking-tight mb-2 line-clamp-2">{p.name}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-4">{p.sku}</p>
                                
                                <div className="mt-auto pt-4 border-t border-accent-brown/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <p className="text-xl font-black text-accent-brown tracking-tight">₱{p.price.toLocaleString()}</p>
                                        <div className="flex items-center gap-1 text-brand">
                                            <Award className="w-3 h-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">+{p.loyalty_points || 0} Pts</span>
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

                {/* Modal */}
                <AnimatePresence>
                    {showModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => !saving && setShowModal(false)} className="fixed inset-0 bg-accent-brown/30 backdrop-blur-sm z-50" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-left">
                                    <div className="flex items-center justify-between mb-8 shrink-0">
                                        <div>
                                            <h3 className="text-3xl font-black text-accent-brown tracking-tight">{editId ? 'Edit Product' : 'Add New Product'}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mt-1">Fill in the details to update your catalog</p>
                                        </div>
                                        <button onClick={() => setShowModal(false)} className="w-11 h-11 bg-accent-peach/30 rounded-2xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-400 transition-all shadow-sm"><X className="w-5 h-5" /></button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        {/* Left Side: Image Upload */}
                                        <div className="lg:col-span-5 space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block ml-1">Product Identity</label>
                                                <div className="relative aspect-[4/3] rounded-[2rem] bg-accent-peach/10 border-4 border-dashed border-accent-peach/30 overflow-hidden group flex items-center justify-center p-8 transition-all hover:border-brand/40">
                                                    {form.image && form.image !== '/images/product_placeholder.png' ? (
                                                        <>
                                                            <img src={form.image} alt="Preview" className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                                <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Change Image'}
                                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                                                </label>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <label className="flex flex-col items-center gap-4 cursor-pointer">
                                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-accent-brown/20 shadow-sm border border-accent-brown/5">
                                                                <Upload className="w-8 h-8" />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs font-black text-accent-brown uppercase tracking-widest mb-1">Upload Image</p>
                                                                <p className="text-[8px] font-bold text-accent-brown/30 uppercase">PNG, JPG or WebP up to 5MB</p>
                                                            </div>
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-accent-peach/10 rounded-3xl p-6 border border-accent-peach/20">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm">
                                                        <Award className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Loyalty Rewards</p>
                                                        <p className="text-[8px] font-bold text-accent-brown/40 uppercase">Encourage repeat customers</p>
                                                    </div>
                                                </div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 px-1">Points awarded per item</label>
                                                <input type="number" min="0" value={form.loyalty_points} onChange={e => setForm(f => ({ ...f, loyalty_points: e.target.value }))} placeholder="0"
                                                    className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                            </div>

                                            {/* Variant Visuals on Left Side */}
                                            {form.variants.length > 0 && (
                                                <div className="space-y-6 pt-6 border-t border-accent-brown/10">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm">
                                                                <Edit2 className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Variant Identity</p>
                                                                <p className="text-[8px] font-bold text-accent-brown/40 uppercase">Unique visuals for each option</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6">
                                                            {form.variants.map((v, i) => (
                                                                <div key={`vimg-${i}`} className="space-y-2">
                                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block ml-1">{v.name || `Variant ${i+1}`} Rendering</label>
                                                                    <div className="relative aspect-[4/3] rounded-[2rem] bg-accent-peach/10 border-4 border-dashed border-accent-peach/30 overflow-hidden group flex items-center justify-center p-8 transition-all hover:border-brand/40">
                                                                        {v.image ? (
                                                                            <>
                                                                                <img src={v.image} alt="Preview" className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" />
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                                                    <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Change Photo'}
                                                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, { type: 'variant', index: i })} disabled={uploading} />
                                                                                    </label>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <label className="flex flex-col items-center gap-4 cursor-pointer">
                                                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent-brown/20 shadow-sm border border-accent-brown/5">
                                                                                    <Upload className="w-6 h-6" />
                                                                                </div>
                                                                                <div className="text-center">
                                                                                    <p className="text-[10px] font-black text-accent-brown uppercase tracking-widest mb-1">Set {v.name || 'Variant'} Image</p>
                                                                                    <p className="text-[8px] font-bold text-accent-brown/30 uppercase">High fidelity product shot</p>
                                                                                </div>
                                                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, { type: 'variant', index: i })} disabled={uploading} />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Side: Form Fields */}
                                        <div className="lg:col-span-7 space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 ml-1">Product Name</label>
                                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Kibble"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-3.5 px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 col-span-2">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 ml-1">SKU Identification</label>
                                                        <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. PT-FOOD-001"
                                                            className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-3.5 px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 ml-1">Promotional Tag</label>
                                                        <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. NEW, GOURMET, BESTSELLER"
                                                            className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-3.5 px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <CustomDropdown
                                                        label="Category"
                                                        value={form.category}
                                                        onChange={val => setForm(f => ({ ...f, category: String(val) }))}
                                                        options={PET_CATS.filter(c => c !== 'All')}
                                                    />
                                                    <CustomDropdown
                                                        label="Type"
                                                        value={form.type}
                                                        onChange={val => setForm(f => ({ ...f, type: String(val) }))}
                                                        options={TYPE_CATS.filter(c => c !== 'All')}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 ml-1">Full Description</label>
                                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell customers more about this product..."
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-[1.5rem] py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30 h-32 resize-none" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 ml-1">Price (₱)</label>
                                                    <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-4 px-5 text-sm font-black text-brand-dark outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 ml-1">Current Stock</label>
                                                    <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-4 px-5 text-sm font-black text-accent-brown outline-none transition-all" />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-accent-brown/10 space-y-8">
                                                <div>
                                                    <div className="flex items-center justify-between mb-4 px-1 text-left">
                                                        <div>
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Product Variants</h4>
                                                            <p className="text-[8px] font-bold text-accent-brown/40 uppercase">Create unique options with their own sizes & stock</p>
                                                        </div>
                                                        <button type="button" onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { name: '', price: '', sizes: [] }] }))}
                                                            className="flex items-center gap-1 bg-brand/10 text-brand px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-brand hover:text-white transition-all shadow-sm">
                                                            <Plus className="w-3 h-3" /> Add Variant
                                                        </button>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {form.variants.map((v, i) => (
                                                            <div key={`v-${i}`} className="bg-accent-peach/5 p-4 rounded-3xl border border-accent-peach/20 space-y-4 text-left">
                                                                <div className="flex gap-3 items-center">
                                                                    <input value={v.name} onChange={e => { const nv = [...form.variants]; nv[i].name = e.target.value; setForm(f => ({ ...f, variants: nv })); }} placeholder="Variant Name"
                                                                        className="flex-1 bg-white border border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-sm font-bold text-accent-brown outline-none shadow-sm" />
                                                                    <div className="relative w-32">
                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-accent-brown/40">₱</span>
                                                                        <input type="number" value={v.price} onChange={e => { const nv = [...form.variants]; nv[i].price = e.target.value; setForm(f => ({ ...f, variants: nv })); }} placeholder="Price"
                                                                            className="w-full bg-white border border-transparent focus:border-brand/30 rounded-xl py-3 pl-8 pr-4 text-sm font-bold text-brand-dark outline-none shadow-sm" />
                                                                    </div>
                                                                    <button type="button" onClick={() => { const nv = [...form.variants]; nv.splice(i, 1); setForm(f => ({ ...f, variants: nv })); }}
                                                                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Sizes for this specific variant */}
                                                                <div className="pl-4 border-l-2 border-brand/10 space-y-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <p className="text-[8px] font-black text-accent-brown/50 uppercase tracking-widest">Variant-Specific Sizes</p>
                                                                        <button type="button" onClick={() => { 
                                                                            const nv = [...form.variants]; 
                                                                            nv[i] = { ...nv[i], sizes: [...(nv[i].sizes || []), {name: '', price: '', stock: ''}] };
                                                                            setForm(f => ({ ...f, variants: nv }));
                                                                        }}
                                                                            className="text-[8px] font-black uppercase text-brand hover:underline">Add Size</button>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {v.sizes?.map((vs, si) => (
                                                                            <div key={`v-${i}-s-${si}`} className="grid grid-cols-12 gap-2 items-center">
                                                                                <div className="col-span-4">
                                                                                    <input value={vs.name} onChange={e => { 
                                                                                        const nv = [...form.variants]; 
                                                                                        nv[i].sizes[si].name = e.target.value; 
                                                                                        setForm(f => ({ ...f, variants: nv })); 
                                                                                    }} placeholder="Size Name"
                                                                                        className="w-full bg-white border border-accent-peach/20 rounded-lg py-2 px-3 text-xs font-bold text-accent-brown outline-none" />
                                                                                </div>
                                                                                <div className="col-span-3">
                                                                                    <input type="number" value={vs.price} onChange={e => { 
                                                                                        const nv = [...form.variants]; 
                                                                                        nv[i].sizes[si].price = e.target.value; 
                                                                                        setForm(f => ({ ...f, variants: nv })); 
                                                                                    }} placeholder="Price"
                                                                                        className="w-full bg-white border border-accent-peach/20 rounded-lg py-2 px-3 text-xs font-bold text-brand-dark outline-none" />
                                                                                </div>
                                                                                <div className="col-span-3">
                                                                                    <input type="number" value={vs.stock} onChange={e => { 
                                                                                        const nv = [...form.variants]; 
                                                                                        nv[i].sizes[si].stock = e.target.value; 
                                                                                        setForm(f => ({ ...f, variants: nv })); 
                                                                                    }} placeholder="Stock"
                                                                                        className="w-full bg-white border border-accent-peach/20 rounded-lg py-2 px-3 text-xs font-bold text-accent-brown outline-none" />
                                                                                </div>
                                                                                <div className="col-span-2 flex justify-end">
                                                                                    <button type="button" onClick={() => { 
                                                                                        const nv = [...form.variants]; 
                                                                                        nv[i].sizes.splice(si, 1); 
                                                                                        setForm(f => ({ ...f, variants: nv })); 
                                                                                    }}
                                                                                        className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {form.variants.length === 0 && <p className="text-[10px] font-bold text-accent-brown/30 text-center py-4 bg-accent-peach/5 rounded-2xl border border-dashed border-accent-brown/10">No variant options configured.</p>}
                                                    </div>
                                                </div>

                                                {/* Original Product Sizes */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-4 px-1 text-left">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Original Product Sizes</h4>
                                                        <button type="button" onClick={() => setForm(f => ({ ...f, sizes: [...(f.sizes || []), { name: '', price: '', stock: '' }] }))}
                                                            className="flex items-center gap-1 bg-brand/10 text-brand px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-brand hover:text-white transition-all shadow-sm">
                                                            <Plus className="w-3 h-3" /> Add Size
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {form.sizes.map((s, i) => (
                                                            <div key={`s-${i}`} className="grid grid-cols-12 gap-3 items-center bg-accent-peach/5 p-3 rounded-2xl border border-accent-peach/20 text-left">
                                                                <div className="col-span-4">
                                                                    <input value={s.name} onChange={e => { const ns = [...form.sizes]; ns[i].name = e.target.value; setForm(f => ({ ...f, sizes: ns })); }} placeholder="Size Name"
                                                                        className="w-full bg-white border border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-xs font-bold text-accent-brown outline-none shadow-sm" />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-accent-brown/40">₱</span>
                                                                        <input type="number" value={s.price} onChange={e => { const ns = [...form.sizes]; ns[i].price = e.target.value; setForm(f => ({ ...f, sizes: ns })); }} placeholder="Price"
                                                                            className="w-full bg-white border border-transparent focus:border-brand/30 rounded-lg py-2.5 pl-6 pr-2 text-xs font-bold text-brand-dark outline-none shadow-sm" />
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <input type="number" value={s.stock} onChange={e => { const ns = [...form.sizes]; ns[i].stock = e.target.value; setForm(f => ({ ...f, sizes: ns })); }} placeholder="Stock"
                                                                        className="w-full bg-white border border-transparent focus:border-brand/30 rounded-lg py-2.5 px-3 text-xs font-bold text-accent-brown outline-none shadow-sm" />
                                                                </div>
                                                                <div className="col-span-2 flex justify-end">
                                                                    <button type="button" onClick={() => { const ns = [...form.sizes]; ns.splice(i, 1); setForm(f => ({ ...f, sizes: ns })); }}
                                                                        className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-10 pt-6 border-t border-accent-brown/5 shrink-0">
                                        <button onClick={() => setShowModal(false)} disabled={saving || uploading}
                                            className="flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/10 hover:text-accent-brown transition-all disabled:opacity-50">Discard Changes</button>
                                        <button onClick={handleSave} disabled={saving || uploading}
                                            className="flex-[2] bg-brand-dark text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-brand-dark/20">
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                            {editId ? 'Update Catalog Item' : 'Create Catalog Product'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            </div>
        </DashboardLayout>
    );
};

export default BusinessCatalog;
