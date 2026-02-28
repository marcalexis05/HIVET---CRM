import { motion } from 'framer-motion';
import { Search, Filter, CheckCircle2, Clock, XCircle, MoreVertical, Package } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const AdminOrders = () => {
    const orders = [
        { id: 'RV-8822', customer: 'Emma Thompson', items: 2, total: '₱174.00', status: 'Ready', time: '10 mins ago', type: 'Pickup' },
        { id: 'RV-8821', customer: 'James Wilson', items: 1, total: '₱340.00', status: 'Pending', time: '1 hour ago', type: 'Delivery' },
        { id: 'RV-8820', customer: 'Sarah Davis', items: 3, total: '₱145.00', status: 'Completed', time: '3 hours ago', type: 'Pickup' },
        { id: 'RV-8819', customer: 'Michael Brown', items: 1, total: '₱85.00', status: 'Pending', time: '5 hours ago', type: 'Delivery' },
        { id: 'RV-8818', customer: 'Jessica Taylor', items: 4, total: '₱210.00', status: 'Cancelled', time: '1 day ago', type: 'Pickup' },
        { id: 'RV-8817', customer: 'David Miller', items: 2, total: '₱112.00', status: 'Completed', time: '1 day ago', type: 'Delivery' },
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Ready': return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Completed': return 'bg-brand/10 text-brand-dark border-brand/20';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <DashboardLayout title="Order Management">
            <div className="space-y-6">

                {/* Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by Order ID or Customer..."
                                className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                            />
                        </div>
                        <button className="w-10 h-10 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                        {['All Orders', 'Pending', 'Ready', 'Completed'].map((tab, i) => (
                            <button key={tab} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${i === 0 ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Orders Table/List */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-[9px] font-black uppercase tracking-widest text-accent-brown/40">
                                    <th className="px-6 py-5 whitespace-nowrap">Order ID</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Customer</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Type & Items</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Total</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-5 whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order, i) => (
                                    <motion.tr
                                        key={order.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="border-b border-accent-brown/5 hover:bg-accent-peach/5 xl:hover:scale-[1.01] transition-all origin-left group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-accent-brown text-xs">{order.id}</span>
                                            <span className="block text-[10px] text-accent-brown/40 mt-0.5">{order.time}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent-peach/30 flex items-center justify-center text-brand-dark font-black text-[10px] shrink-0">
                                                    {order.customer.charAt(0)}
                                                </div>
                                                <span className="font-bold text-accent-brown text-xs group-hover:text-brand-dark transition-colors">{order.customer}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-accent-brown/70">
                                                <Package className="w-3.5 h-3.5" />
                                                {order.items} Items • {order.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-sm text-accent-brown">{order.total}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                                {order.status === 'Ready' && <CheckCircle2 className="w-3 h-3" />}
                                                {order.status === 'Pending' && <Clock className="w-3 h-3" />}
                                                {order.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                                                {order.status === 'Cancelled' && <XCircle className="w-3 h-3" />}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown/40 hover:bg-white hover:text-brand-dark hover:shadow-sm transition-all ml-auto">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest max-w-[100px] truncate">Showing 1 to 6 of 24 entries</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors" disabled>Prev</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand/10 text-brand-dark">1</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/30 transition-colors">2</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/30 transition-colors">3</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminOrders;
