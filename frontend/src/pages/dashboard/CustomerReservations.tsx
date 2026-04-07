import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight, Plus, X, AlertCircle, CheckCircle, Loader2, CalendarX, Clock3 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Branch {
    id: number;
    name: string;
    is_main: boolean;
    phone: string;
    address_line1: string;
    address_line2: string;
    lat?: number;
    lng?: number;
}

interface Clinic {
    id: number;
    name: string;
    address_line1: string;
    address_line2: string;
    zip: string;
    phone: string;
    lat?: number;
    lng?: number;
    branches: Branch[];
    services: { id: number; name: string; price: number; description: string | null; duration_minutes: number }[];
    hours: { day_of_week: number; day_name: string; is_open: boolean; open_time: string; close_time: string; break_start: string | null; break_end: string | null }[];
    special_hours: { specific_date: string; is_open: boolean; open_time: string; close_time: string; break_start: string | null; break_end: string | null }[];
}

// A flattened selectable option combining clinic + branch
interface ClinicOption {
    key: string;          // unique: `{clinic_id}-{branch_id}` or `{clinic_id}-main`
    clinic_id: number;
    branch_id: number | null;
    label: string;        // shown in dropdown
    address_line1: string;
    address_line2: string;
    zip: string;
    phone: string;
    clinic_name: string;
    lat?: number;
    lng?: number;
    services: Clinic['services'];
    hours: Clinic['hours'];
    special_hours: Clinic['special_hours'];
}

interface Reservation {
    id: string;
    db_id: number;
    pet_name: string;
    service: string;
    date: string;
    time: string;
    status: string;
    location: string;
    notes: string;
    total: number;
    created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Confirmed': 'bg-blue-100 text-blue-700',
    'Ready for Pickup': 'bg-green-100 text-green-700',
    'Completed': 'bg-accent-brown/5 text-accent-brown/40',
    'Cancelled': 'bg-red-100 text-red-500',
};

const BASE_TIMES = [
    '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'
];

const defaultForm = {
    pet_name: '',
    service: '',
    service_id: 0,
    date: '',
    time: '09:00 AM',
    clinic_id: 0,
    clinic_option_key: '',
    notes: '',
};

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const CustomerReservations = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showBranches, setShowBranches] = useState(false);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);

    const token = localStorage.getItem('hivet_token');
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Build flat clinic options list containing all branches so selectedOption works correctly
    const allClinicOptions: ClinicOption[] = clinics.flatMap(c => {
        if (!c.branches || c.branches.length === 0) {
            return [{
                key: `${c.id}-main`,
                clinic_id: c.id,
                branch_id: null as number | null,
                label: c.name,
                address_line1: c.address_line1,
                address_line2: c.address_line2,
                zip: c.zip,
                phone: c.phone,
                clinic_name: c.name,
                lat: c.lat,
                lng: c.lng,
                services: c.services,
                hours: c.hours,
                special_hours: c.special_hours,
            }];
        }
        return c.branches.map(b => ({
            key: `${c.id}-${b.id}`,
            clinic_id: c.id,
            branch_id: b.id as number | null,
            label: `${c.name} — ${b.name}`,
            address_line1: b.address_line1,
            address_line2: b.address_line2,
            zip: c.zip,
            phone: b.phone || c.phone,
            clinic_name: c.name,
            lat: b.lat,
            lng: b.lng,
            services: c.services,
            hours: c.hours,
            special_hours: c.special_hours,
        }));
    });

    const selectedOption: ClinicOption | null = allClinicOptions.find(o => o.key === form.clinic_option_key) || null;
    const availableServices = selectedOption?.services || [];
    const selectedService = availableServices.find(s => s.id === form.service_id) || null;
    const estimatedTotal = selectedService?.price || 0;

    // Hours for the selected date (Checks special overrides first)
    const todayHours = (() => {
        if (!selectedOption || !form.date) return null;
        const special = selectedOption.special_hours?.find(sh => sh.specific_date === form.date);
        if (special) return special;
        const dow = new Date(form.date).getDay();
        return selectedOption.hours.find(h => h.day_of_week === dow);
    })();

    // Reset show-branches when a different clinic/branch is selected
    useEffect(() => { setShowBranches(false); }, [form.clinic_option_key]);

    // Fetch booked slots for selected clinic and date
    useEffect(() => {
        if (form.clinic_id && form.date) {
            fetch(`${API}/api/reservations/booked?clinic_id=${form.clinic_id}&date=${form.date}`, { headers: authHeaders })
                .then(res => res.json())
                .then(data => setBookedSlots(data.booked_times || []))
                .catch(() => setBookedSlots([]));
        } else {
            setBookedSlots([]);
        }
    }, [form.clinic_id, form.date]);

    // Clear selected time if it becomes unavailable
    useEffect(() => {
        if (!form.time || !form.date || !form.clinic_id) return;
        
        const isStillAvailable = BASE_TIMES.filter(t => {
            const isBooked = bookedSlots.includes(t);
            let isPast = false;
            try {
                const [hourMin, meridiem] = t.split(' ');
                const [h, m] = hourMin.split(':');
                let hourInt = parseInt(h);
                if (meridiem === 'PM' && hourInt !== 12) hourInt += 12;
                if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
                const slotDate = new Date(form.date);
                slotDate.setHours(hourInt, parseInt(m), 0, 0);
                isPast = slotDate.getTime() < new Date().getTime();
            } catch { return false; }
            
            let outsideHours = false;
            if (todayHours && todayHours.is_open) {
                try {
                    const parseT = (s: string) => {
                        const [hm, mer] = s.split(' ');
                        let [h, min] = hm.split(':').map(Number);
                        if (mer === 'PM' && h !== 12) h += 12;
                        if (mer === 'AM' && h === 12) h = 0;
                        return h * 60 + min;
                    };
                    const slotMins = parseT(t);
                    const openMins = parseT(todayHours.open_time);
                    const closeMins = parseT(todayHours.close_time);
                    if (slotMins < openMins || slotMins >= closeMins) outsideHours = true;
                    if (todayHours.break_start && todayHours.break_end) {
                        const bStart = parseT(todayHours.break_start);
                        const bEnd = parseT(todayHours.break_end);
                        if (slotMins >= bStart && slotMins < bEnd) outsideHours = true;
                    }
                } catch { outsideHours = true; }
            } else {
                outsideHours = true;
            }
            return !isPast && !isBooked && !outsideHours;
        }).includes(form.time);

        if (!isStillAvailable) {
            setForm(f => ({ ...f, time: '' }));
        }
    }, [form.date, form.clinic_id, todayHours, bookedSlots]);
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resRes, clinicsRes] = await Promise.all([
                    fetch(`${API}/api/reservations`, { headers: authHeaders }),
                    fetch(`${API}/api/clinics`),
                ]);
                if (resRes.ok) { const d = await resRes.json(); setReservations(d.reservations || []); }
                else { setError('Could not load reservations. Please log in again.'); }
                if (clinicsRes.ok) { const d = await clinicsRes.json(); setClinics(d.clinics || []); }
            } catch { setError('Could not connect to the server.'); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const activeReservation = reservations.find(r => r.status === 'Ready for Pickup' || r.status === 'Confirmed' || r.status === 'Pending');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.pet_name.trim() || !form.service || !form.date || !form.time) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                pet_name: form.pet_name,
                service: form.service,
                service_id: form.service_id,
                date: form.date,
                time: form.time,
                location: selectedOption ? `${selectedOption.address_line1}, ${selectedOption.address_line2}`.replace(/,\s*,/g, ',').trim() : '',
                notes: form.notes,
                business_id: form.clinic_id || null,
                total_amount: estimatedTotal,
            };
            const res = await fetch(`${API}/api/reservations`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
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

    const handleCancel = async (dbId: number) => {
        setCancellingId(dbId);
        try {
            const res = await fetch(`${API}/api/reservations/${dbId}/cancel`, { method: 'PATCH', headers: authHeaders });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setReservations(prev => prev.map(r => r.db_id === dbId ? { ...r, ...data.reservation } : r));
            showToast('Reservation cancelled.');
        } catch {
            showToast('Could not cancel this reservation.', 'error');
        } finally {
            setCancellingId(null);
        }
    };

    const handleDeleteReservation = async (dbId: number) => {
        try {
            const res = await fetch(`${API}/api/reservations/${dbId}`, { method: 'DELETE', headers: authHeaders });
            if (!res.ok) throw new Error();
            setReservations(prev => prev.filter(r => r.db_id !== dbId));
            showToast('Reservation removed permanently.');
        } catch {
            showToast('Could not remove this reservation.', 'error');
        }
    };

    return (
        <DashboardLayout title="Reservations" hideHeader={showModal}>
            <div className="space-y-8">

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm font-medium text-accent-brown/50">{reservations.length} reservation{reservations.length !== 1 ? 's' : ''} total</p>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-brand-dark/20 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> New Reservation
                    </motion.button>
                </div>

                {/* Loading */}
                {loading && <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-brand-dark animate-spin" /></div>}

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
                        <div className="w-20 h-20 bg-accent-peach/30 rounded-full flex items-center justify-center"><CalendarX className="w-10 h-10 text-accent-brown/40" /></div>
                        <div>
                            <h3 className="font-black text-accent-brown text-2xl tracking-tight mb-2">No reservations yet</h3>
                            <p className="text-accent-brown/50 text-sm font-medium">Book your first appointment and we'll take care of the rest.</p>
                        </div>
                        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-dark text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-brand-dark/20 cursor-pointer">
                            <Plus className="w-4 h-4" /> Book Now
                        </button>
                    </div>
                )}

                {/* Active Reservation Highlight */}
                {!loading && !error && activeReservation && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-brand-dark rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-12 text-white relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="relative z-10 w-full lg:w-2/3">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeReservation.status === 'Ready for Pickup' ? 'bg-green-500/20 text-green-300 border-green-500/30' : activeReservation.status === 'Confirmed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
                                    {activeReservation.status}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Order {activeReservation.id}</span>
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter mb-4">
                                {activeReservation.status === 'Ready for Pickup' ? 'Your appointment is ready!' : activeReservation.status === 'Confirmed' ? `${activeReservation.service} confirmed for ${activeReservation.pet_name}!` : `${activeReservation.service} pending for ${activeReservation.pet_name}.`}
                            </h2>
                            <p className="text-white/60 font-medium text-sm md:text-base max-w-md">
                                {activeReservation.service} · {activeReservation.date} at {activeReservation.time}
                                {activeReservation.notes ? ` · ${activeReservation.notes}` : ''}
                            </p>
                        </div>
                        <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0 min-w-[250px]">
                            {activeReservation.location && (
                                <div className="flex items-center gap-3 text-sm font-bold text-white mb-2">
                                    <MapPin className="w-4 h-4 text-brand" /> {activeReservation.location}
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm font-bold text-white mb-6">
                                <Clock className="w-4 h-4 text-brand" /> {activeReservation.time}
                            </div>
                            {(activeReservation.status === 'Pending' || activeReservation.status === 'Confirmed') && (
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCancel(activeReservation.db_id)} 
                                    disabled={cancellingId === activeReservation.db_id}
                                    className="w-full bg-red-500/20 text-red-300 border border-red-500/30 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {cancellingId === activeReservation.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    Cancel Reservation
                                </motion.button>
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
                                    whileHover={{ scale: 1.01, borderColor: '#ff9f1c', boxShadow: '0 20px 25px -5px rgba(61, 43, 31, 0.05)' }}
                                    whileTap={{ scale: 0.99 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl shadow-accent-brown/5 border border-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${STATUS_STYLES[res.status]}`}>
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{res.id}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLES[res.status]}`}>{res.status}</span>
                                            </div>
                                            <p className="font-bold text-accent-brown mb-1">{res.service} — {res.pet_name}</p>
                                            <div className="flex items-center flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {res.date} · {res.time}</span>
                                                {res.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {res.location}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-accent-brown/10 pt-4 md:pt-0 md:pl-6 gap-3">
                                        <div className="flex items-center gap-2">
                                            {res.status === 'Cancelled' && (
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteReservation(res.db_id);
                                                    }}
                                                    className="w-7 h-7 bg-brand-dark text-white rounded-full flex items-center justify-center hover:bg-black transition-all shadow-md cursor-pointer"
                                                    title="Remove reservation"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </motion.button>
                                            )}
                                            <p className="font-black text-accent-brown text-lg">₱{res.total.toFixed(2)}</p>
                                        </div>
                                        {(res.status === 'Pending' || res.status === 'Confirmed') ? (
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleCancel(res.db_id)} 
                                                disabled={cancellingId === res.db_id}
                                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-all cursor-pointer"
                                            >
                                                {cancellingId === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                Cancel
                                            </motion.button>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-dark group-hover:text-brand transition-colors cursor-pointer">
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
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50 cursor-pointer" />
                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 100 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 100 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.stopPropagation()}>
                                <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-0 w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                                    <div className="flex flex-row items-center justify-between p-5 xs:p-6 sm:p-8 border-b border-accent-brown/5 shrink-0 bg-accent-peach/5 gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tighter">New Reservation</h2>
                                            <p className="text-[10px] sm:text-xs font-black text-accent-brown/50 mt-1 uppercase tracking-widest">Book an appointment</p>
                                        </div>
                                        <motion.button 
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setShowModal(false)} 
                                            className="w-10 h-10 bg-white hover:bg-red-50 text-accent-brown/50 hover:text-red-500 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </motion.button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 xs:p-6 sm:p-8 no-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                            {/* Left Column: Form Selections */}
                                            <div className="space-y-6 px-1">
                                                {/* Pet Name */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-2 block pl-1">Pet Name *</label>
                                                    <input required type="text" value={form.pet_name}
                                                        onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
                                                        placeholder="e.g. Max"
                                                        className="w-full px-5 py-4 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-2xl text-sm font-bold text-accent-brown outline-none transition-all placeholder:text-accent-brown/30 hover:bg-accent-peach/20" />
                                                </div>

                                                {/* Clinic / Branch Selection */}
                                                <div>
                                                    {clinics.length === 0 ? (
                                                        <div className="px-5 py-4 bg-accent-peach/10 rounded-2xl text-sm text-accent-brown/40 font-medium border border-dashed border-accent-peach/30 text-center">No verified clinics available yet.</div>
                                                    ) : (
                                                        <CustomDropdown
                                                            label="Clinic"
                                                            value={form.clinic_id ? form.clinic_id.toString() : ''}
                                                            options={clinics.map(c => ({
                                                                label: c.name,
                                                                value: c.id.toString()
                                                            }))}
                                                            onChange={val => {
                                                                const c = clinics.find(cl => cl.id.toString() === val);
                                                                const mainBranch = c?.branches?.find(b => b.is_main || b.name.toLowerCase().includes('main')) || c?.branches?.[0];
                                                                setForm(f => ({ 
                                                                    ...f, 
                                                                    clinic_id: c?.id || 0,
                                                                    clinic_option_key: mainBranch ? `${c?.id}-${mainBranch.id}` : `${c?.id}-main`,
                                                                    service: '', 
                                                                    service_id: 0 
                                                                }));
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Service Selection */}
                                                {selectedOption && (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                                        {availableServices.length === 0 ? (
                                                            <div className="px-5 py-4 bg-accent-peach/10 rounded-2xl text-sm text-accent-brown/40 font-medium border border-dashed border-accent-peach/30 text-center">No services offered by this clinic yet.</div>
                                                        ) : (
                                                            <CustomDropdown
                                                                label="Service"
                                                                value={selectedService ? `${selectedService.name} — ₱${selectedService.price}` : 'Select a service...'}
                                                                options={availableServices.map(s => `${s.name} — ₱${s.price}`)}
                                                                onChange={val => {
                                                                    const svc = availableServices.find(s => `${s.name} — ₱${s.price}` === val);
                                                                    setForm(f => ({ ...f, service: svc?.name || '', service_id: svc?.id || 0 }));
                                                                }}
                                                            />
                                                        )}
                                                        {selectedService?.description && (
                                                            <p className="mt-2 text-[10px] sm:text-xs text-accent-brown/40 font-medium px-4 leading-relaxed border-l-2 border-brand/20 ml-1 italic">{selectedService.description}</p>
                                                        )}
                                                    </motion.div>
                                                )}

                                                {/* Notes */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-2 block pl-1">Notes (optional)</label>
                                                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requirements..."
                                                        className="w-full h-24 px-5 py-4 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-2xl text-sm font-medium text-accent-brown outline-none transition-all resize-none placeholder:text-accent-brown/30 hover:bg-accent-peach/20" />
                                                </div>
                                            </div>

                                            {/* Right Column: Scheduling & Info Cards */}
                                            <div className="space-y-6">
                                                {/* Date & Time */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <CustomDatePicker label="Date" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} minDate={new Date().toISOString().split('T')[0]} />
                                                    </div>
                                                    <div>
                                                        <CustomDropdown
                                                            label="Time"
                                                            value={form.time}
                                                            options={BASE_TIMES.filter(t => {
                                                                let isPast = false;
                                                                if (form.date) {
                                                                    try {
                                                                        const [hourMin, meridiem] = t.split(' ');
                                                                        const [h, m] = hourMin.split(':');
                                                                        let hourInt = parseInt(h);
                                                                        if (meridiem === 'PM' && hourInt !== 12) hourInt += 12;
                                                                        if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
                                                                        const slotDate = new Date(form.date);
                                                                        slotDate.setHours(hourInt, parseInt(m), 0, 0);
                                                                        isPast = slotDate.getTime() < new Date().getTime();
                                                                    } catch { /* ignore */ }
                                                                }
                                                                
                                                                let outsideHours = false;
                                                                if (todayHours && todayHours.is_open) {
                                                                    try {
                                                                        const parseT = (s: string) => {
                                                                            const [hm, mer] = s.split(' ');
                                                                            let [h, min] = hm.split(':').map(Number);
                                                                            if (mer === 'PM' && h !== 12) h += 12;
                                                                            if (mer === 'AM' && h === 12) h = 0;
                                                                            return h * 60 + min;
                                                                        };
                                                                        const slotMins = parseT(t);
                                                                        const openMins = parseT(todayHours.open_time);
                                                                        const closeMins = parseT(todayHours.close_time);
                                                                            
                                                                        if (slotMins < openMins || slotMins >= closeMins) outsideHours = true;
                                                                        
                                                                        if (todayHours.break_start && todayHours.break_end) {
                                                                            const bStart = parseT(todayHours.break_start);
                                                                            const bEnd = parseT(todayHours.break_end);
                                                                            if (slotMins >= bStart && slotMins < bEnd) outsideHours = true;
                                                                        }
                                                                    } catch { /* ignore */ }
                                                                } else if (todayHours && !todayHours.is_open) {
                                                                    outsideHours = true;
                                                                } else if (!todayHours) {
                                                                    outsideHours = true;
                                                                }

                                                                // HIDE IF past or outside hours, but KEEP if booked (it will be disabled below)
                                                                return !isPast && !outsideHours;
                                                            }).map(t => {
                                                                const isBooked = bookedSlots.includes(t);
                                                                return {
                                                                    label: t,
                                                                    value: t,
                                                                    disabled: isBooked,
                                                                    badge: isBooked ? 'Booked' : undefined
                                                                };
                                                            })}
                                                            onChange={val => setForm(f => ({ ...f, time: val }))}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Clinic Hours Info */}
                                                {selectedOption && todayHours && (
                                                    <div className={`p-5 rounded-2xl border-2 transition-all ${todayHours.is_open ? 'bg-green-50/50 border-green-200 shadow-sm shadow-green-200/20' : 'bg-red-50/50 border-red-200 shadow-sm shadow-red-200/20'}`}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${todayHours.is_open ? 'bg-green-100' : 'bg-red-100'}`}>
                                                                <Clock3 className={`w-4 h-4 ${todayHours.is_open ? 'text-green-600' : 'text-red-500'}`} />
                                                            </div>
                                                            <span className={`font-black text-[10px] uppercase tracking-[0.1em] ${todayHours.is_open ? 'text-green-700' : 'text-red-600'}`}>
                                                                {todayHours.is_open ? `Open Today` : 'Closed Today'}
                                                            </span>
                                                        </div>
                                                        {todayHours.is_open && (
                                                            <div className="text-xs font-bold text-green-700/80 pl-11">
                                                                <p className="tracking-tight">{todayHours.open_time} – {todayHours.close_time}</p>
                                                                {todayHours.break_start && todayHours.break_end && (
                                                                    <p className="opacity-60 text-[10px] mt-1 flex items-center gap-1.5 font-medium italic">
                                                                        <span className="w-1 h-1 rounded-full bg-green-300" />
                                                                        Break: {todayHours.break_start} – {todayHours.break_end}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Selected Clinic Location Info Card */}
                                                {selectedOption && (() => {
                                                    const selectedClinic = clinics.find(c => c.id === selectedOption.clinic_id);
                                                    const mainBranch = selectedClinic?.branches?.find(b => b.is_main || b.name.toLowerCase().includes('main')) || selectedClinic?.branches?.[0];
                                                    const otherBranches = selectedClinic?.branches?.filter(b => b.id !== selectedOption.branch_id) || [];
                                                    return (
                                                        <div className="space-y-3">
                                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                                                className="bg-brand/5 border border-brand/20 rounded-2xl p-5 flex items-start gap-5 shadow-sm shadow-brand/5 overflow-hidden relative">
                                                                <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-full blur-3xl -mr-12 -mt-12" />
                                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md ring-1 ring-brand/10 shrink-0 z-10">
                                                                    <MapPin className="w-6 h-6 text-brand" />
                                                                </div>
                                                                <div className="min-w-0 z-10">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-dark opacity-60 mb-2">Clinic Information</h4>
                                                                    <p className="text-sm font-black text-accent-brown leading-none mb-1.5 flex items-center gap-2">
                                                                        {selectedOption.branch_id === (mainBranch?.id ?? null) 
                                                                            ? selectedOption.clinic_name 
                                                                            : `${selectedOption.clinic_name} — ${selectedOption.address_line1 || 'Branch'}`}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-accent-brown/60 leading-relaxed">
                                                                        {selectedOption.address_line1 && (
                                                                            <span className="block">{selectedOption.address_line1}</span>
                                                                        )}
                                                                        <span className="block">{selectedOption.address_line2}</span>
                                                                        {selectedOption.zip && <span className="block opacity-40 font-medium">Zip: {selectedOption.zip}</span>}
                                                                    </p>
                                                                    {selectedOption.phone && (
                                                                        <div className="mt-3 flex items-center gap-2">
                                                                            <div className="px-2.5 py-1 bg-brand-dark rounded-lg">
                                                                                <span className="text-[10px] font-black text-white uppercase tracking-wider">{selectedOption.phone}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>

                                                            {/* Street View Preview */}
                                                            {selectedOption.lat && selectedOption.lng && (
                                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                                                    className="bg-white border-2 border-accent-peach/20 rounded-2xl p-4 shadow-xl shadow-accent-brown/[0.03] space-y-4 group overflow-hidden relative">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-7 h-7 bg-brand/10 rounded-lg flex items-center justify-center">
                                                                                <MapPin className="w-4 h-4 text-brand" />
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-brown leading-tight">Live Street View</h4>
                                                                                <p className="text-[8px] font-bold text-accent-brown/40 uppercase">Destination Visualization</p>
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedOption.lat},${selectedOption.lng}`, '_blank')}
                                                                            className="text-[9px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors flex items-center gap-1.5 cursor-pointer"
                                                                        >
                                                                            Full Panora <Plus className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="w-full aspect-[2/1] rounded-xl overflow-hidden bg-accent-peach/10 relative border border-accent-peach/10 group-hover:border-brand/30 transition-colors">
                                                                        <img 
                                                                            src={`https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${selectedOption.lat},${selectedOption.lng}&heading=151.78&pitch=-0.76&key=${MAPS_API_KEY}`}
                                                                            alt="Clinic Street View"
                                                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                                                    </div>
                                                                </motion.div>
                                                            )}

                                                            {/* See more branches */}
                                                            {otherBranches.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <button type="button"
                                                                        onClick={() => setShowBranches(v => !v)}
                                                                        className="w-full text-center text-[9px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-brand-dark transition-colors py-1 flex items-center justify-center gap-2 cursor-pointer"
                                                                    >
                                                                        <span>{showBranches ? 'Hide other branches' : `See ${otherBranches.length} other branch${otherBranches.length > 1 ? 'es' : ''}`}</span>
                                                                        <motion.span animate={{ rotate: showBranches ? 180 : 0 }} className="inline-block">▾</motion.span>
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {showBranches && otherBranches.map(b => {
                                                                            const isMain = b.id === mainBranch?.id;
                                                                            const branchOpt: ClinicOption = {
                                                                                key: `${selectedClinic!.id}-${b.id}`,
                                                                                clinic_id: selectedClinic!.id,
                                                                                branch_id: b.id,
                                                                                label: `${selectedClinic!.name} — ${b.name}`,
                                                                                address_line1: b.address_line1,
                                                                                address_line2: b.address_line2,
                                                                                zip: selectedClinic!.zip,
                                                                                phone: b.phone || selectedClinic!.phone,
                                                                                clinic_name: selectedClinic!.name,
                                                                                services: selectedClinic!.services,
                                                                                hours: selectedClinic!.hours,
                                                                                special_hours: selectedClinic!.special_hours,
                                                                            };
                                                                            return (
                                                                                <motion.button 
                                                                                    key={b.id} 
                                                                                    type="button"
                                                                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 159, 28, 0.05)', borderColor: 'rgba(255, 159, 28, 0.2)' }}
                                                                                    whileTap={{ scale: 0.98 }}
                                                                                    initial={{ opacity: 0, y: -8 }} 
                                                                                    animate={{ opacity: 1, y: 0 }} 
                                                                                    exit={{ opacity: 0, y: -8 }}
                                                                                    onClick={() => setForm(f => ({ ...f, clinic_option_key: branchOpt.key, clinic_id: branchOpt.clinic_id, service: '', service_id: 0 }))}
                                                                                    className="w-full text-left bg-accent-peach/5 border border-transparent rounded-2xl px-4 py-3 flex flex-col gap-0.5 transition-all cursor-pointer"
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xs font-black text-accent-brown capitalize">{b.address_line1?.toLowerCase() || b.name}</span>
                                                                                        {isMain ? (
                                                                                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">MAIN</span>
                                                                                        ) : (
                                                                                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">BRANCH</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {b.address_line2 && (
                                                                                        <p className="text-[9px] font-bold text-accent-brown/40 uppercase mt-0.5">
                                                                                            <span className="block text-brand/50">{b.address_line2}</span>
                                                                                        </p>
                                                                                    )}
                                                                                </motion.button>

                                                                            );
                                                                        })}
                                                                    </AnimatePresence>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Service Summary Card */}
                                                {selectedService && (
                                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                                        className="bg-white rounded-2xl p-5 border border-accent-peach/20 shadow-xl shadow-accent-brown/[0.03] space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-black text-accent-brown text-sm tracking-tight">{selectedService.name}</h4>
                                                            <div className="w-8 h-8 rounded-lg bg-accent-peach/10 flex items-center justify-center">
                                                                <Package className="w-4 h-4 text-accent-brown/40" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-5">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">Price</span>
                                                                <span className="font-black text-brand-dark text-lg leading-none">₱{selectedService.price.toFixed(2)}</span>
                                                            </div>
                                                            <div className="w-px h-8 bg-accent-brown/5" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-0.5">Duration</span>
                                                                <span className="font-bold flex items-center gap-1.5 text-accent-brown/60 text-xs">
                                                                    <Clock className="w-3 h-3 text-brand" /> {selectedService.duration_minutes} min
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="mt-6 pt-6 border-t border-accent-brown/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="w-full sm:w-auto bg-brand/10 rounded-xl px-6 py-4 flex items-center justify-between sm:min-w-[200px] border border-brand/20">
                                                <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Est. Total</span>
                                                <span className="font-black text-brand-dark text-xl">₱{estimatedTotal.toFixed(2)}</span>
                                            </div>
                                            <motion.button 
                                                type="submit" 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                disabled={submitting || !form.service || !form.pet_name || !form.date || !form.clinic_id || !!(todayHours && !todayHours.is_open)}
                                                className="w-full sm:w-auto px-10 bg-brand-dark text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:max-w-[300px] cursor-pointer"
                                            >
                                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Confirm Reservation
                                            </motion.button>
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

export default CustomerReservations;
