import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const ALL_ORDERS = [
    { id: 'ORD-0091', customer: 'Maria Santos', email: 'maria@email.com', product: 'Premium Dog Food 5kg', qty: 2, total: 1240, status: 'Completed', date: '2026-03-06', payment: 'GCash' },
    { id: 'ORD-0090', customer: 'Juan Reyes', email: 'juan@email.com', product: 'Cat Vitamin Complex', qty: 1, total: 580, status: 'Processing', date: '2026-03-06', payment: 'Credit Card' },
    { id: 'ORD-0089', customer: 'Ana Cruz', email: 'ana@email.com', product: 'Grooming Accessory Set', qty: 1, total: 920, status: 'Completed', date: '2026-03-05', payment: 'GCash' },
    { id: 'ORD-0088', customer: 'Mark Villanueva', email: 'mark@email.com', product: 'Dental Chew Pack', qty: 3, total: 1020, status: 'Pending', date: '2026-03-05', payment: 'Cash on Pickup' },
    { id: 'ORD-0087', customer: 'Lea Torres', email: 'lea@email.com', product: 'Harness + Leash Bundle', qty: 1, total: 760, status: 'Completed', date: '2026-03-04', payment: 'Credit Card' },
    { id: 'ORD-0086', customer: 'Paolo Alvarez', email: 'paolo@email.com', product: 'Organic Salmon 12lb', qty: 1, total: 1740, status: 'Cancelled', date: '2026-03-03', payment: 'GCash' },
    { id: 'ORD-0085', customer: 'Grace Bautista', email: 'grace@email.com', product: 'Pet Carrier Bag', qty: 1, total: 490, status: 'Processing', date: '2026-03-03', payment: 'Credit Card' },
    { id: 'ORD-0084', customer: 'Ryan Mendoza', email: 'ryan@email.com', product: 'Premium Dog Food 5kg', qty: 3, total: 1860, status: 'Completed', date: '2026-03-02', payment: 'GCash' },
];

const STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    Completed: <CheckCircle className="w-3 h-3" />,
    Processing: <Loader2 className="w-3 h-3 animate-spin" />,
    Pending: <Clock className="w-3 h-3" />,
    Cancelled: <XCircle className="w-3 h-3" />,
};

const FILTERS = ['All', 'Completed', 'Processing', 'Pending', 'Cancelled'];

const BusinessOrders = () => {
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filtered = ALL_ORDERS.filter(o => {
        const matchFilter = activeFilter === 'All' || o.status === activeFilter;
        const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase())
            || o.id.toLowerCase().includes(search.toLowerCase())
            || o.product.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    const totalRevenue = filtered.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.total : 0), 0);

    return (
        <DashboardLayout title="Orders">
            <div className="space-y-6">

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white rounded-2xl p-4 shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            type="text"
                            placeholder="Search orders, customers..."
                            className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <Filter className="w-4 h-4 text-accent-brown/40 shrink-0" />
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === f ? 'bg-brand-dark text-white shadow-lg shadow-brand/20' : 'bg-accent-peach/20 text-accent-brown/50 hover:bg-accent-peach/40'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary strip */}
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm font-medium text-accent-brown/50">{filtered.length} order{filtered.length !== 1 ? 's' : ''} found</p>
                    <p className="text-sm font-black text-accent-brown">Revenue: <span className="text-brand-dark">₱{totalRevenue.toLocaleString()}</span></p>
                </div>

                {/* Orders Table Card */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b border-accent-brown/5 bg-accent-peach/10">
                                    {['', 'Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Date', 'Status'].map(h => (
                                        <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-accent-brown/30 py-4 px-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((o, i) => (
                                    <>
                                        <motion.tr
                                            key={o.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                            className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-4 text-accent-brown/40">
                                                {expandedId === o.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </td>
                                            <td className="py-4 px-4 text-[10px] font-black text-accent-brown/50">{o.id}</td>
                                            <td className="py-4 px-4 font-bold text-accent-brown text-sm">{o.customer}</td>
                                            <td className="py-4 px-4 text-sm font-medium text-accent-brown/70 max-w-[200px] truncate">{o.product}</td>
                                            <td className="py-4 px-4 text-sm font-black text-accent-brown/60">×{o.qty}</td>
                                            <td className="py-4 px-4 font-black text-accent-brown">₱{o.total.toLocaleString()}</td>
                                            <td className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{o.date}</td>
                                            <td className="py-4 px-4">
                                                <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-fit ${STATUS_STYLES[o.status]}`}>
                                                    {STATUS_ICONS[o.status]} {o.status}
                                                </span>
                                            </td>
                                        </motion.tr>
                                        {expandedId === o.id && (
                                            <tr className="bg-accent-peach/10 border-b border-accent-brown/5">
                                                <td colSpan={8} className="px-8 py-5">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Customer Email</p>
                                                            <p className="text-sm font-bold text-accent-brown">{o.email}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Payment Method</p>
                                                            <p className="text-sm font-bold text-accent-brown">{o.payment}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Order Date</p>
                                                            <p className="text-sm font-bold text-accent-brown">{o.date}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-brand-dark text-white px-4 py-2 rounded-xl hover:bg-black transition-colors">
                                                                <Eye className="w-3.5 h-3.5" /> View Full Order
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-accent-brown/40 font-bold">No orders match your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

            </div>
        </DashboardLayout>
    );
};

export default BusinessOrders;
