import { motion } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, Tag, Star } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { products } from '../../data/products';

const AdminCatalog = () => {
    return (
        <DashboardLayout title="Catalog Control">
            <div className="space-y-6">

                {/* Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                            />
                        </div>
                    </div>

                    <button className="w-full md:w-auto px-6 py-2.5 bg-brand-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:-translate-y-0.5 transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Add New Product
                    </button>
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.slice(0, 12).map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-[2rem] p-5 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/30 transition-all flex flex-col group relative"
                        >
                            {/* Action Floating Buttons */}
                            <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-brand/10 flex items-center justify-center text-accent-brown hover:text-brand-dark hover:scale-110 transition-all">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-red-500/10 flex items-center justify-center text-red-400 hover:text-red-500 hover:scale-110 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Image Placeholder/Container */}
                            <div className="w-full aspect-square rounded-[1.5rem] mb-4 bg-accent-peach/10 relative overflow-hidden flex items-center justify-center p-4">
                                <img src={p.image} alt={p.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 ease-out" />
                                <div className="absolute top-3 left-3 bg-white/90 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-brand/5">
                                    <Tag className="w-2.5 h-2.5 text-brand" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown">{p.category}</span>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-bold text-accent-brown/50 uppercase tracking-widest">{p.type}</span>
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, idx) => (
                                            <Star key={idx} className={`w-2 h-2 ${idx < p.stars ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                        ))}
                                    </div>
                                </div>
                                <h3 className="font-black text-accent-brown leading-tight tracking-tight mb-3 line-clamp-2">{p.name}</h3>

                                <div className="mt-auto pt-4 border-t border-accent-brown/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30">Price</span>
                                        <p className="text-xl font-black text-accent-brown tracking-tighter">₱{p.price}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30">Stock</span>
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center justify-center mt-1">
                                            {Math.floor(Math.random() * 50) + 10} units
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center pt-4">
                    <button className="px-8 py-3 rounded-xl bg-white border-2 border-accent-brown/10 text-xs font-black uppercase tracking-widest text-accent-brown hover:border-brand/30 hover:text-brand-dark transition-all shadow-sm">
                        Load More Products
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminCatalog;
