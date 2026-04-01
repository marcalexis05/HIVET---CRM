import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp, MapPin, Truck } from 'lucide-react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

// ALL_ORDERS moved to state

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
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.token) {
            fetchOrders();
        }
    }, [user?.token]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const resp = await fetch('http://localhost:8000/api/business/orders', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (resp.ok) {
                setOrders(await resp.json());
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = orders.filter(o => {
        const matchFilter = activeFilter === 'All' || o.status === activeFilter;
        const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase())
            || o.id.toLowerCase().includes(search.toLowerCase())
            || o.product.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    const totalRevenue = filtered.reduce((sum, o) => sum + (!['Cancelled', 'Pending'].includes(o.status) ? o.total : 0), 0);

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

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <Loader2 className="w-10 h-10 animate-spin text-brand" />
                            <p className="font-bold text-sm tracking-widest uppercase">Loading live orders...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-accent-brown/5 bg-accent-peach/10">
                                        {['', 'Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Date', 'Status'].map(h => (
                                            <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-accent-brown/30 py-4 px-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((o, i) => (
                                        <React.Fragment key={o.id}>
                                            <motion.tr
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                                className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-4 px-4 text-accent-brown/20 group-hover:text-brand-dark transition-colors">
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
                                                        <div className="flex flex-col lg:flex-row gap-8">
                                                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-6">
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
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-brand-dark text-white px-4 py-2 rounded-xl hover:bg-black transition-colors">
                                                                            <Eye className="w-3.5 h-3.5" /> View Full Order
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <select 
                                                                            value={o.status}
                                                                            onChange={async (e) => {
                                                                                try {
                                                                                    const realId = o.id.split('-')[1]; // ORD-12-34 -> 12
                                                                                    const res = await fetch(`http://localhost:8000/api/business/orders/${realId}/status`, {
                                                                                        method: 'PATCH',
                                                                                        headers: {
                                                                                            'Content-Type': 'application/json',
                                                                                            'Authorization': `Bearer ${user?.token}`
                                                                                        },
                                                                                        body: JSON.stringify({ status: e.target.value })
                                                                                    });
                                                                                    if (res.ok) fetchOrders();
                                                                                } catch (err) {
                                                                                    console.error('Failed to update status', err);
                                                                                }
                                                                            }}
                                                                            className="w-full text-[10px] font-black uppercase tracking-widest bg-white text-accent-brown border border-accent-brown/20 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-dark"
                                                                        >
                                                                            <option value="Pending">Pending</option>
                                                                            <option value="Processing">Processing</option>
                                                                            <option value="Order Received">Order Received</option>
                                                                            <option value="Completed">Completed</option>
                                                                            <option value="Cancelled">Cancelled</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {o.fulfillment_method === 'delivery' && (
                                                                <div className="w-full lg:w-[400px] flex gap-6 bg-accent-peach/5 p-4 rounded-2xl border border-accent-brown/5">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Truck className="w-4 h-4 text-brand-dark" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Delivery Address</span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-accent-brown leading-tight mb-2">
                                                                            {o.delivery_address || 'No address provided'}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 text-brand-dark">
                                                                            <MapPin className="w-3 h-3" />
                                                                            <span className="text-[9px] font-black uppercase tracking-widest">Pin on Map</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-32 h-24 rounded-xl overflow-hidden shadow-sm border border-white shrink-0 relative">
                                                                        <Map
                                                                            center={o.delivery_lat ? { lat: o.delivery_lat, lng: o.delivery_lng } : { lat: 14.5995, lng: 120.9842 }}
                                                                            defaultZoom={15}
                                                                            disableDefaultUI={true}
                                                                            className="w-full h-full"
                                                                        >
                                                                                <Marker position={{ lat: o.delivery_lat, lng: o.delivery_lng }} />
                                                                        </Map>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                    {filtered.map((o, i) => (
                        <motion.div
                            key={o.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-3xl p-5 shadow-xl shadow-accent-brown/5 border border-white space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest mb-1">{o.id}</p>
                                    <h4 className="font-black text-accent-brown text-lg tracking-tight leading-tight">{o.customer}</h4>
                                    <p className="text-[10px] font-medium text-accent-brown/50">{o.email}</p>
                                </div>
                                <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>
                                    {STATUS_ICONS[o.status]} {o.status}
                                </span>
                            </div>

                            <div className="p-4 bg-accent-peach/10 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-2">Order Items</p>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-accent-brown truncate flex-1 mr-4">{o.product}</p>
                                    <p className="text-[10px] font-black text-accent-brown/50 whitespace-nowrap">×{o.qty}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-0.5">Total Amount</p>
                                    <p className="text-xl font-black text-brand-dark tracking-tighter">₱{o.total.toLocaleString()}</p>
                                </div>
                                <button className="bg-accent-brown text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-brand-dark transition-all shadow-lg shadow-accent-brown/10">
                                    <Eye className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-accent-brown/30 pt-4 border-t border-accent-brown/5">
                                <span>{o.date}</span>
                                <span>{o.payment}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-accent-peach/20">
                        <p className="text-accent-brown/40 font-bold">No orders found matching your criteria.</p>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default BusinessOrders;
