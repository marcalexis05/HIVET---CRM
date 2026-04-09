import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    Wallet, Banknote, ShieldCheck, MapPin, Store, Truck, Loader2,
    ArrowRight, Tag, CheckCircle, X, Gift, Award, Sparkles, CreditCard,
    Eye, User, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import MapPickerModal from '../../components/MapPickerModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Haversine distance
const calcDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return '...';
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return d < 1 ? `${Math.round(d*1000)}m` : `${d.toFixed(1)}km`;
};

// Draws a driving route between two points on a Map
const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng }: { userLat: number, userLng: number, clinicLat: number, clinicLng: number }) => {
    const map = useMap();
    useEffect(() => {
        const maps = (window as any).google?.maps;
        if (!maps || !map) return;
        const renderer = new maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#F58634', strokeWeight: 5, strokeOpacity: 0.85 }
        });
        new maps.DirectionsService().route(
            { origin: { lat: userLat, lng: userLng }, destination: { lat: clinicLat, lng: clinicLng }, travelMode: maps.TravelMode.DRIVING },
            (result: any, status: any) => { if (status === 'OK') renderer.setDirections(result); }
        );
        return () => renderer.setMap(null);
    }, [map, userLat, userLng, clinicLat, clinicLng]);
    return null;
};

// Imperatively pans the Street View mini-map without re-rendering the Map component
const PanoMapSyncer = ({ position }: { position: { lat: number; lng: number } | null }) => {
    const map = useMap('sv-minimap');
    useEffect(() => {
        if (map && position) map.panTo(position);
    }, [map, position]);
    return null;
};

const Checkout = () => {
    const { items, totalAmount, totalItems, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fulfillment & payment
    const [selectedPayment, setSelectedPayment] = useState<'gcash' | 'maya' | 'cash'>('gcash');
    const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMixedModal, setShowMixedModal] = useState(false);
    const [hasAcknowledgedMixed, setHasAcknowledgedMixed] = useState(false);

    // Address state
    const [loadingData, setLoadingData] = useState(true);
    interface Address {
        id: number;
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2: string;
        lat?: number | null;
        lng?: number | null;
        label: string;
        is_default: boolean;
    }
    const [allAddresses, setAllAddresses] = useState<Address[]>([]);
    const [showAddrModal, setShowAddrModal] = useState(false);
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [deliveryInfo, setDeliveryInfo] = useState({
        contactName: user?.name || '',
        address: '',
        phone: user?.phone || '',
        clinic_id: null as number | null,
        branch_id: null as number | null,
        lat: null as number | null,
        lng: null as number | null,
    });

    const [clinics, setClinics] = useState<any[]>([]);
    const shippingFee = fulfillmentMethod === 'delivery' ? 150 : 0;
    const isMixedCart = Array.from(new Set(items.map(item => item.business_id).filter(id => id != null))).length > 1;

    // Branch map state
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [selectedClinic, setSelectedClinic] = useState<any>(null);
    const [showBranchStreetView, setShowBranchStreetView] = useState(false);
    const [branchActiveMarker, setBranchActiveMarker] = useState<'branch' | 'customer' | null>(null);
    const [svStartPos, setSvStartPos] = useState<{ lat: number; lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState({ heading: 0, pitch: 0 });
    const [panoPosition, setPanoPosition] = useState<{ lat: number; lng: number } | null>(null);
    const branchSvRef = useRef<google.maps.StreetViewPanorama | null>(null);

    // Voucher state
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState<{ id: number; title: string; discount: number; code: string } | null>(null);
    const [myVouchers, setMyVouchers] = useState<any[]>([]);

    // Fetch vouchers
    useEffect(() => {
        const fetchVouchers = async () => {
            try {
                const token = localStorage.getItem('hivet_token');
                if (!token) return;
                const res = await fetch(`${API}/api/loyalty`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setMyVouchers((data.my_vouchers || []).filter((v: any) => v.type !== 'Service'));
                }
            } catch (err) {
                console.error('Failed to fetch vouchers:', err);
            }
        };
        fetchVouchers();
    }, []);

    const handleApplyVoucher = async (code: string) => {
        if (!code) return;
        setApplyingVoucher(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const res = await fetch(`${API}/api/loyalty/validate-voucher`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: code.trim(), items }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Invalid voucher code');
            }
            const data = await res.json();
            
            let discountVal = data.calculated_discount || 0;

            setAppliedVoucher({
                id: data.id,
                title: data.title,
                discount: discountVal,
                code: data.code
            });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setApplyingVoucher(false);
        }
    };

    const selectAddress = (addr: Address) => {
        setDeliveryInfo(prev => ({
            ...prev,
            contactName: addr.full_name || '',
            address: `${addr.address_line1}, ${addr.address_line2}`,
            phone: addr.phone || '',
            lat: addr.lat || null,
            lng: addr.lng || null
        }));
        setShowAddrModal(false);
    };

    // Fetch addresses & clinics on mount
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoadingData(true);
            try {
                const token = localStorage.getItem('hivet_token');
                const [addrRes, clinicsRes] = await Promise.all([
                    fetch(`${API}/api/customer/addresses`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${API}/api/clinics`)
                ]);

                if (addrRes.ok) {
                    const data = await addrRes.json();
                    const addrList = data.addresses || [];
                    setAllAddresses(addrList);
                    const defaultAddr = addrList.find((a: Address) => a.is_default) || addrList[0];
                    if (defaultAddr) {
                        setDeliveryInfo(prev => ({
                            ...prev,
                            contactName: defaultAddr.full_name || user?.name || '',
                            address: `${defaultAddr.address_line1}, ${defaultAddr.address_line2}`,
                            phone: defaultAddr.phone || user?.phone || '',
                            lat: defaultAddr.lat || null,
                            lng: defaultAddr.lng || null
                        }));
                    } else {
                        setDeliveryInfo(prev => ({
                            ...prev,
                            contactName: user?.name || '',
                            address: '',
                            phone: user?.phone || ''
                        }));
                    }
                } else {
                    setDeliveryInfo(prev => ({
                        ...prev,
                        contactName: user?.name || '',
                        address: '',
                        phone: user?.phone || ''
                    }));
                }

                if (clinicsRes.ok) {
                    const d = await clinicsRes.json();
                    setClinics(d.clinics || []);
                }
            } catch (err) {
                console.error('Error fetching checkout data:', err);
                setDeliveryInfo(prev => ({
                    ...prev,
                    contactName: user?.name || '',
                    address: '',
                    phone: user?.phone || ''
                }));
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, [user]);

    const handlePlaceOrder = async () => {
        if (fulfillmentMethod === 'delivery' && !deliveryInfo.address) {
            alert('Please add a delivery address before placing your order.');
            return;
        }
        if (fulfillmentMethod === 'pickup') {
            if (isMixedCart && !hasAcknowledgedMixed) {
                setShowMixedModal(true);
                return;
            }
            if (!deliveryInfo.clinic_id) {
                alert('Please select a clinic branch for pickup.');
                return;
            }
        }

        setIsPlacingOrder(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const orderPayload = {
                items,
                totalAmount: totalAmount + shippingFee - (appliedVoucher?.discount || 0),
                fulfillmentMethod,
                paymentMethod: selectedPayment,
                deliveryDetails: deliveryInfo,
                clinic_id: deliveryInfo.clinic_id,
                branch_id: deliveryInfo.branch_id,
                delivery_lat: deliveryInfo.lat,
                delivery_lng: deliveryInfo.lng,
                voucher_code: appliedVoucher?.code || null,
            };

            if (selectedPayment === 'gcash' || selectedPayment === 'maya') {
                // PayMongo flow — create session, redirect
                const response = await fetch(`${API}/api/payments/paymongo/checkout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderPayload)
                });

                if (response.ok) {
                    const data = await response.json();
                    // Redirect to PayMongo checkout page
                    window.location.href = data.checkout_url;
                } else {
                    const errData = await response.json();
                    alert(errData.detail || 'Failed to create payment session. Please try again.');
                }
            } else {
                // Cash on Delivery / Pickup — direct order
                const response = await fetch(`${API}/api/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderPayload)
                });

                if (response.ok) {
                    clearCart();
                    setShowSuccess(true);
                    setTimeout(() => {
                        navigate('/dashboard/customer/orders');
                    }, 3000);
                } else {
                    console.error('Failed to place order');
                    alert('Failed to place order. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error placing order:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const discount = appliedVoucher?.discount || 0;
    const grandTotal = Math.max(0, totalAmount + shippingFee - discount);

    return (
        <DashboardLayout title="Checkout">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6 sm:space-y-8">

                    {/* Fulfillment + Delivery/Pickup Card */}
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                        {/* Toggle */}
                        <div className="flex gap-4 mb-8">
                            <button
                                onClick={() => setFulfillmentMethod('delivery')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${fulfillmentMethod === 'delivery' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'}`}
                            >
                                <div className="flex-1 text-left relative">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-brand" />
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${fulfillmentMethod === 'delivery' ? 'text-brand' : 'text-accent-brown'}`}>
                                            Home Delivery
                                        </span>
                                        {isMixedCart && (
                                            <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Recommended</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-medium text-accent-brown/40">Safe and direct to your door</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setFulfillmentMethod('pickup')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${fulfillmentMethod === 'pickup' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'}`}
                            >
                                <Store className="w-5 h-5 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-widest text-left leading-tight">Clinic<br />Pick-up</span>
                            </button>
                        </div>

                        {fulfillmentMethod === 'delivery' ? (
                            <>
                                <div className="flex items-center justify-between mb-6 pt-6 border-t border-accent-brown/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-accent-peach/30 rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-accent-brown">Delivery Details</h3>
                                            <p className="text-sm font-medium text-accent-brown/50">Where should we send your order?</p>
                                        </div>
                                    </div>
                                    {allAddresses.length > 0 && (
                                        <button
                                            onClick={() => setShowAddrModal(true)}
                                            className="px-4 py-2 bg-brand/10 hover:bg-brand text-brand-dark hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {loadingData ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Loading delivery details...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {!deliveryInfo.address && (
                                                <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-4 mb-2">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                                                        <MapPin className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-red-500 leading-none mb-1">No saved address found</p>
                                                        <p className="text-[10px] font-medium text-red-500/60">Please add a delivery address in your account settings to proceed.</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Contact Name</label>
                                                    <input
                                                        type="text"
                                                        value={deliveryInfo.contactName}
                                                        onChange={e => setDeliveryInfo(prev => ({ ...prev, contactName: e.target.value }))}
                                                        placeholder="Name of recipient"
                                                        className="w-full bg-white border-2 border-accent-brown/5 focus:border-brand/30 rounded-xl px-4 py-3 outline-none text-accent-brown font-bold transition-all shadow-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Delivery Address</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={deliveryInfo.address}
                                                            placeholder="Tap 'Edit' to set your delivery location"
                                                            className="w-full bg-white border-2 border-accent-brown/5 focus:border-brand/30 rounded-xl px-4 py-3 outline-none text-accent-brown font-bold transition-all shadow-sm pr-20 cursor-default"
                                                        />
                                                        <button
                                                            onClick={() => setShowPickerModal(true)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-dark text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Contact Number</label>
                                                    <input
                                                        type="tel"
                                                        value={deliveryInfo.phone}
                                                        onChange={e => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))}
                                                        placeholder="09XX XXX XXXX"
                                                        className="w-full bg-white border-2 border-accent-brown/5 focus:border-brand/30 rounded-xl px-4 py-3 outline-none text-accent-brown font-bold transition-all shadow-sm"
                                                    />
                                                </div>

                                                {/* Map Preview */}
                                                {deliveryInfo.lat && deliveryInfo.lng && (
                                                    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-accent-brown/5 h-52 relative shadow-inner shadow-black/5">
                                                        <Map
                                                            mapId="4c730709b30c1be1"
                                                            defaultCenter={{ lat: deliveryInfo.lat, lng: deliveryInfo.lng }}
                                                            defaultZoom={16}
                                                            disableDefaultUI={true}
                                                            gestureHandling="greedy"
                                                            className="w-full h-full grayscale-[0.4] contrast-[1.1]"
                                                        >
                                                            <AdvancedMarker position={{ lat: deliveryInfo.lat, lng: deliveryInfo.lng! }}>
                                                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white border-[3px] border-white shadow-2xl ring-4 ring-blue-400/20">
                                                                    <User className="w-5 h-5" />
                                                                </div>
                                                            </AdvancedMarker>
                                                        </Map>
                                                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />
                                                        <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md rounded-lg px-3 py-1.5 shadow-sm">
                                                            <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">✓ Precision Verified</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {allAddresses.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddrModal(true)}
                                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark transition-all group w-fit mt-2"
                                                    >
                                                        Use a Saved Address <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-6 pt-6 border-t border-accent-brown/5">
                                    <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                                        <Store className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-accent-brown">Pick-up Location</h3>
                                        <p className="text-sm font-medium text-accent-brown/50">Select a clinic branch to pick up your items.</p>
                                    </div>
                                </div>

                                {/* Mixed Clinic Warning Banner */}
                                {isMixedCart && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4"
                                    >
                                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                                            <Info className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-wider mb-1">Logistics Optimization Note</h4>
                                            <p className="text-[10px] font-medium text-amber-700/70 leading-relaxed">
                                                Your cart contains items from different partner clinics. If you proceed with pickup, you may need to visit multiple locations.
                                                <button 
                                                    onClick={() => setFulfillmentMethod('delivery')}
                                                    className="ml-2 text-amber-900 underline font-black"
                                                >
                                                    Switch to Home Delivery?
                                                </button>
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Clinic Branch</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {clinics
                                                .filter(c => items.some(item => item.business_id === c.id))
                                                .flatMap(c => (c.branches || []).map((b: any) => {
                                                    const isSelected = deliveryInfo.clinic_id === c.id && deliveryInfo.branch_id === b.id;
                                                    return (
                                                        <button
                                                            key={`${c.id}-${b.id}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setDeliveryInfo(prev => ({
                                                                    ...prev,
                                                                    clinic_id: c.id,
                                                                    branch_id: b.id,
                                                                    address: `${b.address_line1}, ${b.address_line2}`,
                                                                    phone: b.phone || c.phone || prev.phone
                                                                }));
                                                                setSelectedBranch(b);
                                                                setSelectedClinic(c);
                                                                setShowBranchStreetView(false);
                                                                setBranchActiveMarker(null);
                                                                branchSvRef.current = null;
                                                            }}
                                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${isSelected ? 'border-brand bg-brand/5 shadow-md shadow-brand/10' : 'border-accent-brown/10 bg-accent-peach/5 hover:border-brand/30 hover:bg-white'}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="text-xs font-black text-accent-brown">
                                                                    {c.name} — <span className="text-brand">{b.address_line1 || ''}</span>
                                                                </span>
                                                                {b.is_main ? (
                                                                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">MAIN</span>
                                                                ) : (
                                                                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">BRANCH</span>
                                                                )}
                                                            </div>
                                                            {b.address_line2 && (
                                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-accent-brown/40 uppercase">
                                                                    <MapPin className="w-2.5 h-2.5" />
                                                                    {b.address_line2}
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                }))}
                                        </div>
                                    </div>
                                </div>

                                    {/* Branch Map Panel — appears when a branch is selected */}
                                    <AnimatePresence>
                                        {selectedBranch && selectedBranch.lat && selectedBranch.lng && (
                                            <motion.div
                                                key={`${selectedBranch.id}-map`}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden rounded-2xl border-2 border-accent-brown/5 shadow-lg"
                                            >
                                                <div className="relative" style={{ height: showBranchStreetView ? 480 : 300 }}>
                                                    <AnimatePresence mode="wait">
                                                        {!showBranchStreetView ? (
                                                            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                                                <Map
                                                                    mapId="4c730709b30c1be1"
                                                                    defaultCenter={
                                                                        deliveryInfo.lat && deliveryInfo.lng
                                                                            ? {
                                                                                lat: (Number(selectedBranch.lat) + deliveryInfo.lat) / 2,
                                                                                lng: (Number(selectedBranch.lng) + deliveryInfo.lng) / 2
                                                                              }
                                                                            : { lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) }
                                                                    }
                                                                    defaultZoom={deliveryInfo.lat && deliveryInfo.lng ? 13 : 15}
                                                                    gestureHandling="greedy"
                                                                    disableDefaultUI={false}
                                                                    mapTypeControl={false}
                                                                    streetViewControl={false}
                                                                    fullscreenControl={false}
                                                                    className="w-full h-full"
                                                                >
                                                                    {/* Clinic Pin */}
                                                                    <AdvancedMarker
                                                                        position={{ lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) }}
                                                                        onClick={() => setBranchActiveMarker(branchActiveMarker === 'branch' ? null : 'branch')}
                                                                    >
                                                                        <div className="w-10 h-10 bg-brand-dark rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl ring-4 ring-brand/20 cursor-pointer hover:scale-110 transition-transform">
                                                                            <Store className="w-5 h-5" />
                                                                        </div>
                                                                    </AdvancedMarker>

                                                                    {/* User delivery pin (if lat/lng saved) */}
                                                                    {deliveryInfo.lat && deliveryInfo.lng && (
                                                                        <AdvancedMarker
                                                                            position={{ lat: deliveryInfo.lat, lng: deliveryInfo.lng }}
                                                                            onClick={() => setBranchActiveMarker(branchActiveMarker === 'customer' ? null : 'customer')}
                                                                        >
                                                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg ring-4 ring-blue-400/20 cursor-pointer hover:scale-110 transition-transform">
                                                                                <User className="w-4 h-4" />
                                                                            </div>
                                                                        </AdvancedMarker>
                                                                    )}

                                                                    {/* Directions route */}
                                                                    {deliveryInfo.lat && deliveryInfo.lng && (
                                                                        <DirectionsLine
                                                                            userLat={deliveryInfo.lat}
                                                                            userLng={deliveryInfo.lng}
                                                                            clinicLat={Number(selectedBranch.lat)}
                                                                            clinicLng={Number(selectedBranch.lng)}
                                                                        />
                                                                    )}

                                                                    {/* Clinic InfoWindow */}
                                                                    {branchActiveMarker === 'branch' && (
                                                                        <InfoWindow
                                                                            position={{ lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) }}
                                                                            onCloseClick={() => setBranchActiveMarker(null)}
                                                                            headerDisabled={true}
                                                                        >
                                                                            <div className="p-3 w-[250px] font-sans flex flex-col gap-2 relative">
                                                                                <button onClick={() => setBranchActiveMarker(null)} className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-100 text-gray-400"><X className="w-3 h-3" /></button>
                                                                                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                                                                    <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center"><Store className="w-4 h-4 text-brand" /></div>
                                                                                    <div>
                                                                                        <p className="text-xs font-black text-brand-dark leading-tight">{selectedClinic?.name}</p>
                                                                                        <p className="text-[9px] font-bold text-accent-brown/50 uppercase tracking-widest">Clinic Branch</p>
                                                                                    </div>
                                                                                </div>
                                                                                <button onClick={() => {
                                                                                    const pos = { lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) };
                                                                                    setSvStartPos(pos);
                                                                                    branchSvRef.current = null;
                                                                                    setShowBranchStreetView(true);
                                                                                    setBranchActiveMarker(null);
                                                                                }} className="w-full bg-brand/10 text-brand-dark text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-2">
                                                                                    <Eye className="w-4 h-4" /> Street View
                                                                                </button>
                                                                                {deliveryInfo.lat && deliveryInfo.lng && (
                                                                                    <div className="w-full bg-brand-dark/5 border border-brand-dark/10 px-3 py-2 rounded-xl flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Truck className="w-3.5 h-3.5 text-brand-dark/50" />
                                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/50">Distance</span>
                                                                                        </div>
                                                                                        <span className="text-xs font-black text-brand-dark">{calcDist(deliveryInfo.lat, deliveryInfo.lng, Number(selectedBranch.lat), Number(selectedBranch.lng))}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </InfoWindow>
                                                                    )}

                                                                    {/* User InfoWindow */}
                                                                    {branchActiveMarker === 'customer' && deliveryInfo.lat && deliveryInfo.lng && (
                                                                        <InfoWindow
                                                                            position={{ lat: deliveryInfo.lat, lng: deliveryInfo.lng }}
                                                                            onCloseClick={() => setBranchActiveMarker(null)}
                                                                            headerDisabled={true}
                                                                        >
                                                                            <div className="p-3 w-[250px] font-sans flex flex-col gap-2 relative">
                                                                                <button onClick={() => setBranchActiveMarker(null)} className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-100 text-gray-400"><X className="w-3 h-3" /></button>
                                                                                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><User className="w-4 h-4 text-blue-600" /></div>
                                                                                    <div>
                                                                                        <p className="text-xs font-black text-brand-dark">{deliveryInfo.contactName || 'Your Location'}</p>
                                                                                        <p className="text-[9px] font-bold text-accent-brown/50 uppercase tracking-widest">Delivery Address</p>
                                                                                    </div>
                                                                                </div>
                                                                                <button onClick={() => {
                                                                                    if (deliveryInfo.lat && deliveryInfo.lng) {
                                                                                        setSvStartPos({ lat: deliveryInfo.lat, lng: deliveryInfo.lng });
                                                                                    }
                                                                                    branchSvRef.current = null;
                                                                                    setShowBranchStreetView(true);
                                                                                    setBranchActiveMarker(null);
                                                                                }} className="w-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                                                                    <Eye className="w-4 h-4" /> Street View
                                                                                </button>
                                                                                <div className="w-full bg-brand-dark/5 border border-brand-dark/10 px-3 py-2 rounded-xl flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Truck className="w-3.5 h-3.5 text-brand-dark/50" />
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/50">Distance</span>
                                                                                    </div>
                                                                                    <span className="text-xs font-black text-brand-dark">{calcDist(deliveryInfo.lat, deliveryInfo.lng, Number(selectedBranch.lat), Number(selectedBranch.lng))}</span>
                                                                                </div>
                                                                            </div>
                                                                        </InfoWindow>
                                                                    )}
                                                                </Map>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div key="sv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black rounded-2xl overflow-hidden">
                                                                {/* Professional Header Bar */}
                                                                <div className="absolute top-0 left-0 right-0 z-[30] bg-gradient-to-b from-black/80 to-transparent px-5 pt-4 pb-8 pointer-events-none flex items-start justify-between">
                                                                    <div className="flex items-center gap-3 pointer-events-none">
                                                                        <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center">
                                                                            <Eye className="w-4 h-4 text-white" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Immersive Street View</p>
                                                                            <p className="text-xs font-black text-white leading-tight">
                                                                                {svStartPos && deliveryInfo.lat && svStartPos.lat === deliveryInfo.lat
                                                                                    ? (deliveryInfo.contactName || 'Your Location')
                                                                                    : (selectedClinic?.name || 'Clinic Branch')}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => { setShowBranchStreetView(false); branchSvRef.current = null; }}
                                                                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500/80 hover:border-red-500 transition-all pointer-events-auto shadow-lg"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                                                {/* Street View — top 62% */}
                                                                <div className="flex-[0.62] relative">
                                                                    <div
                                                                        ref={(el) => {
                                                                            if (el && !branchSvRef.current) {
                                                                                const pos = svStartPos || { lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) };
                                                                                const pano = new google.maps.StreetViewPanorama(el, {
                                                                                    position: pos,
                                                                                    pov: { heading: 0, pitch: 0 },
                                                                                    zoom: 1,
                                                                                    addressControl: false,
                                                                                    fullscreenControl: false,
                                                                                    zoomControl: true,
                                                                                    linksControl: true,
                                                                                    panControl: false,
                                                                                    enableCloseButton: false,
                                                                                    motionTracking: false,
                                                                                });
                                                                                pano.addListener('position_changed', () => {
                                                                                    const p = pano.getPosition();
                                                                                    if (p) setPanoPosition({ lat: p.lat(), lng: p.lng() });
                                                                                });
                                                                                pano.addListener('pov_changed', () => {
                                                                                    const pov = pano.getPov();
                                                                                    setPanoPov({ heading: pov.heading, pitch: pov.pitch });
                                                                                });
                                                                                branchSvRef.current = pano;
                                                                                setPanoPosition(pos);
                                                                            }
                                                                        }}
                                                                        className="w-full h-full"
                                                                    />
                                                                    {/* Bottom fade into mini-map */}
                                                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                                                                </div>

                                                                {/* Mini-map — bottom 38% with route */}
                                                                <div className="flex-[0.38] relative overflow-hidden">
                                                                    <Map
                                                                        id="sv-minimap"
                                                                        mapId="46537618861d8583"
                                                                        defaultCenter={svStartPos || { lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) }}
                                                                        defaultZoom={15}
                                                                        disableDefaultUI={true}
                                                                        gestureHandling="greedy"
                                                                        className="w-full h-full"
                                                                    >
                                                                        <PanoMapSyncer position={panoPosition} />
                                                                        {deliveryInfo.lat && deliveryInfo.lng && (
                                                                            <DirectionsLine
                                                                                userLat={deliveryInfo.lat}
                                                                                userLng={deliveryInfo.lng}
                                                                                clinicLat={Number(selectedBranch.lat)}
                                                                                clinicLng={Number(selectedBranch.lng)}
                                                                            />
                                                                        )}
                                                                        {/* Current Street View position + heading arrow */}
                                                                        {panoPosition && (
                                                                            <AdvancedMarker position={panoPosition}>
                                                                                <div className="w-10 h-10 flex items-center justify-center" style={{ transform: `rotate(${panoPov.heading}deg)`, transition: 'transform 0.3s ease' }}>
                                                                                    <div className="w-5 h-5 bg-blue-500 rounded-full border-[3px] border-white shadow-2xl relative">
                                                                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-500" />
                                                                                    </div>
                                                                                </div>
                                                                            </AdvancedMarker>
                                                                        )}
                                                                        {/* Clinic pin */}
                                                                        <AdvancedMarker position={{ lat: Number(selectedBranch.lat), lng: Number(selectedBranch.lng) }}>
                                                                            <div className="w-8 h-8 bg-brand-dark rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl">
                                                                                <Store className="w-4 h-4" />
                                                                            </div>
                                                                        </AdvancedMarker>
                                                                        {/* User delivery pin */}
                                                                        {deliveryInfo.lat && deliveryInfo.lng && (
                                                                            <AdvancedMarker position={{ lat: deliveryInfo.lat, lng: deliveryInfo.lng }}>
                                                                                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                                                                                    <User className="w-3.5 h-3.5" />
                                                                                </div>
                                                                            </AdvancedMarker>
                                                                        )}
                                                                    </Map>

                                                                    {/* HUD overlay */}
                                                                    <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-2">
                                                                        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center">
                                                                                <MapPin className="w-3 h-3 text-blue-400" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[7px] font-black uppercase tracking-widest text-white/40">Heading</p>
                                                                                <p className="text-[10px] font-black text-white">{Math.round(panoPov.heading)}°</p>
                                                                            </div>
                                                                        </div>
                                                                        {deliveryInfo.lat && deliveryInfo.lng && (
                                                                            <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-lg bg-brand/30 flex items-center justify-center">
                                                                                    <Truck className="w-3 h-3 text-brand" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[7px] font-black uppercase tracking-widest text-white/40">Distance</p>
                                                                                    <p className="text-[10px] font-black text-white">{calcDist(deliveryInfo.lat, deliveryInfo.lng, Number(selectedBranch.lat), Number(selectedBranch.lng))}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Legend */}
                                                                    <div className="absolute bottom-3 right-3 z-10 pointer-events-none flex flex-col gap-1.5">
                                                                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                                                            <div className="w-3 h-3 rounded bg-brand-dark flex items-center justify-center"><Store className="w-2 h-2 text-white" /></div>
                                                                            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">{selectedClinic?.name || 'Clinic'}</span>
                                                                        </div>
                                                                        {deliveryInfo.lat && deliveryInfo.lng && (
                                                                            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                                                                <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center"><User className="w-2 h-2 text-white" /></div>
                                                                                <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">Your Location</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="p-4 bg-accent-peach/30 rounded-xl border border-brand/10">
                                        <p className="text-sm font-bold text-accent-brown mb-1">Pick up tomorrow after 10:00 AM</p>
                                        <p className="text-xs text-accent-brown/60">Please bring a valid ID and your order confirmation email when collecting your items.</p>
                                    </div>
                                </>
                            )}
                        </div>

                    {/* Vouchers & Rewards Section */}
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                                <Tag className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-accent-brown">Vouchers & Rewards</h3>
                                <p className="text-sm font-medium text-accent-brown/50">Apply your loyalty rewards for discounts</p>
                            </div>
                        </div>

                        {appliedVoucher ? (
                            <div className="p-4 bg-brand/10 border-2 border-brand/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg">
                                        <Gift className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-brand-dark mb-0.5">Applied Reward</p>
                                        <p className="font-black text-accent-brown text-sm">{appliedVoucher.title}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-brand">-₱{appliedVoucher.discount.toLocaleString()}</span>
                                    <button 
                                        onClick={() => setAppliedVoucher(null)}
                                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-accent-brown/40 hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="Enter voucher code"
                                            id="voucher-input"
                                            className="w-full bg-accent-peach/10 border-2 border-accent-brown/5 focus:border-brand/30 rounded-xl px-4 py-3.5 outline-none text-accent-brown font-black text-xs uppercase tracking-widest transition-all"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleApplyVoucher((e.target as HTMLInputElement).value);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('voucher-input') as HTMLInputElement;
                                            handleApplyVoucher(input.value);
                                        }}
                                        disabled={applyingVoucher}
                                        className="px-6 py-3.5 bg-brand-dark text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-brand-dark/10 flex items-center gap-2"
                                    >
                                        {applyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                    </button>
                                </div>

                                {myVouchers.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-accent-brown/5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Your Available Rewards</p>
                                        <div className="flex flex-wrap gap-2">
                                            {myVouchers.map((v) => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => handleApplyVoucher(v.code)}
                                                    className="px-4 py-2 bg-white border-2 border-accent-brown/5 hover:border-brand hover:bg-brand/5 rounded-xl transition-all group flex items-center gap-3 text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-accent-peach/30 flex items-center justify-center text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                                                        <Gift className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-accent-brown leading-tight mb-0.5">{v.title}</p>
                                                        <p className="text-[8px] font-bold text-accent-brown/40 uppercase tracking-widest">{v.code}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Payment Method Card */}
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-accent-peach/30 rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-accent-brown">Payment Method</h3>
                                <p className="text-sm font-medium text-accent-brown/50">All transactions are secure and encrypted.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* GCash via PayMongo */}
                            <button
                                onClick={() => setSelectedPayment('gcash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${selectedPayment === 'gcash' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'}`}
                            >
                                <Wallet className="w-8 h-8 shrink-0" />
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest block">GCash</span>
                                    <span className="text-[7px] font-bold uppercase tracking-widest opacity-50 block">via PayMongo</span>
                                </div>
                            </button>

                            {/* Maya via PayMongo */}
                            <button
                                onClick={() => setSelectedPayment('maya')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${selectedPayment === 'maya' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'}`}
                            >
                                <CreditCard className="w-8 h-8 shrink-0" />
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest block">Maya</span>
                                    <span className="text-[7px] font-bold uppercase tracking-widest opacity-50 block">via PayMongo</span>
                                </div>
                            </button>

                            {/* Cash */}
                            <button
                                onClick={() => setSelectedPayment('cash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer col-span-2 ${selectedPayment === 'cash' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'}`}
                            >
                                <Banknote className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center">
                                    {fulfillmentMethod === 'delivery' ? 'Cash on Delivery' : 'Cash on Pickup'}
                                </span>
                            </button>
                        </div>

                        {(selectedPayment === 'gcash' || selectedPayment === 'maya') && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3"
                            >
                                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-blue-700 leading-relaxed">
                                    You'll be redirected to a secure PayMongo payment page to complete your {selectedPayment === 'gcash' ? 'GCash' : 'Maya'} payment. Your order will be created instantly.
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-4">
                    <div className="bg-brand-dark rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 text-white sticky top-28 sm:top-32 lg:top-36">
                        <h3 className="text-xl font-black mb-6">Order Summary</h3>

                        <div className="space-y-4 mb-6">
                            {items.map((item) => (
                                <div key={`${item.id}-${item.variant}-${item.size}`} className="flex gap-4">
                                    <div className="w-16 h-16 bg-white/10 rounded-xl p-2 shrink-0">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-md" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                        <p className="text-xs text-white/50">{item.variant} • {item.size}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[10px] font-black text-brand tracking-widest">QTY: {item.quantity}</span>
                                            <span className="font-bold text-sm">₱{(Number(item.price) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/10 text-sm mb-6">
                            <div className="flex justify-between text-white/60">
                                <span>Subtotal ({totalItems} items)</span>
                                <span>₱{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Shipping Fees</span>
                                <span>{shippingFee > 0 ? `₱${shippingFee.toFixed(2)}` : 'FREE'}</span>
                            </div>
                            {appliedVoucher && (
                                <div className="flex justify-between text-brand font-bold">
                                    <span>Discount ({appliedVoucher.title})</span>
                                    <span>-₱{discount.toFixed(2)}</span>
                                </div>
                            )}
                            {!appliedVoucher && (
                                <div className="flex justify-between text-white/60">
                                    <span>Discount</span>
                                    <span className="text-brand">-₱0.00</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center py-6 border-t border-white/10 mb-6 sm:mb-8">
                            <span className="text-sm font-black uppercase tracking-widest">Total</span>
                            <span className="text-2xl sm:text-3xl font-black tracking-tighter">₱{grandTotal.toFixed(2)}</span>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handlePlaceOrder}
                            disabled={isPlacingOrder || items.length === 0}
                            className="bg-brand text-white w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPlacingOrder ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                                selectedPayment === 'cash' ? 'Place Order Now' : 'Proceed to Payment'
                            )}
                        </motion.button>

                        <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Secure SSL Checkout</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === MODALS === */}

            {/* Address Selection Modal */}
            <AnimatePresence>
                {showAddrModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-accent-brown/20 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-accent-brown/5 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-peach/10 rounded-full -ml-16 -mb-16 blur-3xl" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-accent-brown tracking-tighter">Change Address</h3>
                                        <p className="text-sm font-medium text-accent-brown/50">Select where to receive your order</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddrModal(false)}
                                        className="w-10 h-10 rounded-full bg-accent-peach/20 flex items-center justify-center text-accent-brown/40 hover:text-accent-brown transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {allAddresses.map((addr) => (
                                        <button
                                            key={addr.id}
                                            onClick={() => selectAddress(addr)}
                                            className="w-full text-left p-6 rounded-2xl border-2 border-accent-brown/5 hover:border-brand/40 hover:bg-brand/[0.02] transition-all group relative"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-accent-brown group-hover:text-brand-dark transition-colors">{addr.full_name}</span>
                                                    {addr.is_default && (
                                                        <span className="px-2 py-0.5 bg-brand-dark text-white text-[8px] font-black uppercase tracking-widest rounded-full">Default</span>
                                                    )}
                                                    <span className="px-2 py-0.5 bg-accent-peach/30 text-accent-brown/60 text-[8px] font-black uppercase tracking-widest rounded-full">{addr.label}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-accent-brown/40">{addr.phone}</span>
                                            </div>
                                            <p className="text-xs text-accent-brown/60 leading-relaxed font-medium">
                                                {addr.address_line1}<br />
                                                {addr.address_line2}
                                            </p>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 flex gap-4">
                                    <button
                                        onClick={() => setShowAddrModal(false)}
                                        className="flex-1 py-4 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-accent-brown/40 hover:text-accent-brown transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Link
                                        to="/dashboard/customer/account"
                                        className="flex-1 py-4 px-6 bg-brand-dark text-white rounded-xl font-black text-[10px] uppercase tracking-widest text-center shadow-lg shadow-brand/20 hover:bg-black hover:shadow-xl transition-all"
                                    >
                                        Add New Address
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Map Picker Modal */}
            <MapPickerModal
                isOpen={showPickerModal}
                onClose={() => setShowPickerModal(false)}
                onSelection={(address, lat, lng) => {
                    setDeliveryInfo(prev => ({
                        ...prev,
                        address,
                        lat,
                        lng,
                    }));
                    setShowPickerModal(false);
                }}
                initialLocation={deliveryInfo.lat && deliveryInfo.lng ? { lat: Number(deliveryInfo.lat), lng: Number(deliveryInfo.lng) } : undefined}
            />

            {/* Mixed Clinic Validation Modal */}
            <AnimatePresence>
                {showMixedModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden text-center"
                        >
                            <div className="relative">
                                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                                    <Sparkles className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-accent-brown leading-tight tracking-tighter mb-4">
                                    Efficiency Recommendation
                                </h3>
                                <p className="text-sm font-medium text-accent-brown/60 leading-relaxed mb-8">
                                    Your cart contains items from different clinics. While you can proceed, a single branch can only fulfill items from its own clinic. We suggest Home Delivery for your convenience.
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setFulfillmentMethod('delivery');
                                            setShowMixedModal(false);
                                        }}
                                        className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                                    >
                                        <Truck className="w-4 h-4" /> Switch to Home Delivery
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHasAcknowledgedMixed(true);
                                            setShowMixedModal(false);
                                        }}
                                        className="w-full py-4 bg-accent-peach/10 text-accent-brown/40 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-accent-peach/20 transition-all"
                                    >
                                        I Understand, Continue
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Overlay (Cash orders) */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/95 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="text-center"
                        >
                            <div className="w-24 h-24 bg-brand rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand/40">
                                <ShieldCheck className="w-12 h-12 text-brand-dark" />
                            </div>
                            <h2 className="text-4xl font-black text-brand tracking-tighter mb-4">Order Placed!</h2>
                            <p className="text-white/60 font-medium max-w-xs mx-auto mb-8">
                                Your order has been successfully sent to our clinic. Redirecting you to your orders...
                            </p>
                            <div className="flex justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default Checkout;
