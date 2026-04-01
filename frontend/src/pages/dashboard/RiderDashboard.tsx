import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bike, DollarSign, Package, 
    Clock, Navigation as NavIcon,
    AlertCircle, ChevronRight, Power,
    MapPin, Phone, CheckCircle2, Loader2,
    Store, Navigation
} from 'lucide-react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';

const RiderDashboard = () => {
    const [isOnline, setIsOnline] = useState(false);
    const [earnings, setEarnings] = useState({ total_earnings: 0, completed_orders: 0, today_earnings: 0 });
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const fetchData = async () => {
        const token = localStorage.getItem('hivet_token');
        if (!token) return;

        try {
            // Fetch Profile
            const profRes = await fetch('http://localhost:8000/api/rider/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profRes.ok) {
                const profData = await profRes.json();
                setIsOnline(profData.is_online);
            }

            // Fetch Earnings
            const earnRes = await fetch('http://localhost:8000/api/rider/earnings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (earnRes.ok) {
                setEarnings(await earnRes.json());
            }

            // Fetch Available Orders
            const orderRes = await fetch('http://localhost:8000/api/rider/available-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (orderRes.ok) {
                const orderData = await orderRes.json();
                setAvailableOrders(orderData.orders);
            }

            // Fetch Active Order
            const activeRes = await fetch('http://localhost:8000/api/rider/active-order', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (activeRes.ok) {
                const activeData = await activeRes.json();
                setActiveOrder(activeData.order);
            }
        } catch (err) {
            console.error('Failed to fetch rider data:', err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            if (isOnline) fetchData();
        }, 15000); // Polling every 15s when online
        return () => clearInterval(interval);
    }, [isOnline]);

    // Geolocation Tracking
    useEffect(() => {
        if (!isOnline) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setRiderLocation(newLoc);
                // Update backend location
                const token = localStorage.getItem('hivet_token');
                fetch('http://localhost:8000/api/rider/location', {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newLoc)
                }).catch(err => console.error("Loc update failed:", err));
            },
            (err) => console.error("Geo error:", err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isOnline]);

    const toggleStatus = async () => {
        const token = localStorage.getItem('hivet_token');
        setIsUpdatingStatus(true);
        try {
            const res = await fetch('http://localhost:8000/api/rider/status', {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_online: !isOnline })
            });
            if (res.ok) {
                setIsOnline(!isOnline);
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const acceptOrder = async (orderId: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/rider/orders/${orderId}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error('Failed to accept order:', err);
        }
    };

    const updateOrderStatus = async (orderId: number, status: string) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/rider/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error('Failed to update order status:', err);
        }
    };

    return (
        <DashboardLayout title="Rider Dashboard">
            <div className="space-y-8 pb-32">
                {/* Status Toggle & Welcome */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-brand/5 border border-brand/5 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-brand/10 transition-colors" />
                    
                    <div className="relative z-10 flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-lg ${isOnline ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-gray-100 text-gray-400'}`}>
                            <Bike className={`w-10 h-10 ${isOnline ? 'animate-bounce' : ''}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-accent-brown tracking-tight">
                                    {isOnline ? 'You are Online!' : 'Currently Offline'}
                                </h2>
                                {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
                            </div>
                            <p className="text-sm font-medium text-accent-brown/50 italic">
                                {isOnline ? 'Scanning for nearby delivery requests...' : 'Toggle to start accepting orders.'}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={toggleStatus}
                        disabled={isUpdatingStatus}
                        className={`relative z-10 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl disabled:opacity-50 ${
                            isOnline 
                            ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shadow-red-500/10' 
                            : 'bg-brand-dark text-white hover:bg-black shadow-brand-dark/20'
                        }`}
                    >
                        <Power className="w-5 h-5" />
                        {isOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeOrder ? (
                        <motion.div 
                            key="active-tracking"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-2 h-2 rounded-full bg-brand animate-ping" />
                                <h3 className="font-black text-accent-brown uppercase tracking-widest text-sm">Active Delivery Tracking</h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Map View */}
                                <div className="lg:col-span-8 bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-brand/5 min-h-[500px] relative">
                                    <Map
                                        defaultCenter={riderLocation || activeOrder.clinic || { lat: 14.5995, lng: 120.9842 }}
                                        defaultZoom={15}
                                        className="w-full h-full"
                                        disableDefaultUI={true}
                                    >
                                        {/* Rider Marker */}
                                        {riderLocation && (
                                            <Marker position={riderLocation} label="Rider" />
                                        )}

                                        {/* Pickup Marker */}
                                        {activeOrder.clinic && (
                                            <Marker position={{ lat: activeOrder.clinic.lat, lng: activeOrder.clinic.lng }} label="Pickup" />
                                        )}

                                        {/* Dropoff Marker */}
                                        {activeOrder.delivery_lat && (
                                            <Marker position={{ lat: activeOrder.delivery_lat, lng: activeOrder.delivery_lng }} label="Dropoff" />
                                        )}
                                    </Map>

                                    {/* Map Overlays */}
                                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4">
                                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white flex items-center gap-4">
                                            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand-dark">
                                                <NavIcon size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-accent-brown/30">Action</p>
                                                <p className="text-sm font-black text-accent-brown">
                                                    {activeOrder.status === 'Processing' ? 'Head to Clinic for Pickup' : 'Deliver to Customer'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details Sidebar */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-brand/5">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-14 h-14 bg-brand-light/30 rounded-2xl flex items-center justify-center text-brand-dark">
                                                <Package size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-accent-brown tracking-tight">Order #{activeOrder.id.toString().padStart(6, '0')}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-brand" />
                                                    <p className="text-xs font-bold text-brand-dark uppercase tracking-widest">{activeOrder.status}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6 mb-8">
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0">
                                                    <Store size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.1em]">Pickup From</p>
                                                    <p className="text-sm font-bold text-accent-brown">{activeOrder.clinic?.name || 'Hi-Vet Hub'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0">
                                                    <MapPin size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.1em]">Delivery To</p>
                                                    <p className="text-sm font-bold text-accent-brown truncate" title={activeOrder.delivery_address}>
                                                        {activeOrder.delivery_address}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-accent-peach/10 rounded-2xl p-4 mb-8">
                                            <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest mb-3 px-1">Items in Parcel</p>
                                            <div className="space-y-2">
                                                {(activeOrder.items || []).map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs font-bold text-accent-brown bg-white/50 p-2 rounded-lg">
                                                        <span>{item.name}</span>
                                                        <span className="bg-brand/10 px-2 py-0.5 rounded text-brand-dark">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button className="p-4 bg-accent-peach/20 hover:bg-accent-peach/40 text-accent-brown rounded-2xl transition-all flex items-center justify-center">
                                                <Phone size={20} />
                                            </button>
                                            {activeOrder.status === 'Processing' ? (
                                                <button 
                                                    onClick={() => updateOrderStatus(activeOrder.id, 'Picked Up')}
                                                    className="flex-[3] bg-brand-dark hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    Confirm Picked Up
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => updateOrderStatus(activeOrder.id, 'Delivered')}
                                                    className="flex-[3] bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 size={18} /> Complete Delivery
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="available-view"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-8"
                        >
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-brand/5 border border-brand/5 hover:translate-y-[-4px] transition-all">
                                    <div className="w-12 h-12 bg-brand/10 text-brand-dark rounded-2xl flex items-center justify-center mb-6">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Today's Earnings</p>
                                    <h3 className="text-3xl font-black text-accent-brown tracking-tight">₱{earnings.today_earnings}</h3>
                                </div>

                                <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-brand/5 border border-brand/5 hover:translate-y-[-4px] transition-all">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Total Completed</p>
                                    <h3 className="text-3xl font-black text-accent-brown tracking-tight">{earnings.completed_orders}</h3>
                                </div>

                                <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-brand/5 border border-brand/5 hover:translate-y-[-4px] transition-all sm:col-span-2 lg:col-span-1">
                                    <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Total Wallet</p>
                                    <h3 className="text-3xl font-black text-accent-brown tracking-tight">₱{(earnings.total_earnings / 100).toFixed(2)}</h3>
                                </div>
                            </div>

                            {/* Available Orders Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <NavIcon className="w-5 h-5 text-brand-dark" />
                                        <h3 className="font-black text-accent-brown uppercase tracking-widest text-sm">Available Delivery Requests</h3>
                                    </div>
                                    <span className="bg-brand/10 text-brand-dark px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {availableOrders.length} New
                                    </span>
                                </div>

                                {!isOnline ? (
                                    <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] py-20 border-2 border-dashed border-accent-brown/5 flex flex-col items-center justify-center text-center px-6">
                                        <div className="w-20 h-20 bg-accent-peach/20 rounded-full flex items-center justify-center mb-6">
                                            <AlertCircle className="w-10 h-10 text-accent-brown/20" />
                                        </div>
                                        <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tight">Offline Mode</h4>
                                        <p className="text-sm text-accent-brown/40 font-medium max-w-xs leading-relaxed">
                                            Go online to start seeing delivery requests in your immediate area.
                                        </p>
                                    </div>
                                ) : availableOrders.length === 0 ? (
                                    <div className="bg-white rounded-[2.5rem] py-24 border border-brand/5 flex flex-col items-center justify-center text-center px-6">
                                        <div className="w-20 h-20 bg-brand/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                            <Package className="w-10 h-10 text-brand-dark/20" />
                                        </div>
                                        <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tight">No Requests Found</h4>
                                        <p className="text-sm text-accent-brown/40 font-medium max-w-xs leading-relaxed">
                                            We're checking for new requests every few seconds. Stay tuned!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableOrders.map((order) => (
                                            <motion.div 
                                                key={order.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-white rounded-3xl p-6 border border-brand/5 shadow-lg shadow-brand/5 hover:border-brand/40 transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-accent-peach/20 rounded-2xl flex items-center justify-center text-brand-dark">
                                                            <Package className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Order Info</span>
                                                            <p className="font-black text-accent-brown tracking-tight truncate w-32 md:w-auto">#{order.id.toString().padStart(6, '0')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-brand/10 text-brand-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                        ₱{order.total_amount}
                                                    </div>
                                                </div>

                                                <div className="space-y-4 mb-6">
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col items-center gap-1 mt-1">
                                                            <div className="w-2 h-2 rounded-full bg-brand-dark" />
                                                            <div className="w-0.5 h-full bg-accent-brown/10 rounded-full" />
                                                            <div className="w-2 h-2 rounded-full border-2 border-accent-brown/20 bg-white" />
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div>
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 block">Pickup</span>
                                                                <p className="text-[11px] font-bold text-accent-brown">Hi-Vet Main Hub • Clinic District</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 block">Delivery To</span>
                                                                <p className="text-[11px] font-bold text-accent-brown">Customer Address • Near Location</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => acceptOrder(order.id)}
                                                    className="w-full bg-brand-dark hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                                >
                                                    Accept Request <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default RiderDashboard;
