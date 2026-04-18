import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    Wallet, Banknote, ShieldCheck, MapPin, Store, Truck, Loader2,
    Tag, CheckCircle, X, Gift, Sparkles,
    Eye, User, Info, QrCode, Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import MapPickerModal from '../../components/MapPickerModal';
import ModernModal from '../../components/ModernModal';
import QrCodeModal from '../../components/QrCodeModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Haversine distance
const calcDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return '...';
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
};

// Draws a driving route between two points on a Map
const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng }: { userLat: number | null, userLng: number | null, clinicLat: number | null, clinicLng: number | null }) => {
    const map = useMap();
    useEffect(() => {
        const maps = (window as any).google?.maps;
        if (!maps || !map || !userLat || !userLng || !clinicLat || !clinicLng) return;
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

// Fits the map bounds to show all provided points
const FitBoundsHandler = ({ points }: { points: { lat: number; lng: number }[] }) => {
    const map = useMap();
    const pointsKey = JSON.stringify(points);

    useEffect(() => {
        const google = (window as any).google;
        if (!map || !google || points.length < 2) return;
        const bounds = new google.maps.LatLngBounds();
        points.forEach(p => bounds.extend(p));
        map.fitBounds(bounds, 70);
    }, [map, pointsKey]);
    return null;
};

// Re-centers the map only when the provided coordinates change, without locking it
const MapReCenterer = ({ lat, lng }: { lat: number | null, lng: number | null }) => {
    const map = useMap();
    useEffect(() => {
        if (map && lat && lng) {
            map.panTo({ lat, lng });
        }
    }, [map, lat, lng]);
    return null;
};

const Checkout = () => {
    const { items: cartItems, clearCart } = useCart();
    const [items, setItems] = useState<any[]>(cartItems);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [payingOrder, setPayingOrder] = useState<any>(null);

    // Consolidate initialization logic
    useEffect(() => {
        const orderJson = localStorage.getItem('hivet_checkout_paying_order');
        const filteredJson = localStorage.getItem('hivet_checkout_filtered');

        if (orderJson) {
            // Priority 1: Resuming an existing order payment
            try {
                const order = JSON.parse(orderJson);
                console.log('Checkout: Loading items from paying order', order.id);
                if (order.items) setItems(order.items);
                return; // Early return to prevent overwriting with cart items
            } catch (e) {
                console.error('Checkout: Error parsing paying order', e);
            }
        }

        if (filteredJson) {
            // Priority 2: Filtered selection from cart drawer
            try {
                const filtered = JSON.parse(filteredJson);
                console.log('Checkout: Loading filtered items from storage', filtered);
                setItems(filtered);
                return;
            } catch (e) {
                console.error('Checkout: Error parsing filtered items', e);
            }
        }

        // Priority 3: Fallback to full cart
        console.log('Checkout: Using standard cart items', cartItems);
        setItems(cartItems);
    }, [cartItems]);

    // Derived totals for the selected items
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);

    // Fulfillment & payment
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState<'gcash' | 'maya' | 'qrph' | 'cash'>('qrph');
    const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMixedModal, setShowMixedModal] = useState(false);
    const [hasAcknowledgedMixed, setHasAcknowledgedMixed] = useState(false);
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // QRPh Payment State
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState('');
    const [qrStatus, setQrStatus] = useState<'pending' | 'succeeded' | 'expired' | 'processing'>('pending');
    const pollingInterval = useRef<any>(null);

    // Stop polling on unmount
    useEffect(() => {
        // Handle step from URL
        const step = searchParams.get('step');
        if (step) setCurrentStep(Number(step));

        // Handle existing order payment
        const orderJson = localStorage.getItem('hivet_checkout_paying_order');
        if (orderJson) {
            try {
                const order = JSON.parse(orderJson);
                setPayingOrder(order);
                setFulfillmentMethod(order.fulfillment_method);

                // Pre-fill delivery info from order
                setDeliveryInfo(prev => ({
                    ...prev,
                    contactName: order.contact_name || prev.contactName,
                    phone: order.contact_phone || prev.phone,
                    address: order.delivery_address || '',
                    lat: order.delivery_lat || null,
                    lng: order.delivery_lng || null,
                    branch_id: order.branch_id || null,
                    clinic_id: order.clinic_id || null
                }));

                if (order.branch_id) {
                    // Match branch for map
                    const fetchBranch = async () => {
                        try {
                            const res = await fetch(`${API}/api/clinics/branches/${order.branch_id}`);
                            if (res.ok) {
                                const data = await res.json();
                                setSelectedBranch(data.branch);
                                setSelectedClinic({ id: data.branch.clinic_id, name: data.branch.clinic_name });

                                // Ensure delivery info matches the fetched branch
                                setDeliveryInfo(prev => ({
                                    ...prev,
                                    clinic_id: data.branch.clinic_id,
                                    branch_id: data.branch.id,
                                    address: `${data.branch.address_line1}, ${data.branch.address_line2}`,
                                    phone: data.branch.phone || prev.phone
                                }));
                            }
                        } catch (err) { console.error('Error fetching branch:', err); }
                    };
                    fetchBranch();
                }
            } catch (err) {
                console.error('Error parsing paying order:', err);
            }
        }

        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            // We DON'T clear paying order on unmount yet, we wait for success
        };
    }, [searchParams]);

    const startPolling = (intentId: string) => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setQrStatus('processing');

        pollingInterval.current = setInterval(async () => {
            try {
                const res = await fetch(`${API}/api/payments/paymongo/status/${intentId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'succeeded') {
                        setQrStatus('succeeded');
                        if (pollingInterval.current) clearInterval(pollingInterval.current);

                        // Clear cart and redirect after a delay
                        clearCart();
                        localStorage.removeItem('hivet_checkout_paying_order');
                        localStorage.removeItem('hivet_checkout_filtered');
                        setTimeout(() => {
                            setShowQrModal(false);
                            navigate('/dashboard/customer/orders');
                        }, 2000);
                    } else if (data.status === 'expired') {
                        setQrStatus('expired');
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 5000);
    };



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
    const [shippingFee, setShippingFee] = useState(0);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [selectedClinic, setSelectedClinic] = useState<any>(null);
    const [showBranchStreetView, setShowBranchStreetView] = useState(false);
    const [branchActiveMarker, setBranchActiveMarker] = useState<'branch' | 'customer' | null>(null);
    const [svStartPos, setSvStartPos] = useState<{ lat: number; lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState({ heading: 0, pitch: 0 });
    const [panoPosition, setPanoPosition] = useState<{ lat: number; lng: number } | null>(null);
    const branchSvRef = useRef<google.maps.StreetViewPanorama | null>(null);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const r = 6371; // Radius of earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    };

    const calculateDistanceFee = (dist: number) => {
        const base = 50;
        if (dist <= 5) return base;
        if (dist <= 9) return base + (dist - 5) * 6;
        return base + 24 + (dist - 9) * 5;
    };

    useEffect(() => {
        if (fulfillmentMethod === 'delivery' && deliveryInfo.lat && deliveryInfo.lng) {
            // Find a reference branch to calculate distance from.
            // In a real multi-clinic cart, this would be more complex (e.g., nearest branch of first clinic)
            let referenceBranch = selectedBranch;
            if (!referenceBranch && items.length > 0) {
                const firstItemClinicId = items[0].business_id || items[0].clinic_id;
                const clinic = clinics.find(c => c.id === firstItemClinicId);
                if (clinic && clinic.branches && clinic.branches.length > 0) {
                    referenceBranch = clinic.branches.find((b: any) => b.is_main) || clinic.branches[0];
                }
            }

            if (referenceBranch && referenceBranch.lat && referenceBranch.lng) {
                const dist = getDistance(referenceBranch.lat, referenceBranch.lng, deliveryInfo.lat, deliveryInfo.lng);
                const fee = calculateDistanceFee(dist);
                setShippingFee(Math.round(fee));
            } else {
                setShippingFee(50); // Fallback base fee
            }
        } else {
            setShippingFee(0);
        }
    }, [fulfillmentMethod, deliveryInfo.lat, deliveryInfo.lng, clinics, items, selectedBranch]);
    const isMixedCart = Array.from(new Set(items.map(item => item.business_id).filter(id => id != null))).length > 1;


    // Voucher state
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState<{ id: number; title: string; discount: number; code: string; type: string } | null>(null);
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
                code: data.code,
                type: data.type
            });
        } catch (err: any) {
            setModal({
                isOpen: true,
                title: 'Voucher Error',
                message: err.message || 'Invalid voucher code.',
                type: 'error'
            });
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
            setModal({
                isOpen: true,
                title: 'Logistics Requirement',
                message: 'Please define a delivery destination protocol before proceeding with order authorization.',
                type: 'error'
            });
            return;
        }
        if (fulfillmentMethod === 'pickup') {
            if (isMixedCart && !hasAcknowledgedMixed) {
                setShowMixedModal(true);
                return;
            }
            if (!deliveryInfo.clinic_id) {
                setModal({
                    isOpen: true,
                    title: 'Branch Specification',
                    message: 'A valid clinic branch must be selected for pickup synchronization.',
                    type: 'error'
                });
                return;
            }
        }

        setIsPlacingOrder(true);
        try {
            const token = localStorage.getItem('hivet_token');

            if (payingOrder) {
                // Settlement Flow for existing order
                const res = await fetch(`${API}/api/payments/paymongo/order-recheckout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order_id: payingOrder.id,
                        payment_method: selectedPayment === 'qrph' ? 'qrph' : selectedPayment
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (selectedPayment === 'qrph' && data.qr_code) {
                        setQrData(data.qr_code);
                        setShowQrModal(true);
                        startPolling(data.intent_id);
                    } else if (data.checkout_url) {
                        window.location.href = data.checkout_url;
                    }
                } else {
                    const err = await res.json();
                    setModal({
                        isOpen: true,
                        title: 'Settlement Error',
                        message: err.detail || 'The payment gateway failed to initiate the settlement protocol. Please try again.',
                        type: 'error'
                    });
                }
                setIsPlacingOrder(false);
                return;
            }

            const derivedClinicId = deliveryInfo.clinic_id || selectedClinic?.id || (items.length > 0 ? (items[0].business_id || items[0].clinic_id) : null);
            const derivedBranchId = deliveryInfo.branch_id || selectedBranch?.id;

            const orderPayload = {
                items,
                totalAmount: totalAmount + shippingFee - (appliedVoucher?.discount || 0),
                fulfillmentMethod,
                paymentMethod: selectedPayment,
                deliveryDetails: deliveryInfo,
                clinic_id: derivedClinicId,
                branch_id: derivedBranchId,
                delivery_lat: deliveryInfo.lat,
                delivery_lng: deliveryInfo.lng,
                voucher_code: appliedVoucher?.code || null,
            };

            if (selectedPayment === 'gcash' || selectedPayment === 'maya' || selectedPayment === 'qrph') {
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

                    if (selectedPayment === 'qrph' && data.qr_code) {
                        setQrData(data.qr_code);
                        setShowQrModal(true);
                        startPolling(data.intent_id);
                    } else if (data.checkout_url) {
                        // Redirect to PayMongo checkout page (GCash/Maya)
                        window.location.href = data.checkout_url;
                    }
                } else {
                    const errData = await response.json();
                    setModal({
                        isOpen: true,
                        title: 'Gateway Failure',
                        message: errData.detail || 'Failed to synchronize with the payment processor. Please verify your connection.',
                        type: 'error'
                    });
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
                    setModal({
                        isOpen: true,
                        title: 'Transaction Failure',
                        message: 'The order database could not be updated at this time. Please retry the authorization.',
                        type: 'error'
                    });
                }
            }
        } catch (error) {
            console.error('Error placing order:', error);
            setModal({
                isOpen: true,
                title: 'Critical Breach',
                message: 'An unexpected system error occurred during transaction processing. Protocol aborted.',
                type: 'danger'
            });
        } finally {
            setIsPlacingOrder(false);
        }
    };

    // Cleanup paying state on success
    useEffect(() => {
        if (showSuccess) {
            localStorage.removeItem('hivet_checkout_paying_order');
            localStorage.removeItem('hivet_checkout_filtered');
        }
    }, [showSuccess]);

    const discount = appliedVoucher?.discount || 0;
    const grandTotal = Math.max(0, totalAmount + shippingFee - discount);

    return (
        <DashboardLayout title="Checkout">
            {/* Premium Stepper */}
            <div className="mb-16 max-w-2xl mx-auto">
                <div className="relative flex justify-between items-center px-4">
                    {/* Background Progress Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-accent-brown/10 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2">
                        <motion.div
                            className="h-full bg-brand shadow-[0_0_15px_rgba(245,134,52,0.4)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                            transition={{ duration: 0.8, ease: "circOut" }}
                        />
                    </div>

                    {[
                        { step: 1, label: 'Identity', icon: User },
                        { step: 2, label: 'Logistics', icon: Truck },
                        { step: 3, label: 'Settlement', icon: Wallet }
                    ].map((s, idx) => (
                        <div key={s.step} className="relative z-10">
                            <motion.button
                                onClick={() => currentStep > s.step && setCurrentStep(s.step)}
                                whileHover={currentStep > s.step ? { scale: 1.1 } : {}}
                                whileTap={{ scale: 0.9 }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 ${currentStep === s.step
                                        ? 'bg-brand text-white shadow-2xl shadow-brand/40 scale-125 ring-4 ring-white'
                                        : currentStep > s.step
                                            ? 'bg-white border-2 border-brand text-brand shadow-lg'
                                            : 'bg-white border border-accent-brown/10 text-accent-brown/20'
                                    }`}
                            >
                                <s.icon className={`transition-all duration-500 ${currentStep === s.step ? 'w-5 h-5' : 'w-4 h-4'}`} />
                            </motion.button>
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <span className={`text-[8px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${currentStep === s.step ? 'text-accent-brown opacity-100' : 'text-black opacity-60'
                                    }`}>
                                    {s.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
                {/* Left Column Content Rendering based on currentStep */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-[2rem] p-8 sm:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                                    <div className="flex items-start justify-between mb-12 relative z-10">
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black text-accent-brown italic tracking-tighter leading-none">Identity Verification</h3>
                                            <p className="text-[10px] font-bold text-black tracking-[0.2em]">Primary Consumer Information</p>
                                        </div>
                                        <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-accent-brown shadow-sm">
                                            <User className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 relative z-10">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown ml-1">Full Legal Name</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={deliveryInfo.contactName}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                        setDeliveryInfo(prev => ({ ...prev, contactName: val }));
                                                    }}
                                                    placeholder="e.g. Marc Alexis Evangelista"
                                                    className="w-full bg-white border-b-2 border-gray-100 focus:border-brand px-1 py-4 outline-none text-accent-brown font-black transition-all placeholder:text-black tracking-wider text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown ml-1">Secure Contact Number</label>
                                            <div className="relative group">
                                                <input
                                                    type="tel"
                                                    value={deliveryInfo.phone}
                                                    onChange={e => {
                                                        let val = e.target.value;
                                                        const oldVal = deliveryInfo.phone || '';
                                                        
                                                        // Prevent letters and symbols
                                                        val = val.replace(/[^0-9+]/g, '');
                                                        
                                                        // Handle deletion
                                                        if (val.length < oldVal.length) {
                                                            setDeliveryInfo(prev => ({ ...prev, phone: val }));
                                                            return;
                                                        }

                                                        // Auto-formatting (only when adding)
                                                        if (val.length > 0 && !val.startsWith('+63')) {
                                                            if (val.startsWith('09')) val = '+63' + val.substring(1);
                                                            else if (val.startsWith('9')) val = '+63' + val;
                                                            else if (val.startsWith('0')) val = '+63' + val.substring(1);
                                                            else if (val.startsWith('+')) {
                                                                if (val.length > 1 && !val.startsWith('+63')) {
                                                                    // Do nothing, let them type
                                                                }
                                                            } else {
                                                                val = '+639' + val;
                                                            }
                                                        }

                                                        // Maximum length for PH mobile
                                                        if (val.length <= 13) {
                                                            setDeliveryInfo(prev => ({ ...prev, phone: val }));
                                                        }
                                                    }}
                                                    placeholder="+639XXXXXXXXX"
                                                    className="w-full bg-white border-b-2 border-gray-100 focus:border-brand px-1 py-4 outline-none text-accent-brown font-black transition-all placeholder:text-gray-200 tracking-wider text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4 md:col-span-2 opacity-60 mt-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown ml-1">Registered Channel</label>
                                            <div className="relative group">
                                                <input
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="w-full bg-white border-b-2 border-gray-100 px-1 py-4 outline-none text-accent-brown font-black cursor-not-allowed tracking-wider text-sm"
                                                />
                                            </div>
                                            <p className="text-[9px] font-bold text-black tracking-[0.1em] mt-2 italic">Authentication completed via registered email</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={() => {
                                            if (!deliveryInfo.contactName || !deliveryInfo.phone) {
                                                setModal({
                                                    isOpen: true,
                                                    title: 'Identity Requirement',
                                                    message: 'Valid contact nomenclature and digits are required for logistics coordination.',
                                                    type: 'error'
                                                });
                                                return;
                                            }
                                            setCurrentStep(2);
                                        }}
                                        className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-brand-dark/20 flex items-center gap-3 group"
                                    >
                                        Shipping Details
                                        <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-brand transition-colors">
                                            <MapPin className="w-3 h-3 text-white" />
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* Fulfillment + Delivery/Pickup Card */}
                                <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                                    {/* Premium Fulfillment Toggle */}
                                    <div className="flex gap-4 mb-10">
                                        <button
                                            onClick={() => setFulfillmentMethod('delivery')}
                                            className={`flex-1 p-6 rounded-[2rem] border-2 transition-all duration-500 relative overflow-hidden group ${fulfillmentMethod === 'delivery' ? 'border-brand bg-brand/5 shadow-xl shadow-brand/10' : 'border-gray-100 bg-gray-50/50 grayscale hover:grayscale-0 hover:border-brand/40 hover:bg-white'}`}
                                        >
                                            <div className="relative z-10 flex flex-col items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${fulfillmentMethod === 'delivery' ? 'bg-brand text-white' : 'bg-gray-100 text-black'}`}>
                                                    <Truck className="w-6 h-6" />
                                                </div>
                                                <div className="text-center">
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.25em] block mb-1 ${fulfillmentMethod === 'delivery' ? 'text-accent-brown' : 'text-black'}`}>Doorstep Delivery</span>
                                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${fulfillmentMethod === 'delivery' ? 'text-brand' : 'text-black'}`}>Express Logistic Channel</p>
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setFulfillmentMethod('pickup')}
                                            className={`flex-1 p-6 rounded-[2rem] border-2 transition-all duration-500 relative overflow-hidden group ${fulfillmentMethod === 'pickup' ? 'border-brand bg-brand/5 shadow-xl shadow-brand/10' : 'border-gray-100 bg-gray-50/50 grayscale hover:grayscale-0 hover:border-brand/40 hover:bg-white'}`}
                                        >
                                            <div className="relative z-10 flex flex-col items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${fulfillmentMethod === 'pickup' ? 'bg-brand text-white' : 'bg-gray-100 text-black'}`}>
                                                    <Store className="w-6 h-6" />
                                                </div>
                                                <div className="text-center">
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.25em] block mb-1 ${fulfillmentMethod === 'pickup' ? 'text-accent-brown' : 'text-black'}`}>Direct Pickup</span>
                                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${fulfillmentMethod === 'pickup' ? 'text-brand' : 'text-black'}`}>Partner Clinic Settlement</p>
                                                </div>
                                            </div>
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
                                                        <p className="text-sm font-medium text-black">Where should we send your order?</p>
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
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-black">Delivery Address</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="text"
                                                                        readOnly
                                                                        value={deliveryInfo.address}
                                                                        placeholder="Tap 'Edit' to set your delivery location"
                                                                        className="w-full bg-white border-2 border-accent-brown/5 focus:border-brand/30 rounded-xl px-4 py-4 outline-none text-accent-brown font-bold transition-all shadow-sm pr-20 cursor-default"
                                                                    />
                                                                    <button
                                                                        onClick={() => setShowPickerModal(true)}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-brand-dark text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Map Preview */}
                                                            {deliveryInfo.lat && deliveryInfo.lng && (
                                                                <div className="mt-4 rounded-3xl overflow-hidden border-2 border-accent-brown/5 h-64 relative shadow-inner shadow-black/5">
                                                                    <Map
                                                                        mapId="4c730709b30c1be1"
                                                                        defaultCenter={{ lat: deliveryInfo.lat!, lng: deliveryInfo.lng! }}
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
                                                                        <MapReCenterer lat={deliveryInfo.lat} lng={deliveryInfo.lng} />
                                                                    </Map>
                                                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                                                                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-white/20">
                                                                        <div className="flex items-center gap-2">
                                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Precision Verified</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
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
                                                    <p className="text-sm font-medium text-black">Select a clinic branch to pick up your items.</p>
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
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-black">Clinic Branch</label>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {clinics
                                                            .filter(c => {
                                                                if (payingOrder) {
                                                                    // Primary: Match by clinic/business ID
                                                                    if (payingOrder.clinic_id || payingOrder.business_id) {
                                                                        return Number(payingOrder.clinic_id || payingOrder.business_id) === c.id;
                                                                    }
                                                                    // Fallback: Match by branch if the parent ID is missing (robustness for existing orders)
                                                                    if (payingOrder.branch_id) {
                                                                        return (c.branches || []).some((b: any) => Number(b.id) === Number(payingOrder.branch_id));
                                                                    }
                                                                }
                                                                return items.some(item => (Number(item.business_id) === c.id || Number(item.clinic_id) === c.id));
                                                            })
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
                                                                        className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center gap-5 ${isSelected ? 'border-brand bg-brand/5 shadow-xl shadow-brand/10' : 'border-gray-100 bg-white hover:border-brand/30 hover:shadow-lg'}`}
                                                                    >
                                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all ${isSelected ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-black border-gray-100'}`}>
                                                                            <MapPin className="w-6 h-6" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="text-[11px] font-black text-accent-brown uppercase italic tracking-tighter leading-none">{c.name}</span>
                                                                                {b.is_main && (
                                                                                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent-brown text-white">Central Hub</span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-[10px] font-bold text-black uppercase tracking-widest truncate">{b.address_line1}</p>
                                                                            <p className="text-[9px] font-black text-brand uppercase tracking-widest mt-1 opacity-60">Verified Logistics Branch</p>
                                                                        </div>
                                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand border-brand' : 'border-gray-100'}`}>
                                                                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            }))}
                                                    </div>
                                                </div>

                                                {/* Branch Map Panel — appears when a branch is selected */}
                                                <AnimatePresence>
                                                    {selectedBranch && selectedBranch.lat && selectedBranch.lng && (
                                                        <>
                                                            <motion.div
                                                                key={`${selectedBranch.id}-map`}
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="overflow-hidden rounded-2xl border-2 border-accent-brown/5 shadow-lg"
                                                            >
                                                                <div className="relative" style={{ height: showBranchStreetView ? 480 : 300 }}>
                                                                    <Map
                                                                        mapId="sv-minimap"
                                                                        defaultCenter={{ lat: selectedBranch.lat!, lng: selectedBranch.lng! }}
                                                                        defaultZoom={15}
                                                                        disableDefaultUI={true}
                                                                        gestureHandling="greedy"
                                                                        className="w-full h-full"
                                                                    >
                                                                        <AdvancedMarker
                                                                            position={{ lat: selectedBranch.lat!, lng: selectedBranch.lng! }}
                                                                            onClick={() => setBranchActiveMarker('branch')}
                                                                        >
                                                                            <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white border-[3px] border-white shadow-xl ring-4 ring-brand/20">
                                                                                <Store className="w-5 h-5" />
                                                                            </div>
                                                                        </AdvancedMarker>

                                                                        {deliveryInfo.lat && deliveryInfo.lng && (
                                                                            <>
                                                                                <AdvancedMarker
                                                                                    position={{ lat: deliveryInfo.lat!, lng: deliveryInfo.lng! }}
                                                                                    onClick={() => setBranchActiveMarker('customer')}
                                                                                >
                                                                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                                                                                        <User className="w-4 h-4" />
                                                                                    </div>
                                                                                </AdvancedMarker>
                                                                                <DirectionsLine
                                                                                    userLat={deliveryInfo.lat!}
                                                                                    userLng={deliveryInfo.lng!}
                                                                                    clinicLat={selectedBranch.lat!}
                                                                                    clinicLng={selectedBranch.lng!}
                                                                                />
                                                                            </>
                                                                        )}

                                                                        <PanoMapSyncer position={panoPosition} />

                                                                        {deliveryInfo.lat && deliveryInfo.lng && (
                                                                            <FitBoundsHandler points={[
                                                                                { lat: deliveryInfo.lat, lng: deliveryInfo.lng },
                                                                                { lat: selectedBranch.lat, lng: selectedBranch.lng }
                                                                            ]} />
                                                                        )}
                                                                    </Map>

                                                                    {/* Street View Toggle & Panel */}
                                                                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
                                                                        <button
                                                                            onClick={() => setShowBranchStreetView(!showBranchStreetView)}
                                                                            className={`p-3 rounded-xl shadow-xl backdrop-blur-md transition-all flex items-center gap-2 ${showBranchStreetView ? 'bg-brand text-white px-5' : 'bg-white/90 text-accent-brown hover:bg-white'}`}
                                                                        >
                                                                            {showBranchStreetView ? (
                                                                                <>
                                                                                    <MapPin className="w-4 h-4" />
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Back to Map</span>
                                                                                </>
                                                                            ) : (
                                                                                <Eye className="w-5 h-5" />
                                                                            )}
                                                                        </button>
                                                                    </div>

                                                                    {showBranchStreetView && (
                                                                        <div className="absolute inset-0 bg-black z-10">
                                                                            <div
                                                                                ref={(el) => {
                                                                                    const google = (window as any).google;
                                                                                    if (el && google) {
                                                                                        if (!branchSvRef.current) {
                                                                                            const panorama = new google.maps.StreetViewPanorama(el, {
                                                                                                position: { lat: selectedBranch.lat!, lng: selectedBranch.lng! },
                                                                                                pov: panoPov,
                                                                                                zoom: 1,
                                                                                                addressControl: false,
                                                                                                showRoadLabels: false,
                                                                                                disableDefaultUI: true
                                                                                            });
                                                                                            panorama.addListener('pov_changed', () => setPanoPov(panorama.getPov()));
                                                                                            panorama.addListener('position_changed', () => {
                                                                                                const pos = panorama.getPosition();
                                                                                                if (pos && typeof pos.toJSON === 'function') {
                                                                                                    setPanoPosition(pos.toJSON());
                                                                                                } else if (pos) {
                                                                                                    setPanoPosition({ lat: pos.lat(), lng: pos.lng() });
                                                                                                } else {
                                                                                                    setPanoPosition(null);
                                                                                                }
                                                                                            });
                                                                                            branchSvRef.current = panorama;
                                                                                        }
                                                                                    } else {
                                                                                        branchSvRef.current = null;
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full"
                                                                            />

                                                                            {/* Mini Map Widget with Directions */}
                                                                            <div className="absolute bottom-6 left-6 w-56 h-56 rounded-3xl overflow-hidden border-[4px] border-white shadow-2xl z-20 group">
                                                                                <Map
                                                                                    mapId="sv-widget-map"
                                                                                    defaultCenter={{ lat: selectedBranch.lat!, lng: selectedBranch.lng! }}
                                                                                    defaultZoom={14}
                                                                                    disableDefaultUI={true}
                                                                                    gestureHandling="none"
                                                                                    className="w-full h-full grayscale-[0.2]"
                                                                                >
                                                                                    <AdvancedMarker position={{ lat: selectedBranch.lat!, lng: selectedBranch.lng! }}>
                                                                                        <div className="w-6 h-6 bg-brand rounded-full border-2 border-white shadow-lg" />
                                                                                    </AdvancedMarker>

                                                                                    {deliveryInfo.lat && deliveryInfo.lng && (
                                                                                        <>
                                                                                            <AdvancedMarker position={{ lat: deliveryInfo.lat!, lng: deliveryInfo.lng! }}>
                                                                                                <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                                                                                            </AdvancedMarker>
                                                                                            <DirectionsLine
                                                                                                userLat={deliveryInfo.lat!}
                                                                                                userLng={deliveryInfo.lng!}
                                                                                                clinicLat={selectedBranch.lat!}
                                                                                                clinicLng={selectedBranch.lng!}
                                                                                            />
                                                                                            <FitBoundsHandler points={[
                                                                                                { lat: deliveryInfo.lat!, lng: deliveryInfo.lng! },
                                                                                                { lat: selectedBranch.lat!, lng: selectedBranch.lng! }
                                                                                            ]} />
                                                                                        </>
                                                                                    )}
                                                                                </Map>
                                                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-3">
                                                                                    <p className="text-[8px] font-black text-white uppercase tracking-widest text-center">Route Preview</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="py-4 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest text-black hover:text-accent-brown transition-colors"
                                    >
                                        Back to Identity
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (fulfillmentMethod === 'delivery' && !deliveryInfo.address) {
                                                setModal({
                                                    isOpen: true,
                                                    title: 'Logistics Protocol',
                                                    message: 'A verified delivery destination is required for logistics synchronization.',
                                                    type: 'error'
                                                });
                                                return;
                                            }
                                            if (fulfillmentMethod === 'pickup' && !deliveryInfo.branch_id) {
                                                setModal({
                                                    isOpen: true,
                                                    title: 'Branch Requirement',
                                                    message: 'Please specify a clinic branch for pickup protocol alignment.',
                                                    type: 'error'
                                                });
                                                return;
                                            }
                                            setCurrentStep(3);
                                        }}
                                        className="px-10 py-4 bg-brand text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-dark transition-all shadow-xl shadow-brand/20 flex items-center gap-3 group"
                                    >
                                        Payment Method
                                        <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors group-hover:text-brand">
                                            <Wallet className="w-3 h-3" />
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* Payment Method Card */}
                                <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 bg-accent-peach/30 rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                                            <Wallet className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-accent-brown">Payment Method</h3>
                                            <p className="text-sm font-medium text-black">All transactions are secure and encrypted.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { id: 'qrph', label: 'QRPh', icon: QrCode, color: 'text-brand', bg: 'bg-brand/5', border: 'border-brand', active: 'shadow-brand/20' },
                                            { id: 'gcash', label: 'GCash', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', active: 'shadow-blue-500/20' },
                                            { id: 'maya', label: 'Maya', icon: Smartphone, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', active: 'shadow-emerald-500/20' },
                                            { id: 'cash', label: fulfillmentMethod === 'delivery' ? 'COD' : 'COP', icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', active: 'shadow-amber-500/20' }
                                        ].map((method) => {
                                            const isActive = selectedPayment === method.id;
                                            return (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setSelectedPayment(method.id as any)}
                                                    className={`p-6 rounded-3xl border-2 transition-all duration-500 relative group overflow-hidden ${isActive ? `${method.border} ${method.bg} shadow-2xl ${method.active}` : 'border-gray-100 bg-white hover:border-brand/40 grayscale hover:grayscale-0'}`}
                                                >
                                                    <div className="flex flex-col items-center gap-4 relative z-10">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-white shadow-lg' : 'bg-gray-50'}`}>
                                                            <method.icon className={`w-6 h-6 ${method.color}`} />
                                                        </div>
                                                        <div className="text-center">
                                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-0.5 ${isActive ? 'text-accent-brown' : 'text-black'}`}>{method.label}</span>
                                                            <p className={`text-[7px] font-bold uppercase tracking-widest ${isActive ? 'text-brand opacity-100' : 'opacity-0'}`}>Encrypted Channel</p>
                                                        </div>
                                                    </div>
                                                    {isActive && (
                                                        <div className="absolute top-2 right-2">
                                                            <CheckCircle className={`w-4 h-4 ${method.color}`} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selectedPayment === 'qrph' && (
                                        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                                            <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
                                            <p className="text-xs font-bold text-blue-700 leading-relaxed">
                                                A QRPh code will be generated for you to scan and pay using any banking or e-wallet app.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Vouchers & Rewards Card */}
                                <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                                            <Tag className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-accent-brown">Vouchers & Rewards</h3>
                                            <p className="text-sm font-medium text-black">Apply your loyalty rewards for discounts</p>
                                        </div>
                                    </div>

                                    {appliedVoucher ? (
                                        <div className="p-5 bg-brand/10 border-2 border-brand/20 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand/20">
                                                    <Gift className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark mb-0.5">Applied Reward</p>
                                                    <p className="font-black text-accent-brown text-sm">{appliedVoucher.title}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-brand text-lg">-₱{appliedVoucher.discount.toLocaleString()}</span>
                                                <button onClick={() => setAppliedVoucher(null)} className="p-2 hover:bg-white rounded-xl transition-colors text-black hover:text-red-500">
                                                    <X className="w-5 h-5" />
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
                                                        id="voucher-input-step3"
                                                        className="w-full bg-accent-peach/10 border-2 border-accent-brown/5 focus:border-brand/30 rounded-xl px-4 py-4 outline-none text-accent-brown font-black text-xs uppercase tracking-widest transition-all"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleApplyVoucher((e.target as HTMLInputElement).value);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const input = document.getElementById('voucher-input-step3') as HTMLInputElement;
                                                        handleApplyVoucher(input.value);
                                                    }}
                                                    disabled={applyingVoucher}
                                                    className="px-8 py-4 bg-brand-dark text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
                                                >
                                                    {applyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                                </button>
                                            </div>
                                            {myVouchers.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-4 border-t border-accent-brown/5">
                                                    {myVouchers.map((v) => (
                                                        <button
                                                            key={v.id}
                                                            onClick={() => handleApplyVoucher(v.code)}
                                                            className="px-4 py-2.5 bg-white border-2 border-accent-brown/5 hover:border-brand hover:bg-brand/5 rounded-xl transition-all group flex items-center gap-3 text-left"
                                                        >
                                                            <Gift className="w-4 h-4 text-brand group-hover:scale-110 transition-transform" />
                                                            <div>
                                                                <p className="text-[10px] font-black text-accent-brown leading-tight">{v.title}</p>
                                                                <p className="text-[8px] font-bold text-black uppercase tracking-widest">{v.code}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="py-4 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest text-black hover:text-accent-brown transition-colors"
                                    >
                                        Back to Shipment
                                    </button>
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={isPlacingOrder || items.length === 0}
                                        className="px-12 py-5 bg-emerald-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 flex items-center gap-4 group active:scale-95"
                                    >
                                        {isPlacingOrder ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing...</>
                                        ) : (
                                            <>
                                                {selectedPayment === 'cash' ? 'Confirm Order' : 'Complete Payment'}
                                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-emerald-600 transition-colors">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: High-Density Order Summary (Vibrant Orange) */}
                <div className="lg:col-span-4">
                    <div className="bg-brand rounded-[2.5rem] p-8 text-white sticky top-32 shadow-2xl border border-white/20 overflow-hidden">
                        {/* Aesthetic Background Detail */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black italic tracking-tighter text-white">Receipt Summary</h3>
                                <Tag className="w-5 h-5 text-white" />
                            </div>

                            <div className="space-y-5 mb-10 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.variant}-${item.size}`} className="flex gap-4 group">
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl p-2 shrink-0 border border-white/10 transition-all group-hover:bg-white/30">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="font-black text-[10px] tracking-wider truncate mb-0.5 text-white">{item.name}</h4>
                                            <p className="text-[9px] font-bold text-white tracking-widest">{item.variant} | {item.size}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[10px] font-black text-white tracking-[0.2em]">x{item.quantity}</span>
                                                <span className="font-black text-xs tabular-nums text-white">₱{(Number(item.price) * item.quantity).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-8 border-t border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-10">
                                <div className="flex justify-between text-white">
                                    <span>Subtotal</span>
                                    <span className="text-white">₱{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-white">
                                    <span>Logistics Fee</span>
                                    <span className="text-white font-black italic">
                                        {shippingFee > 0 ? `₱${shippingFee.toLocaleString()}` : 'FREE'}
                                    </span>
                                </div>
                                {appliedVoucher && (
                                    <div className="flex justify-between text-white">
                                        <span>Reward Applied</span>
                                        <span>-₱{discount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end mb-10 border-b border-white/20 pb-8">
                                <div>
                                    <p className="text-[9px] font-black text-white uppercase tracking-[0.3em] mb-1">Total Settlement</p>
                                    <h2 className="text-4xl font-black tracking-tighter italic text-white leading-none">₱{grandTotal.toLocaleString()}</h2>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    if (currentStep === 1) {
                                        if (!deliveryInfo.contactName || !deliveryInfo.phone) {
                                            setModal({
                                                isOpen: true,
                                                title: 'Identity Missing',
                                                message: 'Authorization requires valid contact details.',
                                                type: 'error'
                                            });
                                            return;
                                        }
                                        setCurrentStep(2);
                                    } else if (currentStep === 2) {
                                        if (fulfillmentMethod === 'delivery' && !deliveryInfo.address) {
                                            setModal({
                                                isOpen: true,
                                                title: 'Logistics Error',
                                                message: 'Delivery protocol requires a verified address.',
                                                type: 'error'
                                            });
                                            return;
                                        }
                                        if (fulfillmentMethod === 'pickup' && !deliveryInfo.branch_id) {
                                            setModal({
                                                isOpen: true,
                                                title: 'Logistics Error',
                                                message: 'Pickup protocol requires a selected branch.',
                                                type: 'error'
                                            });
                                            return;
                                        }
                                        setCurrentStep(3);
                                    } else {
                                        handlePlaceOrder();
                                    }
                                }}
                                disabled={isPlacingOrder || items.length === 0}
                                className="w-full py-5 bg-white text-brand rounded-2xl font-black uppercase tracking-[0.25em] text-[11px] hover:bg-black hover:text-white transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 transition-all duration-500"
                            >
                                {isPlacingOrder ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing Transact</>
                                ) : (
                                    <>
                                        {currentStep < 3 ? 'Proceed Next' : 'Authorize Payment'}
                                        <div className="w-6 h-6 bg-brand/10 rounded-lg flex items-center justify-center">
                                            <CheckCircle className="w-3 h-3" />
                                        </div>
                                    </>
                                )}
                            </motion.button>
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
                                        <p className="text-sm font-medium text-black">Select where to receive your order</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddrModal(false)}
                                        className="w-10 h-10 rounded-full bg-accent-peach/20 flex items-center justify-center text-black hover:text-accent-brown transition-colors"
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
                                                    <span className="px-2 py-0.5 bg-accent-peach/30 text-black text-[8px] font-black uppercase tracking-widest rounded-full">{addr.label}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-black">{addr.phone}</span>
                                            </div>
                                            <p className="text-xs text-black leading-relaxed font-medium">
                                                {addr.address_line1}<br />
                                                {addr.address_line2}
                                            </p>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 flex gap-4">
                                    <button
                                        onClick={() => setShowAddrModal(false)}
                                        className="flex-1 py-4 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-black hover:text-accent-brown transition-colors"
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

            {/* Success Modal (Cash orders) */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-accent-brown/20 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-12 text-center shadow-[0_50px_100px_rgba(245,134,52,0.15)] border border-brand/10 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                            
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-brand rounded-[2.25rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-brand/30">
                                    <ShieldCheck className="w-12 h-12 text-white" />
                                </div>
                                <h2 className="text-4xl font-black text-accent-brown tracking-tighter mb-4 italic uppercase leading-none">Order Placed!</h2>
                                <p className="text-accent-brown/40 font-bold text-sm leading-relaxed max-w-[280px] mx-auto mb-10 uppercase tracking-wide">
                                    Your order has been successfully sent to our clinic. Redirecting to your terminal...
                                </p>
                                <div className="flex justify-center items-center gap-4">
                                    <span className="text-[10px] font-black text-brand uppercase tracking-[0.4em]">Redirecting</span>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Global Modal */}
            <ModernModal
                isOpen={modal.isOpen}
                onClose={() => setModal(m => ({ ...m, isOpen: false }))}
                onConfirm={modal.onConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />


            <QrCodeModal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                qrData={qrData}
                amount={totalAmount + shippingFee - (appliedVoucher?.discount || 0)}
                reference={`HV-2026-${(user?.id || 0).toString().padStart(6, '0')}`}
                status={qrStatus}
            />
        </DashboardLayout>
    );
};

export default Checkout;
