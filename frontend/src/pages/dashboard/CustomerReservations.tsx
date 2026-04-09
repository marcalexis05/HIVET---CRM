import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight, Plus, X, AlertCircle, CheckCircle, Loader2, CalendarX, Clock3, CreditCard, Smartphone, Banknote, ShieldCheck, Gift, Sparkles } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import ModernModal from '../../components/ModernModal';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import { useAuth } from '../../context/AuthContext';

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

interface ClinicService {
    id: number;
    name: string;
    price: number;
    description: string | null;
    duration_minutes: number;
    is_package: boolean;
    package_items_json: string | null;
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
    services: ClinicService[];
    hours: { day_of_week: number; day_name: string; is_open: boolean; open_time: string; close_time: string; break_start: string | null; break_end: string | null }[];
    special_hours: { specific_date: string; is_open: boolean; open_time: string; close_time: string; break_start: string | null; break_end: string | null }[];
}

interface Voucher {
    id: number;
    title: string;
    code: string;
    type: string;
    value: number;
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
    payment_status: string;
    location: string;
    notes: string;
    total: number;
    created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
    'Payment Pending': 'bg-blue-100 text-blue-700',
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Confirmed': 'bg-emerald-100 text-emerald-700',
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

const StreetViewInner = ({ lat, lng }: { lat: number; lng: number }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const streetViewLib = useMapsLibrary('streetView');

    useEffect(() => {
        if (!streetViewLib || !containerRef.current) return;
        new streetViewLib.StreetViewPanorama(containerRef.current, {
            position: { lat, lng },
            disableDefaultUI: true,
            linksControl: false,
            panControl: false,
            addressControl: false,
            pov: { heading: 151.78, pitch: -0.76 },
            zoom: 1,
        });
    }, [streetViewLib, lat, lng]);

    return <div ref={containerRef} className="w-full h-full" />;
};

const InteractiveStreetView = ({ lat, lng }: { lat: number; lng: number }) => {
    return (
        <APIProvider apiKey={MAPS_API_KEY}>
            <StreetViewInner lat={lat} lng={lng} />
        </APIProvider>
    );
};

const CustomerReservations = () => {
    const { user } = useAuth();
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
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'paymaya' | 'cash'>('gcash');
    const [payNowLoading, setPayNowLoading] = useState<number | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<Reservation | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeStatus, setActiveStatus] = useState('All');
    const [showPackageExplorer, setShowPackageExplorer] = useState(false);
    const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
    const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const ITEMS_PER_PAGE = 5;



    const tabs = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Payment Pending'];

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
    
    // Robust check for packages (boolean flag + name matching)
    const isPackageService = (s: ClinicService) => s.is_package || s.name.toLowerCase().includes('package');
    
    const regularServices = availableServices.filter(s => !isPackageService(s));
    const packageServices = availableServices.filter(s => isPackageService(s));
    
    const selectedService = availableServices.find(s => s.id === form.service_id) || null;
    const baseTotal = selectedService?.price || 0;
    const estimatedTotal = appliedVoucher ? 0 : baseTotal; // Assuming Service vouchers make it free

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
                
                // Fetch Vouchers
                const loyaltyRes = await fetch(`${API}/api/loyalty`, { headers: authHeaders });
                if (loyaltyRes.ok) {
                    const lData = await loyaltyRes.json();
                    setMyVouchers((lData.my_vouchers || []).filter((v: Voucher) => v.type === 'Service'));
                }
            } catch { setError('Could not connect to the server.'); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    // Derived filtering and pagination data
    const filteredReservations = reservations.filter(res => {
        if (activeStatus === 'All') return true;
        return res.status === activeStatus;
    });

    const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);
    const paginatedReservations = filteredReservations.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 if search/filter or deletions make current page invalid
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [filteredReservations.length, totalPages, currentPage]);

    const activeReservation = reservations.find(r => r.status === 'Ready for Pickup' || r.status === 'Confirmed' || r.status === 'Pending');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.pet_name.trim() || !form.service || !form.date || !form.time) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            // Step 1 — create the reservation (Payment Pending)
            const payload = {
                pet_name: form.pet_name,
                service: form.service,
                service_id: form.service_id,
                date: form.date,
                time: form.time,
                location: selectedOption ? `${selectedOption.address_line1}, ${selectedOption.address_line2}`.replace(/,\s*,/g, ',').trim() : '',
                notes: form.notes,
                business_id: form.clinic_id || null,
                branch_id: selectedOption?.branch_id || null,
                total_amount: estimatedTotal,
                voucher_code: appliedVoucher?.code || null,
            };
            const res = await fetch(`${API}/api/reservations`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Failed to create reservation');
            const data = await res.json();
            const newReservation = data.reservation;
            setReservations(prev => [newReservation, ...prev]);

            if (selectedPaymentMethod === 'cash') {
                // Cash: confirm immediately (no PayMongo), reservation becomes Pending
                await fetch(`${API}/api/payments/paymongo/reservation-confirm/${newReservation.db_id}`, {
                    method: 'POST',
                    headers: authHeaders,
                });
                // Update local state to show Pending status
                setReservations(prev => prev.map(r =>
                    r.db_id === newReservation.db_id ? { ...r, status: 'Pending', payment_status: 'paid' } : r
                ));
                setShowModal(false);
                setForm(defaultForm);
                showToast('Reservation booked! Please pay cash at the clinic.');
            } else {
                // Step 2 — create PayMongo checkout and redirect
                const payRes = await fetch(`${API}/api/payments/paymongo/reservation-checkout`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ reservation_id: newReservation.db_id, payment_method: selectedPaymentMethod }),
                });
                if (!payRes.ok) {
                    const err = await payRes.json();
                    throw new Error(err.detail || 'Failed to create payment session');
                }
                const payData = await payRes.json();
                setShowModal(false);
                setForm(defaultForm);
                setAppliedVoucher(null);
                
                if (payData.checkout_url) {
                    window.location.href = payData.checkout_url;
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayExisting = async (reservationDbId: number, method: 'gcash' | 'paymaya' = 'gcash') => {
        setPayNowLoading(reservationDbId);
        try {
            const res = await fetch(`${API}/api/payments/paymongo/reservation-checkout`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ reservation_id: reservationDbId, payment_method: method }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to create payment session');
            }
            const data = await res.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Payment failed.';
            showToast(msg, 'error');
        } finally {
            setPayNowLoading(null);
        }
    };

    const handleCancel = async (dbId: number) => {
        setModal({
            isOpen: true,
            title: 'Cancel Reservation',
            message: 'Are you sure you want to cancel this reservation?',
            type: 'confirm',
            onConfirm: async () => {
                setModal(m => ({ ...m, isOpen: false }));
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
            }
        });
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
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeReservation.status === 'Ready for Pickup' ? 'bg-green-500/20 text-green-300 border-green-500/30' : activeReservation.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
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
                            {(activeReservation.status === 'Pending' || activeReservation.status === 'Confirmed' || activeReservation.status === 'Payment Pending') && (
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleCancel(activeReservation.db_id)}
                                    disabled={cancellingId === activeReservation.db_id}
                                    className="w-full bg-white/10 backdrop-blur-md text-white border border-white/30 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-white/50 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg"
                                >
                                    {cancellingId === activeReservation.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 text-white" />}
                                    <span>Cancel Reservation</span>
                                </motion.button>
                            )}
                        </div>
                        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-[80px]" />
                    </motion.div>
                )}

                {/* Status Tabs */}
                {!loading && !error && reservations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pb-2">
                        {tabs.map((tab) => (
                            <motion.button
                                key={tab}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setActiveStatus(tab);
                                    setCurrentPage(1);
                                }}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeStatus === tab 
                                    ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' 
                                    : 'bg-white text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown border border-accent-brown/5'
                                }`}
                            >
                                {tab}
                                {activeStatus === tab && ` (${filteredReservations.length})`}
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Reservation History */}
                {!loading && !error && reservations.length > 0 && (
                    <>
                        <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-accent-brown tracking-tighter">
                                {activeStatus === 'All' ? 'All Reservations' : `${activeStatus} Reservations`}
                            </h3>
                            <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">
                                {filteredReservations.length} result{filteredReservations.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        
                        {filteredReservations.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-16 flex flex-col items-center gap-6 text-center shadow-xl shadow-accent-brown/5 border border-white">
                                <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center text-accent-brown/30">
                                    <X className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="font-black text-accent-brown text-lg uppercase tracking-tight mb-2">No {activeStatus.toLowerCase()} reservations</h4>
                                    <p className="text-accent-brown/50 text-sm font-medium">We couldn't find any reservations with this status.</p>
                                </div>
                                <button onClick={() => setActiveStatus('All')} className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors cursor-pointer">Clear Filter</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {paginatedReservations.map((res, i) => (
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
                                            <div className="flex gap-2">
                                                {res.payment_status === 'unpaid' && res.status !== 'Cancelled' && (
                                                    <button
                                                        onClick={() => handlePayExisting(res.db_id, res.total > 0 ? (selectedPaymentMethod !== 'cash' ? (selectedPaymentMethod as any) : 'gcash') : 'gcash')}
                                                        className="px-4 py-2 bg-[#ea580c] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#c2410c] transition-all flex items-center gap-2 shadow-sm"
                                                    >
                                                        {payNowLoading === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                                        Pay Now
                                                    </button>
                                                )}
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

                                            {res.status === 'Payment Pending' ? (
                                                <div className="flex flex-col items-center md:items-end gap-2">
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={(e) => { e.stopPropagation(); handlePayExisting(res.db_id, 'gcash'); }}
                                                        disabled={payNowLoading === res.db_id}
                                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-60"
                                                    >
                                                        {payNowLoading === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                                        Pay Now
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => { e.stopPropagation(); handleCancel(res.db_id); }}
                                                        disabled={cancellingId === res.db_id}
                                                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-all cursor-pointer"
                                                    >
                                                        {cancellingId === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                        Cancel
                                                    </motion.button>
                                                </div>
                                            ) : (res.status === 'Pending' || res.status === 'Confirmed') ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => { e.stopPropagation(); handleCancel(res.db_id); }}
                                                    disabled={cancellingId === res.db_id}
                                                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-all cursor-pointer"
                                                >
                                                    {cancellingId === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                    Cancel
                                                </motion.button>
                                            ) : res.status === 'Cancelled' ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDetail(res); }}
                                                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-accent-brown transition-colors cursor-pointer"
                                                >
                                                    View Details <ChevronRight className="w-3 h-3" />
                                                </motion.button>
                                            ) : (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDetail(res); }}
                                                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-dark group-hover:text-brand transition-colors cursor-pointer"
                                                >
                                                    View Details <ChevronRight className="w-3 h-3" />
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {filteredReservations.length > 0 && (
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-accent-brown/5">
                                <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredReservations.length)} of {filteredReservations.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        whileHover={currentPage > 1 ? { scale: 1.05 } : {}}
                                        whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-accent-brown/50 border border-accent-brown/5 hover:bg-accent-peach/20 hover:text-accent-brown transition-all disabled:opacity-30 disabled:hover:bg-white cursor-pointer"
                                    >
                                        Prev
                                    </motion.button>
                                    
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        return (
                                            <motion.button
                                                key={page}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white text-accent-brown/40 border border-accent-brown/5 hover:bg-accent-peach/20'}`}
                                            >
                                                {page}
                                            </motion.button>
                                        );
                                    })}

                                    <motion.button
                                        whileHover={currentPage < totalPages ? { scale: 1.05 } : {}}
                                        whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-brand-dark border border-brand/10 hover:bg-brand/10 transition-all disabled:opacity-30 disabled:hover:bg-white cursor-pointer"
                                    >
                                        Next
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </div>
                    </>
                )}

            </div>

                {/* New Reservation Modal */}
                <AnimatePresence>
                    {showModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50 cursor-pointer" />
                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 100 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 100 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.stopPropagation()}>
                                <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-0 w-full max-w-6xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
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

                                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                                        <div className="flex flex-col lg:flex-row">
                                            {/* LEFT SIDEBAR: Setup & Previews */}
                                            <div className="w-full lg:w-[380px] bg-accent-peach/5 border-r border-accent-brown/5 p-6 sm:p-8 space-y-6">
                                                <div className="space-y-6">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-4">1. Select Clinic & Service</p>
                                                    
                                                    {/* Clinic / Branch Selection */}
                                                    <div>
                                                        {clinics.length === 0 ? (
                                                            <div className="px-5 py-4 bg-accent-peach/10 rounded-2xl text-sm text-accent-brown/40 font-medium border border-dashed border-accent-peach/30 text-center">No verified clinics available yet.</div>
                                                        ) : (
                                                            <CustomDropdown
                                                                label="Provider Clinic"
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

                                                    {/* Service & Package Selection */}
                                                    {selectedOption && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                                            <div className="space-y-3">
                                                                <CustomDropdown
                                                                    label="Desired Service"
                                                                    value={selectedService && !isPackageService(selectedService) ? `${selectedService.name} — ₱${selectedService.price}` : 'Select a service...'}
                                                                    options={regularServices.map(s => `${s.name} — ₱${s.price}`)}
                                                                    onChange={val => {
                                                                        const svc = regularServices.find(s => `${s.name} — ₱${s.price}` === val);
                                                                        setForm(f => ({ ...f, service: svc?.name || '', service_id: svc?.id || 0 }));
                                                                    }}
                                                                />
                                                                
                                                                {packageServices.length > 0 && (
                                                                    <div className="pt-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowPackageExplorer(true)}
                                                                            className="w-full py-4 px-6 bg-white border-2 border-[#ea580c]/20 hover:border-[#ea580c]/50 text-[#ea580c] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between group shadow-sm hover:shadow-md"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 bg-[#ea580c]/10 rounded-lg flex items-center justify-center group-hover:bg-[#ea580c] transition-colors">
                                                                                    <Package className="w-4 h-4 text-[#ea580c] group-hover:text-white" />
                                                                                </div>
                                                                                <span>Browse Clinic Packages</span>
                                                                            </div>
                                                                            <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                                        </button>
                                                                        {selectedService && isPackageService(selectedService) && (
                                                                            <div className="mt-3 p-5 bg-[#ea580c]/5 border border-[#ea580c]/20 rounded-2xl space-y-3">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <CheckCircle className="w-4 h-4 text-[#ea580c]" />
                                                                                        <span className="text-xs font-bold text-accent-brown">Selected: {selectedService.name}</span>
                                                                                    </div>
                                                                                    <button type="button" onClick={() => setForm(f => ({ ...f, service: '', service_id: 0 }))} className="text-[10px] font-black uppercase text-[#ea580c]/60 hover:text-[#ea580c]">Remove</button>
                                                                                </div>
                                                                                
                                                                                {/* Inclusions in main form */}
                                                                                {(() => {
                                                                                    let items = [];
                                                                                    try { items = selectedService.package_items_json ? JSON.parse(selectedService.package_items_json) : []; } catch { items = []; }
                                                                                    if (items.length > 0) {
                                                                                        return (
                                                                                            <div className="pt-2 border-t border-[#ea580c]/10">
                                                                                                <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-2">Package Inclusions:</p>
                                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                                    {items.map((item: string, idx: number) => (
                                                                                                        <span key={idx} className="px-2 py-1 bg-white border border-[#ea580c]/10 text-[#ea580c] rounded-md text-[9px] font-bold">
                                                                                                            {item}
                                                                                                        </span>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                            </div>
                                                                        )}

                                                                    </div>
                                                                )}

                                                                {selectedService?.description && !isPackageService(selectedService) && (
                                                                    <p className="mt-3 text-[10px] text-accent-brown/40 font-medium px-4 leading-relaxed border-l-2 border-brand/20 ml-1 italic">{selectedService.description}</p>
                                                                )}
                                                            </div>

                                                            {/* Selected Clinic Location Info Card */}
                                                            {selectedOption && (() => {
                                                                const selectedClinic = clinics.find(c => c.id === selectedOption.clinic_id);
                                                                const mainBranch = selectedClinic?.branches?.find(b => b.is_main || b.name.toLowerCase().includes('main')) || selectedClinic?.branches?.[0];
                                                                const otherBranches = selectedClinic?.branches?.filter(b => b.id !== selectedOption.branch_id) || [];
                                                                return (
                                                                    <div className="space-y-4">
                                                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                                                            className="bg-white border border-accent-brown/5 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full blur-3xl -mr-12 -mt-12" />
                                                                            <div className="w-10 h-10 bg-accent-peach/10 rounded-xl flex items-center justify-center shrink-0 z-10">
                                                                                <MapPin className="w-5 h-5 text-brand" />
                                                                            </div>
                                                                            <div className="min-w-0 z-10">
                                                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-2">Clinic Information</h4>
                                                                                <p className="text-sm font-black text-accent-brown leading-tight mb-1 flex items-center gap-2">
                                                                                    {selectedOption.branch_id === (mainBranch?.id ?? null)
                                                                                        ? selectedOption.clinic_name
                                                                                        : `${selectedOption.clinic_name}`}
                                                                                </p>
                                                                                <p className="text-[10px] font-bold text-accent-brown/50 leading-relaxed">
                                                                                    {selectedOption.address_line1 && <span className="block">{selectedOption.address_line1}</span>}
                                                                                    <span className="block">{selectedOption.address_line2}</span>
                                                                                </p>
                                                                                {selectedOption.phone && (
                                                                                    <div className="mt-3">
                                                                                        <span className="text-[9px] font-black text-[#ea580c] uppercase tracking-wider bg-[#ea580c]/5 px-2 py-1 rounded-md">{selectedOption.phone}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>

                                                                        {/* Street View Preview */}
                                                                        {selectedOption.lat && selectedOption.lng && (
                                                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                                                                className="bg-white border border-accent-brown/5 rounded-2xl p-1 gap-4 shadow-sm overflow-hidden group">
                                                                                <div className="w-full aspect-video rounded-xl overflow-hidden bg-accent-peach/10 relative">
                                                                                    <InteractiveStreetView lat={selectedOption.lat} lng={selectedOption.lng} />
                                                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-accent-brown/5">
                                                                                        <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown">Live Street View</p>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT CONTENT AREA: Details & Actions */}
                                            <div className="flex-1 p-6 sm:p-8 space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Section 1: Personal info & Scheduling */}
                                                    <div className="space-y-6">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c]">2. Reservation Details</p>
                                                        
                                                        {/* Pet Name */}
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-2 block ml-1">Pet Name *</label>
                                                            <input required type="text" value={form.pet_name}
                                                                onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
                                                                placeholder="e.g. Max"
                                                                className="w-full px-5 py-4 bg-accent-peach/10 border-2 border-transparent focus:border-[#ea580c]/30 rounded-2xl text-sm font-bold text-accent-brown outline-none transition-all placeholder:text-accent-brown/30" />
                                                        </div>

                                                        {/* Date & Time */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <CustomDatePicker label="Preferred Date" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} minDate={new Date().toISOString().split('T')[0]} />
                                                            <CustomDropdown
                                                                label="Preferred Time"
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
                                                                    } else if (todayHours && !todayHours.is_open) { outsideHours = true; }
                                                                    else if (!todayHours) { outsideHours = true; }
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

                                                        {/* Clinic Hours Info */}
                                                        {selectedOption && todayHours && (
                                                            <div className={`p-5 rounded-2xl border-2 transition-all ${todayHours.is_open ? 'bg-green-50/50 border-green-200 shadow-sm' : 'bg-red-50/50 border-red-200'}`}>
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${todayHours.is_open ? 'bg-green-100' : 'bg-red-100'}`}>
                                                                        <Clock3 className={`w-4 h-4 ${todayHours.is_open ? 'text-green-600' : 'text-red-500'}`} />
                                                                    </div>
                                                                    <span className={`font-black text-[10px] uppercase tracking-[0.1em] ${todayHours.is_open ? 'text-green-700' : 'text-red-600'}`}>
                                                                        {todayHours.is_open ? `Clinic is Open Today` : 'Clinic is Closed Today'}
                                                                    </span>
                                                                </div>
                                                                {todayHours.is_open && (
                                                                    <div className="text-xs font-bold text-green-700/80 pl-11">
                                                                        <p className="tracking-tight">{todayHours.open_time} – {todayHours.close_time}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Section 2: Vouchers & Rewards */}
                                                    <div className="space-y-6">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c]">3. Vouchers & Rewards</p>
                                                        
                                                        {myVouchers.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {myVouchers.map((mv) => (
                                                                    <motion.button
                                                                        key={mv.id}
                                                                        type="button"
                                                                        whileHover={{ scale: 1.02 }}
                                                                        whileTap={{ scale: 0.98 }}
                                                                        onClick={() => setAppliedVoucher(appliedVoucher?.id === mv.id ? null : mv)}
                                                                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-start gap-4 relative overflow-hidden group ${appliedVoucher?.id === mv.id ? 'border-[#ea580c] bg-[#ea580c]/5 shadow-md' : 'border-accent-brown/5 bg-white hover:border-[#ea580c]/30 shadow-sm'}`}
                                                                    >
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${appliedVoucher?.id === mv.id ? 'bg-[#ea580c] text-white' : 'bg-blue-100 text-blue-600'}`}>
                                                                            <Sparkles className="w-4 h-4" />
                                                                        </div>
                                                                        <div className="min-w-0 pr-6">
                                                                            <p className={`font-black text-xs mb-0.5 truncate ${appliedVoucher?.id === mv.id ? 'text-[#ea580c]' : 'text-accent-brown'}`}>{mv.title}</p>
                                                                            <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest">{mv.code}</p>
                                                                        </div>
                                                                        {appliedVoucher?.id === mv.id && (
                                                                            <div className="absolute top-3 right-3">
                                                                                <div className="w-4 h-4 bg-[#ea580c] rounded-full flex items-center justify-center">
                                                                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </motion.button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="px-6 py-8 bg-accent-peach/5 border border-dashed border-accent-peach/30 rounded-2xl flex flex-col items-center gap-2 text-center">
                                                                <Gift className="w-8 h-8 text-accent-brown/20" />
                                                                <p className="text-xs font-bold text-accent-brown/40 uppercase tracking-tight">No rewards available</p>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Notes */}
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-2 block ml-1">Special Notes</label>
                                                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any specific details for the vet..."
                                                                className="w-full h-[116px] px-5 py-4 bg-accent-peach/10 border-2 border-transparent focus:border-[#ea580c]/30 rounded-2xl text-sm font-medium text-accent-brown outline-none transition-all resize-none placeholder:text-accent-brown/30" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment Method Selection */}
                                                <div className="pt-8 border-t border-accent-brown/5">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-5">4. Payment Method</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

                                                        
                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('gcash')}
                                                            className={`relative p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${selectedPaymentMethod === 'gcash' ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-accent-brown/5 bg-white hover:border-accent-brown/20'}`}>
                                                            <div className="w-10 h-10 rounded-xl bg-[#007DFF]/10 flex items-center justify-center shrink-0">
                                                                <Smartphone className="w-5 h-5 text-[#007DFF]" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-black text-accent-brown text-sm">GCash</p>
                                                                <p className="text-[9px] text-accent-brown/40 font-medium uppercase tracking-widest leading-none">E-Wallet</p>
                                                            </div>
                                                            {selectedPaymentMethod === 'gcash' && <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                                                        </motion.button>

                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('paymaya')}
                                                            className={`relative p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${selectedPaymentMethod === 'paymaya' ? 'border-green-500 bg-green-50/50 shadow-md' : 'border-accent-brown/5 bg-white hover:border-accent-brown/20'}`}>
                                                            <div className="w-10 h-10 rounded-xl bg-[#00A9A5]/10 flex items-center justify-center shrink-0">
                                                                <CreditCard className="w-5 h-5 text-[#00A9A5]" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-black text-accent-brown text-sm">Maya</p>
                                                                <p className="text-[9px] text-accent-brown/40 font-medium uppercase tracking-widest leading-none">E-Wallet</p>
                                                            </div>
                                                            {selectedPaymentMethod === 'paymaya' && <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                                                        </motion.button>

                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('cash')}
                                                            className={`relative p-5 rounded-2xl border-2 flex items-center gap-4 transition-all col-span-1 sm:col-span-2 lg:col-span-4 ${selectedPaymentMethod === 'cash' ? 'border-amber-500 bg-amber-50/50 shadow-md' : 'border-accent-brown/5 bg-white hover:border-accent-brown/20'}`}>
                                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                                <Banknote className="w-5 h-5 text-amber-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-black text-accent-brown text-sm">Cash at Clinic</p>
                                                                <p className="text-[9px] text-accent-brown/40 font-medium uppercase tracking-widest leading-none">Pay during your visit</p>
                                                            </div>
                                                            {selectedPaymentMethod === 'cash' && <div className="absolute top-2 right-2 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                                                        </motion.button>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[10px] text-accent-brown/40 font-medium px-1">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                                        Transactions are secured and processed immediately upon confirmation.
                                                    </div>
                                                </div>

                                                {/* Footer Actions Inline */}
                                                <div className="mt-8 pt-8 border-t border-accent-brown/5 flex flex-col sm:flex-row items-center justify-between gap-6 bg-accent-peach/5 p-8 rounded-3xl">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mb-1">Estimated Total</span>
                                                            <span className="font-black text-brand-dark text-4xl leading-none">₱{estimatedTotal.toFixed(2)}</span>
                                                        </div>
                                                        <div className="w-px h-12 bg-accent-brown/10 hidden sm:block" />
                                                        <div className="hidden sm:flex flex-col">
                                                            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Appointment Status</span>
                                                            <span className="text-xs font-bold text-accent-brown/60">Ready to Book</span>
                                                        </div>
                                                    </div>
                                                    <motion.button type="submit"
                                                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                        disabled={submitting || !form.service || !form.pet_name || !form.date || !form.clinic_id || !!(todayHours && !todayHours.is_open)}
                                                        className="w-full sm:w-auto px-12 bg-brand-dark text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-brand-dark/30 disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                                        {submitting ? 'Processing...' : 'Complete Reservation'}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>

                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            {/* ── View Details Side Panel ───────────────────────── */}
            <AnimatePresence>
                {selectedDetail && (
                    <>
                        <motion.div
                            key="detail-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDetail(null)}
                            className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50 cursor-pointer"
                        />
                        <motion.div
                            key="detail-panel"
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24"
                            onClick={() => setSelectedDetail(null)}
                        >
                        <div
                            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl shadow-accent-brown/15 flex flex-col max-h-[90vh] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-accent-brown/5 bg-accent-peach/5 shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-accent-brown tracking-tighter">Reservation Details</h2>
                                    <p className="text-[10px] font-black text-accent-brown/40 mt-0.5 uppercase tracking-widest">{selectedDetail.id}</p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedDetail(null)}
                                    className="w-10 h-10 bg-white hover:bg-red-50 text-accent-brown/50 hover:text-red-500 rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                {/* Status badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${STATUS_STYLES[selectedDetail.status] || 'bg-gray-100 text-gray-500'}`}>
                                        {selectedDetail.status}
                                    </span>
                                    {selectedDetail.payment_status === 'paid' ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Paid
                                        </span>
                                    ) : selectedDetail.payment_status === 'unpaid' ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-red-100 text-red-500">
                                            Unpaid
                                        </span>
                                    ) : null}
                                </div>

                                {/* Service + Pet */}
                                <div className="bg-accent-peach/10 rounded-2xl p-5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Service</p>
                                    <p className="font-black text-accent-brown text-lg tracking-tight">{selectedDetail.service}</p>
                                    <p className="text-sm text-accent-brown/50 font-medium mt-0.5">for <span className="font-bold text-accent-brown">{selectedDetail.pet_name}</span></p>
                                </div>

                                {/* Date & Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white border border-accent-brown/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-brand" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Date</p>
                                        </div>
                                        <p className="font-black text-accent-brown text-sm">{selectedDetail.date}</p>
                                    </div>
                                    <div className="bg-white border border-accent-brown/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-3.5 h-3.5 text-brand" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Time</p>
                                        </div>
                                        <p className="font-black text-accent-brown text-sm">{selectedDetail.time}</p>
                                    </div>
                                </div>

                                {/* Location */}
                                {selectedDetail.location && (
                                    <div className="bg-white border border-accent-brown/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-3.5 h-3.5 text-brand" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Location</p>
                                        </div>
                                        <p className="font-bold text-accent-brown text-sm leading-relaxed">{selectedDetail.location}</p>
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedDetail.notes && (
                                    <div className="bg-white border border-accent-brown/10 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 mb-2">Special Notes</p>
                                        <p className="text-sm text-accent-brown/70 font-medium leading-relaxed">{selectedDetail.notes}</p>
                                    </div>
                                )}

                                {/* Total */}
                                <div className="bg-brand/5 border border-brand/20 rounded-2xl p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-dark/50 mb-1">Total Amount</p>
                                        <p className="font-black text-brand-dark text-2xl">&#8369;{selectedDetail.total.toFixed(2)}</p>
                                    </div>
                                    {selectedDetail.payment_status === 'paid'
                                        ? <ShieldCheck className="w-8 h-8 text-emerald-400" />
                                        : <CreditCard className="w-8 h-8 text-accent-brown/20" />
                                    }
                                </div>

                                {/* Meta */}
                                <div className="text-center pt-1 pb-2">
                                    <p className="text-[10px] text-accent-brown/30 font-medium">
                                        Reservation ID: <span className="font-black text-accent-brown/50">{selectedDetail.id}</span>
                                    </p>
                                    {selectedDetail.created_at && (
                                        <p className="text-[10px] text-accent-brown/30 font-medium mt-0.5">
                                            Booked on {new Date(selectedDetail.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Footer actions */}
                            <div className="p-6 border-t border-accent-brown/5 shrink-0 space-y-3">
                                {selectedDetail.status === 'Payment Pending' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            if (selectedDetail) {
                                                const dbId = selectedDetail.db_id;
                                                setSelectedDetail(null);
                                                handlePayExisting(dbId, 'gcash');
                                            }
                                        }}
                                        disabled={payNowLoading === selectedDetail.db_id}
                                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-60"
                                    >
                                        {payNowLoading === selectedDetail.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                        Pay Now
                                    </motion.button>
                                )}
                                {(selectedDetail.status === 'Pending' || selectedDetail.status === 'Confirmed') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            if (selectedDetail) {
                                                handleCancel(selectedDetail.db_id);
                                                setSelectedDetail(null);
                                            }
                                        }}
                                        disabled={cancellingId === selectedDetail.db_id}
                                        className="w-full bg-red-50 text-red-500 border border-red-200 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                                    >
                                        {cancellingId === selectedDetail.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                        Cancel Reservation
                                    </motion.button>
                                )}
                                <button
                                    onClick={() => setSelectedDetail(null)}
                                    className="w-full py-3 text-accent-brown/30 hover:text-accent-brown font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Package Explorer Sub-Modal */}
            <AnimatePresence>
                {showPackageExplorer && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPackageExplorer(false)}
                            className="fixed inset-0 bg-accent-brown/20 backdrop-blur-md z-[60]" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-accent-brown/5">
                                <div className="p-8 border-b border-accent-brown/5 flex items-center justify-between bg-accent-peach/5">
                                    <div>
                                        <h3 className="text-xl font-black text-accent-brown tracking-tighter">Available Packages</h3>
                                        <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest mt-1">Select a bundle to save</p>
                                    </div>
                                    <button onClick={() => setShowPackageExplorer(false)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center hover:bg-accent-peach/20 transition-all shadow-sm">
                                        <X className="w-5 h-5 text-accent-brown/40" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4 bg-accent-peach/5">
                                    {packageServices.map((pkg) => {
                                        let items: string[] = [];
                                        try { items = pkg.package_items_json ? JSON.parse(pkg.package_items_json) : []; } catch { items = []; }
                                        const isSelected = form.service_id === pkg.id;
                                        return (
                                            <motion.button
                                                key={pkg.id}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => {
                                                    setForm(f => ({ ...f, service: pkg.name, service_id: pkg.id }));
                                                    setShowPackageExplorer(false);
                                                }}
                                                className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group ${isSelected ? 'border-[#ea580c] bg-white shadow-xl shadow-[#ea580c]/10' : 'border-accent-brown/5 bg-white hover:border-[#ea580c]/30 hover:shadow-lg'}`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/30' : 'bg-accent-peach/20 text-[#ea580c]'}`}>
                                                            <Package className="w-7 h-7" />
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-xl font-black tracking-tight ${isSelected ? 'text-[#ea580c]' : 'text-accent-brown'}`}>{pkg.name}</h4>
                                                            <div className="flex items-center gap-3 mt-1 text-accent-brown/40">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{pkg.duration_minutes} Mins Duration</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-start sm:items-end bg-accent-peach/5 px-4 py-2 rounded-xl">
                                                        <span className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.2em]">Value Deal</span>
                                                        <span className="text-2xl font-black text-accent-brown tracking-tighter">₱{pkg.price.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                
                                                {(items.length > 0 || pkg.description) && (
                                                    <div className="relative z-10 space-y-4">
                                                        {items.length > 0 && (
                                                            <div className="space-y-2">
                                                                <div className="text-[9px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                                    <div className="w-1 h-1 bg-[#ea580c] rounded-full" /> Included Services:
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {items.map((item: string, idx: number) => (
                                                                        <div key={idx} className={`px-4 py-3 rounded-2xl border transition-all flex items-center gap-3 ${isSelected ? 'bg-white border-[#ea580c]/20 text-[#ea580c] shadow-sm' : 'bg-accent-peach/5 border-accent-brown/5 text-accent-brown/60 group-hover:bg-white group-hover:border-accent-brown/10'}`}>
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#ea580c]' : 'bg-accent-brown/20'}`} />
                                                                            <span className="text-[11px] font-bold">{item}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {pkg.description && (
                                                            <div className="px-4 py-3 bg-slate-50 border-l-4 border-slate-200 rounded-r-xl">
                                                                <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">{pkg.description}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Background Glow */}
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#ea580c]/5 rounded-full blur-[60px] -mr-24 -mt-24 group-hover:bg-[#ea580c]/10 transition-colors" />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
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


        </DashboardLayout>
    );
};

export default CustomerReservations;
