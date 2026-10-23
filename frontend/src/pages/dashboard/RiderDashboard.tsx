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
import ConfirmPickupModal from '../../components/ConfirmPickupModal';
import AvailableDeliveryDetailsModal from '../../components/AvailableDeliveryDetailsModal';
import Pagination from '../../components/Pagination';
import { RIDER_TEXT } from '../../constants/riderWording';
import { formatRiderOrderId, formatRiderOrderIdForAria } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_ID || '4c730709b30c1be1';

const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-[200] px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-lg shadow-black/15 bg-slate-900/95 text-white border border-white/10 flex items-center gap-2.5 max-w-[92vw] sm:max-w-md backdrop-blur-md"
    >
        <div 
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`} 
            aria-hidden="true"
        >
            {type === 'success' ? <Check size={12} strokeWidth={2.5} /> : <AlertCircle size={12} strokeWidth={2.5} />}
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-100 leading-none truncate">
            {message}
        </p>
        <button 
            type="button"
            onClick={onClose} 
            aria-label="Dismiss notification"
            className="p-1 text-slate-400 hover:text-white rounded-full transition-colors ml-0.5 shrink-0"
        >
            <X size={13} />
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
    const ITEMS_PER_PAGE = 6;
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
    const [isAcceptingDelivery, setIsAcceptingDelivery] = useState(false);
    const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [pinModal, setPinModal] = useState<{ isOpen: boolean; status: string; deliveryId: number | null }>({
        isOpen: false,
        status: '',
        deliveryId: null
    });
    const [commModal, setCommModal] = useState<{ isOpen: boolean, phone: string, name: string }>({ isOpen: false, phone: '', name: '' });
    const [pinValue, setPinValue] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const pickupTriggerBtnRef = React.useRef<HTMLButtonElement | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<'clinic' | 'customer' | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [activeRoute, setActiveRoute] = useState<{ origin: google.maps.LatLngLiteral; dest: google.maps.LatLngLiteral } | null>(null);
    const [activeStatIndex, setActiveStatIndex] = useState(0);
    const statContainerRef = React.useRef<HTMLDivElement>(null);

    const handleStatScroll = () => {
        if (!statContainerRef.current) return;
        const { scrollLeft, clientWidth } = statContainerRef.current;
        if (clientWidth > 0) {
            const index = Math.round(scrollLeft / (clientWidth * 0.82));
            setActiveStatIndex(Math.min(Math.max(index, 0), 2));
        }
    };

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
                showToast(data.is_online ? "You are now online" : "You are now offline", "success");
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
        setIsAcceptingDelivery(true);
        try {
            const res = await fetch(`${API}/api/rider/tasks/${deliveryId}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Manifest accepted toast removed as per user request
                setSelectedDelivery(null);
                fetchData();
            } else {
                const err = await res.json();
                showToast(err.detail || "Failed to accept task.", "error");
            }
        } catch (err) {
            showToast("Network error.", "error");
        } finally {
            setIsAcceptingDelivery(false);
        }
    };

    const handlePinSubmit = async () => {
        const idToUpdate = pinModal.deliveryId || activeOrder?.delivery_id || activeOrder?.id;
        if (!idToUpdate || !pinValue.trim()) {
            setPinError("Please enter the serial number.");
            return;
        }
        setIsUpdatingStatus(true);
        setPinError(null);
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
                    pin: pinValue.trim()
                })
            });

            if (res.ok) {
                setPinModal({ isOpen: false, status: '', deliveryId: null });
                setPinValue('');
                setPinError(null);
                fetchData();
                pickupTriggerBtnRef.current?.focus();
            } else {
                const err = await res.json();
                const msg = err.detail || "Invalid Serial Number. Check the product packaging.";
                setPinError(msg);
                showToast(msg, "error");
            }
        } catch (err) {
            setPinError("Network error. Please try again.");
            showToast("Network error.", "error");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const updateOrderStatus = async (deliveryId: number, status: string) => {
        if (status === 'Picked Up') {
            setPinError(null);
            setPinValue('');
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
        <DashboardLayout title={RIDER_TEXT.dashboard.pageTitle}>
            <CommModal {...commModal} onClose={() => setCommModal({ ...commModal, isOpen: false })} />
            <AvailableDeliveryDetailsModal 
                order={selectedDelivery}
                isOpen={!!selectedDelivery}
                onClose={() => setSelectedDelivery(null)}
                onAccept={acceptOrder}
                isAccepting={isAcceptingDelivery}
            />
            <div className="space-y-5 sm:space-y-6 pb-28 sm:pb-24 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] max-w-[1140px] xl:max-w-[1200px] mx-auto w-full">

                {/* ── STATUS CARD ── */}
                <div
                    className={`rounded-[24px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5 shadow-sm transition-all duration-500 mb-4 sm:mb-6 ${
                        isOnline ? 'bg-brand-dark' : 'bg-accent-brown/10'
                    }`}
                >
                    <div className="flex flex-col min-w-0">
                        <h2
                            className={`text-2xl sm:text-[26px] md:text-[28px] font-black tracking-tight uppercase leading-tight ${
                                isOnline ? 'text-white' : 'text-accent-brown'
                            }`}
                        >
                            {isOnline ? RIDER_TEXT.dashboard.readyTitle : RIDER_TEXT.dashboard.offlineTitle}
                        </h2>
                    </div>
                    <button
                        onClick={toggleStatus}
                        disabled={isUpdatingStatus}
                        className={`w-full md:w-auto h-12 min-h-[48px] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2.5 shrink-0 ${
                            isOnline
                                ? 'bg-white text-brand-dark hover:bg-red-50 hover:text-red-600'
                                : 'bg-brand text-white hover:bg-brand-dark'
                        }`}
                    >
                        <Power className="w-4 h-4 shrink-0" />
                        <span>{isOnline ? RIDER_TEXT.dashboard.goOfflineBtn : RIDER_TEXT.dashboard.goOnlineBtn}</span>
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
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">{RIDER_TEXT.dashboard.activeDelivery.headerLabel}</p>
                                        <h3 className="text-lg font-black text-accent-brown tracking-tighter uppercase leading-none">
                                            {activeOrder.primary_serial_number || `Order #${activeOrder?.id?.toString().slice(-4)}`}
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
                                                                {RIDER_TEXT.dashboard.activeDelivery.pickupMarker}
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
                                                                    <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">{RIDER_TEXT.dashboard.activeDelivery.pickupMarker}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-accent-brown/60 font-medium leading-relaxed">{activeOrder.clinic.address}</p>
                                                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.1em]">{RIDER_TEXT.dashboard.activeDelivery.contactLabel}: {activeOrder.clinic.phone || 'N/A'}</p>
                                                            <button
                                                                onClick={() => {
                                                                    if (activeRoute?.dest.lat === Number(activeOrder.clinic.lat)) { setActiveRoute(null); setRouteInfo(null); return; }
                                                                    if (riderLocation) { setActiveRoute({ origin: riderLocation, dest: { lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) } }); }
                                                                }}
                                                                className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${activeRoute?.dest.lat === Number(activeOrder.clinic.lat) ? 'bg-accent-brown text-white' : 'bg-brand-dark text-white hover:bg-black'}`}
                                                            >
                                                                {activeRoute?.dest.lat === Number(activeOrder.clinic.lat) ? <><X size={12} /> {RIDER_TEXT.dashboard.activeDelivery.hideDirections}</> : <><NavIcon size={12} /> {RIDER_TEXT.dashboard.activeDelivery.getRoute}</>}
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
                                                            <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">{RIDER_TEXT.dashboard.activeDelivery.dropoffMarker}</div>
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
                                                                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{RIDER_TEXT.dashboard.activeDelivery.dropoffMarker}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-accent-brown/60 font-medium leading-relaxed">{activeOrder.delivery_address}</p>
                                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.1em]">{RIDER_TEXT.dashboard.activeDelivery.contactLabel}: {activeOrder.customer?.phone || 'N/A'}</p>
                                                            <button
                                                                onClick={() => {
                                                                    if (activeRoute?.dest.lat === Number(activeOrder.delivery_lat)) { setActiveRoute(null); setRouteInfo(null); return; }
                                                                    const origin = { lat: Number(activeOrder.clinic.lat), lng: Number(activeOrder.clinic.lng) };
                                                                    const dest = { lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) };
                                                                    setActiveRoute({ origin, dest });
                                                                }}
                                                                className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${activeRoute?.dest.lat === Number(activeOrder.delivery_lat) ? 'bg-accent-brown text-white' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'}`}
                                                            >
                                                                {activeRoute?.dest.lat === Number(activeOrder.delivery_lat) ? <><X size={12} /> {RIDER_TEXT.dashboard.activeDelivery.hideDirections}</> : <><NavIcon size={12} /> {RIDER_TEXT.dashboard.activeDelivery.getRoute}</>}
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
                                                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest leading-none mb-0.5">{RIDER_TEXT.dashboard.activeDelivery.travelInfo}</p>
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
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-90">{RIDER_TEXT.dashboard.activeDelivery.gpsConnected}</p>
                                            </div>
                                        </div>
                                    )}
                                </APIProvider>
                            </div>

                            {/* ── DELIVERY INFO + ACTIONS ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                {/* Route info */}
                                <div className="bg-white rounded-2xl p-6 border border-accent-brown/5 shadow-sm space-y-4">
                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.25em]">{RIDER_TEXT.dashboard.activeDelivery.routeSummaryTitle}</p>

                                    {/* Pickup */}
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 bg-brand-dark rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                            <Store size={14} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">{RIDER_TEXT.dashboard.activeDelivery.pickupHeader}</p>
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
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">{RIDER_TEXT.dashboard.activeDelivery.dropoffHeader}</p>
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
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.25em] mb-3">{RIDER_TEXT.dashboard.activeDelivery.itemsTitle}</p>
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
                                                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">{RIDER_TEXT.dashboard.activeDelivery.quantityLabel}: {item.quantity}</p>
                                                            <div className="w-1 h-1 rounded-full bg-accent-brown/10" />
                                                            <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">{RIDER_TEXT.dashboard.activeDelivery.checkedBadge}</p>
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
                                                ref={pickupTriggerBtnRef}
                                                onClick={() => updateOrderStatus(activeOrder.delivery_id || activeOrder.id, 'Picked Up')}
                                                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 hover:bg-black active:scale-95"
                                            >
                                                <CheckCircle2 size={18} />
                                                {RIDER_TEXT.dashboard.activeDelivery.confirmPickupBtn}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateOrderStatus(activeOrder.delivery_id || activeOrder.id, 'Delivered')}
                                                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 hover:bg-black active:scale-95"
                                            >
                                                <Package size={18} />
                                                {RIDER_TEXT.dashboard.activeDelivery.markDeliveredBtn}
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
                                                title={RIDER_TEXT.dashboard.activeDelivery.contactBtn}
                                            >
                                                <MessageSquare size={16} /> {RIDER_TEXT.dashboard.activeDelivery.contactBtn}
                                            </button>
                                            <button
                                                onClick={() => updateOrderStatus(
                                                    activeOrder.delivery_id || activeOrder.id,
                                                    activeOrder.status === 'Processing' ? 'release' : 'pending_pickup'
                                                )}
                                                className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                title={activeOrder.status === 'Processing' ? 'Cancel Delivery' : 'Undo Pickup'}
                                            >
                                                <ArrowLeft size={16} /> {RIDER_TEXT.dashboard.activeDelivery.cancelJobBtn}
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
                            {/* ── STAT CARDS (Swipeable horizontal snap on mobile, 3 equal columns on tablet/desktop) ── */}
                            <div className="space-y-2">
                                <div
                                    ref={statContainerRef}
                                    onScroll={handleStatScroll}
                                    className="flex sm:grid sm:grid-cols-3 gap-3.5 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2 sm:pb-0 no-scrollbar"
                                >
                                    {[
                                        { label: RIDER_TEXT.dashboard.stats.todayEarningsLabel, value: formatCurrency(earnings.today_earnings), icon: DollarSign, desc: RIDER_TEXT.dashboard.stats.todayEarningsDesc, dark: false },
                                        { label: RIDER_TEXT.dashboard.stats.completedOrdersLabel, value: `${(earnings?.completed_orders ?? 0).toLocaleString('en-PH')}`, icon: Package, desc: RIDER_TEXT.dashboard.stats.completedOrdersDesc, dark: true },
                                        { label: RIDER_TEXT.dashboard.stats.totalEarningsLabel, value: formatCurrency(earnings?.total_earnings ?? 0), icon: Wallet, desc: RIDER_TEXT.dashboard.stats.totalEarningsDesc, dark: false },
                                    ].map((stat, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            className={`w-[82%] min-w-[82%] sm:w-auto sm:min-w-0 snap-start shrink-0 rounded-[22px] p-5 border shadow-sm flex flex-col justify-between gap-3 transition-shadow ${
                                                stat.dark
                                                    ? 'bg-brand-dark text-white border-brand-dark/20'
                                                    : 'bg-white text-accent-brown border-accent-brown/5'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                        stat.dark ? 'bg-white/15 text-white' : 'bg-accent-peach/30 text-accent-brown'
                                                    }`}
                                                >
                                                    <stat.icon size={20} />
                                                </div>
                                            </div>
                                            <div className="space-y-1 my-auto">
                                                <p
                                                    className={`text-xs font-black uppercase tracking-wider leading-tight ${
                                                        stat.dark ? 'text-white/85' : 'text-accent-brown/60'
                                                    }`}
                                                >
                                                    {stat.label}
                                                </p>
                                                <h3
                                                    className={`text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight leading-none truncate tabular-nums ${
                                                        stat.dark ? 'text-white' : 'text-accent-brown'
                                                    }`}
                                                    title={stat.value}
                                                >
                                                    {stat.value}
                                                </h3>
                                            </div>
                                            <p
                                                className={`text-xs font-semibold leading-relaxed ${
                                                    stat.dark ? 'text-white/90' : 'text-accent-brown/75'
                                                }`}
                                            >
                                                {stat.desc}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Dots indicator for mobile pagination */}
                                <div className="flex sm:hidden items-center justify-center gap-2 pt-1 pb-0.5">
                                    {[0, 1, 2].map((idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                if (statContainerRef.current) {
                                                    const cardWidth = statContainerRef.current.clientWidth * 0.82;
                                                    statContainerRef.current.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
                                                    setActiveStatIndex(idx);
                                                }
                                            }}
                                            aria-label={`Go to stat card ${idx + 1} of 3`}
                                            className={`transition-all duration-300 rounded-full ${
                                                activeStatIndex === idx
                                                    ? 'w-6 h-2 bg-brand-dark'
                                                    : 'w-2 h-2 bg-accent-brown/20'
                                            }`}
                                        />
                                    ))}
                                    <span className="text-[11px] font-bold text-accent-brown/50 ml-1.5 tabular-nums">
                                        {activeStatIndex + 1} of 3
                                    </span>
                                </div>
                            </div>

                            {/* ── AVAILABLE ORDERS / DISPATCH SECTION ── */}
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-1">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-brand uppercase tracking-wider mb-0.5">{RIDER_TEXT.dashboard.availableSection.subHeader}</p>
                                        <h4 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight uppercase leading-snug">
                                            {RIDER_TEXT.dashboard.availableSection.mainHeader}
                                        </h4>
                                    </div>
                                    <div className="self-start sm:self-auto bg-brand-dark text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shrink-0">
                                        {RIDER_TEXT.dashboard.availableSection.waitingBadge(availableOrders.length)}
                                    </div>
                                </div>

                                {!isOnline ? (
                                    <div className="bg-white rounded-[24px] py-14 sm:py-16 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                        <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mb-5">
                                            <AlertCircle className="w-8 h-8 text-accent-brown/20" />
                                        </div>
                                        <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tight uppercase">{RIDER_TEXT.dashboard.availableSection.offlinePromptTitle}</h4>
                                        <p className="text-sm text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                                            {RIDER_TEXT.dashboard.availableSection.offlinePromptDesc}
                                        </p>
                                    </div>
                                ) : availableOrders.length === 0 ? (
                                    <div className="bg-white rounded-[24px] py-14 sm:py-16 border border-accent-brown/5 flex flex-col items-center justify-center text-center px-6 shadow-sm">
                                        <div className="w-16 h-16 bg-accent-peach/10 rounded-full flex items-center justify-center mb-5 animate-pulse">
                                            <Package className="w-8 h-8 text-accent-brown/20" />
                                        </div>
                                        <h4 className="text-xl font-black text-accent-brown mb-2 tracking-tight uppercase">{RIDER_TEXT.dashboard.availableSection.noOrdersTitle}</h4>
                                        <p className="text-sm text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                                            {RIDER_TEXT.dashboard.availableSection.noOrdersDesc}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5 items-stretch">
                                            {availableOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((order) => (
                                                <motion.div
                                                    key={order.id}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-white rounded-[20px] border border-accent-brown/10 shadow-sm hover:border-brand-dark/30 hover:shadow-md transition-all flex flex-col justify-between p-3 sm:p-4.5 h-full"
                                                >
                                                    <div className="space-y-2.5 flex-1 flex flex-col">
                                                        {/* 1. Icon Tile + Order ID */}
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-accent-peach/20 rounded-xl flex items-center justify-center text-accent-brown shrink-0" aria-hidden="true">
                                                                <Package size={16} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-none mb-1">
                                                                    {RIDER_TEXT.dashboard.orderCard.idLabel}
                                                                </p>
                                                                <p className="font-black text-sm sm:text-base text-accent-brown tracking-tight leading-snug break-words" aria-label={formatRiderOrderIdForAria(order)}>
                                                                    {formatRiderOrderId(order)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 2. Your Pay */}
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-none mb-1">
                                                                {RIDER_TEXT.dashboard.orderCard.payLabel}
                                                            </p>
                                                            <p className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-accent-brown tracking-tight leading-none whitespace-nowrap">
                                                                {formatCurrency(order.total_amount)}
                                                            </p>
                                                        </div>

                                                        {/* 3. Package Items (Compact first item with Qty & +more count) */}
                                                        {order.items && order.items.length > 0 ? (
                                                            <div className="bg-accent-peach/5 rounded-xl p-2 sm:p-2.5 border border-accent-brown/5 space-y-1.5">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-10 h-10 bg-white rounded-lg border border-accent-brown/5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-accent-brown/20">
                                                                        {order.items[0].image_url ? (
                                                                            <img src={order.items[0].image_url} alt={order.items[0].name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Package size={16} />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-black text-accent-brown leading-tight line-clamp-2 mb-0.5">
                                                                            {order.items[0].name}
                                                                        </p>
                                                                        <p className="text-[11px] font-bold text-accent-brown/60 uppercase tracking-wider leading-none">
                                                                            Qty: {order.items[0].quantity}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {order.items.length > 1 && (
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] sm:text-[11px] font-bold text-brand uppercase tracking-wider bg-brand/10 px-1.5 py-0.5 rounded">
                                                                            +{order.items.length - 1} more
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : null}

                                                        {/* 4. Distance Pill (if data exists) */}
                                                        {order.distance_km && (
                                                            <div className="inline-flex items-center gap-1 text-accent-brown/80 text-xs font-bold bg-accent-peach/20 px-2 py-0.5 rounded-md self-start">
                                                                <NavIcon size={11} aria-hidden="true" />
                                                                <span>{order.distance_km} KM</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 5. Thin Divider */}
                                                    <div className="border-t border-accent-brown/10 my-2.5" aria-hidden="true" />

                                                    {/* 6. View Details Button (Light / Outlined style) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDelivery(order)}
                                                        aria-label={`View details of order ${formatRiderOrderId(order)}`}
                                                        className="w-full min-h-[44px] h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-1.5 border border-brand-dark/30 text-brand-dark bg-brand-dark/5 hover:bg-brand-dark/10 active:scale-[0.98] transition-all outline-none focus:ring-2 focus:ring-brand-dark/30 mt-auto"
                                                    >
                                                        <span>{RIDER_TEXT.dashboard.orderCard.viewDetailsBtn}</span>
                                                        <ArrowRight size={15} aria-hidden="true" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        <Pagination currentPage={currentPage} totalPages={Math.ceil(availableOrders.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CONFIRM PACKAGE PICKUP MODAL */}
            <ConfirmPickupModal
                isOpen={pinModal.isOpen}
                onClose={() => {
                    setPinModal({ isOpen: false, status: '', deliveryId: null });
                    setPinValue('');
                    setPinError(null);
                    pickupTriggerBtnRef.current?.focus();
                }}
                onConfirm={handlePinSubmit}
                pinValue={pinValue}
                onPinChange={(val) => {
                    setPinValue(val);
                    if (pinError) setPinError(null);
                }}
                isUpdatingStatus={isUpdatingStatus}
                error={pinError}
            />

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
                                <h3 className="text-xl font-black text-accent-brown uppercase tracking-tighter">{RIDER_TEXT.dashboard.contactModal.title}</h3>
                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mt-1">{RIDER_TEXT.dashboard.contactModal.title}: {commModal.name}</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none mb-1">{RIDER_TEXT.dashboard.contactModal.callTitle}</p>
                                        <p className="text-sm font-black uppercase">{RIDER_TEXT.dashboard.contactModal.callSub}</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 leading-none mb-1">{RIDER_TEXT.dashboard.contactModal.smsTitle}</p>
                                        <p className="text-sm font-black uppercase">{RIDER_TEXT.dashboard.contactModal.smsSub}</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600/40 leading-none mb-1">{RIDER_TEXT.dashboard.contactModal.whatsAppTitle}</p>
                                        <p className="text-sm font-black uppercase">{RIDER_TEXT.dashboard.contactModal.whatsAppSub}</p>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setCommModal({ ...commModal, isOpen: false })}
                                className="w-full mt-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/20 hover:text-accent-brown transition-colors"
                            >
                                {RIDER_TEXT.dashboard.contactModal.closeBtn}
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
