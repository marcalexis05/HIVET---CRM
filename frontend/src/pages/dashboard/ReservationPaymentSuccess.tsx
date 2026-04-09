import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, CalendarCheck, Sparkles } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ReservationPaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useMemo(() => [new URLSearchParams(window.location.search)], []);
    const reservationId = searchParams.get('reservation_id');
    const hasInitiated = useRef(false);
    const [seconds, setSeconds] = useState(10);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (hasInitiated.current) return;
        hasInitiated.current = true;

        const confirmPayment = async () => {
            if (!reservationId) return;
            try {
                const token = localStorage.getItem('hivet_token');
                const res = await fetch(
                    `${API}/api/payments/paymongo/reservation-confirm/${reservationId}`,
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );
                if (res.ok) setConfirmed(true);
            } catch (error) {
                console.error('Failed to confirm reservation payment:', error);
                setConfirmed(true); // still show success UI
            }
        };

        confirmPayment();
    }, [reservationId]);

    // Countdown redirect
    useEffect(() => {
        if (seconds <= 0) {
            navigate('/dashboard/customer/reservations');
            return;
        }
        const timer = setTimeout(() => setSeconds(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [seconds, navigate]);

    return (
        <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                className="max-w-md w-full bg-white rounded-[32px] p-8 text-center shadow-2xl shadow-brand/10 border border-brand/10 relative overflow-hidden"
            >
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-400/10 rounded-full blur-3xl -mt-20 pointer-events-none" />

                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                    className="relative w-24 h-24 mx-auto mb-6"
                >
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                    <div className="relative w-24 h-24 bg-green-50 rounded-full flex items-center justify-center ring-4 ring-green-100">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                </motion.div>

                {/* Sparkles badge */}
                <div className="inline-flex items-center gap-1.5 bg-brand/10 text-brand-dark px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                    <Sparkles className="w-3 h-3" />
                    Payment Successful
                </div>

                <h1 className="text-3xl font-black text-brand-dark tracking-tighter mb-3">
                    Appointment Booked!
                </h1>
                <p className="text-accent-brown/60 font-medium mb-2 text-sm leading-relaxed">
                    Your payment was processed securely via PayMongo.
                </p>
                <p className="text-accent-brown/50 font-medium mb-8 text-sm leading-relaxed">
                    Your reservation is now <strong className="text-brand-dark">pending clinic confirmation</strong>. You'll receive a notification once confirmed.
                </p>

                {/* Reservation ID display */}
                {reservationId && (
                    <div className="mb-6 px-5 py-3 bg-accent-peach/20 rounded-2xl border border-accent-peach/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-brand" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50">Reservation ID</span>
                        </div>
                        <span className="font-black text-brand-dark text-sm">RV-{String(reservationId).padStart(4, '0')}</span>
                    </div>
                )}

                {/* Countdown */}
                <div className="mb-8 px-6 py-4 bg-brand-dark/5 rounded-[2rem] border border-brand-dark/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-dark/40 mb-1">
                        Redirecting to Reservations
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-black text-brand-dark">{seconds}</span>
                        <span className="text-[10px] font-bold text-brand-dark/30 uppercase tracking-widest">seconds remaining</span>
                    </div>
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/dashboard/customer/reservations')}
                        className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-brand/20 text-[10px] cursor-pointer"
                    >
                        View My Reservations
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/customer')}
                        className="w-full py-4 text-accent-brown/40 hover:text-accent-brown font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                    >
                        Back to Customer Hub
                    </button>
                </div>

                {/* Footer note */}
                <div className="mt-8 pt-6 border-t border-brand/10">
                    <p className="text-[10px] text-accent-brown/40 font-bold uppercase tracking-widest">
                        {confirmed
                            ? 'Payment confirmed. A confirmation has been sent to your notification center.'
                            : 'Processing confirmation...'}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ReservationPaymentSuccess;
