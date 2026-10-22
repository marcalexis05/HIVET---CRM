import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import {
    ShoppingBag, Package, Truck, CheckCircle, XCircle,
    AlertCircle, ChevronRight, MapPin, Eye, Store,
    User, Phone, ShieldCheck, X, MessageSquare,
    ShieldAlert, Clock, CreditCard, Tag, Loader2,
    Activity, Trophy, Search, Filter, ArrowRight,
    Map as MapIcon, Navigation, Trash2, RotateCcw, Image as ImageIcon, Upload, Send,
    Plus, Minus, LocateFixed
} from 'lucide-react';
import { APIProvider, useMap, AdvancedMarker, InfoWindow, Map } from '@vis.gl/react-google-maps';
import ModernModal from '../../components/ModernModal';
import QrCodeModal from '../../components/QrCodeModal';
import Pagination from '../../components/Pagination';
import { toTitleCase, toSentenceCase, formatName } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface OrderItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    size?: string;
    image?: string;
    serial_number?: string;
}

interface Order {
    id: number;
    status: string;
    total_amount: number;
    fulfillment_method: string;
    payment_method: string;
    cancellation_reason?: string;
    delivery_address?: string;
    delivery_lat?: number;
    delivery_lng?: number;
    branch_id?: number;
    branch_lat?: number;
    branch_lng?: number;
    branch_name?: string;
    branch_address?: string;
    contact_name?: string;
    contact_phone?: string;
    created_at: string;
    items: OrderItem[];
    voucher_code?: string;
    discount_amount?: number;
    shipping_fee?: number;
    return_status?: string;
    return_reason?: string;
    return_photos?: string;
}

const cleanMapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.attraction', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.government', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.medical', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.place_of_worship', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.sports_complex', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit.station', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit.line', elementType: 'all', stylers: [{ visibility: 'off' }] }
];

const MapInstanceBinder = ({ onMapReady }: { onMapReady: (map: google.maps.Map) => void }) => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        onMapReady(map);
    }, [map, onMapReady]);
    return null;
};

const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng, id }: { userLat: number | null, userLng: number | null, clinicLat: number, clinicLng: number, id?: string }) => {
    const map = useMap(id);
    useEffect(() => {
        const maps = (window as any).google?.maps;
        if (!maps || !map || !userLat || !userLng || !clinicLat || !clinicLng) return;

        // Skip directions if points are virtually the same coordinate
        if (Math.abs(userLat - clinicLat) < 0.0001 && Math.abs(userLng - clinicLng) < 0.0001) {
            return;
        }

        const renderer = new maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
                strokeColor: '#FF9F1C',
                strokeWeight: 4,
                strokeOpacity: 0.85
            }
        });

        const service = new maps.DirectionsService();
        service.route(
            {
                origin: { lat: userLat, lng: userLng },
                destination: { lat: clinicLat, lng: clinicLng },
                travelMode: maps.TravelMode.DRIVING
            },
            (result: any, status: any) => {
                if (status === 'OK') {
                    renderer.setDirections(result);
                }
            }
        );

        return () => {
            renderer.setMap(null);
        };
    }, [map, userLat, userLng, clinicLat, clinicLng]);

    return null;
};

const OrderRouteMap = ({ order }: { order: Order }) => {
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [isUserInteracted, setIsUserInteracted] = useState(false);

    const deliveryLat = order.delivery_lat ? Number(order.delivery_lat) : null;
    const deliveryLng = order.delivery_lng ? Number(order.delivery_lng) : null;
    const branchLat = order.branch_lat ? Number(order.branch_lat) : null;
    const branchLng = order.branch_lng ? Number(order.branch_lng) : null;

    // Collect valid non-zero points
    const points: { lat: number; lng: number }[] = [];
    if (deliveryLat && deliveryLng && !isNaN(deliveryLat) && !isNaN(deliveryLng) && !(deliveryLat === 0 && deliveryLng === 0)) {
        points.push({ lat: deliveryLat, lng: deliveryLng });
    }
    if (branchLat && branchLng && !isNaN(branchLat) && !isNaN(branchLng) && !(branchLat === 0 && branchLng === 0)) {
        points.push({ lat: branchLat, lng: branchLng });
    }

    const defaultCenter = points.length > 0 ? points[0] : { lat: 14.5995, lng: 120.9842 };

    const fitRoute = () => {
        if (!mapInstance || !window.google) return;

        if (points.length >= 2) {
            const p1 = points[0];
            const p2 = points[1];
            const dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));

            if (dist > 0.0003) {
                const bounds = new window.google.maps.LatLngBounds();
                points.forEach(p => bounds.extend(p));
                // Fit bounds with ~40px of padding around the route
                mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

                // Clamp zoom: never closer than 17, never farther than 10
                window.google.maps.event.addListenerOnce(mapInstance, 'idle', () => {
                    const z = mapInstance.getZoom();
                    if (z !== undefined) {
                        if (z > 17) mapInstance.setZoom(16);
                        else if (z < 10) mapInstance.setZoom(10);
                    }
                });
                return;
            }
        }

        if (points.length >= 1) {
            mapInstance.setCenter(points[0]);
            mapInstance.setZoom(15);
        } else {
            mapInstance.setCenter(defaultCenter);
            mapInstance.setZoom(14);
        }
    };

    useEffect(() => {
        if (!mapInstance || !window.google) return;

        mapInstance.setOptions({
            gestureHandling: 'greedy',
            minZoom: 10,
            maxZoom: 19,
            clickableIcons: false,
            disableDefaultUI: true,
            styles: cleanMapStyles
        });

        const dragListener = mapInstance.addListener('dragstart', () => {
            setIsUserInteracted(true);
        });

        // Initial fit
        fitRoute();

        // Wait until popup finishes opening animation (~350ms) to ensure container has real size
        const timer = setTimeout(() => {
            if (mapInstance && window.google) {
                window.google.maps.event.trigger(mapInstance, 'resize');
                fitRoute();
            }
        }, 350);

        // Fit again when resized or rotated
        const handleResize = () => {
            if (mapInstance && window.google) {
                window.google.maps.event.trigger(mapInstance, 'resize');
                if (!isUserInteracted) {
                    fitRoute();
                }
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.google.maps.event.removeListener(dragListener);
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [mapInstance, order.id]);

    const handleZoomIn = () => {
        if (!mapInstance) return;
        const currentZoom = mapInstance.getZoom() || 14;
        if (currentZoom < 19) {
            mapInstance.setZoom(currentZoom + 1);
            setIsUserInteracted(true);
        }
    };

    const handleZoomOut = () => {
        if (!mapInstance) return;
        const currentZoom = mapInstance.getZoom() || 14;
        if (currentZoom > 10) {
            mapInstance.setZoom(currentZoom - 1);
            setIsUserInteracted(true);
        }
    };

    const handleRecenter = () => {
        fitRoute();
        setIsUserInteracted(false);
    };

    return (
        <div
            className="h-48 sm:h-60 w-full rounded-2xl overflow-hidden border border-accent-brown/10 relative group bg-slate-100 touch-none select-none"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <Map
                id="details-map"
                mapId="4c730709b30c1be1"
                defaultCenter={defaultCenter}
                defaultZoom={15}
                minZoom={10}
                maxZoom={19}
                gestureHandling="greedy"
                disableDefaultUI={true}
                clickableIcons={false}
                styles={cleanMapStyles}
                className="w-full h-full"
            >
                <MapInstanceBinder onMapReady={setMapInstance} />

                {deliveryLat && deliveryLng && (
                    <AdvancedMarker position={{ lat: deliveryLat, lng: deliveryLng }}>
                        <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-brand" title="Delivery Address">
                            <User className="w-3.5 h-3.5 text-accent-brown" />
                        </div>
                    </AdvancedMarker>
                )}

                {branchLat && branchLng && (
                    <AdvancedMarker position={{ lat: branchLat, lng: branchLng }}>
                        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center shadow-lg border-2 border-white" title={order.branch_name || 'Clinic'}>
                            <Store className="w-3.5 h-3.5 text-white" />
                        </div>
                    </AdvancedMarker>
                )}

                {deliveryLat && deliveryLng && branchLat && branchLng && (
                    <DirectionsLine
                        id="details-map"
                        userLat={deliveryLat}
                        userLng={deliveryLng}
                        clinicLat={branchLat}
                        clinicLng={branchLng}
                    />
                )}
            </Map>

            {/* Live Route Tag (Top Left) */}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg border border-accent-brown/10 shadow-sm pointer-events-none z-10">
                <p className="text-[9px] font-bold text-accent-brown">Live Route</p>
            </div>

            {/* Map Controls (Top Right): Recenter + 44px Zoom Controls */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 pointer-events-auto">
                {isUserInteracted && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRecenter();
                        }}
                        aria-label="Recenter live route"
                        title="Recenter live route"
                        className="h-11 px-3 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-accent-brown/10 flex items-center gap-1.5 text-accent-brown hover:bg-brand hover:text-white transition-all active:scale-95 cursor-pointer text-xs font-bold"
                    >
                        <LocateFixed className="w-4 h-4" />
                        <span>Recenter</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomIn();
                    }}
                    aria-label="Zoom in"
                    title="Zoom in"
                    className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-accent-brown/10 flex items-center justify-center text-accent-brown hover:bg-brand hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                    <Plus className="w-5 h-5" />
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomOut();
                    }}
                    aria-label="Zoom out"
                    title="Zoom out"
                    className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-accent-brown/10 flex items-center justify-center text-accent-brown hover:bg-brand hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                    <Minus className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const CustomerOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [fulfillmentFilter, setFulfillmentFilter] = useState<'All' | 'delivery' | 'pickup'>('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await fetch(`${API}/api/orders/refund/upload`, {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                const data = await resp.json();
                setReturnPhotos(prev => [...prev, data.url]);
            }
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const submitReturnRequest = async () => {
        if (!selectedOrder || !returnReason) return;
        setSubmittingReturn(true);
        try {
            const resp = await fetch(`${API}/api/orders/${selectedOrder.id}/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('hivet_token')}`
                },
                body: JSON.stringify({
                    reason: returnReason,
                    photos: returnPhotos
                })
            });
            if (resp.ok) {
                setShowReturnModal(false);
                setReturnReason('');
                setReturnPhotos([]);
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to submit return', err);
        } finally {
            setSubmittingReturn(false);
        }
    };

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ordersPerPage = 6;
    const [showStreetView, setShowStreetView] = useState(false);
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);
    const [activeMarker, setActiveMarker] = useState<'branch' | 'delivery' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrData, setQrData] = useState('');
    const [qrStatus, setQrStatus] = useState<'pending' | 'succeeded' | 'expired' | 'processing'>('pending');

    const tabs = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Payment Pending', 'Returns'];
    const activeTabRef = useRef<HTMLButtonElement | null>(null);
    const statusTabsContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (activeTabRef.current && statusTabsContainerRef.current) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            activeTabRef.current.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeTab]);

    // Lock background scroll & handle Escape key when order details modal is open
    useEffect(() => {
        if (isDetailsModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setIsDetailsModalOpen(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isDetailsModalOpen]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`${API}/api/orders`, {
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
            const response = await fetch(`${API}/api/orders/${selectedOrder.id}/cancel`, {
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

    const handleHideOrder = async (id: number) => {
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch(`${API}/api/orders/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setOrders(prev => prev.filter(o => o.id !== id));
            }
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const handlePayExistingOrder = (order: Order) => {
        const checkoutItems = order.items.map(item => ({
            ...item,
            price: item.price,
            quantity: item.quantity
        }));

        localStorage.setItem('hivet_checkout_filtered', JSON.stringify(checkoutItems));
        localStorage.setItem('hivet_checkout_paying_order', JSON.stringify(order));
        navigate('/dashboard/customer/checkout?step=3');
    };

    const filteredOrders = orders.filter(o => {
        let matchesStatus = activeTab === 'All' || o.status === activeTab;
        if (activeTab === 'Returns') {
            matchesStatus = !!o.return_status;
        }

        const matchesFulfillment = fulfillmentFilter === 'All' || o.fulfillment_method === fulfillmentFilter;
        const matchesSearch = searchQuery === '' ||
            `HV-2026-${o.id.toString().padStart(6, '0')}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesFulfillment && matchesSearch;
    });

    const totalOrders = orders.length;
    const inTransitCount = orders.filter(o => o.status === 'Processing' || o.status === 'In Transit').length;
    const deliveredCount = orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const paginatedOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'Cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'Payment Pending': return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
            case 'Processing': return 'bg-brand/10 text-brand border-brand/20';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed': return <CheckCircle className="w-4 h-4" />;
            case 'Cancelled': return <XCircle className="w-4 h-4" />;
            case 'Pending': return <Package className="w-4 h-4" />;
            case 'Payment Pending': return <CreditCard className="w-4 h-4" />;
            case 'Processing': return <Activity className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <APIProvider apiKey={MAPS_API_KEY}>
            <DashboardLayout title="" hideHeader={isDetailsModalOpen || isCancelModalOpen} hideFooter={isDetailsModalOpen || isCancelModalOpen}>
                <div className="max-w-[1920px] mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-10 pb-36 sm:pb-32 pb-[calc(env(safe-area-inset-bottom,0px)+8rem)]">


                    {/* CONTROL HUB: FILTERS & SEARCH */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 border border-white shadow-xl shadow-accent-brown/5">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 lg:gap-6">
                            {/* Search Bar */}
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/30 group-focus-within:text-brand transition-colors pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    aria-label="Search by Order ID or Product Name"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white h-12 sm:h-14 pl-11 sm:pl-13 pr-4 sm:pr-6 rounded-2xl sm:rounded-[1.5rem] text-[16px] font-bold text-accent-brown placeholder:text-black/40 outline-none border border-accent-brown/10 focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                />
                            </div>

                            {/* Fulfillment Method Switch */}
                            <div
                                role="tablist"
                                aria-label="Delivery Method Filter"
                                className="w-full sm:w-auto sm:min-w-[320px] flex items-center p-1 bg-slate-100/80 rounded-2xl sm:rounded-[1.5rem] border border-accent-brown/5"
                            >
                                {['All', 'delivery', 'pickup'].map((f) => {
                                    const isSelected = fulfillmentFilter === f;
                                    const label = f === 'delivery' ? 'Delivery' : f === 'pickup' ? 'Pickup' : 'All Methods';
                                    return (
                                        <button
                                            key={f}
                                            role="tab"
                                            aria-selected={isSelected}
                                            onClick={() => setFulfillmentFilter(f as any)}
                                            className={`flex-1 min-w-0 min-h-[44px] px-1.5 sm:px-3 py-2 rounded-xl sm:rounded-[1.25rem] text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center text-center focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                                                isSelected
                                                    ? 'bg-white text-accent-brown shadow-sm'
                                                    : 'text-black/70 hover:text-accent-brown hover:bg-white/40'
                                            }`}
                                        >
                                            <span className="leading-tight text-center break-words sm:whitespace-nowrap">
                                                {label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Status Filters - Smooth Horizontal Swipe on Mobile, Wrap on Tablet/Desktop */}
                        <div className="mt-3.5 sm:mt-6 pt-3.5 sm:pt-6 border-t border-accent-brown/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-black/70">
                                    Filter by status:
                                </span>
                                <span className="sm:hidden text-[11px] font-bold text-accent-brown/40">
                                    Swipe for more →
                                </span>
                            </div>
                            <div
                                ref={statusTabsContainerRef}
                                className="flex sm:flex-wrap items-center gap-2 sm:gap-2.5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth no-scrollbar"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                {tabs.map((tab) => {
                                    const count = tab === 'All'
                                        ? orders.length
                                        : tab === 'Returns'
                                            ? orders.filter(o => !!o.return_status).length
                                            : orders.filter(o => o.status === tab).length;
                                    const isSelected = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            ref={isSelected ? activeTabRef : null}
                                            onClick={() => {
                                                setActiveTab(tab);
                                                setCurrentPage(1);
                                            }}
                                            aria-pressed={isSelected}
                                            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 snap-start select-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                                                isSelected
                                                    ? 'bg-brand text-white shadow-md shadow-brand/20'
                                                    : 'bg-white text-black border border-accent-brown/10 hover:border-brand/30 hover:text-brand'
                                            }`}
                                        >
                                            <span>{tab}</span>
                                            <span className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-accent-brown/60'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ORDER GRID */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-72 bg-white/50 animate-pulse rounded-[3rem] border border-white shadow-xl"></div>
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/50 py-10 rounded-[4rem] flex flex-col items-center gap-8 text-center border-2 border-dashed border-accent-brown/10"
                        >
                            <div className="w-24 h-24 bg-accent-peach/20 rounded-full flex items-center justify-center text-accent-brown/20">
                                <ShoppingBag className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-accent-brown tracking-tighter mb-2">No Records Found</h3>
                                <p className="text-sm font-medium text-black max-w-xs mx-auto">Try adjusting your filters or search query to find specific orders.</p>
                            </div>
                            <button
                                onClick={() => { setSearchQuery(''); setActiveTab('All'); setFulfillmentFilter('All'); }}
                                className="px-10 py-4 bg-brand text-white rounded-2xl text-xs font-bold hover:bg-brand-dark transition-all shadow-xl shadow-brand/20"
                            >
                                Reset Control Hub
                            </button>
                        </motion.div>
                    ) : (
                        <div className="space-y-12">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {paginatedOrders.map((order, i) => (
                                        <motion.div
                                            key={order.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, delay: i * 0.05 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setIsDetailsModalOpen(true);
                                            }}
                                            className="group bg-white rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-[0_12px_40px_rgba(45,34,27,0.06)] border border-slate-100 hover:border-brand/30 transition-all relative overflow-hidden flex flex-col cursor-pointer"
                                        >
                                            {/* TOP LOGISTICS LAYER: Badges & Deployment ID */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 mb-4 relative z-10 pb-3 border-b border-accent-brown/5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${getStatusStyle(order.status)}`}>
                                                        {getStatusIcon(order.status)}
                                                        <span>{toTitleCase(order.status)}</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-slate-50 border border-accent-brown/5 rounded-full text-xs font-bold text-black">
                                                        {toTitleCase(order.fulfillment_method)}
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="text-[11px] font-bold text-black/50">Deployment ID</p>
                                                    <p className="text-xs sm:text-sm font-black text-accent-brown tracking-wider break-all mt-0.5">
                                                        HV-2026-{order.id.toString().padStart(6, '0')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* CORE IDENTITY LAYER: Product Image & Details */}
                                            <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 mb-4 relative z-10">
                                                <div className="w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-2xl sm:rounded-[1.75rem] flex items-center justify-center border border-accent-brown/5 overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300 p-2 sm:p-3">
                                                    <img
                                                        src={order.items[0]?.image}
                                                        alt={order.items[0]?.name || 'Order Item'}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base sm:text-lg font-black text-accent-brown tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2 overflow-hidden text-ellipsis">
                                                        {formatName(order.items[0]?.name)}
                                                    </h3>
                                                    {order.items.length > 1 && (
                                                        <p className="text-xs font-bold text-brand mt-0.5">
                                                            +{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-black/60 font-medium mt-1">
                                                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>

                                                {/* Desktop Price */}
                                                <div className="hidden sm:block text-right shrink-0">
                                                    <p className="text-[11px] font-bold text-black/50 mb-0.5">Total</p>
                                                    <p className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight whitespace-nowrap">
                                                        ₱{Number(order.total_amount).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* LOGISTICS PROGRESS BAR */}
                                            <div className="mb-4 relative z-10">
                                                <div className="flex justify-between items-end mb-1.5 text-xs font-bold">
                                                    <span className="text-black font-bold">Order Progress</span>
                                                    <span className="text-brand font-black">
                                                        {order.status === 'Completed' ? '100% Finalized' : order.status === 'Processing' ? '65% Routing' : '15% Initialization'}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: order.status === 'Completed' ? '100%' : order.status === 'Processing' ? '65%' : '15%' }}
                                                        transition={{ duration: 1.2, ease: "circOut" }}
                                                        className={`h-full ${order.status === 'Completed' ? 'bg-emerald-500' : 'bg-brand'}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* INTERACTIVE FOOTER LAYER */}
                                            <div className="mt-auto pt-3 sm:pt-4 border-t border-accent-brown/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                                                {/* Mobile Price */}
                                                <div className="sm:hidden flex items-baseline justify-between">
                                                    <span className="text-xs font-bold text-black/50">Total:</span>
                                                    <span className="text-xl font-black text-accent-brown tracking-tight">
                                                        ₱{Number(order.total_amount).toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Item Avatars on Tablets/Desktop */}
                                                <div className="hidden sm:flex items-center gap-3">
                                                    <div className="flex -space-x-2">
                                                        {order.items.slice(0, 3).map((item, idx) => (
                                                            <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                                                <img src={item.image} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                        ))}
                                                        {order.items.length > 3 && (
                                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-accent-brown text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                                                                +{order.items.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-nowrap items-center gap-2 self-stretch sm:self-auto justify-end">
                                                    {order.status === 'Cancelled' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleHideOrder(order.id); }}
                                                            className="min-h-[44px] min-w-[44px] p-2.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm shrink-0"
                                                            title="Purge Cancellation Record"
                                                            aria-label="Hide cancellation record"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </motion.button>
                                                    )}

                                                    {order.status === 'Payment Pending' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handlePayExistingOrder(order); }}
                                                            className="min-h-[44px] flex-1 sm:flex-initial px-2.5 xs:px-4 py-2.5 bg-sky-500 text-white rounded-xl flex items-center justify-center gap-1.5 xs:gap-2 text-[11px] xs:text-xs font-bold whitespace-nowrap shadow-sm hover:bg-sky-600 transition-all shrink-0"
                                                        >
                                                            <CreditCard className="w-4 h-4 shrink-0" />
                                                            <span className="whitespace-nowrap">Resolve Payment</span>
                                                        </motion.button>
                                                    )}

                                                    {order.status === 'Completed' && !order.return_status && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            type="button"
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setSelectedOrder(order);
                                                                setShowReturnModal(true);
                                                            }}
                                                            className="min-h-[44px] flex-1 sm:flex-initial px-2.5 xs:px-4 py-2.5 bg-black text-white rounded-xl flex items-center justify-center gap-1.5 xs:gap-2 text-[11px] xs:text-xs font-bold whitespace-nowrap hover:bg-black/80 transition-all shadow-sm shrink-0"
                                                        >
                                                            <RotateCcw className="w-4 h-4 shrink-0" />
                                                            <span className="whitespace-nowrap">Request Return</span>
                                                        </motion.button>
                                                    )}

                                                    {order.return_status && (
                                                        <div className="min-h-[44px] flex-1 sm:flex-initial px-2.5 xs:px-3.5 py-2 bg-accent-peach/20 border border-accent-peach/30 text-accent-brown rounded-xl flex items-center justify-center gap-1.5 xs:gap-2 text-[11px] xs:text-xs font-bold whitespace-nowrap opacity-90 cursor-default shrink-0">
                                                            <ShieldAlert className="w-4 h-4 shrink-0" />
                                                            <span className="whitespace-nowrap">{toTitleCase(order.return_status)}</span>
                                                        </div>
                                                    )}

                                                    <div className="min-h-[44px] flex-1 sm:flex-initial px-2.5 xs:px-5 py-2.5 bg-brand text-white rounded-xl flex items-center justify-center gap-1.5 xs:gap-2 text-[11px] xs:text-xs font-bold whitespace-nowrap hover:bg-brand-dark transition-all shadow-md shadow-brand/10 shrink-0">
                                                        <span className="whitespace-nowrap">Order Details</span>
                                                        <ArrowRight className="w-4 h-4 shrink-0" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Atmospheric Bloom */}
                                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[80px] -mr-40 -mt-40 group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Pagination Bar */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                scrollToTop={true}
                            />
                        </div>
                    )}
                </div>

                {/* ORDER DETAILS MODAL */}
                {createPortal(
                    <AnimatePresence>
                        {isDetailsModalOpen && selectedOrder && (() => {
                            const order = selectedOrder;
                            return (
                                <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setIsDetailsModalOpen(false)}
                                        className="absolute inset-0 bg-accent-brown/30 backdrop-blur-md"
                                    />
                                    <motion.div
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="Order Details"
                                        initial={{ y: 40, opacity: 0, scale: 0.98 }}
                                        animate={{ y: 0, opacity: 1, scale: 1 }}
                                        exit={{ y: 40, opacity: 0, scale: 0.98 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                        className="bg-white w-full sm:max-w-3xl lg:max-w-6xl h-[92vh] sm:h-[88vh] max-h-[96dvh] rounded-t-[28px] sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.25)] relative z-10 overflow-hidden flex flex-col border border-white/60"
                                    >
                                        {/* FIXED HEADER: Always visible at the top */}
                                        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-3.5 border-b border-accent-brown/10 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                                <h3 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight truncate">
                                                    Order Details
                                                </h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsDetailsModalOpen(false)}
                                                className="w-11 h-11 rounded-full bg-slate-100 hover:bg-black hover:text-white transition-all flex items-center justify-center text-accent-brown shrink-0 cursor-pointer"
                                                aria-label="Close Order Details"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* SCROLLABLE BODY */}
                                        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row overscroll-contain touch-pan-y no-scrollbar">
                                            {/* LEFT LOGISTICS PANE: Tracking & Map */}
                                            <div className="lg:w-[42%] bg-accent-peach/5 border-b lg:border-b-0 lg:border-r border-accent-brown/10 p-4 sm:p-6 lg:overflow-y-auto space-y-4 shrink-0">
                                                {/* Tracking Card */}
                                                <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-accent-brown/10 shadow-sm space-y-4">
                                                    {/* Tracking number stack */}
                                                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-accent-brown/5">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-accent-brown/5 flex items-center justify-center text-accent-brown shrink-0">
                                                                <Navigation className="w-5 h-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-bold text-accent-brown/60 leading-none mb-1">
                                                                    Tracking number
                                                                </p>
                                                                <p className="text-xs sm:text-sm font-black text-accent-brown tracking-wider break-all leading-tight">
                                                                    HV-2026-{order.id.toString().padStart(6, '0')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="sr-only">Active tracking</span>
                                                            <div className="w-3 h-3 rounded-full bg-brand animate-pulse" title="Active Delivery Route" />
                                                        </div>
                                                    </div>

                                                    {/* Origin & Destination Route */}
                                                    <div className="flex items-start gap-3.5 pt-1">
                                                        <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-accent-brown/30 shrink-0" />
                                                            <div className="w-[1.5px] h-12 bg-accent-brown/20 border-dashed border-l" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />
                                                        </div>
                                                        <div className="flex-1 space-y-3 min-w-0">
                                                            <div>
                                                                <p className="text-[9px] font-bold text-black/60 leading-none mb-1">
                                                                    Origin (Clinic)
                                                                </p>
                                                                <p className="text-xs font-bold text-accent-brown leading-snug">
                                                                    {order.branch_name || 'Verification Center'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-bold text-black/60 leading-none mb-1">
                                                                    Destination (Encrypted address)
                                                                </p>
                                                                <p className="text-xs font-bold text-accent-brown leading-relaxed break-words">
                                                                    {order.delivery_address || order.branch_address || 'Clinic Pickup Point'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Live Route Map Preview */}
                                                <OrderRouteMap order={order} />
                                            </div>

                                            {/* RIGHT CONTENT PANE: Order Summary, Tiles, Items & Settlement */}
                                            <div className="w-full lg:flex-1 flex flex-col bg-white lg:overflow-hidden relative shrink-0 lg:shrink">
                                                {/* Summary Header */}
                                                <div className="flex items-center gap-3.5 p-4 sm:p-6 pb-2 shrink-0">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-accent-brown border border-accent-brown/10 shrink-0">
                                                        <ShoppingBag className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-brand leading-none mb-1">
                                                            Receipt Intelligence
                                                        </p>
                                                        <h4 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight leading-tight">
                                                            Order Summary
                                                        </h4>
                                                    </div>
                                                </div>

                                                {/* 4 Tiles (Status, Payment, Deployment, Payload) */}
                                                <div className="px-4 sm:px-6 py-2 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                                                    {[
                                                        { label: 'Status', value: toTitleCase(order.status), icon: getStatusIcon(order.status) },
                                                        { label: 'Payment', value: toTitleCase(order.payment_method || 'Standard'), icon: <CreditCard className="w-4 h-4" /> },
                                                        {
                                                            label: 'Deployment',
                                                            value: new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                                                            icon: <Clock className="w-4 h-4" />
                                                        },
                                                        {
                                                            label: 'Payload',
                                                            value: (order.items.reduce((acc, it) => acc + (it.quantity || 1), 0) || order.items.length) === 1 ? '1 Unit' : `${order.items.reduce((acc, it) => acc + (it.quantity || 1), 0) || order.items.length} Units`,
                                                            icon: <Package className="w-4 h-4" />
                                                        }
                                                    ].map((stat, i) => (
                                                        <div key={i} className="p-3.5 sm:p-4 bg-slate-50/90 rounded-2xl border border-accent-brown/5 flex flex-col justify-between min-h-[72px]">
                                                            <p className="text-[10px] font-bold text-slate-500 mb-1.5">{stat.label}</p>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-accent-brown shadow-sm border border-accent-brown/5 shrink-0">
                                                                    {stat.icon}
                                                                </div>
                                                                <span className="text-xs font-bold text-accent-brown leading-tight break-words line-clamp-2">
                                                                    {stat.value}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Items List */}
                                                <div className="lg:flex-1 lg:overflow-y-auto px-4 sm:px-6 py-3 space-y-2.5 no-scrollbar">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white rounded-2xl border border-accent-brown/10 hover:border-brand/30 transition-all shadow-sm">
                                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-xl p-2 shrink-0 flex items-center justify-center border border-accent-brown/5">
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <h5 className="font-bold text-xs sm:text-sm text-accent-brown line-clamp-2 leading-snug mb-1">
                                                                    {formatName(item.name)}
                                                                </h5>
                                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                    {item.variant && (
                                                                        <span className="px-2 py-0.5 bg-brand/10 rounded-md text-[9px] font-bold text-brand">
                                                                            {toTitleCase(item.variant)}
                                                                        </span>
                                                                    )}
                                                                    {item.size && (
                                                                        <span className="text-[9px] font-semibold text-slate-500">
                                                                            Size: {toTitleCase(item.size)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.serial_number && (
                                                                    <div className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 bg-accent-brown/5 rounded-md border border-accent-brown/5 w-fit">
                                                                        <Tag className="w-3 h-3 text-accent-brown/40" />
                                                                        <span className="text-[8px] font-semibold text-accent-brown/70">
                                                                            SN: {item.serial_number}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-[9px] font-semibold text-slate-400 mb-0.5">
                                                                    Qty {item.quantity}
                                                                </p>
                                                                <p className="text-sm sm:text-base font-black text-accent-brown tracking-tight">
                                                                    ₱{(item.price * item.quantity).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Settlement Footer */}
                                                <div className="p-4 sm:p-6 bg-accent-peach/5 border-t border-accent-brown/10 shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3 justify-between sm:justify-start">
                                                            {(order.status === 'Pending' || order.status === 'Payment Pending') && (
                                                                <button
                                                                    onClick={() => {
                                                                        setIsDetailsModalOpen(false);
                                                                        setIsCancelModalOpen(true);
                                                                    }}
                                                                    className="min-h-[44px] px-5 py-2.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all border border-rose-200"
                                                                >
                                                                    Cancel Order
                                                                </button>
                                                            )}
                                                            <div>
                                                                <p className="text-[10px] font-bold text-slate-700">Secure transaction</p>
                                                                <p className="text-[10px] font-medium text-slate-400">All calculations final</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="w-full sm:w-auto flex flex-col items-end gap-1 pb-2 border-b border-accent-brown/5">
                                                                <div className="flex items-center justify-between sm:justify-end gap-6 text-[10px] font-bold text-slate-500 w-full">
                                                                    <span>Subtotal</span>
                                                                    <span className="font-bold text-slate-700">₱{(order.total_amount - (order.shipping_fee || 0) + (order.discount_amount || 0)).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between sm:justify-end gap-6 text-[10px] font-bold text-brand w-full">
                                                                    <span>Logistics Fee</span>
                                                                    <span>{(order.shipping_fee && order.shipping_fee > 0) ? `₱${order.shipping_fee.toLocaleString()}` : "FREE"}</span>
                                                                </div>
                                                                {order.discount_amount !== undefined && order.discount_amount > 0 && (
                                                                    <div className="flex items-center justify-between sm:justify-end gap-6 text-[10px] font-bold text-emerald-600 w-full">
                                                                        <span>Reward Applied</span>
                                                                        <span>-₱{order.discount_amount.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-baseline justify-between sm:justify-end gap-4 w-full pt-1">
                                                                <span className="text-xs font-bold text-brand">Total settlement</span>
                                                                <span className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight">
                                                                    ₱{order.total_amount.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })()}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Refund/Return Modal */}
                {showReturnModal && createPortal(
                    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReturnModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-white rounded-[4rem] w-full max-w-2xl p-16 shadow-3xl overflow-hidden relative z-10 border border-white"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32" />
                            
                            <h2 className="text-4xl font-black text-accent-brown tracking-tighter mb-2 relative">Request a Return</h2>
                            <p className="text-xs font-semibold text-accent-brown/50 mb-12 relative">Order HV-{new Date(selectedOrder?.created_at || '').getFullYear()}-{selectedOrder?.id.toString().padStart(6, '0')}</p>

                            <div className="space-y-10 relative">
                                <div>
                                    <label className="text-xs font-bold text-black block mb-4 ml-2">Reason for request</label>
                                    <textarea 
                                        value={returnReason}
                                        onChange={e => setReturnReason(e.target.value)}
                                        placeholder="Please provide a detailed explanation..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 text-sm font-bold text-accent-brown outline-none focus:border-brand/50 transition-all min-h-[160px] resize-none shadow-inner"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <label className="text-xs font-bold text-black block">Evidence photos</label>
                                        <span className="text-xs font-semibold text-accent-brown/60 bg-accent-peach/5 px-4 py-1.5 rounded-full border border-accent-peach/10">{returnPhotos.length} / 4 Slots</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {returnPhotos.map((url, i) => (
                                            <div key={i} className="aspect-square rounded-[2rem] border-2 border-slate-100 overflow-hidden relative group shadow-lg">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => setReturnPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute inset-0 bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        ))}
                                        {returnPhotos.length < 4 && (
                                            <label className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all group active:scale-95">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                                                    {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 group-hover:text-brand transition-all">Upload</span>
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-6 items-center">
                                    <button 
                                        onClick={() => setShowReturnModal(false)}
                                        className="flex-1 py-6 rounded-[2rem] font-bold text-xs text-black border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        Dismiss
                                    </button>
                                    <button 
                                        onClick={submitReturnRequest}
                                        disabled={!returnReason || returnPhotos.length === 0 || submittingReturn}
                                        className="flex-[2] py-6 px-12 bg-black text-white rounded-[2rem] font-bold text-xs hover:bg-brand-dark transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]"
                                    >
                                        {submittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {submittingReturn ? 'Processing...' : 'Finalize Request'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}

                {/* CANCELLATION MODAL */}
                {createPortal(
                    <AnimatePresence>
                        {isCancelModalOpen && (
                            <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="absolute inset-0 bg-rose-950/20 backdrop-blur-xl"
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border border-white"
                                >
                                    <div className="p-12 border-b border-rose-100/10 bg-rose-50/50">
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className="w-20 h-20 bg-rose-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-rose-500/30">
                                                <ShieldAlert className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-accent-brown tracking-tight">Cancel Order</h3>
                                                <p className="text-xs font-semibold text-rose-500/80 mt-1">Permanent transaction withdrawal</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-accent-brown/60 leading-relaxed max-w-2xl">
                                            You are about to cancel this order. This action cannot be undone. Please select a reason for the cancellation.
                                        </p>
                                    </div>

                                    <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            "Change of mind",
                                            "Algorithm optimization error",
                                            "Financial pivot",
                                            "Logistic delay concerns",
                                            "Duplicate order",
                                            "Others"
                                        ].map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => setCancelReason(reason)}
                                                className={`flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer ${cancelReason === reason
                                                    ? 'border-rose-500 bg-rose-50 text-rose-600'
                                                    : 'border-accent-brown/5 hover:border-brand/40 text-accent-brown/40 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-xs font-bold">{reason}</span>
                                                {cancelReason === reason && <CheckCircle className="w-5 h-5" />}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-12 bg-slate-50 flex gap-4">
                                        <button
                                            onClick={() => setIsCancelModalOpen(false)}
                                            className="flex-1 py-6 bg-white border border-accent-brown/5 text-accent-brown rounded-3xl font-bold text-xs hover:bg-accent-peach/10 transition-all cursor-pointer shadow-sm"
                                        >
                                            Abort
                                        </button>
                                        <button
                                            onClick={handleCancelOrder}
                                            disabled={!cancelReason || isCancelling}
                                            className="flex-1 py-6 bg-rose-500 text-white rounded-3xl font-bold text-xs hover:bg-rose-600 transition-all disabled:opacity-30 shadow-2xl shadow-rose-500/20 cursor-pointer"
                                        >
                                            {isCancelling ? 'Processing...' : 'Confirm'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                <ModernModal
                    isOpen={modal.isOpen}
                    onClose={() => setModal(m => ({ ...m, isOpen: false }))}
                    onConfirm={modal.onConfirm}
                    title={modal.title}
                    message={modal.message}
                    type={modal.type}
                />

                <QrCodeModal
                    isOpen={qrModalOpen}
                    onClose={() => setQrModalOpen(false)}
                    qrData={qrData}
                    amount={selectedOrder?.total_amount || 0}
                    reference={`HV-2026-${(selectedOrder?.id || 0).toString().padStart(6, '0')}`}
                    status={qrStatus}
                />
            </DashboardLayout>
        </APIProvider>
    );
};

export default CustomerOrders;
