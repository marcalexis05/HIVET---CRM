import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight, Plus, X, AlertCircle, CheckCircle, Loader2, CalendarX } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const API = 'http://localhost:8000';

interface Reservation {
    id: string;
    pet_name: string;
    service: string;
    date: string;
    time: string;
    status: 'Pending' | 'Confirmed' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
    location: string;
    notes: string;
    total: number;
}

const STATUS_STYLES: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Confirmed': 'bg-blue-100 text-blue-700',
    'Ready for Pickup': 'bg-green-100 text-green-700',
    'Completed': 'bg-accent-brown/5 text-accent-brown/40',
    'Cancelled': 'bg-red-100 text-red-500',
};

const SERVICE_PRICES: Record<string, number> = {
    'Grooming': 150,
    'Vet Consultation': 200,
    'Boarding': 300,
    'Dental Cleaning': 250,
};

const LOCATIONS = ['Main Clinic - Los Angeles', 'Westside Branch', 'Downtown Clinic', 'Pasadena Branch'];
const TIMES = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

const defaultForm = { pet_name: '', service: 'Grooming', date: '', time: '10:00 AM', location: LOCATIONS[0], notes: '' };

const UserReservations = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        fetch(`${API}/api/reservations`)
            .then(r => r.json())
            .then(d => { setReservations(d.reservations); setLoading(false); })
            .catch(() => { setError('Could not load reservations. Is the backend running?'); setLoading(false); });
    }, []);

    const activeReservation = reservations.find(r => r.status === 'Ready for Pickup' || r.status === 'Confirmed' || r.status === 'Pending');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setReservations(prev => [data.reservation, ...prev]);
            setShowModal(false);
            setForm(defaultForm);
            showToast('Reservation created successfully!');
        } catch {
            showToast('Failed to create reservation. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        setCancellingId(id);
        try {
            const res = await fetch(`${API}/api/reservations/${id}/cancel`, { method: 'PATCH' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setReservations(prev => prev.map(r => r.id === id ? data.reservation : r));
            showToast('Reservation cancelled.');
        } catch {
            showToast('Could not cancel this reservation.', 'error');
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <DashboardLayout title="Reservations">
            <div className="space-y-8">

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}
                        >
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm font-medium text-accent-brown/50">{reservations.length} reservation{reservations.length !== 1 ? 's' : ''} total</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-brand-dark/20"
                    >
                        <Plus className="w-4 h-4" /> New Reservation
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-brand-dark animate-spin" />
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4 text-red-600">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <p className="font-medium text-sm">{error}</p>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && reservations.length === 0 && (
                    <div className="bg-white rounded-[2rem] p-16 flex flex-col items-center gap-6 text-center shadow-xl shadow-accent-brown/5 border border-white">
                        <div className="w-20 h-20 bg-accent-peach/30 rounded-full flex items-center justify-center">
                            <CalendarX className="w-10 h-10 text-accent-brown/40" />
                        </div>
                        <div>
                            <h3 className="font-black text-accent-brown text-2xl tracking-tight mb-2">No reservations yet</h3>
                            <p className="text-accent-brown/50 text-sm font-medium">Book your first appointment and we'll take care of the rest.</p>
                        </div>
                        <button onClick={() => setShowModal(true)} className="btn-primary !px-8 !py-3 !text-xs">
                            Book Now
                        </button>
                    </div>
                )}

                {/* Active Reservation Highlight */}
                {!loading && !error && activeReservation && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-brand-dark rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-12 text-white relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-8"
                    >
                        <div className="relative z-10 w-full lg:w-2/3">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeReservation.status === 'Ready for Pickup' ? 'bg-green-500/20 text-green-300 border-green-500/30' : activeReservation.status === 'Confirmed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
                                    {activeReservation.status}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Order {activeReservation.id}</span>
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter mb-4">
                                {activeReservation.status === 'Ready for Pickup'
                                    ? 'Your order is packed and waiting!'
                                    : activeReservation.status === 'Confirmed'
                                        ? `${activeReservation.service} confirmed for ${activeReservation.pet_name}!`
                                        : `${activeReservation.service} pending for ${activeReservation.pet_name}.`}
                            </h2>
                            <p className="text-white/60 font-medium text-sm md:text-base max-w-md">
                                {activeReservation.service} · {activeReservation.date} at {activeReservation.time}
                                {activeReservation.notes ? ` · ${activeReservation.notes}` : ''}
                            </p>
                        </div>

                        <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0 min-w-[250px]">
                            <div className="flex items-center gap-3 text-sm font-bold text-white mb-2">
                                <MapPin className="w-4 h-4 text-brand" />
                                {activeReservation.location}
                            </div>
                            <div className="flex items-center gap-3 text-sm font-bold text-white mb-6">
                                <Clock className="w-4 h-4 text-brand" />
                                Open until 7:00 PM
                            </div>
                            {(activeReservation.status === 'Pending' || activeReservation.status === 'Confirmed') && (
                                <button
                                    onClick={() => handleCancel(activeReservation.id)}
                                    disabled={cancellingId === activeReservation.id}
                                    className="w-full bg-red-500/20 text-red-300 border border-red-500/30 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    {cancellingId === activeReservation.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    Cancel Reservation
                                </button>
                            )}
                        </div>

                        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-[80px]" />
                    </motion.div>
                )}

                {/* Reservation History */}
                {!loading && !error && reservations.length > 0 && (
                    <div>
                        <h3 className="text-xl font-black text-accent-brown tracking-tighter mb-6">All Reservations</h3>
                        <div className="space-y-4">
                            {reservations.map((res, i) => (
                                <motion.div
                                    key={res.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${STATUS_STYLES[res.status]}`}>
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{res.id}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLES[res.status]}`}>
                                                    {res.status}
                                                </span>
                                            </div>
                                            <p className="font-bold text-accent-brown mb-1">{res.service} — {res.pet_name}</p>
                                            <div className="flex items-center flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {res.date} · {res.time}</span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {res.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-accent-brown/10 pt-4 md:pt-0 md:pl-6 gap-3">
                                        <p className="font-black text-accent-brown text-lg">₱{res.total.toFixed(2)}</p>
                                        {(res.status === 'Pending' || res.status === 'Confirmed') ? (
                                            <button
                                                onClick={() => handleCancel(res.id)}
                                                disabled={cancellingId === res.id}
                                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                {cancellingId === res.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                Cancel
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-dark group-hover:text-brand transition-colors">
                                                View Details <ChevronRight className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* New Reservation Modal */}
                <AnimatePresence>
                    {showModal && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowModal(false)}
                                className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 100 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 100 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-0 w-full max-w-4xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                                    <div className="flex flex-row items-center justify-between p-5 xs:p-6 sm:p-8 border-b border-accent-brown/5 shrink-0 bg-accent-peach/5 gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tighter">New Reservation</h2>
                                            <p className="text-[10px] sm:text-xs font-medium text-accent-brown/50 mt-1 uppercase tracking-widest font-black">Book an appointment</p>
                                        </div>
                                        <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-white hover:bg-red-50 text-accent-brown/50 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 xs:p-6 sm:p-8 no-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 xs:gap-y-6">

                                            {/* Left Column */}
                                            <div className="space-y-4 xs:space-y-6">
                                                {/* Pet Name */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Pet Name *</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        value={form.pet_name}
                                                        onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
                                                        placeholder="e.g. Max"
                                                        className="w-full px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-sm font-bold text-accent-brown outline-none transition-colors placeholder:text-accent-brown/30"
                                                    />
                                                </div>

                                                {/* Service */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Service *</label>
                                                    <select
                                                        value={form.service}
                                                        onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-sm font-bold text-accent-brown outline-none transition-colors appearance-none cursor-pointer"
                                                    >
                                                        {Object.keys(SERVICE_PRICES).map(s => (
                                                            <option key={s} value={s}>{s} — ₱{SERVICE_PRICES[s]}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Location */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Location *</label>
                                                    <select
                                                        value={form.location}
                                                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-sm font-bold text-accent-brown outline-none transition-colors appearance-none cursor-pointer"
                                                    >
                                                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-4 xs:space-y-6 flex flex-col">
                                                {/* Date & Time */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Date *</label>
                                                        <input
                                                            required
                                                            type="date"
                                                            value={form.date}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                                            className="w-full px-3 xs:px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-xs xs:text-sm font-bold text-accent-brown outline-none transition-colors cursor-pointer"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Time *</label>
                                                        <select
                                                            value={form.time}
                                                            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                                            className="w-full px-3 xs:px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-xs xs:text-sm font-bold text-accent-brown outline-none transition-colors appearance-none cursor-pointer"
                                                        >
                                                            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                <div className="flex-1 min-h-[80px] xs:min-h-[100px]">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Notes (optional)</label>
                                                    <textarea
                                                        value={form.notes}
                                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                                        placeholder="Any special requirements..."
                                                        className="w-full h-[calc(100%-24px)] px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-xs sm:text-sm font-medium text-accent-brown outline-none transition-colors resize-none placeholder:text-accent-brown/30"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="mt-6 xs:mt-8 pt-6 xs:pt-8 border-t border-accent-brown/5 flex flex-col sm:flex-row items-center justify-between gap-4 xs:gap-6">
                                            {/* Price estimate */}
                                            <div className="w-full sm:w-auto bg-brand/10 rounded-xl px-6 py-4 flex items-center justify-between sm:min-w-[200px] border border-brand/20">
                                                <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Est. Total</span>
                                                <span className="font-black text-brand-dark text-xl">₱{SERVICE_PRICES[form.service]?.toFixed(2) || '0.00'}</span>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="w-full sm:w-auto px-10 bg-brand text-brand-dark py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 disabled:opacity-50 flex-1 sm:max-w-[300px]"
                                            >
                                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Confirm Reservation
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default UserReservations;
