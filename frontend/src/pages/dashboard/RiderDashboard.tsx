import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bike, DollarSign, Package,
    Navigation as NavIcon,
    AlertCircle, Power,
    MapPin, Phone, CheckCircle2, Loader2,
    Store, X, Check, Wallet, ArrowLeft, ArrowRight, ShieldCheck,
    MessageSquare, MessageCircle
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
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

const CommModal = ({ isOpen, phone, name, onClose }: { isOpen: boolean, phone: string, name: string, onClose: () => void }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[3rem] p-8 w-[90%] max-w-sm shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-accent-brown uppercase tracking-widest">Contact {name}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                    </div>
                    <div className="space-y-3">
                        <a href={`tel:${phone}`} className="flex items-center gap-4 p-4 bg-brand-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                            <Phone size={20} /> Call Directly
                        </a>
                        <a href={`sms:${phone}`} className="flex items-center gap-4 p-4 bg-gray-100 text-accent-brown rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all">
                            <MessageCircle size={20} /> Send SMS
                        </a>
                        <a href={`https://wa.me/${phone.replace(/^0/, '63')}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all">
                            <MessageSquare size={20} /> WhatsApp
                        </a>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);

// Sub-component for Directions
const Directions = ({ origin, destination, onRouteUpdate }: { 
    origin: google.maps.LatLngLiteral, 
    destination: google.maps.LatLngLiteral,
    onRouteUpdate: (dist: string, dur: string) => void 
}) => {
    const map = useMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ 
            map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#FB8500",
                strokeOpacity: 0.8,
                strokeWeight: 6
            }
        }));
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer) return;

        directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        }).then(response => {
            directionsRenderer.setDirections(response);
            const route = response.routes[0].legs[0];
            onRouteUpdate(route.distance?.text || '0 km', route.duration?.text || '0 min');
        }).catch(err => console.error("Directions error:", err));

        return () => directionsRenderer.setDirections({ routes: [] } as any);
    }, [directionsService, directionsRenderer, origin, destination]);

    return null;
};

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
    const [pinModal, setPinModal] = useState<{ isOpen: boolean; status: string; deliveryId: number | null }>({
        isOpen: false,
        status: '',
        deliveryId: null
    });
    const [commModal, setCommModal] = useState<{ isOpen: boolean, phone: string, name: string }>({ isOpen: false, phone: '', name: '' });
    const [pinValue, setPinValue] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<'clinic' | 'customer' | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [activeRoute, setActiveRoute] = useState<{ origin: google.maps.LatLngLiteral; dest: google.maps.LatLngLiteral } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = async () => {
        const token = localStorage.getItem('hivet_token');
        if (!token) return;

        try {
            const profRes = await fetch(`${API}/api/rider/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profRes.ok) {
                const profData = await profRes.json();
                setIsOnline(profData.is_online);
            }

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

            const taskRes = await fetch(`${API}/api/rider/available-tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (taskRes.ok) {
                const taskData = await taskRes.json();
                setAvailableOrders(taskData.tasks || []);
            }

            const activeRes = await fetch(`${API}/api/rider/active-order`, {
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
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, [isOnline]);

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
                    const token = localStorage.getItem('hivet_token');
                    fetch(`${API}/api/rider/location`, {
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

    const acceptOrder = async (deliveryId: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/tasks/${deliveryId}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Manifest accepted toast removed as per user request
                fetchData();
            } else {
                const err = await res.json();
                showToast(err.detail || "Failed to accept task.", "error");
            }
        } catch (err) {
            showToast("Network error.", "error");
        }
    };

    const handlePinSubmit = async () => {
        const idToUpdate = pinModal.deliveryId || activeOrder?.delivery_id || activeOrder?.id;
        if (!idToUpdate || !pinValue) {
            showToast("Critical: Mission data missing. Please refresh.", "error");
            return;
        }
        setIsUpdatingStatus(true);
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/deliveries/${idToUpdate}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    new_status: pinModal.status,
                    pin: pinValue
                })
            });

            if (res.ok) {
                // Logistics updated toast removed as per user request
                setPinModal({ isOpen: false, status: '', deliveryId: null });
                setPinValue('');
                fetchData();
            } else {
                const err = await res.json();
                showToast(err.detail || "Invalid Serial Number. Check the product packaging.", "error");
            }
        } catch (err) {
            showToast("Network error.", "error");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const updateOrderStatus = async (deliveryId: number, status: string) => {
        if (status === 'Picked Up') {
            setPinModal({ isOpen: true, status, deliveryId });
            return;
        }

        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`${API}/api/rider/deliveries/${deliveryId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_status: status })
            });
            if (res.ok) {
                // Success toast removed as per user request
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
            <CommModal {...commModal} onClose={() => setCommModal({ ...commModal, isOpen: false })} />
            <div className="space-y-6 pb-32">

                {/* ── STATUS HEADER BAR ── */}
                <div className={`rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-sm transition-all duration-500 ${isOnline ? 'bg-brand-dark' : 'bg-accent-brown/10'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isOnline ? 'text-white/40' : 'text-accent-brown/40'}`}>Fleet Operations</p>
                            <h2 className={`text-lg font-black tracking-tighter uppercase leading-none ${isOnline ? 'text-white' : 'text-accent-brown'}`}>
                                {isOnline ? 'Ready for Dispatch' : 'System Standby'}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={toggleStatus}
                        disabled={isUpdatingStatus}
                        className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap ${
                            isOnline
                            ? 'bg-white text-brand-dark hover:bg-red-50 hover:text-red-600'
                            : 'bg-brand text-white hover:bg-brand-dark'
                        }`}
                    >
                        <Power className="w-4 h-4" />
                        {isOnline ? 'Terminate Duty' : 'Go Active Now'}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeOrder ? (
                        <motion.div
                            key="active-tracking"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="space-y-4"
                        >
                            {/* ── ACTIVE ORDER HEADER ── */}
                            <div className="bg-white rounded-2xl px-6 py-4 border border-accent-brown/5 shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-brand-dark rounded-xl flex items-center justify-center shadow-md shrink-0">
                                        <Package size={22} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">Logistics Manifest</p>
                                        <h3 className="text-lg font-black text-accent-brown tracking-tighter uppercase leading-none">
                                            {activeOrder.primary_serial_number || `Job #${activeOrder?.id?.toString().slice(-4)}`}
                                        </h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${activeOrder.status === 'Processing' ? 'bg-brand-dark text-white' : 'bg-orange-100 text-orange-600'}`}>
                                        {activeOrder.status}
                                    </span>
                                    <button onClick={() => fetchData()} className="p-2.5 bg-accent-peach/10 rounded-xl text-accent-brown/40 hover:text-accent-brown transition-all">
                                        <Loader2 size={16} className={isUpdatingStatus ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>

                            {/* ── MAP (full width) ── */}
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-accent-brown/5 h-[400px] relative">
                                <APIProvider apiKey={MAPS_API_KEY} libraries={['marker', 'places']}>
                                    <Map
                                        mapId={MAP_ID}
                                        defaultCenter={riderLocation ? { lat: Number(riderLocation.lat), lng: Number(riderLocation.lng) } : (activeOrder?.clinic ? { lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) } : { lat: 14.5995, lng: 120.9842 })}
                                        defaultZoom={15}
                                        className="w-full h-full grayscale-[0.15] contrast-[1.1]"
                                        disableDefaultUI={true}
                                        gestureHandling="greedy"
                                    >
                                        {riderLocation && (
                                            <AdvancedMarker position={{ lat: Number(riderLocation.lat), lng: Number(riderLocation.lng) }}>
                                                <div className="bg-brand-dark text-white p-3 rounded-2xl shadow-2xl border-2 border-white scale-110 animate-bounce">
                                                    <Bike size={20} />
                                                </div>
                                            </AdvancedMarker>
                                        )}
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
                                                            <p className="text-[10px] text-accent-brown/60 font-medium leading-relaxed">{activeOrder.clinic.address}</p>
                                                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.1em]">Clinic Number: {activeOrder.clinic.phone || 'N/A'}</p>
                                                            <button
                                                                onClick={() => {
                                                                    if (activeRoute?.dest.lat === Number(activeOrder.clinic.lat)) { setActiveRoute(null); setRouteInfo(null); return; }
                                                                    if (riderLocation) { setActiveRoute({ origin: riderLocation, dest: { lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) } }); }
                                                                }}
                                                                className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${activeRoute?.dest.lat === Number(activeOrder.clinic.lat) ? 'bg-accent-brown text-white' : 'bg-brand-dark text-white hover:bg-black'}`}
                                                            >
                                                                {activeRoute?.dest.lat === Number(activeOrder.clinic.lat) ? <><X size={12} /> Hide Directions</> : <><NavIcon size={12} /> Get Route</>}
                                                            </button>
                                                        </div>
                                                    </InfoWindow>
                                                )}
                                            </>
                                        )}
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
                                                            <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Destination</div>
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
                                                                <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center"><MapPin size={18} /></div>
                                                                <div>
                                                                    <h5 className="font-black text-xs uppercase tracking-tight text-accent-brown leading-none mb-1">{activeOrder.customer?.name || 'Customer'}</h5>
                                                                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Target delivery</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-accent-brown/60 font-medium leading-relaxed">{activeOrder.delivery_address}</p>
                                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.1em]">Contact: {activeOrder.customer?.phone || 'N/A'}</p>
                                                            <button
                                                                onClick={() => {
                                                                    if (activeRoute?.dest.lat === Number(activeOrder.delivery_lat)) { setActiveRoute(null); setRouteInfo(null); return; }
                                                                    const origin = { lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) };
                                                                    const dest = { lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) };
                                                                    setActiveRoute({ origin, dest });
                                                                }}
                                                                className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${activeRoute?.dest.lat === Number(activeOrder.delivery_lat) ? 'bg-accent-brown text-white' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'}`}
                                                            >
                                                                {activeRoute?.dest.lat === Number(activeOrder.delivery_lat) ? <><X size={12} /> Hide Directions</> : <><NavIcon size={12} /> Get Route</>}
                                                            </button>
                                                        </div>
                                                    </InfoWindow>
                                                )}
                                            </>
                                        )}
                                        {activeRoute && (
                                            <Directions
                                                origin={activeRoute.origin}
                                                destination={activeRoute.dest}
                                                onRouteUpdate={(distance, duration) => setRouteInfo({ distance, duration })}
                                            />
                                        )}
                                    </Map>

                                    {/* Map overlay: route info */}
                                    {routeInfo ? (
                                        <div className="absolute top-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
                                            <div className="inline-flex items-center gap-4 bg-brand-dark text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md pointer-events-auto">
                                                <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center"><NavIcon size={16} /></div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest leading-none mb-0.5">Route Metrics</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-black text-white tracking-tighter">{routeInfo.distance}</span>
                                                        <div className="w-1 h-1 rounded-full bg-white/30" />
                                                        <span className="text-xl font-black text-white">{routeInfo.duration}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => { setActiveRoute(null); setRouteInfo(null); }} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute top-4 left-4 pointer-events-none">
                                            <div className="inline-flex items-center gap-2 bg-brand-dark text-white px-4 py-2.5 rounded-xl shadow-xl border border-white/10 backdrop-blur-md">
                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-90">GPS Location ON</p>
                                            </div>
                                        </div>
                                    )}
                                </APIProvider>
                            </div>

                            {/* ── DELIVERY INFO + ACTIONS ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                {/* Route info */}
                                <div className="bg-white rounded-2xl p-6 border border-accent-brown/5 shadow-sm space-y-4">
                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.25em]">Route Summary</p>

                                    {/* Pickup */}
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 bg-brand-dark rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                            <Store size={14} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">Origin Protocol</p>
                                            <p className="text-sm font-black text-accent-brown leading-tight uppercase tracking-tight truncate">{activeOrder.clinic?.name || 'Hi-Vet Site'}</p>
                                            <p className="text-[11px] text-accent-brown/50 font-bold mt-0.5 leading-snug line-clamp-2">{activeOrder.clinic?.address}</p>
                                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mt-1 flex items-center gap-1">
                                                <Phone size={9} /> {activeOrder.clinic?.phone || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-l-2 border-dashed border-accent-brown/10 ml-4 h-5" />

                                    {/* Dropoff */}
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin size={14} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">Delivery Target</p>
                                            <p className="text-sm font-black text-accent-brown leading-tight uppercase tracking-tight">{activeOrder.customer?.name || 'Customer Drop-off'}</p>
                                            <p className="text-[11px] text-accent-brown/50 font-bold mt-0.5 leading-snug line-clamp-2">{activeOrder.delivery_address}</p>
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1 flex items-center gap-1">
                                                <Phone size={9} /> {activeOrder.customer?.phone || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items + Actions */}
                                <div className="bg-white rounded-2xl p-6 border border-accent-brown/5 shadow-sm flex flex-col gap-4">
                                    {/* Inventory */}
                                    <div>
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.25em] mb-3">Inventory Breakdown</p>
                                        <div className="space-y-3">
                                            {(activeOrder.items || []).map((item: any, idx: number) => (
                                                <div key={idx} className="flex gap-4 items-center bg-accent-peach/5 rounded-2xl px-5 py-4 border border-accent-brown/5 group hover:bg-accent-peach/10 transition-all">
                                                    <div className="w-14 h-14 bg-white rounded-xl border border-accent-brown/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={20} className="text-accent-brown/20" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-accent-brown uppercase tracking-tight leading-none mb-1.5 truncate">{item.name}</p>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">Quantity: {item.quantity}</p>
                                                            <div className="w-1 h-1 rounded-full bg-accent-brown/10" />
                                                            <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">Verified</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="space-y-3 mt-auto">
                                        {activeOrder.status === 'Processing' ? (
                                            <button
                                                onClick={() => updateOrderStatus(activeOrder.delivery_id || activeOrder.id, 'Picked Up')}
                                                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 hover:bg-black active:scale-95"
                                            >
                                                <CheckCircle2 size={18} />
                                                Confirm Collection (PIN Required)
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateOrderStatus(activeOrder.delivery_id || activeOrder.id, 'Delivered')}
                                                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 hover:bg-black active:scale-95"
                                            >
                                                <Package size={18} />
                                                Finalize Drop-off
                                            </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    const phone = activeOrder.contact_phone || '09123456789';
                                                    const name = activeOrder.status === 'Processing' ? (activeOrder.clinic?.name || 'Clinic') : 'Customer';
                                                    setCommModal({ isOpen: true, phone, name });
                                                }}
                                                className="flex items-center justify-center gap-2 py-4 bg-accent-peach/20 text-accent-brown rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-accent-brown hover:text-white transition-all"
                                                title="Communications Hub"
                                            >
                                                <MessageSquare size={16} /> Contact
                                            </button>
                                            <button
                                                onClick={() => updateOrderStatus(
                                                    activeOrder.delivery_id || activeOrder.id,
                                                    activeOrder.status === 'Processing' ? 'release' : 'pending_pickup'
                                                )}
                                                className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                title={activeOrder.status === 'Processing' ? 'Release Task — Return to Available Pool' : 'Undo Pickup — Roll back to Pending Pickup'}
                                            >
                                                <ArrowLeft size={16} /> Go Back
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="available-view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="space-y-6"
                        >
                            {/* ── EARNINGS ROW ── */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: "Session Revenue", value: `₱${earnings.today_earnings}`, icon: DollarSign, accent: "Financial Pulse", desc: "Real-time earnings for current operational block." },
                                    { label: "Field Success", value: earnings?.completed_orders ?? 0, icon: Package, accent: "Logistical Peak", desc: "Verified drops within the Hi-Vet courier network.", dark: true },
                                    { label: "Lifetime Asset", value: `₱${earnings?.total_earnings ?? 0}`, icon: Wallet, accent: "Fleet Treasury", desc: "Cumulative compensation including 100% tip retention." },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className={`rounded-2xl p-6 border border-accent-brown/5 shadow-sm flex flex-col gap-3 ${stat.dark ? 'bg-brand-dark text-white' : 'bg-white'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.dark ? 'bg-white/10 text-white' : 'bg-accent-peach/30 text-accent-brown'}`}>
                                            <stat.icon size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${stat.dark ? 'text-white/40' : 'text-accent-brown/30'}`}>{stat.label}</p>
                                            <h3 className={`text-2xl font-black tracking-tighter leading-none ${stat.dark ? 'text-white' : 'text-accent-brown'}`}>{stat.value}</h3>
                                        </div>
                                        <p className={`text-[10px] font-bold leading-relaxed ${stat.dark ? 'text-white/40' : 'text-accent-brown/40'}`}>{stat.desc}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* ── AVAILABLE ORDERS ── */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <div>
                                        <p className="text-[10px] font-black text-brand uppercase tracking-[0.4em]">Logistics Dispatch</p>
                                        <h4 className="text-xl font-black text-accent-brown tracking-tighter uppercase">Operational Opportunities</h4>
                                    </div>
                                    <div className="bg-brand-dark text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        {availableOrders.length} Potential Loads
                                    </div>
                                </div>

                                {!isOnline ? (
                                    <div className="bg-white rounded-2xl py-16 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                        <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mb-5">
                                            <AlertCircle className="w-8 h-8 text-accent-brown/20" />
                                        </div>
                                        <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tighter uppercase">Status Suspension</h4>
                                        <p className="text-sm text-accent-brown/40 font-medium max-w-sm leading-relaxed italic">
                                            "A courier's potential is matched by their availability. Suspend fleet mode to view real-time logistical opportunities."
                                        </p>
                                    </div>
                                ) : availableOrders.length === 0 ? (
                                    <div className="bg-white rounded-2xl py-16 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                        <div className="w-16 h-16 bg-accent-peach/10 rounded-full flex items-center justify-center mb-5 animate-pulse">
                                            <Package className="w-8 h-8 text-accent-brown/20" />
                                        </div>
                                        <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tighter uppercase">Silent Network</h4>
                                        <p className="text-sm text-accent-brown/40 font-medium max-w-sm leading-relaxed italic">
                                            "Our logistics core is scanning for high-priority drops. Stay calibrated, the network moves quickly."
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((order) => (
                                                <motion.div
                                                    key={order.id}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-white rounded-2xl border border-accent-brown/5 shadow-sm overflow-hidden hover:border-accent-brown/20 hover:shadow-md transition-all flex flex-col"
                                                >
                                                    {/* Card Header */}
                                                    <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-accent-brown/5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0">
                                                                <Package size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Logistics ID</p>
                                                                <p className="font-black text-lg text-accent-brown tracking-tighter">#HY-{order?.id?.toString().slice(-4) || '0000'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mb-0.5">Fee</p>
                                                            <p className="text-xl font-black text-accent-brown tracking-tighter">₱{order.total_amount}</p>
                                                        </div>
                                                    </div>

                                                    {/* Content Area */}
                                                    <div className="px-6 py-5 space-y-5 flex-1">
                                                        {/* Job Manifest (Detailed products) */}
                                                        {order.items && order.items.length > 0 ? (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">Job Manifest</p>
                                                                    <p className="text-[9px] font-black text-accent-brown/20 uppercase tracking-widest">{order.items.length} Product{order.items.length > 1 ? 's' : ''}</p>
                                                                </div>
                                                                <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                                                                    {order.items.map((item: any, idx: number) => (
                                                                        <div key={idx} className="flex items-center gap-3 bg-accent-peach/5 rounded-xl p-2.5 border border-accent-brown/5 hover:bg-accent-peach/10 transition-colors">
                                                                            <div className="w-10 h-10 bg-white rounded-lg border border-accent-brown/5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-accent-brown/20">
                                                                                {item.image_url ? (
                                                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <Package size={14} />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[11px] font-black text-accent-brown leading-none truncate mb-1">{item.name}</p>
                                                                                <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest">Qty: {item.quantity}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100 italic">
                                                                <AlertCircle size={12} className="text-red-400" />
                                                                <p className="text-[10px] font-bold text-red-400/70">No items detected in manifest</p>
                                                            </div>
                                                        )}

                                                        {/* Route Info */}
                                                        <div className="space-y-4">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-2 h-2 rounded-full bg-brand-dark mt-1.5 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-brown/30 mb-1">Pickup Hub</p>
                                                                    <p className="text-sm font-black text-accent-brown truncate uppercase tracking-tight leading-none">{order.clinic_name || order.pickup_name || 'Hi-Vet Site'}</p>
                                                                    <p className="text-[10px] text-accent-brown/50 font-bold truncate mt-1">{order.pickup_address}</p>
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-1.5 text-accent-brown/50 text-[10px] font-black ml-auto bg-accent-peach/10 px-2 py-1 rounded-lg">
                                                                    <NavIcon size={10} /> {order.distance_km || '0.5'} KM
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="border-l-2 border-dashed border-accent-brown/10 ml-[3px] h-4" />
                                                            
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-brown/30 mb-1">Drop-off Target</p>
                                                                    <p className="text-sm font-black text-accent-brown truncate" title={order.delivery_address}>{order.delivery_address || 'Customer Point'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Accept Button area */}
                                                    <div className="px-6 pb-6">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); acceptOrder(order.delivery_id || order.id); }}
                                                            className="w-full bg-brand-dark text-white h-14 rounded-xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg hover:bg-black active:scale-95 transition-all group/btn"
                                                        >
                                                            Confirm Delivery Job
                                                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {availableOrders.length > ITEMS_PER_PAGE && (
                                            <div className="flex items-center justify-center gap-3 pt-4">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="w-10 h-10 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    <ArrowLeft size={16} />
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    {Array.from({ length: Math.ceil(availableOrders.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentPage(i + 1)}
                                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-brand-dark text-white shadow-md scale-105' : 'bg-white text-accent-brown border border-accent-brown/5 hover:text-brand-dark'}`}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(availableOrders.length / ITEMS_PER_PAGE), prev + 1))}
                                                    disabled={currentPage === Math.ceil(availableOrders.length / ITEMS_PER_PAGE)}
                                                    className="w-10 h-10 bg-white border border-accent-brown/10 rounded-xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    <ArrowRight size={16} />
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

            {/* PIN AUTHORIZATION MODAL */}
            <AnimatePresence>
                {pinModal.isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                            
                            <div className="w-20 h-20 bg-brand-dark/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-brand-dark">
                                <ShieldCheck className="w-10 h-10" />
                            </div>

                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter mb-4 uppercase">
                                Collection Verification
                            </h3>
                            <p className="text-sm font-medium text-accent-brown/50 leading-relaxed mb-8">
                                Please enter the **Serial Number** located on the product packaging to verify this extraction.
                            </p>

                            <div className="flex justify-center gap-3 mb-10">
                                <input
                                    type="text"
                                    value={pinValue}
                                    onChange={(e) => setPinValue(e.target.value)}
                                    autoFocus
                                    className="w-full h-20 bg-[#FAF9F6] border-2 border-accent-brown/5 focus:border-brand-dark rounded-2xl text-center text-2xl font-black tracking-widest outline-none transition-all uppercase px-4"
                                    placeholder="HV-SN-..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setPinModal({ isOpen: false, status: '', deliveryId: null });
                                        setPinValue('');
                                    }}
                                    className="py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-accent-brown/40 hover:text-accent-brown transition-colors"
                                >
                                    Abort Operation
                                </button>
                                <button
                                    onClick={handlePinSubmit}
                                    disabled={pinValue.length < 3 || isUpdatingStatus}
                                    className="py-5 bg-brand-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
                                >
                                    {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Sync'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* COMMUNICATIONS HUB MODAL */}
            <AnimatePresence>
                {commModal.isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
                        onClick={() => setCommModal({ ...commModal, isOpen: false })}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-brand-dark/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-dark">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-accent-brown uppercase tracking-tighter">Communications Hub</h3>
                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Contact: {commModal.name}</p>
                            </div>

                            <div className="space-y-3">
                                <button 
                                    onClick={() => window.open(`tel:${commModal.phone}`, '_self')}
                                    className="w-full flex items-center gap-4 p-5 bg-brand-dark text-white rounded-2xl hover:bg-black transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Phone size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none mb-1">Voice Protocol</p>
                                        <p className="text-sm font-black uppercase">Direct Audio Call</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => window.open(`sms:${commModal.phone}`, '_self')}
                                    className="w-full flex items-center gap-4 p-5 bg-white border-2 border-accent-brown/5 text-accent-brown rounded-2xl hover:border-brand-dark transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-accent-brown/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 leading-none mb-1">Text Protocol</p>
                                        <p className="text-sm font-black uppercase">Standard SMS Message</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => window.open(`https://wa.me/${commModal.phone.replace(/^0/, '63')}`, '_blank')}
                                    className="w-full flex items-center gap-4 p-5 bg-green-50 text-green-700 rounded-2xl hover:bg-green-100 transition-all group border border-green-100"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <MessageSquare size={18} className="text-green-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600/40 leading-none mb-1">Signal Protocol</p>
                                        <p className="text-sm font-black uppercase">WhatsApp Secure</p>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setCommModal({ ...commModal, isOpen: false })}
                                className="w-full mt-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/20 hover:text-accent-brown transition-colors"
                            >
                                Close Hub
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <RiderBottomNav />
        </DashboardLayout>
    );
};

export default RiderDashboard;
