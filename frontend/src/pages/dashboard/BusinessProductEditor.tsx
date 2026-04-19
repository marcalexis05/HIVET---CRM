import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, Package, X, Check, Loader2,
    AlertCircle, Award, Upload, Star, MapPin, ChevronLeft, ChevronRight,
    Eye, Settings, Layers, Box, Info, Image as ImageIcon, Save, Store
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { CustomDropdown } from '../../components/CustomDropdown';
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
    weight?: string;
    variants_json?: string;
    sizes_json?: string;
    stars?: number;
    review_count?: number;
    inventory_distribution?: Record<string, { price: string | number; stock: string | number } | number | string>;
}

const EMPTY_FORM = {
    name: '',
    category: 'Dogs',
    type: 'Food',
    price: '',
    stock: '',
    sku: '',
    description: '',
    tag: '',
    weight: '',
    loyalty_points: '',
    image: '/images/product_placeholder.png',
    variants: [] as { name: string, price: string, image?: string, sizes: { name: string, price: string, stock: string, branch_stock?: Record<string, { price: string, stock: string }> }[] }[],
    sizes: [] as { name: string, price: string, stock: string, branch_stock?: Record<string, { price: string, stock: string }> }[],
    inventory_distribution: {} as Record<string, any>
};

const BusinessProductEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = id && id !== 'new';

    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(isEdit ? true : false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [allBranches, setAllBranches] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('details'); // details, inventory, variants
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const { user } = useAuth();
    const token = user?.token;

    const [isAddingOtherCategory, setIsAddingOtherCategory] = useState(false);
    const [otherCategory, setOtherCategory] = useState('');
    const [isAddingOtherType, setIsAddingOtherType] = useState(false);
    const [otherType, setOtherType] = useState('');

    // Predefined categories/types (should match BusinessCatalog)
    const baseCategories = ['Cats', 'Dogs'];
    const baseTypes = [
        'Food', 'Accessories', 'Vitamins',
        'Health & Wellness', 'Grooming', 'Toys', 'Bedding',
        'Apparel', 'Training', 'Hygiene', 'Furniture'
    ];

    useEffect(() => {
        if (token) {
            fetchAllBranches();
            if (isEdit) {
                fetchProduct();
            }
        }
    }, [token, id]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const fetchAllBranches = async () => {
        try {
            const resp = await fetch('http://localhost:8000/api/business/branches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                setAllBranches(data);
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
        }
    };

    const fetchProduct = async () => {
        try {
            const resp = await fetch(`http://localhost:8000/api/business/catalog/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                const p = await resp.json();
                setForm({
                    name: p.name,
                    category: p.category,
                    type: p.type,
                    price: String(p.price),
                    stock: String(p.stock),
                    sku: p.sku,
                    description: p.description || '',
                    tag: p.tag || '',
                    weight: p.weight || '',
                    loyalty_points: String(p.loyalty_points || 0),
                    image: p.image || '/images/product_placeholder.png',
                    variants: p.variants_json ? JSON.parse(p.variants_json).map((v: any) => ({ ...v, sizes: v.sizes || [] })) : [],
                    sizes: p.sizes_json ? JSON.parse(p.sizes_json) : [],
                    inventory_distribution: Object.entries((p as any).inventory_distribution || {}).reduce((acc: any, [key, val]: [string, any]) => {
                        // If it's a number/string (legacy), convert to object
                        if (typeof val !== 'object') {
                            acc[key] = { price: String(p.price), stock: String(val) };
                        } else {
                            acc[key] = {
                                price: String(val.price || p.price),
                                stock: String(val.stock || 0)
                            };
                        }
                        return acc;
                    }, {})
                });
            } else {
                showToast('Failed to fetch product');
                navigate('/dashboard/business/catalog');
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
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
        const hasSizes = form.sizes.length > 0;
        if (!form.name || (!hasSizes && (!form.price || !form.stock)) || !form.sku) {
            showToast('Please fill in all required fields');
            return;
        }
        setSaving(true);
        try {
            const url = isEdit
                ? `http://localhost:8000/api/business/catalog/${id}`
                : 'http://localhost:8000/api/business/catalog';
            const method = isEdit ? 'PUT' : 'POST';

            // If sizes exist, we use the first size price as the "base" for the catalog list
            const finalPrice = hasSizes ? parseFloat(String(form.sizes[0].price)) : parseFloat(String(form.price));

            // Total stock is sum of all branch stocks IF distribution has data, else base stock
            const distEntries = Object.values(form.inventory_distribution || {});
            const totalDistStock = distEntries.reduce((acc, curr: any) => {
                const s = typeof curr === 'object' ? curr.stock : curr;
                return acc + (parseInt(String(s)) || 0);
            }, 0);
            const finalStock = hasSizes
                ? form.sizes.reduce((acc, s) => acc + (parseInt(String(s.stock)) || 0), 0)
                : (totalDistStock > 0 ? totalDistStock : (parseInt(String(form.stock)) || 0));

            // Sanitize variants and sizes to remove empty ghosts
            const cleanSizes = form.sizes.filter(s => s.name && s.name.trim() !== '');
            const cleanVariants = form.variants.filter(v => v.name && v.name.trim() !== '').map(v => ({
                ...v,
                sizes: (v.sizes || []).filter(s => s.name && s.name.trim() !== '')
            }));

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
                    price: finalPrice,
                    stock: finalStock,
                    sku: form.sku,
                    image: form.image,
                    description: form.description,
                    tag: form.tag,
                    weight: form.weight,
                    loyalty_points: parseInt(form.loyalty_points) || 0,
                    variants_json: JSON.stringify(cleanVariants),
                    sizes_json: JSON.stringify(cleanSizes),
                    inventory_distribution: form.inventory_distribution
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                showToast(isEdit ? 'Product updated successfully' : 'Product created successfully');

                // If it was a new product, we navigate to its edit page to stay on "this" item
                if (!isEdit && data.id) {
                    setTimeout(() => navigate(`/dashboard/business/catalog/product/${data.id}`), 1000);
                }
                // If already editing, we just stay here.
            } else {
                showToast('Error saving product');
            }
        } catch (err) {
            showToast('Network error');
        } finally {
            setSaving(false);
        }
    };

    const displayPrice = useMemo(() => {
        const allSizes = [
            ...form.sizes,
            ...form.variants.flatMap(v => v.sizes || [])
        ];

        if (allSizes.length > 0) {
            const prices = allSizes.map(s => parseFloat(String(s.price))).filter(p => !isNaN(p));
            if (prices.length === 0) return '0.00';
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return min === max ? min.toLocaleString() : `${min.toLocaleString()} - ${max.toLocaleString()}`;
        }
        return parseFloat(String(form.price || '0')).toLocaleString();
    }, [form.price, form.sizes, form.variants]);

    const baseStockTotal = useMemo(() => {
        const sizeStock = form.sizes.reduce((acc, s) => acc + (parseInt(String(s.stock)) || 0), 0);
        if (sizeStock > 0) return sizeStock;

        const totalDistStock = Object.values(form.inventory_distribution || {}).reduce((acc, curr: any) => {
            const val = typeof curr === 'object' ? curr.stock : curr;
            return acc + (parseInt(String(val)) || 0);
        }, 0);
        return totalDistStock > 0 ? totalDistStock : (parseInt(String(form.stock)) || 0);
    }, [form.sizes, form.inventory_distribution, form.stock]);

    const variantStockTotal = useMemo(() => {
        return (form.variants || []).reduce((acc, v) => acc + (v.sizes?.reduce((sAcc, s) => sAcc + (parseInt(String(s.stock)) || 0), 0) || 0), 0);
    }, [form.variants]);

    const displayStock = useMemo(() => String(baseStockTotal + variantStockTotal), [baseStockTotal, variantStockTotal]);

    const [previewImageIndex, setPreviewImageIndex] = useState(0);
    const previewImages = useMemo(() => {
        const imgs = [];
        if (form.image) {
            imgs.push({
                url: form.image,
                name: 'Original Product',
                stock: baseStockTotal
            });
        }
        (form.variants || []).forEach((v, idx) => {
            if (v.image) {
                const vStock = v.sizes?.reduce((acc, s) => acc + (parseInt(String(s.stock)) || 0), 0) || 0;
                imgs.push({
                    url: v.image,
                    name: v.name || `Variant ${idx + 1}`,
                    stock: vStock
                });
            }
        });
        return imgs;
    }, [form.image, form.variants, baseStockTotal]);

    const previewStock = useMemo(() => {
        if (previewImages.length === 0) return displayStock;
        return String(previewImages[previewImageIndex]?.stock ?? displayStock);
    }, [previewImageIndex, previewImages, displayStock]);

    if (loading) {
        return (
            <DashboardLayout title="Loading Product...">
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <Loader2 className="w-10 h-10 animate-spin text-brand" />
                    <p className="font-bold text-sm tracking-widest uppercase">Loading catalog data...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={isEdit ? '' : ''}>
            <div className="space-y-8">
                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm bg-green-600 text-white">
                            <Check className="w-4 h-4" /> {toast}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard/business/catalog')}
                            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-accent-brown hover:bg-brand hover:text-white transition-all shadow-sm border border-accent-brown/5"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-accent-brown tracking-tight">
                                {isEdit ? `Editing ${form.name || 'Product'}` : 'Create New Product'}
                            </h2>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-brown/30 mt-1">
                                {isEdit ? 'Update existing catalog item details' : 'Configure and list a new item in your catalog'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/dashboard/business/catalog')}
                            className="flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-accent-brown/60 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            Discard Changes
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-dark text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brand-dark/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {isEdit ? 'Update Catalog Item' : 'Publish to Catalog'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Left Side: Form Sections */}
                    <div className="lg:col-span-8 space-y-8 pb-20">

                        {/* Custom Navigation for sections */}
                        <div className="flex items-center gap-2 p-1.5 bg-accent-peach/5 rounded-2xl border border-accent-peach/20 w-fit">
                            {[
                                { id: 'details', icon: Info, label: 'Details' },
                                { id: 'inventory', icon: MapPin, label: 'Inventory' },
                                { id: 'variants', icon: Layers, label: 'Variants' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm uppercase font-black tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-white text-brand shadow-md shadow-accent-brown/5 border border-accent-brown/5'
                                        : 'text-accent-brown/40 hover:text-accent-brown'
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'details' && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    {/* Brand Aesthetics: Image Upload */}
                                    <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white space-y-6">
                                        <div>
                                            <h3 className="text-sm font-black text-accent-brown uppercase tracking-widest flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-brand" /> Product Visuals
                                            </h3>
                                            <p className="text-sm font-bold text-accent-brown/30 uppercase mt-1">Upload high-quality product images to attract customers</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="relative aspect-[4/3] rounded-[2rem] bg-accent-peach/10 border-4 border-dashed border-accent-peach/30 overflow-hidden group flex items-center justify-center p-8 transition-all hover:border-brand/40">
                                                {form.image && form.image !== '/images/product_placeholder.png' ? (
                                                    <>
                                                        <img src={form.image} alt="Preview" className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                            <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-center">
                                                                {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Change Photo'}
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
                                                            <p className="text-sm font-black text-accent-brown uppercase tracking-widest mb-1">Click to Upload</p>
                                                            <p className="text-sm font-bold text-accent-brown/30 uppercase">PNG, JPG up to 5MB</p>
                                                        </div>
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                                    </label>
                                                )}
                                            </div>

                                            <div className="space-y-6">
                                                <div className="bg-accent-peach/10 rounded-3xl p-6 border border-accent-peach/20">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm">
                                                            <Award className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm uppercase font-black tracking-widest text-accent-brown">Loyalty Points</p>
                                                            <p className="text-sm font-bold text-accent-brown/40 uppercase">Points awarded per item purchase</p>
                                                        </div>
                                                    </div>
                                                    <input type="number" min="0" value={form.loyalty_points} onChange={e => setForm(f => ({ ...f, loyalty_points: e.target.value }))} placeholder="0"
                                                        className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-base font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                                </div>
                                                <div className="p-6 bg-brand/5 border border-brand/10 rounded-3xl">
                                                    <h4 className="text-sm uppercase font-black text-brand tracking-widest mb-2 flex items-center gap-2">
                                                        <Star className="w-3 h-3 fill-brand" /> Visual Tip
                                                    </h4>
                                                    <p className="text-sm font-bold text-accent-brown/60 leading-relaxed uppercase">
                                                        Use a white background and good lighting for your product photos to make them look professional in the store view.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Primary Info */}
                                    <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white space-y-8">
                                        <div>
                                            <h3 className="text-sm font-black text-accent-brown uppercase tracking-widest flex items-center gap-2">
                                                <Box className="w-4 h-4 text-brand" /> Basic Information
                                            </h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="text-sm uppercase font-black tracking-widest text-accent-brown/40 block mb-2 ml-1">Product Name</label>
                                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Kibble"
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                            </div>

                                            <div>
                                                <label className="text-sm uppercase font-black tracking-widest text-accent-brown/40 block mb-2 ml-1">SKU ID</label>
                                                <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. PT-FOOD-001"
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none transition-all" />
                                            </div>

                                            <div>
                                                <label className="text-sm uppercase font-black tracking-widest text-accent-brown/40 block mb-2 ml-1">Weight</label>
                                                <input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 2.4 lbs"
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none transition-all" />
                                            </div>


                                            <div className="md:col-span-1">
                                                {isAddingOtherCategory ? (
                                                    <div>
                                                        <label className="text-sm uppercase font-black tracking-widest text-brand block mb-2 ml-1">Custom Category</label>
                                                        <div className="flex gap-2">
                                                            <input autoFocus value={otherCategory} onChange={e => { setOtherCategory(e.target.value); setForm(f => ({ ...f, category: e.target.value })); }} placeholder="New category..."
                                                                className="flex-1 bg-white border-2 border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none shadow-sm" />
                                                            <button onClick={() => setIsAddingOtherCategory(false)} className="px-4 bg-accent-peach/20 rounded-2xl text-accent-brown/40 hover:text-brand"><X className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <CustomDropdown label="Category" value={form.category} onChange={val => {
                                                        if (val === 'OTHER') { setIsAddingOtherCategory(true); setForm(f => ({ ...f, category: '' })); setOtherCategory(''); }
                                                        else { setForm(f => ({ ...f, category: String(val) })); }
                                                    }} options={[...baseCategories, { label: '+ Add New Custom...', value: 'OTHER' }]} />
                                                )}
                                            </div>

                                            <div className="md:col-span-1">
                                                {isAddingOtherType ? (
                                                    <div>
                                                        <label className="text-sm uppercase font-black tracking-widest text-brand block mb-2 ml-1">Custom Type</label>
                                                        <div className="flex gap-2">
                                                            <input autoFocus value={otherType} onChange={e => { setOtherType(e.target.value); setForm(f => ({ ...f, type: e.target.value })); }} placeholder="New type..."
                                                                className="flex-1 bg-white border-2 border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none shadow-sm" />
                                                            <button onClick={() => setIsAddingOtherType(false)} className="px-4 bg-accent-peach/20 rounded-2xl text-accent-brown/40 hover:text-brand"><X className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <CustomDropdown label="Type" value={form.type} onChange={val => {
                                                        if (val === 'OTHER') { setIsAddingOtherType(true); setForm(f => ({ ...f, type: '' })); setOtherType(''); }
                                                        else { setForm(f => ({ ...f, type: String(val) })); }
                                                    }} options={[...baseTypes, { label: '+ Add New Custom...', value: 'OTHER' }]} />
                                                )}
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-sm uppercase font-black tracking-widest text-accent-brown/40 block mb-2 ml-1">Promotional Tag</label>
                                                <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. NEW, GOURMET, BESTSELLER"
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-sm uppercase font-black tracking-widest text-accent-brown/40 block mb-2 ml-1">Description</label>
                                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell customers more about this product..."
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-3xl py-4 px-6 text-base font-bold text-accent-brown outline-none transition-all h-40 resize-none" />
                                            </div>
                                        </div>
                                    </section>
                                </motion.div>
                            )}

                            {activeTab === 'inventory' && (
                                <motion.div
                                    key="inventory"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                                                    <Package className="w-5 h-5 text-brand" /> Price & Inventory
                                                </h3>
                                                <p className="text-xs font-bold text-black uppercase mt-1.5 opacity-40">Define base pricing or add specific size options</p>
                                            </div>
                                            <button type="button" onClick={() => setForm(f => ({ ...f, sizes: [...(f.sizes || []), { name: '', price: '', stock: '', branch_stock: {} }] }))}
                                                className="flex items-center gap-2 bg-brand/10 text-brand px-6 py-3 rounded-2xl text-[12px] uppercase font-black hover:bg-brand hover:text-white transition-all shadow-md">
                                                <Plus className="w-5 h-5" /> Add Product Size
                                            </button>
                                        </div>

                                        {form.sizes.length === 0 ? (
                                            <div className="grid grid-cols-1 gap-8">
                                                <div className="grid grid-cols-2 gap-8 bg-accent-peach/5 p-10 rounded-[2.5rem] border-2 border-accent-peach/10">
                                                    <div className="space-y-6">
                                                        <div>
                                                            <label className="text-[12px] font-black uppercase tracking-widest text-black block mb-2.5 ml-1">Base Price (₱)</label>
                                                            <div className="relative group/price">
                                                                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-xl font-black text-brand">$</span>
                                                                <input type="number" readOnly value={form.price}
                                                                    className="w-full bg-accent-peach/20 border-2 border-dashed border-accent-peach/30 rounded-[1.5rem] py-5 pl-16 pr-8 text-2xl font-black text-black outline-none shadow-inner cursor-not-allowed select-none" />
                                                            </div>
                                                            <p className="text-[11px] font-black text-brand uppercase mt-3 ml-1 italic opacity-80 flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-brand"></div> Linked to Product Details
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[12px] font-black uppercase tracking-widest text-black block mb-2.5 ml-1">Global Total Stock</label>
                                                            <div className="relative group/total">
                                                                <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-brand" />
                                                                <input type="number" readOnly value={displayStock}
                                                                    className="w-full bg-accent-peach/20 border-2 border-dashed border-accent-peach/30 rounded-[1.5rem] py-5 pl-16 pr-8 text-2xl font-black text-black outline-none shadow-inner cursor-not-allowed select-none" />
                                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-hover/total:opacity-100 transition-opacity">
                                                                    <Check className="w-5 h-5 text-green-600" />
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] font-black text-brand uppercase mt-3 ml-1 italic opacity-80 flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div> Strictly Read-Only: Managed via branches
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[12px] font-black uppercase tracking-widest text-black ml-1">Branch Distribution</label>
                                                            <div className="flex gap-8 text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mr-8">
                                                                <span>Region Price</span>
                                                                <span>Local Stock</span>
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[350px] overflow-y-auto pr-3 space-y-3 custom-scrollbar">
                                                            {allBranches.map(branch => {
                                                                const branchData = form.inventory_distribution[branch.id] || { price: '', stock: '' };
                                                                const hasStock = (parseInt(branchData.stock) || 0) > 0;

                                                                return (
                                                                    <div key={branch.id} className="bg-white p-5 rounded-2xl border-2 border-accent-peach/10 flex items-center justify-between gap-4 shadow-sm hover:border-brand/20 transition-all group">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <div className={`w-2 h-2 rounded-full ${hasStock ? 'bg-green-500' : 'bg-red-400'} shadow-sm`}></div>
                                                                                <p className="text-[13px] font-black text-black truncate leading-none">{branch.name}</p>
                                                                            </div>
                                                                            <p className="text-[10px] font-black text-black uppercase tracking-wider truncate opacity-40">{branch.city}</p>
                                                                        </div>
                                                                        <div className="flex gap-3 shrink-0">
                                                                            <div className="relative w-28">
                                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/20">₱</span>
                                                                                <input type="number" readOnly value={branchData.price}
                                                                                    className="w-full bg-accent-peach/10 border-2 border-transparent rounded-xl py-2.5 pl-8 pr-3 text-xs font-black text-black outline-none cursor-default select-none shadow-inner" />
                                                                            </div>
                                                                            <div className="relative w-24">
                                                                                <input type="number" readOnly value={branchData.stock}
                                                                                    className="w-full bg-accent-peach/10 border-2 border-transparent rounded-xl py-2.5 px-3 text-xs font-black text-black outline-none transition-all text-center cursor-default select-none shadow-inner" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {/* Global Branch Insights (Consolidated Overview) */}
                                                <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[3rem] border-2 border-brand/10 shadow-xl space-y-6">
                                                    <div className="flex items-center justify-between px-2">
                                                        <div className="space-y-1">
                                                            <h4 className="text-[12px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <Store className="w-4 h-4 text-brand" /> Global Branch Insights
                                                            </h4>
                                                            <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Consolidated inventory overview across all sizes</p>
                                                        </div>
                                                        <div className="bg-brand/5 px-4 py-2 rounded-xl border border-brand/10">
                                                            <p className="text-[10px] font-black text-brand uppercase tracking-widest">Dynamic Summary</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {allBranches.map(branch => {
                                                            // Calculate total stock for this branch across all product sizes
                                                            const consolidatedStock = form.sizes.reduce((acc, s) => {
                                                                const bStock = s.branch_stock?.[branch.id];
                                                                return acc + (parseInt(bStock?.stock || '0') || 0);
                                                            }, 0);

                                                            return (
                                                                <div key={`cons-${branch.id}`} className="bg-white p-6 rounded-[2rem] border-2 border-accent-peach/5 flex flex-col justify-between group/insight hover:border-brand/20 transition-all shadow-sm">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[13px] font-black text-black truncate leading-tight mb-1">{branch.name}</p>
                                                                            <p className="text-[10px] font-black text-black opacity-30 uppercase tracking-widest truncate">{branch.city}</p>
                                                                        </div>
                                                                        <div className={`w-2.5 h-2.5 rounded-full ${consolidatedStock > 0 ? 'bg-green-500' : 'bg-red-400'} shadow-sm`}></div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between bg-accent-peach/5 rounded-xl py-3 px-5 border border-transparent group-hover/insight:border-brand/5 transition-all">
                                                                        <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Consolidated Stock</p>
                                                                        <p className="text-[14px] font-bold text-black tabular-nums">{consolidatedStock}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Size Configuration List */}
                                                <div className="flex items-center justify-between px-2 mb-2">
                                                    <div className="space-y-1">
                                                        <h4 className="text-[12px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Layers className="w-4 h-4 text-brand" /> Original Product Sizes
                                                        </h4>
                                                        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Define distinct unit options for the base product</p>
                                                    </div>
                                                    <button type="button" onClick={() => {
                                                        const newSize = { name: '', price: form.price, stock: '0', branch_stock: {} };
                                                        setForm(f => ({ ...f, sizes: [newSize, ...f.sizes] }));
                                                    }} className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-[10px] uppercase font-black hover:bg-black transition-all shadow-lg shadow-brand/20">
                                                        <Plus className="w-3.5 h-3.5" /> Add Size Option
                                                    </button>
                                                </div>

                                                {form.sizes.map((s, i) => {
                                                    const currentSizeBranchStock = s.branch_stock || {};
                                                    return (
                                                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={`base-s-${i}`}
                                                            className="bg-accent-peach/5 p-8 rounded-[3rem] border-2 border-accent-peach/10 space-y-6 relative group transition-all hover:bg-white/50 hover:shadow-2xl hover:shadow-accent-brown/5">
                                                            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border-2 border-accent-peach/10">
                                                                <div className="grid grid-cols-12 gap-6 flex-1 items-center">
                                                                    <div className="col-span-4">
                                                                        <label className="text-[11px] font-black uppercase tracking-widest text-black block mb-2 ml-1 opacity-50">Size Option Name</label>
                                                                        <input value={s.name} onChange={e => { const ns = [...form.sizes]; ns[i].name = e.target.value; setForm(f => ({ ...f, sizes: ns })); }} placeholder="e.g. Small, 5kg"
                                                                            className="w-full bg-accent-peach/5 border-2 border-transparent focus:border-brand/20 rounded-2xl py-3 px-5 text-sm font-black text-black outline-none" />
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <label className="text-[11px] font-black uppercase tracking-widest text-black block mb-2 ml-1 opacity-50">Base Size Price</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/20">₱</span>
                                                                            <input type="number" value={s.price} onChange={e => { const ns = [...form.sizes]; ns[i].price = e.target.value; setForm(f => ({ ...f, sizes: ns })); }} placeholder="0.00"
                                                                                className="w-full bg-accent-peach/5 border-2 border-transparent focus:border-brand/20 rounded-2xl py-3 pl-8 pr-4 text-sm font-black text-black outline-none" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <label className="text-[11px] font-black uppercase tracking-widest text-black block mb-2 ml-1 opacity-50">Combined Stock</label>
                                                                        <div className="relative group/combined">
                                                                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand" />
                                                                            <input type="number" readOnly value={s.stock || '0'}
                                                                                className="w-full bg-accent-peach/20 border-2 border-dashed border-accent-peach/30 rounded-2xl py-3.5 pl-12 pr-4 text-xl font-black text-black outline-none shadow-inner cursor-not-allowed select-none" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-span-2 flex justify-end">
                                                                        <button type="button" onClick={() => { const ns = [...form.sizes]; ns.splice(i, 1); setForm(f => ({ ...f, sizes: ns })); }}
                                                                            className="w-12 h-12 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-[1.25rem] flex items-center justify-center transition-all shadow-sm">
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Branch breakdown inside size card */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                                                                {allBranches.map(branch => {
                                                                    const branchData = currentSizeBranchStock[branch.id] || { price: '', stock: '' };
                                                                    return (
                                                                        <div key={`s-${i}-b-${branch.id}`} className="bg-white p-5 rounded-[1.5rem] border-2 border-accent-peach/10 shadow-sm flex flex-col justify-between group/branch hover:border-brand/30 transition-all">
                                                                            <div className="flex justify-between items-start mb-4">
                                                                                <div className="min-w-0 flex-1 mr-3">
                                                                                    <p className="text-[13px] font-black text-black truncate leading-tight mb-1">{branch.name}</p>
                                                                                    <p className="text-[10px] font-black text-black opacity-30 uppercase tracking-widest truncate">{branch.city}</p>
                                                                                </div>
                                                                                <div className={`w-2.5 h-2.5 rounded-full ${(parseInt(branchData.stock) || 0) > 0 ? 'bg-green-500' : 'bg-red-400'} shadow-sm transition-colors`}></div>
                                                                            </div>
                                                                            <div className="flex gap-3">
                                                                                <div className="relative flex-1">
                                                                                    <div className="flex items-center justify-between bg-accent-peach/5 border-2 border-transparent rounded-xl py-2.5 px-4">
                                                                                        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Local Stock</p>
                                                                                        <input type="number"
                                                                                            value={branchData.stock}
                                                                                            onChange={e => {
                                                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                                                const ns = [...form.sizes];
                                                                                                const bStock = { ...(ns[i].branch_stock || {}) };
                                                                                                bStock[branch.id] = { ...(bStock[branch.id] || { price: s.price }), stock: val.toString() };

                                                                                                const total = Object.values(bStock).reduce((acc: number, curr: any) => acc + (parseInt(curr.stock) || 0), 0);
                                                                                                ns[i] = { ...ns[i], branch_stock: bStock, stock: total.toString() };
                                                                                                setForm(f => ({ ...f, sizes: ns }));
                                                                                            }}
                                                                                            placeholder="0" min="0"
                                                                                            className="w-20 bg-transparent text-[14px] font-black text-black outline-none transition-all text-right" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="text-[12px] font-black text-brand uppercase tracking-[0.25em] ml-6 italic opacity-70 flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-brand"></div> Setting branch overrides for this size
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                                <div className="mt-8 pt-8 border-t-2 border-accent-peach/10 flex flex-col items-center gap-6">
                                                    <div className="flex flex-col items-center justify-center w-full p-10 bg-accent-peach/5 rounded-[2.5rem] border-2 border-dashed border-accent-peach/20 text-center space-y-6">
                                                        <div className="space-y-2">
                                                            <p className="text-[14px] font-black text-brand uppercase tracking-[0.3em] italic mb-1">Multi-size mode active: Global Total calculated per location</p>
                                                            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Advanced distribution logic is overriding base inventory values</p>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => setShowResetConfirm(true)}
                                                                className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-accent-peach/10 rounded-2xl text-[10px] font-black text-black uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all shadow-sm group"
                                                            >
                                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                                Deactivate Sizes
                                                            </button>

                                                            {/* Custom Confirmation Modal */}
                                                            <AnimatePresence>
                                                                {showResetConfirm && (
                                                                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetConfirm(false)}
                                                                            className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                                                                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                                            className="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl border border-white text-center space-y-8">
                                                                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto shadow-inner">
                                                                                <AlertCircle className="w-10 h-10" />
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <h3 className="text-xl font-black text-black tracking-tight uppercase">Confirm Inventory Reset</h3>
                                                                                <p className="text-sm font-bold text-black/40 uppercase leading-relaxed tracking-wide">
                                                                                    This will permanently remove all product size configurations and custom branch overrides. Are you sure you want to revert?
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex gap-4">
                                                                                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-4 bg-accent-peach/10 rounded-2xl text-xs font-black text-black uppercase tracking-widest hover:bg-accent-peach/20 transition-all">
                                                                                    Cancel
                                                                                </button>
                                                                                <button onClick={() => { setForm(f => ({ ...f, sizes: [] })); setShowResetConfirm(false); }}
                                                                                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-red-500/20">
                                                                                    Reset Now
                                                                                </button>
                                                                            </div>
                                                                        </motion.div>
                                                                    </div>
                                                                )}
                                                            </AnimatePresence>

                                                            <button
                                                                onClick={handleSave}
                                                                disabled={saving}
                                                                className="flex items-center gap-4 px-12 py-5 bg-brand text-white rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.2em] hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                            >
                                                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                                                {saving ? 'Synchronizing...' : 'Save & Update Inventory'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </motion.div>
                            )}

                            {activeTab === 'variants' && (
                                <motion.div
                                    key="variants"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    {/* Specific Variants */}
                                    <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-black text-accent-brown uppercase tracking-widest flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-brand" /> Variant Collection
                                                </h3>
                                                <p className="text-sm font-bold text-accent-brown/30 uppercase mt-1">Unique visuals and pricing for different model versions</p>
                                            </div>
                                            <button type="button" onClick={() => setForm(f => ({ ...f, variants: [{ name: '', price: '', image: '', sizes: [] }, ...(f.variants || [])] }))}
                                                className="flex items-center gap-2 bg-brand/10 text-brand px-5 py-2.5 rounded-xl text-sm uppercase font-black hover:bg-brand hover:text-white transition-all shadow-sm">
                                                <Plus className="w-4 h-4" /> Add New Variant
                                            </button>
                                        </div>

                                        <div className="space-y-12">
                                            {form.variants.map((v, i) => (
                                                <div key={`v-${i}`} className="space-y-6 p-8 bg-accent-peach/5 rounded-[2rem] border border-accent-peach/10 relative group">
                                                    <button type="button" onClick={() => { const nv = [...form.variants]; nv.splice(i, 1); setForm(f => ({ ...f, variants: nv })); }}
                                                        className="absolute top-4 right-4 w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-accent-brown/5">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                                        <div className="md:col-span-4 space-y-4">
                                                            <label className="text-xs font-black uppercase tracking-widest text-accent-brown/40 block ml-1">Variant Image</label>
                                                            <div className="relative aspect-square rounded-3xl bg-white border-2 border-dashed border-accent-peach/30 overflow-hidden group/img flex items-center justify-center p-6 transition-all hover:border-brand/40 shadow-sm">
                                                                {v.image ? (
                                                                    <div className="relative w-full h-full">
                                                                        <img src={v.image} alt="Preview" className="w-full h-full object-contain" />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                                            <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">
                                                                                Change
                                                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, { type: 'variant', index: i })} />
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <label className="flex flex-col items-center gap-3 cursor-pointer">
                                                                        <Upload className="w-6 h-6 text-accent-brown/20" />
                                                                        <p className="text-xs font-black text-accent-brown/30 uppercase">Upload</p>
                                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, { type: 'variant', index: i })} />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="md:col-span-8 space-y-6">
                                                            <div>
                                                                <label className="text-xs font-black uppercase tracking-widest text-accent-brown/40 block mb-2 ml-1">Variant Name</label>
                                                                <input value={v.name} onChange={e => { const nv = [...form.variants]; nv[i] = { ...nv[i], name: e.target.value }; setForm(f => ({ ...f, variants: nv })); }} placeholder="e.g. Chicken Flavor"
                                                                    className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-6 text-base font-bold text-accent-brown outline-none shadow-sm" />
                                                            </div>

                                                            <div className="bg-white/50 p-8 rounded-[2rem] border-2 border-white shadow-inner space-y-6">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="space-y-1">
                                                                        <h5 className="text-[11px] font-black text-accent-brown uppercase tracking-[0.2em] flex items-center gap-2">
                                                                            <Box className="w-4 h-4 text-brand" /> Variant Sizes
                                                                        </h5>
                                                                        <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest">Localized inventory for this specific model</p>
                                                                    </div>
                                                                    <button type="button" onClick={() => {
                                                                        const nv = [...form.variants];
                                                                        const newSize = { name: '', price: form.price, stock: '0', branch_stock: {} };
                                                                        nv[i] = { ...nv[i], sizes: [newSize, ...(nv[i].sizes || [])] };
                                                                        setForm(f => ({ ...f, variants: nv }));
                                                                    }} className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-[10px] uppercase font-black hover:bg-black transition-all shadow-lg shadow-brand/20">
                                                                        <Plus className="w-3.5 h-3.5" /> Add Size Option
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-6">
                                                                    {v.sizes?.map((vs, si) => {
                                                                        const currentVsBranchStock = vs.branch_stock || {};
                                                                        return (
                                                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={`vs-${i}-${si}`} className="p-10 bg-white rounded-[3rem] border-2 border-accent-peach/5 space-y-10 relative group/size shadow-sm hover:shadow-2xl transition-all">
                                                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                                                                                    {/* Size Info (10/12) */}
                                                                                    <div className="md:col-span-10">
                                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                                            <div className="space-y-3">
                                                                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 ml-1">Size Option Name</label>
                                                                                                <input value={vs.name} onChange={e => { const nv = [...form.variants]; const ns = [...(nv[i].sizes || [])]; ns[si] = { ...ns[si], name: e.target.value }; nv[i] = { ...nv[i], sizes: ns }; setForm(f => ({ ...f, variants: nv })); }} placeholder="e.g. Small"
                                                                                                    className="w-full bg-accent-peach/5 border-2 border-transparent focus:border-brand/20 rounded-2xl py-4 px-6 text-sm font-black text-black outline-none transition-all italic" />
                                                                                            </div>
                                                                                            <div className="space-y-3">
                                                                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 ml-1">Base Size Price</label>
                                                                                                <div className="relative">
                                                                                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-black/20 font-black">₱</span>
                                                                                                    <input type="number" value={vs.price} onChange={e => { const nv = [...form.variants]; const ns = [...(nv[i].sizes || [])]; ns[si] = { ...ns[si], price: e.target.value }; nv[i] = { ...nv[i], sizes: ns }; setForm(f => ({ ...f, variants: nv })); }} placeholder="0"
                                                                                                        className="w-full bg-accent-peach/5 border-2 border-transparent focus:border-brand/20 rounded-[1.25rem] py-4 pl-12 pr-6 text-sm font-black text-black outline-none transition-all" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-3">
                                                                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 ml-1 text-brand">Combined Stock</label>
                                                                                                <div className="relative group/stock">
                                                                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                                                                                        <Box className="w-5 h-5 text-brand" />
                                                                                                    </div>
                                                                                                    <input readOnly value={vs.stock}
                                                                                                        className="w-full bg-brand/5 border-2 border-brand/10 rounded-[1.25rem] py-4 pl-14 pr-6 text-xl font-black text-brand outline-none shadow-inner cursor-not-allowed tabular-nums" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Form Actions (2/12) */}
                                                                                    <div className="md:col-span-2 flex justify-end">
                                                                                        <button type="button" onClick={() => { const nv = [...form.variants]; const ns = [...(nv[i].sizes || [])]; ns.splice(si, 1); nv[i] = { ...nv[i], sizes: ns }; setForm(f => ({ ...f, variants: nv })); }}
                                                                                            className="w-14 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                                                            <Trash2 className="w-5 h-5" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Variant Branch Overrides */}
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-accent-peach/[0.03] rounded-[2rem] border border-accent-peach/10">
                                                                                    {allBranches.map(branch => {
                                                                                        const bData = currentVsBranchStock[branch.id] || { price: vs.price, stock: '0' };
                                                                                        return (
                                                                                            <div key={`vs-${i}-${si}-b-${branch.id}`} className="bg-white p-5 rounded-2xl border-2 border-transparent hover:border-brand/10 transition-all shadow-sm group/branch">
                                                                                                <div className="flex justify-between items-center mb-4">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <p className="text-[11px] font-black text-black truncate max-w-[120px]">{branch.name}</p>
                                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="space-y-3">
                                                                                                    <div className="relative flex-1">
                                                                                                        <span className="absolute left-0 top-[2px] text-[7px] font-black text-black/20 uppercase tracking-tighter italic">Local Stock</span>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            value={bData.stock}
                                                                                                            onChange={e => {
                                                                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                                                                const nv = [...form.variants];
                                                                                                                const ns = [...(nv[i].sizes || [])];
                                                                                                                const updatedSize = { ...ns[si] };
                                                                                                                const updatedBranchStock = { ...(updatedSize.branch_stock || {}), [branch.id]: { ...bData, stock: val.toString() } };

                                                                                                                const total = Object.values(updatedBranchStock).reduce((acc: number, curr: any) => acc + (parseInt(curr.stock) || 0), 0);

                                                                                                                updatedSize.branch_stock = updatedBranchStock;
                                                                                                                updatedSize.stock = String(total);
                                                                                                                ns[si] = updatedSize;
                                                                                                                nv[i] = { ...nv[i], sizes: ns };
                                                                                                                setForm(f => ({ ...f, variants: nv }));
                                                                                                            }}
                                                                                                            placeholder="0" min="0"
                                                                                                            className="w-full bg-transparent border-b-2 border-black/5 focus:border-brand/40 pt-4 pb-1 text-base font-black text-black outline-none transition-all placeholder:text-black/5 tabular-nums text-center"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                    {(v.sizes?.length || 0) === 0 && (
                                                                        <div className="py-12 flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                                                            <Box className="w-12 h-12 mb-4" />
                                                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No custom sizes for this variant</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {form.variants.length === 0 && (
                                                <div className="py-20 text-center bg-accent-peach/5 rounded-[2.5rem] border border-dashed border-accent-peach/20">
                                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-accent-brown/10 mx-auto mb-4 border border-accent-brown/5 shadow-sm">
                                                        <Layers className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-sm font-black text-accent-brown/20 uppercase tracking-widest">No variation models listed</p>
                                                    <p className="text-[11px] font-bold text-accent-brown/10 uppercase mt-1">Add variants if this product has different flavors or packaging</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Side: Sticky Preview */}
                    <div className="lg:col-span-4 sticky top-28 space-y-6">
                        <div className="bg-accent-brown/[0.02] rounded-[3rem] p-8 border border-accent-brown/5">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xs font-black text-accent-brown uppercase tracking-widest flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-brand" /> Live Preview
                                </h3>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-400/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-400/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-400/20"></div>
                                </div>
                            </div>

                            {/* Catalog Card Preview */}
                            <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-accent-brown/10 border-2 border-brand/5 group flex flex-col relative overflow-hidden max-w-sm mx-auto">
                                <div className="aspect-square rounded-[2rem] bg-accent-peach/10 mb-6 relative overflow-hidden flex items-center justify-center p-8">
                                    {previewImages.length > 0 ? (
                                        <div className="relative w-full h-full group/preview">
                                            <img src={previewImages[previewImageIndex].url} alt="Preview" className="w-full h-full object-contain transition-all duration-500" />

                                            {previewImages.length > 1 && (
                                                <>
                                                    <button onClick={() => setPreviewImageIndex(i => (i - 1 + previewImages.length) % previewImages.length)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-black border border-accent-peach/20 opacity-0 group-hover/preview:opacity-100 transition-all shadow-sm hover:bg-brand hover:text-white">
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setPreviewImageIndex(i => (i + 1) % previewImages.length)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-black border border-accent-peach/20 opacity-0 group-hover/preview:opacity-100 transition-all shadow-sm hover:bg-brand hover:text-white">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                                                        <p className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{previewImages[previewImageIndex].name}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <Package className="w-16 h-16 text-brand-dark/10" />
                                    )}
                                    {form.tag && (
                                        <div className="absolute top-4 right-4 bg-brand text-white text-sm uppercase font-black px-3 py-1 rounded-full shadow-lg">
                                            {form.tag}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-black text-brand-dark uppercase tracking-widest">{form.type} • {form.category}</p>
                                        <span className={`text-sm uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${Number(previewStock) <= 0 ? 'bg-red-100 text-red-500' : Number(previewStock) <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {Number(previewStock) <= 0 ? 'Out' : `In Stock: ${previewStock}`}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-accent-brown text-lg leading-tight tracking-tight mb-2 line-clamp-2">
                                        {previewImages[previewImageIndex]?.name === 'Original Product'
                                            ? (form.name || 'Product Name')
                                            : (previewImages[previewImageIndex]?.name)}
                                    </h4>
                                    <div className="flex items-center gap-1 mb-4 h-4">
                                        <Star className="w-3 h-3 text-brand fill-brand" />
                                        <Star className="w-3 h-3 text-brand fill-brand" />
                                        <Star className="w-3 h-3 text-brand fill-brand" />
                                        <Star className="w-3 h-3 text-brand fill-brand" />
                                        <Star className="w-3 h-3 text-accent-brown/10" />
                                        <span className="text-xs font-black text-accent-brown/30 ml-1 uppercase">Sample Rating</span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-accent-brown/30 mb-6">{form.sku || 'SKU-XXXXX'}</p>

                                    <div className="mt-auto pt-5 border-t border-accent-brown/5 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-2xl font-black text-accent-brown tracking-tighter">₱{displayPrice}</p>
                                            <div className="flex items-center gap-1 text-brand">
                                                <Award className="w-3 h-3" />
                                                <span className="text-sm uppercase font-black tracking-widest">+{form.loyalty_points || 0} Pts</span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-dark/20">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 p-6 bg-white rounded-3xl border border-accent-brown/5 shadow-sm space-y-4">
                                <h4 className="text-xs font-black text-accent-brown uppercase tracking-widest border-b border-accent-brown/5 pb-2">Configuration Summary</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wide">
                                        <span className="text-accent-brown/40">Total Availability</span>
                                        <span className="text-brand font-black">{displayStock} Units</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 border-t border-accent-brown/5 pt-3">
                                        <div className="bg-accent-peach/5 p-3 rounded-2xl border border-accent-peach/10">
                                            <p className="text-[8px] font-black text-accent-brown/40 uppercase tracking-widest mb-1">Base Product</p>
                                            <p className="text-sm font-black text-accent-brown">{baseStockTotal} <span className="text-[10px] opacity-40">Stock</span></p>
                                        </div>
                                        <div className="bg-accent-peach/5 p-3 rounded-2xl border border-accent-peach/10">
                                            <p className="text-[8px] font-black text-accent-brown/40 uppercase tracking-widest mb-1">All Variants</p>
                                            <p className="text-sm font-black text-accent-brown">{variantStockTotal} <span className="text-[10px] opacity-40">Stock</span></p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest border-t border-accent-brown/5 pt-3">
                                        <span className="text-accent-brown/40">Variants Count</span>
                                        <span className="text-accent-brown">{form.variants.length} Models</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-accent-brown/40">Size Options</span>
                                        <span className="text-accent-brown">{form.sizes.length} Options</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest pb-1">
                                        <span className="text-accent-brown/40">Active Channels</span>
                                        <span className="text-accent-brown">{Object.keys(form.inventory_distribution).length} Branches</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default BusinessProductEditor;
