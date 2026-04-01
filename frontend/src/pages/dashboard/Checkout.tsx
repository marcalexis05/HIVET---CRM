import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, Banknote, ShieldCheck, MapPin, Store, Truck, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Map, Marker } from '@vis.gl/react-google-maps';
import AddressAutocomplete from '../../components/AddressAutocomplete';

const Checkout = () => {
    const { items, totalAmount, totalItems, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedPayment, setSelectedPayment] = useState('gcash');
    const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Address & Profile State
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
    const [deliveryInfo, setDeliveryInfo] = useState({
        contactName: user?.name || '',
        address: '',
        phone: user?.phone || '',
        clinic_id: null as number | null,
        branch_id: null as number | null,
        lat: null as number | null,
        lng: null as number | null
    });

    const [clinics, setClinics] = useState<any[]>([]);

    const shippingFee = fulfillmentMethod === 'delivery' ? 150 : 0;

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

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            // Re-sync with user object in case it changed
            setLoadingData(true);
            try {
                // Fetch addresses
                const token = localStorage.getItem('hivet_token');
                const res = await fetch('http://localhost:8000/api/customer/addresses', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const addrList = data.addresses || []; // Access the addresses array from wrapper
                    setAllAddresses(addrList);

                    const defaultAddr = addrList.find((a: Address) => a.is_default) || addrList[0];
                    if (defaultAddr) {
                        setDeliveryInfo(prev => ({
                            ...prev,
                            contactName: defaultAddr.full_name || user.name || '',
                            address: `${defaultAddr.address_line1}, ${defaultAddr.address_line2}`,
                            phone: defaultAddr.phone || user.phone || '',
                            lat: defaultAddr.lat || null,
                            lng: defaultAddr.lng || null
                        }));
                    } else {
                        // No address found, use profile data
                        setDeliveryInfo(prev => ({
                            ...prev,
                            contactName: user.name || '',
                            address: '',
                            phone: user.phone || ''
                        }));
                    }
                } else {
                    // Fetch failed (e.g. 401), still set profile data fallbacks
                    setDeliveryInfo(prev => ({
                        ...prev,
                        contactName: user.name || '',
                        address: '',
                        phone: user.phone || ''
                    }));
                }

                // Fetch clinics for pickup
                const clinicsRes = await fetch('http://localhost:8000/api/clinics');
                if (clinicsRes.ok) {
                    const d = await clinicsRes.json();
                    setClinics(d.clinics || []);
                }
            } catch (err) {
                console.error('Error fetching checkout data:', err);
                // On network error, still ensure we have profile names
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
        setIsPlacingOrder(true);
        try {
            const token = localStorage.getItem('hivet_token');
            const response = await fetch('http://localhost:8000/api/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items,
                    totalAmount: totalAmount + shippingFee,
                    fulfillmentMethod,
                    paymentMethod: selectedPayment,
                    deliveryDetails: deliveryInfo,
                    clinic_id: deliveryInfo.clinic_id,
                    branch_id: deliveryInfo.branch_id,
                    delivery_lat: deliveryInfo.lat,
                    delivery_lng: deliveryInfo.lng
                })
            });

            if (response.ok) {
                clearCart();
                setShowSuccess(true);
                setTimeout(() => {
                    navigate('/dashboard/user/orders');
                }, 2000);
            } else {
                console.error('Failed to place order');
            }
        } catch (error) {
            console.error('Error placing order:', error);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <DashboardLayout title="Checkout">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
                {/* Left Column: Details */}
                <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                    {/* Delivery Section */}
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-accent-brown/5">
                        {/* Fulfillment Method Toggle */}
                        <div className="flex gap-4 mb-8">
                            <button
                                onClick={() => setFulfillmentMethod('delivery')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${fulfillmentMethod === 'delivery' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
                            >
                                <Truck className="w-5 h-5 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-widest text-left leading-tight">Home<br />Delivery</span>
                            </button>
                            <button
                                onClick={() => setFulfillmentMethod('pickup')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${fulfillmentMethod === 'pickup' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
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
                                                        <p className="text-[10px] font-medium text-red-500/60">Please add a delivery address in your settings to proceed.</p>
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
                                                    <AddressAutocomplete 
                                                        onAddressSelect={(full, _comp, geometry) => {
                                                            setDeliveryInfo(prev => ({ 
                                                                ...prev, 
                                                                address: full,
                                                                lat: geometry?.lat || null,
                                                                lng: geometry?.lng || null
                                                            }));
                                                        }}
                                                        defaultValue={deliveryInfo.address}
                                                        placeholder="Enter or pick delivery address"
                                                        className="!py-3 !rounded-xl shadow-sm border-2 border-transparent focus:border-brand/30"
                                                    />
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

                                                {deliveryInfo.address && (
                                                    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-accent-brown/5 h-48 relative shadow-inner shadow-black/5">
                                                        <Map
                                                            center={deliveryInfo.lat ? { lat: deliveryInfo.lat, lng: deliveryInfo.lng! } : { lat: 14.5995, lng: 120.9842 }}
                                                            defaultZoom={15}
                                                            disableDefaultUI={true}
                                                            gestureHandling={'greedy'}
                                                            className="w-full h-full grayscale-[0.5] contrast-[1.1]"
                                                        >
                                                            {deliveryInfo.lat && (
                                                                <Marker position={{ lat: deliveryInfo.lat, lng: deliveryInfo.lng! }} />
                                                            )}
                                                        </Map>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
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

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Clinic Branch</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {clinics.flatMap(c => {
                                                // Create unique list of branches to avoid duplicates
                                                // The backend 'branches' list includes everything.
                                                return (c.branches || []).map((b: any) => {
                                                    const isSelected = deliveryInfo.clinic_id === c.id && deliveryInfo.branch_id === b.id;
                                                    const street = b.address_line1 || "";
                                                    
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
                                                            }}
                                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${
                                                                isSelected 
                                                                    ? 'border-brand bg-brand/5 shadow-md shadow-brand/10' 
                                                                    : 'border-accent-brown/10 bg-accent-peach/5 hover:border-brand/30 hover:bg-white'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="text-xs font-black text-accent-brown">
                                                                    {c.name} — <span className="text-brand">{street}</span>
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
                                                });
                                            })}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-accent-peach/30 rounded-xl border border-brand/10">
                                        <p className="text-sm font-bold text-accent-brown mb-1">Pick up tomorrow after 10:00 AM</p>
                                        <p className="text-xs text-accent-brown/60">Please bring a valid ID and your order confirmation email when collecting your items.</p>
                                    </div>
                                </div>
                            </>
                        )}


                    </div>

                    {/* Payment Section */}
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
                            <button
                                onClick={() => setSelectedPayment('gcash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${selectedPayment === 'gcash' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
                            >
                                <Banknote className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center">GCash</span>
                            </button>
                            <button
                                onClick={() => setSelectedPayment('cash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${selectedPayment === 'cash' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
                            >
                                <Wallet className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                                    {fulfillmentMethod === 'delivery' ? <>Cash on<br />Delivery</> : <>Cash on<br />Pickup</>}
                                </span>
                            </button>
                        </div>


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
                            <div className="flex justify-between text-white/60">
                                <span>Discount</span>
                                <span className="text-brand">-₱0.00</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-6 border-t border-white/10 mb-6 sm:mb-8">
                            <span className="text-sm font-black uppercase tracking-widest">Total</span>
                            <span className="text-2xl sm:text-3xl font-black tracking-tighter">₱{(totalAmount + shippingFee).toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={isPlacingOrder}
                            className="bg-brand text-white w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPlacingOrder ? 'Processing...' : 'Place Order Now'}
                        </button>

                        <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Secure SSL Checkout</span>
                        </div>
                    </div>
                </div>
            </div>

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
                            {/* Decorative background elements */}
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
                                        ✕
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
                                        to="/dashboard/user/account"
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

            {/* Success Overlay */}
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
