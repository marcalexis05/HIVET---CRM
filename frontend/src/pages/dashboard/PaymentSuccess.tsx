import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [searchParams] = useMemo(() => [new URLSearchParams(window.location.search)], []);
    const orderId = searchParams.get('order_id');
    const hasInitiated = useRef(false);
    const [seconds, setSeconds] = useState(10);

    useEffect(() => {
        if (hasInitiated.current) return;
        hasInitiated.current = true;

        const confirmPayment = async () => {
            if (!orderId) return;
            try {
                const token = localStorage.getItem('hivet_token');
                await fetch(`${API}/api/payments/paymongo/confirm/${orderId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Failed to confirm payment:', error);
            }
        };

        confirmPayment();
        clearCart();
    }, [clearCart, orderId]);

    // Secure Countdown Logic
    useEffect(() => {
        if (seconds <= 0) {
            navigate('/dashboard/customer/orders');
            return;
        }

        const timer = setTimeout(() => {
            setSeconds(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [seconds, navigate]);

    return (
        <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-[32px] p-8 text-center shadow-xl shadow-brand/5 border border-brand/10"
            >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                
                <h1 className="text-3xl font-black text-brand-dark mb-3">Payment Successful!</h1>
                <p className="text-accent-brown/60 font-medium mb-8 text-sm">
                    Your payment was processed securely via PayMongo. Your order has been placed and is now being reviewed by the clinic.
                </p>

                <div className="mb-8 px-6 py-4 bg-brand-dark/5 rounded-[2rem] border border-brand-dark/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-dark/40 mb-1">Redirecting to Dashboard</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-black text-brand-dark">{seconds}</span>
                        <span className="text-[10px] font-bold text-brand-dark/30 uppercase tracking-widest">seconds remaining</span>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => navigate('/dashboard/customer/orders')}
                        className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-brand/20 text-[10px] cursor-pointer"
                    >
                        View My Orders
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <button 
                        onClick={() => navigate('/dashboard/customer/catalog')}
                        className="w-full bg-brand/10 text-brand-dark py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand/20 transition-all text-[10px] cursor-pointer"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Continue Shopping
                    </button>

                    <button 
                        onClick={() => navigate('/dashboard/customer')}
                        className="w-full py-4 text-accent-brown/40 hover:text-accent-brown font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                    >
                        Back to Customer Hub
                    </button>
                </div>
                
                <div className="mt-8 pt-8 border-t border-brand/10">
                    <p className="text-[10px] text-accent-brown/40 font-bold uppercase tracking-widest">
                        A confirmation receipt has been sent to your email.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;

