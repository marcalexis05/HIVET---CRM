import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Package, X, Check, Loader2, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    sku: string;
}

const INITIAL: Product[] = [
    { id: '1', name: 'Premium Dog Food 5kg', category: 'Food', price: 620, stock: 48, sku: 'DF-5KG-001' },
    { id: '2', name: 'Cat Vitamin Complex', category: 'Vitamins', price: 580, stock: 31, sku: 'CV-COM-002' },
    { id: '3', name: 'Dog Grooming Brush', category: 'Dogs', price: 920, stock: 12, sku: 'GA-SET-003' },
    { id: '4', name: 'Dental Chew Pack', category: 'Dogs', price: 340, stock: 55, sku: 'DC-PCK-004' },
    { id: '5', name: 'Cat Harness + Leash', category: 'Cats', price: 760, stock: 8, sku: 'HL-BND-005' },
    { id: '6', name: 'Organic Salmon 12lb', category: 'Food', price: 1740, stock: 6, sku: 'OS-12L-006' },
    { id: '7', name: 'Pet Carrier Bag', category: 'Accessories', price: 490, stock: 19, sku: 'PB-BAG-007' },
    { id: '8', name: 'Flea & Tick Drops', category: 'Cats', price: 280, stock: 0, sku: 'FT-DRP-008' },
    { id: '9', name: 'Dog Multivitamin Pack', category: 'Vitamins', price: 420, stock: 22, sku: 'DV-MUL-009' },
    { id: '10', name: 'Cat Toy Bundle', category: 'Accessories', price: 320, stock: 15, sku: 'CT-TOY-010' },
];

const CATS = ['All', 'Cats', 'Dogs', 'Food', 'Accessories', 'Vitamins'];

const EMPTY_FORM = { name: '', category: 'Food', price: '', stock: '', sku: '' };

const BusinessCatalog = () => {
    const [products, setProducts] = useState<Product[]>(INITIAL);
    const [search, setSearch] = useState('');
    const [cat, setCat] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const filtered = products.filter(p => {
        const matchCat = cat === 'All' || p.category === cat;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
    const openEdit = (p: Product) => {
        setForm({ name: p.name, category: p.category, price: String(p.price), stock: String(p.stock), sku: p.sku });
        setEditId(p.id);
        setShowModal(true);
    };
    const handleDelete = (id: string) => { setProducts(ps => ps.filter(p => p.id !== id)); showToast('Product removed'); };
    const handleSave = async () => {
        if (!form.name || !form.price || !form.stock || !form.sku) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 600));
        if (editId) {
            setProducts(ps => ps.map(p => p.id === editId ? { ...p, name: form.name, category: form.category, price: +form.price, stock: +form.stock, sku: form.sku } : p));
            showToast('Product updated');
        } else {
            setProducts(ps => [...ps, { id: String(Date.now()), name: form.name, category: form.category, price: +form.price, stock: +form.stock, sku: form.sku }]);
            showToast('Product added');
        }
        setSaving(false);
        setShowModal(false);
    };

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
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative w-full max-w-xs group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search products, SKU..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 shadow-sm transition-all" />
                        </div>
                        <div className="hidden md:flex items-center gap-2 overflow-x-auto">
                            {CATS.map(c => (
                                <button key={c} onClick={() => setCat(c)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${cat === c ? 'bg-brand-dark text-white' : 'bg-white text-accent-brown/50 hover:bg-accent-peach/30'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={openAdd}
                        className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shrink-0">
                        <Plus className="w-4 h-4" /> Add Product
                    </button>
                </div>

                {/* Products grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-[2rem] p-7 shadow-xl shadow-accent-brown/5 border-2 border-transparent hover:border-brand/20 transition-all group flex flex-col">
                            <div className="w-12 h-12 bg-accent-peach/40 rounded-2xl flex items-center justify-center mb-5">
                                <Package className="w-6 h-6 text-brand-dark" />
                            </div>
                            <h4 className="font-black text-accent-brown leading-tight tracking-tight mb-1">{p.name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-4">{p.sku} · {p.category}</p>
                            <div className="mt-auto pt-4 border-t border-accent-brown/5 flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-black text-accent-brown tracking-tight">₱{p.price.toLocaleString()}</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-500' : p.stock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {p.stock === 0 ? 'Out of Stock' : `${p.stock} in stock`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(p)} className="w-8 h-8 bg-accent-peach/40 hover:bg-brand hover:text-white text-accent-brown rounded-xl flex items-center justify-center transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-xl flex items-center justify-center transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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

                {/* Modal */}
                <AnimatePresence>
                    {showModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => !saving && setShowModal(false)} className="fixed inset-0 bg-accent-brown/30 backdrop-blur-sm z-50" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-black text-accent-brown tracking-tight">{editId ? 'Edit Product' : 'Add Product'}</h3>
                                        <button onClick={() => setShowModal(false)} className="w-9 h-9 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="space-y-4">
                                        {(['name', 'sku'] as const).map(field => (
                                            <div key={field}>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 pl-1">{field === 'sku' ? 'SKU' : 'Product Name'}</label>
                                                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={field === 'sku' ? 'XX-YYY-001' : 'Product name'}
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                            </div>
                                        ))}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 pl-1">Category</label>
                                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                                className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-sm font-bold text-accent-brown outline-none transition-all">
                                                {CATS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(['price', 'stock'] as const).map(field => (
                                                <div key={field}>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-1.5 pl-1">{field === 'price' ? 'Price (₱)' : 'Stock'}</label>
                                                    <input type="number" min="0" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder="0"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 rounded-xl py-3 px-4 text-sm font-bold text-accent-brown outline-none transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-8">
                                        <button onClick={() => setShowModal(false)} disabled={saving}
                                            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-accent-brown transition-colors">Cancel</button>
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex-[2] bg-brand-dark text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            {editId ? 'Save Changes' : 'Add Product'}
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
