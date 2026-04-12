import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bike, DollarSign, Package,
    Navigation as NavIcon,
    AlertCircle, ChevronRight, Power, Bell,
    MapPin, Phone, CheckCircle2, Loader2,
    Store, X, Check, Wallet, ArrowLeft, ArrowRight
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import RiderBottomNav from '../../components/RiderBottomNav';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_ID || '4c730709b30c1be1';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] border backdrop-blur-md ${type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
            }`}
    >
        {type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <p className="text-sm font-black uppercase tracking-widest flex-1">{message}</p>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
        </button>
    </motion.div>
);

const RiderDashboard = () => {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [earnings, setEarnings] = useState<any>({ today_earnings: 0, total_earnings: 0, completed_orders: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 4;
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<'clinic' | 'customer' | null>(null);
    const [unreadAlerts, setUnreadAlerts] = useState<any[]>([]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = async () => {
        const token = localStorage.getItem('hivet_token');
        if (!token) return;

        try {
            // Fetch Profile
            const profRes = await fetch(`${API}/api/rider/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profRes.ok) {
                const profData = await profRes.json();
                setIsOnline(profData.is_online);
            }

            // Fetch Earnings
            const earnRes = await fetch(`${API}/api/rider/earnings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (earnRes.ok) {
                const earnData = await earnRes.json();
                setEarnings({
                    total_earnings: earnData.total_earnings || 0,
                    completed_orders: earnData.completed_orders || 0,
                    today_earnings: earnData.today_earnings || 0
                });
            }

            // Fetch Available Orders
            const orderRes = await fetch(`${API}/api/rider/available-orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (orderRes.ok) {
                const orderData = await orderRes.json();
                setAvailableOrders(orderData.orders || []);
            }

            // Fetch Active Order
            const activeRes = await fetch(`${API}/api/rider/active-order`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (activeRes.ok) {
                const activeData = await activeRes.json();
                setActiveOrder(activeData.order);
            }

            // Fetch Alerts
            const alertRes = await fetch(`${API}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (alertRes.ok) {
                const alertData = await alertRes.json();
                setUnreadAlerts(alertData.notifications?.filter((n: any) => !n.read).slice(0, 2) || []);
            }
        } catch (err) {
            console.error('Failed to fetch rider data:', err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
        }, 5000); // Polling every 5s for snappy updates
        return () => clearInterval(interval);
    }, [isOnline]); // Refresh whenever status changes or every 5s

    // Geolocation Tracking
    useEffect(() => {
        if (!isOnline) return;

        if (!navigator.geolocation) {
            console.error('Geolocation is not supported');
            return;
        }
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (pos.coords) {
                    const newLoc = { 
                        lat: Number(pos.coords.latitude), 
                        lng: Number(pos.coords.longitude) 
                    };
                    setRiderLocation(newLoc);
                    // Update backend location
                    const token = localStorage.getItem('hivet_token');
                    fetch('http://localhost:8000/api/rider/location', {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ lat: newLoc.lat, lng: newLoc.lng })
                    }).catch(err => console.error("Loc update failed:", err));
                }
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
            const res = await fetch(`${API}/api/rider/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_online: !isOnline })
            });

            if (res.ok) {
                const data = await res.json();
                setIsOnline(data.is_online);
                showToast(data.is_online ? "You are now ONLINE" : "You are now OFFLINE", "success");
            } else {
                const errData = await res.json();
                showToast(errData.detail || "Failed to update status", "error");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "error");
            console.error('Failed to update status:', err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const acceptOrder = async (orderId: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/orders/${orderId}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("Order accepted! Head to pickup store.", "success");
                fetchData();
            } else {
                showToast("Failed to accept order. It may have been claimed.", "error");
            }
        } catch (err) {
            showToast("Network error.", "error");
        }
    };

    const updateOrderStatus = async (orderId: number, status: string) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                showToast(`Status updated to ${status}`, "success");
                fetchData();
            } else {
                showToast("Failed to update status", "error");
            }
        } catch (err) {
            showToast("Network error.", "error");
        }
    };

    return (
        <DashboardLayout title="Rider Dashboard">
            <div className="space-y-10 pb-32">
                {/* Tactical Control Bar - Redefined Command Layout */}
                <div className={`relative overflow-hidden rounded-[4rem] p-10 sm:p-14 text-white shadow-2xl transition-all duration-700 group ${isOnline ? 'bg-brand-dark' : 'bg-brand-dark/40'}`}>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-[250px] -mt-[250px] blur-[120px] group-hover:bg-white/20 transition-all duration-1000" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-[2px] bg-white opacity-20" />
                                <h3 className="font-black text-white/40 uppercase tracking-[0.4em] text-[10px]">Fleet Operations</h3>
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-none">
                                {isOnline ? 'Ready for Dispatch' : 'System Standby'}
                            </h2>
                        </div>

                        <button
                            onClick={toggleStatus}
                            disabled={isUpdatingStatus}
                            className={`px-12 py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-5 whitespace-nowrap ${
                                isOnline 
                                ? 'bg-white text-brand-dark hover:bg-black hover:text-white' 
                                : 'bg-brand text-white hover:bg-white hover:text-brand-dark'
                            }`}
                        >
                            <Power className="w-5 h-5" />
                            {isOnline ? 'Terminate Duty' : 'Go Active Now'}
                        </button>
                    </div>
                </div>

                {/* Announcement Hub - High Visibility System Alerts */}
                <div className="space-y-6">
                    <div className="flex items-end justify-between px-4">
                        <div className="space-y-1">
                            <h3 className="text-4xl sm:text-5xl font-black text-accent-brown tracking-tighter leading-none">System Alerts</h3>
                            <p className="text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.3em]">Operational Intel & Updates</p>
                        </div>
                        {unreadAlerts.length > 0 && (
                            <button 
                                onClick={() => navigate('/dashboard/rider/alerts')}
                                className="text-[10px] font-black text-brand-dark uppercase tracking-widest hover:underline flex items-center gap-2"
                            >
                                View All Center <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {unreadAlerts.length > 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                            {unreadAlerts.map((alert) => (
                                <div 
                                    key={alert.id}
                                    onClick={() => navigate('/dashboard/rider/alerts')}
                                    className="group bg-white border-2 border-brand/10 hover:border-brand/40 p-8 rounded-[3rem] flex items-center gap-6 cursor-pointer transition-all hover:shadow-2xl hover:shadow-brand/5 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-peach/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-brand/10 transition-colors" />
                                    <div className="w-16 h-16 bg-brand/10 rounded-[1.5rem] flex items-center justify-center text-brand-dark shrink-0 group-hover:scale-110 transition-transform">
                                        <Bell className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark bg-brand/10 px-2.5 py-1 rounded-full">{alert.type}</span>
                                        <h4 className="font-extrabold text-xl text-brand-dark tracking-tight mt-2 truncate transition-colors">{alert.title}</h4>
                                        <p className="text-sm text-accent-brown/40 font-bold truncate mt-1">{alert.desc}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-accent-peach/20 rounded-full flex items-center justify-center text-accent-brown/30 group-hover:bg-brand group-hover:text-white transition-all">
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-20 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-accent-brown/10 backdrop-blur-md"
                        >
                            <Bell className="w-12 h-12 text-accent-brown/10 mx-auto mb-4" />
                            <p className="text-sm font-black text-accent-brown/30 uppercase tracking-[0.2em]">Everything is up to date</p>
                            <p className="text-[10px] font-bold text-accent-brown/20 uppercase tracking-widest mt-2">No active system alerts for your sector.</p>
                        </motion.div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {activeOrder ? (
                        <motion.div
                            key="active-tracking"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-[2px] bg-brand-dark" />
                                    <h3 className="font-black text-accent-brown uppercase tracking-[0.4em] text-[10px]">Logistics Manifest</h3>
                                </div>
                                <button
                                    onClick={() => fetchData()}
                                    className="p-3 bg-white rounded-2xl shadow-sm border border-accent-brown/5 text-accent-brown/40 hover:text-accent-brown transition-all"
                                >
                                    <Loader2 size={16} className={isUpdatingStatus ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Map Interface - Tactical HUD */}
                                <div className="lg:col-span-8 bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-accent-brown/5 min-h-[550px] relative group/map">
                                    <APIProvider apiKey={MAPS_API_KEY} libraries={['marker', 'places']}>
                                        <Map
                                            mapId={MAP_ID}
                                            center={riderLocation ? { lat: Number(riderLocation.lat), lng: Number(riderLocation.lng) } : (activeOrder?.clinic ? { lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) } : { lat: 14.5995, lng: 120.9842 })}
                                            defaultZoom={15}
                                            className="w-full h-full grayscale-[0.2] contrast-[1.1]"
                                            disableDefaultUI={true}
                                            gestureHandling="greedy"
                                        >
                                        {/* Rider - Moving Asset */}
                                        {riderLocation && (
                                            <AdvancedMarker position={{ lat: Number(riderLocation.lat), lng: Number(riderLocation.lng) }}>
                                                <div className="bg-brand-dark text-white p-3 rounded-2xl shadow-2xl border-2 border-white scale-110 animate-bounce">
                                                    <Bike size={20} />
                                                </div>
                                            </AdvancedMarker>
                                        )}

                                        {/* Pickup - Extraction Point */}
                                        {activeOrder.clinic && activeOrder.clinic.lat && (
                                            <>
                                                <AdvancedMarker
                                                    position={{ lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) }}
                                                    title={activeOrder.clinic.name}
                                                    onClick={() => setSelectedMarker('clinic')}
                                                >
                                                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                                                        <div className={`p-3 rounded-2xl shadow-2xl border-2 border-white transition-all group-hover:scale-125 ${activeOrder.status === 'Processing' ? 'bg-brand-dark ring-4 ring-brand-dark/10' : 'bg-gray-400 opacity-50'}`}>
                                                            <Store size={22} className="text-white" />
                                                        </div>
                                                        {activeOrder.status === 'Processing' && (
                                                            <div className="bg-brand-dark text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                                                Extraction Point
                                                            </div>
                                                        )}
                                                    </div>
                                                </AdvancedMarker>

                                                {selectedMarker === 'clinic' && (
                                                    <InfoWindow
                                                        position={{ lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) }}
                                                        onCloseClick={() => setSelectedMarker(null)}
                                                    >
                                                        <div className="p-4 min-w-[220px] text-left space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-brand-dark text-white rounded-xl flex items-center justify-center">
                                                                    <Store size={18} />
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-black text-xs uppercase tracking-tight text-accent-brown leading-none mb-1">{activeOrder.clinic.name}</h5>
                                                                    <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">Clinic Outlet</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-accent-brown/60 font-medium leading-relaxed">
                                                                {activeOrder.clinic.address}
                                                            </p>
                                                            <button
                                                                onClick={() => {
                                                                    const dest = `${activeOrder.clinic.lat},${activeOrder.clinic.lng}`;
                                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                                                                }}
                                                                className="w-full bg-brand-dark text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-all"
                                                            >
                                                                <NavIcon size={12} /> Get Route
                                                            </button>
                                                        </div>
                                                    </InfoWindow>
                                                )}
                                            </>
                                        )}

                                        {/* Dropoff - Target Destination */}
                                        {activeOrder.delivery_lat && (
                                            <>
                                                <AdvancedMarker
                                                    position={{ lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) }}
                                                    onClick={() => setSelectedMarker('customer')}
                                                >
                                                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                                                        <div className={`p-3 rounded-2xl shadow-2xl border-2 border-white transition-all group-hover:scale-125 ${activeOrder.status === 'Picked Up' ? 'bg-orange-600 ring-4 ring-orange-600/10' : 'bg-gray-400 opacity-50'}`}>
                                                            <Package size={22} className="text-white" />
                                                        </div>
                                                        {activeOrder.status === 'Picked Up' && (
                                                            <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                                                Destination
                                                            </div>
                                                        )}
                                                    </div>
                                                </AdvancedMarker>

                                                {selectedMarker === 'customer' && (
                                                    <InfoWindow
                                                        position={{ lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) }}
                                                        onCloseClick={() => setSelectedMarker(null)}
                                                    >
                                                        <div className="p-4 min-w-[220px] text-left space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center">
                                                                    <MapPin size={18} />
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-black text-xs uppercase tracking-tight text-accent-brown leading-none mb-1">Customer</h5>
                                                                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Target delivery</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-accent-brown/60 font-medium leading-relaxed">
                                                                {activeOrder.delivery_address}
                                                            </p>
                                                            <button
                                                                onClick={() => {
                                                                    const dest = `${activeOrder.delivery_lat},${activeOrder.delivery_lng}`;
                                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                                                                }}
                                                                className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-orange-700 transition-all"
                                                            >
                                                                <NavIcon size={12} /> Get Route
                                                            </button>
                                                        </div>
                                                    </InfoWindow>
                                                )}
                                            </>
                                        )}
                                    </Map>

                                    {/* Map HUD Overlays */}
                                    <div className="absolute top-6 left-6 right-6 pointer-events-none">
                                        <div className="inline-flex items-center gap-3 bg-brand-dark text-white p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md">
                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Tactical Hub System Live</p>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-10 left-10 right-10 flex flex-col sm:flex-row items-center gap-4">
                                        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white flex items-center gap-6 flex-1">
                                            <div className="w-14 h-14 bg-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown shrink-0">
                                                <NavIcon size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-brown/30 mb-1">Navigation objective</p>
                                                <p className="text-base font-black text-accent-brown leading-tight truncate">
                                                    {activeOrder.status === 'Processing'
                                                        ? `Extraction from ${activeOrder.clinic.name}`
                                                        : `Zero-in on ${activeOrder.delivery_address.split(',')[0]}`}
                                                </p>
                                                <p className="text-[10px] text-accent-brown/40 font-bold truncate mt-1">
                                                    {activeOrder.status === 'Processing' ? activeOrder.clinic.address : activeOrder.delivery_address}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const dest = activeOrder.status === 'Processing'
                                                    ? `${activeOrder.clinic.lat},${activeOrder.clinic.lng}`
                                                    : `${activeOrder.delivery_lat},${activeOrder.delivery_lng}`;
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                                            }}
                                            className="bg-brand-dark text-white h-[84px] px-8 rounded-3xl shadow-2xl shadow-brand-dark/20 border-2 border-brand-dark/50 flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] whitespace-nowrap hover:bg-black transition-all group"
                                        >
                                            Initiate Navigation
                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </APIProvider>
                            </div>

                                {/* Logistics Sidebar - Manifest Data */}
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-accent-brown/5 relative overflow-hidden group/card">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-peach/20 rounded-full -mr-16 -mt-16 group-hover/card:bg-accent-peach/30 transition-colors" />
                                        
                                        <div className="relative z-10 space-y-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 bg-brand-dark text-white rounded-[1.5rem] flex items-center justify-center shadow-xl">
                                                    <Package size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-accent-brown tracking-tighter uppercase leading-none">Job #{activeOrder?.id?.toString().slice(-4) || '0000'}</h4>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-brand-dark" />
                                                        <p className="text-[10px] font-black text-accent-brown uppercase tracking-widest">{activeOrder.status}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8 py-2 border-l-2 border-dashed border-accent-brown/10 ml-8 pl-8">
                                                <div className="relative">
                                                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-brand-dark border-4 border-white shadow-md" />
                                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1.5">Origin Protocol</p>
                                                    <p className="text-sm font-black text-accent-brown leading-tight">{activeOrder.clinic?.name || 'Hi-Vet Site'}</p>
                                                    <p className="text-[11px] text-accent-brown/50 font-bold mt-1 leading-snug">{activeOrder.clinic?.address}</p>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-brand-dark border-4 border-white shadow-md" />
                                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1.5">Delivery Target</p>
                                                    <p className="text-sm font-black text-accent-brown leading-tight">Customer Drop-off</p>
                                                    <p className="text-[11px] text-accent-brown/50 font-bold mt-1 leading-snug">{activeOrder.delivery_address}</p>
                                                </div>
                                            </div>

                                            <div className="bg-[#FAF9F6] rounded-3xl p-6 border border-accent-brown/5">
                                                <p className="text-[9px] font-black text-accent-brown/40 uppercase tracking-[0.2em] mb-4">Inventory Breakdown</p>
                                                <div className="space-y-3">
                                                    {(activeOrder.items || []).map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs font-black text-accent-brown">
                                                            <span className="opacity-70">{item.name}</span>
                                                            <span className="bg-accent-brown/5 px-3 py-1 rounded-lg text-accent-brown">× {item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 pt-4">
                                                {activeOrder.status === 'Processing' ? (
                                                    <button
                                                        onClick={() => updateOrderStatus(activeOrder.id, 'Picked Up')}
                                                        className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-brand-dark/20 flex items-center justify-center gap-3 hover:bg-black"
                                                    >
                                                        Confirm Collection
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateOrderStatus(activeOrder.id, 'Delivered')}
                                                        className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-brand-dark/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95"
                                                    >
                                                        Finalize Drop-off
                                                        <Package size={18} />
                                                    </button>
                                                )}
                                                
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const phone = activeOrder.contact_phone || '09123456789';
                                                            window.open(`tel:${phone}`, '_self');
                                                        }}
                                                        className="flex-1 p-5 bg-white border border-accent-brown/10 text-accent-brown rounded-2xl transition-all flex items-center justify-center hover:bg-accent-brown hover:text-white"
                                                        title="Call Support/Customer"
                                                    >
                                                        <Phone size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateOrderStatus(activeOrder.id, activeOrder.status === 'Processing' ? 'Pending' : 'Processing')}
                                                        className="flex-1 p-5 bg-red-50 text-red-500 rounded-2xl transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                                                        title="Rollback Status"
                                                    >
                                                        <ArrowLeft size={20} />
                                                    </button>
                                                </div>
                                            </div>
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
                            className="space-y-12 text-left"
                        >
                            {/* Architectural Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                                {[
                                    {
                                        label: "Session Revenue",
                                        value: `₱${earnings.today_earnings}`,
                                        icon: DollarSign,
                                        color: "bg-white",
                                        accent: "Financial Pulse",
                                        desc: "Real-time earnings for current operational block."
                                    },
                                    {
                                        label: "Field Success",
                                        value: earnings?.completed_orders ?? 0,
                                        icon: Package,
                                        color: "bg-brand-dark text-white",
                                        accent: "Logistical Peak",
                                        desc: "Verified drops within the Hi-Vet courier network."
                                    },
                                    {
                                        label: "Lifetime Asset",
                                        value: `₱${earnings?.total_earnings ?? 0}`,
                                        icon: Wallet,
                                        color: "bg-white",
                                        accent: "Fleet Treasury",
                                        desc: "Cumulative compensation including 100% tip retention."
                                    }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`p-10 rounded-[3rem] border border-accent-brown/5 flex flex-col min-h-[300px] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden ${stat.color}`}
                                    >
                                        <div className="relative z-10 h-full flex flex-col">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:rotate-6 ${stat.color.includes('bg-white') ? 'bg-accent-peach/30 border-accent-brown/10 text-accent-brown' : 'bg-white/10 border-white/20 text-white'}`}>
                                                    <stat.icon size={22} />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${stat.color.includes('bg-white') ? 'text-accent-brown' : 'text-white'}`}>
                                                    {stat.accent}
                                                </span>
                                            </div>
                                            <div className="mt-auto">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${stat.color.includes('bg-white') ? 'text-accent-brown/30' : 'text-white/40'}`}>
                                                    {stat.label}
                                                </p>
                                                <h3 className={`text-4xl lg:text-5xl font-black mb-4 tracking-tighter uppercase leading-none ${stat.color.includes('bg-white') ? 'text-accent-brown' : 'text-white'}`}>
                                                    {stat.value}
                                                </h3>
                                                <p className={`text-[11px] font-bold leading-relaxed ${stat.color.includes('bg-white') ? 'text-accent-brown/40' : 'text-white/60'}`}>
                                                    {stat.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Logistics Dispatch - Opportunity Grid */}
                            <div className="space-y-8">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-[2px] bg-brand" />
                                            <h3 className="font-black text-brand uppercase tracking-[0.4em] text-[10px]">Logistics Dispatch</h3>
                                        </div>
                                        <h4 className="text-3xl font-black text-accent-brown tracking-tighter uppercase">Operational Opportunities</h4>
                                    </div>
                                    <div className="bg-brand-dark text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                        {availableOrders.length} Potential Loads
                                    </div>
                                </div>

                                {!isOnline ? (
                                    <div className="bg-white/40 backdrop-blur-md rounded-[4rem] py-32 border-2 border-dashed border-accent-brown/10 flex flex-col items-center justify-center text-center px-6">
                                        <div className="w-24 h-24 bg-accent-peach/20 rounded-full flex items-center justify-center mb-8">
                                            <AlertCircle className="w-12 h-12 text-accent-brown/10" />
                                        </div>
                                        <h4 className="text-2xl font-black text-accent-brown mb-3 tracking-tighter uppercase">Status Suspension</h4>
                                        <p className="text-base text-accent-brown/40 font-medium max-w-sm leading-relaxed italic">
                                            "A courier's potential is matched by their availability. Suspend fleet mode to view real-time logistical opportunities."
                                        </p>
                                    </div>
                                ) : availableOrders.length === 0 ? (
                                    <div className="bg-white rounded-[4.5rem] py-32 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                        <div className="w-24 h-24 bg-accent-peach/5 rounded-full flex items-center justify-center mb-8 animate-pulse">
                                            <Package className="w-12 h-12 text-accent-brown/20" />
                                        </div>
                                        <h4 className="text-2xl font-black text-accent-brown mb-3 tracking-tighter uppercase">Silent Network</h4>
                                        <p className="text-base text-accent-brown/40 font-medium max-w-sm leading-relaxed italic">
                                            "Our logistics core is scanning for high-priority drops. Stay calibrated, the network moves quickly."
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {availableOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((order) => (
                                                <motion.div
                                                    key={order.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    whileHover={{ y: -8 }}
                                                    className="bg-white rounded-[3rem] p-10 border border-accent-brown/5 shadow-xl shadow-accent-brown/5 hover:border-accent-brown/30 transition-all cursor-pointer group/order"
                                                >
                                                    <div className="flex justify-between items-start mb-10">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-16 h-16 bg-accent-peach/20 group-hover/order:bg-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown group-hover/order:text-accent-brown transition-colors">
                                                                <Package size={28} />
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Logistics ID</span>
                                                                <p className="font-black text-2xl text-accent-brown tracking-tighter mt-1">#HY-{order?.id?.toString().slice(-4) || '0000'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 block mb-1">Fee</span>
                                                            <div className="text-2xl font-black text-accent-brown tracking-tighter">
                                                                ₱{order.total_amount}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-8 mb-10 p-8 bg-[#FAF9F6] rounded-[2.5rem] border border-accent-brown/5 relative">
                                                        <div className="space-y-5">
                                                            <div className="relative pl-8">
                                                                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-accent-brown border-2 border-white shadow-sm" />
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Pickup Hub</p>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Vicinity</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-sm font-black text-accent-brown truncate max-w-[150px] uppercase tracking-tight">{order.clinic_name || 'Hi-Vet Hub'}</p>
                                                                    <div className="flex items-center gap-1 text-accent-brown font-black text-[10px]">
                                                                        <NavIcon size={12} /> 0.5 KM
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="h-[2px] bg-accent-brown/5 w-full" />

                                                            <div className="relative pl-8">
                                                                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-accent-brown border-2 border-white shadow-sm" />
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Drop-off Target</p>
                                                                <p className="text-sm font-black text-accent-brown truncate" title={order.delivery_address}>{order.delivery_address || 'Customer Point'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            acceptOrder(order.id);
                                                        }}
                                                        className="w-full bg-brand-dark text-white h-20 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all group/btn"
                                                    >
                                                        Accept Manifest
                                                        <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Pagination Controls */}
                                        {availableOrders.length > ITEMS_PER_PAGE && (
                                            <div className="flex items-center justify-center gap-4 pt-10 border-t border-accent-brown/5">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="w-14 h-14 bg-white border border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    <ArrowLeft size={20} />
                                                </button>
                                                
                                                <div className="flex items-center gap-3">
                                                    {Array.from({ length: Math.ceil(availableOrders.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentPage(i + 1)}
                                                            className={`w-14 h-14 rounded-2xl text-xs font-black transition-all ${
                                                                currentPage === i + 1 
                                                                ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20 scale-110' 
                                                                : 'bg-white text-accent-brown hover:text-brand-dark hover:border-brand-dark/20 border border-accent-brown/5'
                                                            }`}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(availableOrders.length / ITEMS_PER_PAGE), prev + 1))}
                                                    disabled={currentPage === Math.ceil(availableOrders.length / ITEMS_PER_PAGE)}
                                                    className="w-14 h-14 bg-white border border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    <ArrowRight size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            <RiderBottomNav />
        </DashboardLayout>
    );
};

export default RiderDashboard;
