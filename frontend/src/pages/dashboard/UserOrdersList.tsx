import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, AlertCircle, ChevronRight, MessageSquare, ShieldAlert } from 'lucide-react';

interface OrderItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    size?: string;
    image?: string;
}

interface Order {
    id: number;
    status: string;
    total_amount: number;
    fulfillment_method: string;
    payment_method: string;
    cancellation_reason?: string;
    created_at: string;
    items: OrderItem[];
}

const UserOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const tabs = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled'];

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch('http://localhost:8000/api/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason) return;
        setIsCancelling(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`http://localhost:8000/api/orders/${selectedOrder.id}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: cancelReason })
            });

            if (response.ok) {
                setIsCancelModalOpen(false);
                setCancelReason('');
                setSelectedOrder(null);
                fetchOrders();
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    const filteredOrders = activeTab === 'All'
        ? orders
        : orders.filter(o => o.status === activeTab);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending': return <Package className="w-5 h-5 text-amber-500" />;
            case 'Processing': return <Truck className="w-5 h-5 text-blue-500" />;
            case 'Completed': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'Cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const cancelReasons = [
        "Change of mind",
        "Found a better price elsewhere",
        "Ordered by mistake",
        "Shipping time is too long",
        "Duplicate order",
        "Other"
    ];

    return (
        <DashboardLayout title="My Orders">
            <div className="space-y-8">
                {/* Status Tabs */}
                <div className="relative">
                    <div className="flex items-center gap-1.5 xs:gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-2.5 xs:px-6 py-2.5 xs:py-3 rounded-full font-black text-[8px] xs:text-[10px] uppercase tracking-wider xs:tracking-widest transition-all whitespace-nowrap ${activeTab === tab
                                    ? 'bg-brand text-brand-dark shadow-lg shadow-brand/20'
                                    : 'bg-white text-accent-brown/40 hover:bg-accent-peach/30'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    {/* Visual Scroll Indicator for mobile */}
                    <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#FAF3E0] to-transparent pointer-events-none sm:hidden" />
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-64 bg-white/50 animate-pulse rounded-[2rem]"></div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-8 xs:p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm border border-accent-brown/5">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-accent-peach/30 rounded-[2rem] flex items-center justify-center mb-6">
                            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-brand" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tighter mb-2">No orders found</h3>
                        <p className="text-[10px] sm:text-base text-accent-brown/50 font-medium">You haven't placed any orders in this category yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredOrders.map(order => (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[2rem] shadow-sm border border-accent-brown/5 overflow-hidden group"
                            >
                                {/* Order Header */}
                                <div className="p-4 xs:p-6 sm:p-8 flex items-center justify-between border-b border-accent-brown/5 bg-accent-peach/5">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                            {getStatusIcon(order.status)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Order</span>
                                                <span className="text-xs sm:text-sm font-black text-accent-brown truncate">#HV-{order.id.toString().padStart(4, '0')}</span>
                                            </div>
                                            <p className="text-[8px] sm:text-[10px] font-bold text-accent-brown/40 uppercase mt-0.5">
                                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-600' :
                                                order.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-blue-100 text-blue-600'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="p-4 xs:p-6 sm:p-8 space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent-peach/10 rounded-xl p-2 shrink-0 flex items-center justify-center">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm text-accent-brown truncate">{item.name}</h4>
                                                <p className="text-[8px] sm:text-[10px] text-accent-brown/40 font-black uppercase tracking-widest">
                                                    {item.variant} • {item.size}
                                                </p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-brand-dark tracking-widest uppercase">Qty: {item.quantity}</span>
                                                    <span className="font-black text-xs sm:text-sm text-accent-brown tracking-tight">₱{item.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Order Footer */}
                                <div className="p-4 xs:p-6 sm:p-8 bg-accent-peach/10 flex flex-col sm:flex-row items-center justify-between border-t border-accent-brown/5 gap-6 sm:gap-4">
                                    <div className="w-full sm:w-auto text-center sm:text-left">
                                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-1">Total Amount</p>
                                        <p className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter leading-none">₱{order.total_amount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                        {order.status === 'Pending' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setIsCancelModalOpen(true);
                                                }}
                                                className="w-full xs:w-auto px-6 py-3 bg-white border-2 border-red-50 text-red-500 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                Cancel Order
                                            </button>
                                        )}
                                        <button className="w-full xs:w-auto px-6 py-3 bg-brand-dark hover:bg-black text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand-dark/10 flex items-center justify-center gap-2">
                                            Order Details <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {order.status === 'Cancelled' && order.cancellation_reason && (
                                    <div className="px-8 pb-8 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Reason for cancellation</p>
                                            <p className="text-xs font-semibold text-accent-brown mt-0.5">{order.cancellation_reason}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancel Order Modal */}
            <AnimatePresence>
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCancelModalOpen(false)}
                            className="absolute inset-0 bg-accent-brown/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 100 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 100 }}
                            className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
                        >
                            <div className="p-5 xs:p-6 sm:p-10 border-b border-accent-brown/5 bg-accent-peach/10 shrink-0">
                                <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                                        <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg xs:text-xl sm:text-2xl font-black text-accent-brown tracking-tighter">Cancel Order</h3>
                                        <p className="text-[9px] sm:text-xs font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Order #HV-{selectedOrder?.id.toString().padStart(4, '0')}</p>
                                    </div>
                                </div>
                                <p className="text-[11px] sm:text-sm font-medium text-accent-brown/60 leading-tight sm:leading-relaxed max-w-sm">
                                    Please select a reason for cancelling your order.
                                </p>
                            </div>

                            <div className="p-5 xs:p-6 sm:p-10 space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar flex-1">
                                <div className="grid grid-cols-1 gap-2">
                                    {cancelReasons.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setCancelReason(reason)}
                                            className={`flex items-center justify-between p-3.5 xs:p-4 rounded-xl border-2 transition-all ${cancelReason === reason
                                                ? 'border-red-500 bg-red-50/50 text-red-600'
                                                : 'border-accent-brown/5 hover:border-accent-brown/10 text-accent-brown/60 hover:bg-accent-peach/10'
                                                }`}
                                        >
                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">{reason}</span>
                                            {cancelReason === reason && <CheckCircle className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>

                                {cancelReason === 'Other' && (
                                    <textarea
                                        placeholder="Please tell us more..."
                                        className="w-full bg-accent-peach/10 border-2 border-accent-brown/5 rounded-xl p-3 sm:p-4 text-xs sm:text-sm font-medium outline-none focus:border-red-500 transition-colors"
                                        rows={2}
                                        value={cancelReason === 'Other' ? (cancelReason === cancelReasons[cancelReasons.length - 1] ? '' : cancelReason) : ''}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="p-5 xs:p-6 sm:p-10 bg-accent-peach/5 border-t border-accent-brown/5 shrink-0 flex gap-3 sm:gap-4">
                                <button
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="flex-1 px-4 sm:px-8 py-3.5 xs:py-4 bg-white border border-accent-brown/5 text-accent-brown rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-accent-peach/20 transition-all shadow-sm"
                                >
                                    Keep
                                </button>
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={!cancelReason || isCancelling}
                                    className="flex-1 px-4 sm:px-8 py-3.5 xs:py-4 bg-red-500 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 shadow-xl shadow-red-500/20"
                                >
                                    {isCancelling ? '...' : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default UserOrders;
