import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Banknote, ShieldCheck, MapPin, Store, Truck } from 'lucide-react';

const Checkout = () => {
    const { items, totalAmount, totalItems, clearCart } = useCart();
    const navigate = useNavigate();
    const [selectedPayment, setSelectedPayment] = useState('card');
    const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const shippingFee = fulfillmentMethod === 'delivery' ? 150 : 0;

    if (items.length === 0) {
        return (
            <DashboardLayout title="Checkout">
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
                    <div className="w-24 h-24 bg-accent-peach/30 rounded-full flex items-center justify-center mb-6">
                        <ShieldCheck className="w-10 h-10 text-brand" />
                    </div>
                    <h2 className="text-3xl font-black text-accent-brown tracking-tighter mb-4">Your cart is empty</h2>
                    <p className="text-accent-brown/60 mb-8 font-medium">Add some items from our catalog to proceed with checkout.</p>
                    <button
                        onClick={() => navigate('/dashboard/user/catalog')}
                        className="bg-brand text-brand-dark px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-dark hover:text-white transition-all w-full shadow-xl shadow-brand/20"
                    >
                        Browse Catalog
                    </button>
                </div>
            </DashboardLayout>
        );
    }

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
                    paymentMethod: selectedPayment
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
                                <div className="flex items-center gap-4 mb-6 pt-6 border-t border-accent-brown/5">
                                    <div className="w-12 h-12 bg-accent-peach/30 rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-accent-brown">Delivery Details</h3>
                                        <p className="text-sm font-medium text-accent-brown/50">Where should we send your order?</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">First Name</label>
                                            <input type="text" defaultValue="Sarah" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Last Name</label>
                                            <input type="text" defaultValue="Connor" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Complete Address</label>
                                        <textarea rows={3} defaultValue="123 Pet Lovers Lane, Suite 4B, Metro District" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium resize-none"></textarea>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Contact Number</label>
                                        <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium" />
                                    </div>
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
                                        <select className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-black appearance-none cursor-pointer">
                                            <option value="main">Main Clinic - Los Angeles, CA</option>
                                            <option value="west">Westside Branch - Santa Monica, CA</option>
                                            <option value="east">Eastside Branch - Pasadena, CA</option>
                                        </select>
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

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <button
                                onClick={() => setSelectedPayment('card')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${selectedPayment === 'card' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
                            >
                                <CreditCard className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center">Credit Card</span>
                            </button>
                            <button
                                onClick={() => setSelectedPayment('gcash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${selectedPayment === 'gcash' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
                            >
                                <Banknote className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center">GCash</span>
                            </button>
                            <button
                                onClick={() => setSelectedPayment('paymaya')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${selectedPayment === 'paymaya' ? 'border-brand bg-brand/5 text-brand-dark' : 'border-accent-brown/10 text-accent-brown/40 hover:border-brand/30'
                                    }`}
                            >
                                <Banknote className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center">PayMaya</span>
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

                        {selectedPayment === 'card' && (
                            <div className="mt-6 space-y-4 pt-6 border-t border-accent-brown/5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Card Number</label>
                                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium font-mono" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Expiry Date</label>
                                        <input type="text" placeholder="MM/YY" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">CVV</label>
                                        <input type="text" placeholder="123" className="w-full bg-accent-peach/10 border border-accent-brown/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-accent-brown font-medium font-mono" />
                                    </div>
                                </div>
                            </div>
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
                            className="bg-brand text-brand-dark w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
