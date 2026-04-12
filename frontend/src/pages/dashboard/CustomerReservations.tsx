import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight, Plus, X, AlertCircle, CheckCircle, Loader2, CalendarX, Clock3, CreditCard, Banknote, ShieldCheck, Gift, Sparkles, QrCode, Wallet, Smartphone, Activity, Trophy } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import ModernModal from '../../components/ModernModal';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import QrCodeModal from '../../components/QrCodeModal';
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
    tracking_id: string;
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
        <StreetViewInner lat={lat} lng={lng} />
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
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'paymaya' | 'qrph' | 'cash' | ''>('');
    const [payNowLoading, setPayNowLoading] = useState<number | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<Reservation | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeStatus, setActiveStatus] = useState('All');
    const [showPackageExplorer, setShowPackageExplorer] = useState(false);
    const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
    const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
    const [wizardStep, setWizardStep] = useState(1);
    const [showMethodSelector, setShowMethodSelector] = useState(false);
    const [paymentSelectionId, setPaymentSelectionId] = useState<number | null>(null);

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const ITEMS_PER_PAGE = 5;



    const tabs = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Payment Pending'];

    const token = localStorage.getItem('hivet_token');
    const authHeaders = useMemo(() => ({ 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
    }), [token]);

    // QRPh Payment State
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState('');
    const [qrReference, setQrReference] = useState('');
    const [qrAmount, setQrAmount] = useState(0);
    const [qrStatus, setQrStatus] = useState<'pending' | 'succeeded' | 'expired' | 'processing'>('pending');
    const pollingInterval = useRef<any>(null);

    // HI-VET ARCHITECTURE NOIR: Modal State Observer
    // Hides the background site footer and layout when a priority modal is active.
    useEffect(() => {
        const isActive = showModal || !!selectedDetail || showQrModal || showPackageExplorer;
        if (isActive) {
            document.body.classList.add('map-modal-active');
        } else {
            document.body.classList.remove('map-modal-active');
        }
        return () => document.body.classList.remove('map-modal-active');
    }, [showModal, selectedDetail, showQrModal, showPackageExplorer]);

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
                        setTimeout(async () => {
                            const refreshRes = await fetch(`${API}/api/reservations`, { headers: authHeaders });
                            if (refreshRes.ok) {
                                const d = await refreshRes.json();
                                setReservations(d.reservations || []);
                            }
                            setShowQrModal(false);
                        }, 2000);
                    } else if (data.status === 'expired') {
                        setQrStatus('expired');
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                    }
                }
            } catch (err) { console.error('Polling error:', err); }
        }, 5000);
    };

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
    const fetchData = useCallback(async () => {
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
    }, [authHeaders]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
    const activeCount = reservations.filter(r => ['Pending', 'Confirmed', 'Payment Pending'].includes(r.status)).length;
    const pendingPaymentCount = reservations.filter(r => r.payment_status === 'unpaid' && r.status === 'Payment Pending').length;
    const completedCount = reservations.filter(r => r.status === 'Completed').length;

    // Reset to page 1 if search/filter or deletions make current page invalid
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [filteredReservations.length, totalPages, currentPage]);

    const activeReservation = reservations.find(r => r.status === 'Ready for Pickup' || r.status === 'Confirmed' || r.status === 'Pending');

    const handleStepContinue = () => {
        if (wizardStep === 3 && appliedVoucher && estimatedTotal === 0) {
            setModal({
                isOpen: true,
                title: 'Apply Free Reward?',
                message: `You are applying the voucher "${appliedVoucher.title}" which makes this reservation 100% free. Proceed to checkout?`,
                type: 'confirm',
                onConfirm: () => {
                    setWizardStep(4);
                    setModal(m => ({ ...m, isOpen: false }));
                }
            });
            return;
        }
        if (wizardStep === 2) {
            if (todayHours && !todayHours.is_open) {
                const dayOfWeek = new Date(form.date).toLocaleDateString('en-US', { weekday: 'long' });
                showToast(`The clinic is closed on ${dayOfWeek}s. Please select another date.`, 'error');
                return;
            }
        }
        setWizardStep(s => s + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        // HARD GUARD: Only allow submission from the final review step (Step 4)
        if (wizardStep !== 4) {
            console.warn('Form submission blocked: Must be on Step 4 to finalize.');
            return;
        }

        // Comprehensive pre-submission validation
        if (!form.pet_name.trim() || !form.service || !form.date || !form.time) {
            showToast('Please fill in all required fields (Pet Name, Service, Date, Time).', 'error');
            return;
        }

        if (!form.clinic_id || form.clinic_id === 0) {
            showToast('Please select a healthcare provider clinic first.', 'error');
            setWizardStep(1);
            return;
        }

        if (!form.service_id || form.service_id === 0) {
            showToast('Please select a specific service to proceed.', 'error');
            setWizardStep(1);
            return;
        }

        setSubmitting(true);
        try {
            // Step 1 — create the reservation (Payment Pending)
            const payload = {
                pet_name: form.pet_name.trim(),
                service: form.service,
                service_id: Number(form.service_id),
                date: form.date,
                time: form.time,
                location: selectedOption ? `${selectedOption.address_line1}, ${selectedOption.address_line2}`.replace(/,\s*,/g, ',').trim() : '',
                notes: form.notes || '',
                business_id: Number(form.clinic_id),
                branch_id: selectedOption?.branch_id ? Number(selectedOption.branch_id) : null,
                total_amount: Number(estimatedTotal),
                voucher_code: appliedVoucher?.code || null,
            };

            const res = await fetch(`${API}/api/reservations`, { 
                method: 'POST', 
                headers: authHeaders, 
                body: JSON.stringify(payload) 
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to create reservation');
            }
            const data = await res.json();
            const newReservation = data.reservation;
            setReservations(prev => [newReservation, ...prev]);

            // Robust check: Skip payment if backend says it's already paid OR if frontend total is negligible
            if (newReservation.payment_status === 'paid' || estimatedTotal < 0.01) {
                // Free Booking Logic: No payment gateway required
                setForm(defaultForm);
                setAppliedVoucher(null);
                setWizardStep(5); // Move to Receipt View
                showToast('Success! Your reservation has been confirmed.');
            } else if (selectedPaymentMethod === 'cash') {
                // Cash: confirm immediately (no PayMongo), reservation becomes Pending
                await fetch(`${API}/api/payments/paymongo/reservation-confirm/${newReservation.db_id}`, {
                    method: 'POST',
                    headers: authHeaders,
                });
                // Update local state to show Pending status
                setReservations(prev => prev.map(r =>
                    r.db_id === newReservation.db_id ? { ...r, status: 'Pending', payment_status: 'paid' } : r
                ));
                setForm(defaultForm);
                setWizardStep(5); // Show Receipt
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
                setForm(defaultForm);
                setAppliedVoucher(null);
                
                if (selectedPaymentMethod === 'qrph' && payData.qr_code) {
                    setQrData(payData.qr_code);
                    setQrReference(newReservation.tracking_id || `RV-${newReservation.db_id}`);
                    setQrAmount(estimatedTotal);
                    setShowQrModal(true);
                    startPolling(payData.intent_id);
                } else if (payData.checkout_url) {
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

    const handlePayExisting = async (reservationDbId: number, method: 'gcash' | 'paymaya' | 'qrph' = 'qrph') => {
        // Find the reservation to check its total
        const resObj = reservations.find(r => r.db_id === reservationDbId);
        if (resObj && resObj.total <= 0) {
            showToast('Success! This reservation has been marked as confirmed.', 'success');
            fetchData(); // Refresh list
            return;
        }

        setPayNowLoading(reservationDbId);
        try {
            const res = await fetch(`${API}/api/payments/paymongo/reservation-checkout`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ reservation_id: reservationDbId, payment_method: method }),
            });
            const data = await res.json();
            if (method === 'qrph' && data.qr_code) {
                setQrData(data.qr_code);
                setQrReference(resObj?.tracking_id || `RV-${reservationDbId}`);
                setQrAmount(resObj?.total || 0);
                setShowQrModal(true);
                startPolling(data.intent_id);
            } else if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                showToast('Failed to initiate payment gateway.', 'error');
            }
        } catch (error) {
            console.error('Payment Error:', error);
            showToast('An error occurred during payment initiation.', 'error');
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

                {/* HI-VET ARCHITECTURE NOIR: CINEMATIC HEADER */}
                <div className="relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                        <div className="relative z-10">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 mb-4"
                            >
                                <div className="w-1.5 h-6 bg-brand rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/40">Wellness Journey</span>
                            </motion.div>
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl sm:text-7xl font-black text-accent-brown tracking-tighter leading-[0.9]"
                            >
                                My <br /> <span className="text-brand">Reservations</span>
                            </motion.h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 relative z-10">
                            {[
                                { label: 'Active', count: activeCount, color: 'text-brand', icon: Activity },
                                { label: 'Settling', count: pendingPaymentCount, color: 'text-blue-500', icon: CreditCard },
                                { label: 'Done', count: completedCount, color: 'text-emerald-500', icon: Trophy }
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="bg-white px-6 py-4 rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white flex items-center gap-4 min-w-[140px]"
                                >
                                    <div className={`p-2 rounded-xl bg-slate-50 ${stat.color}`}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 leading-none mb-1">{stat.label}</p>
                                        <p className="text-xl font-black text-accent-brown leading-none">{stat.count}</p>
                                    </div>
                                </motion.div>
                            ))}
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#000' }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                onClick={() => {
                                    setWizardStep(1);
                                    setShowModal(true);
                                }}
                                className="bg-brand-dark text-white h-[68px] px-8 rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-brand-dark/20 ml-auto sm:ml-0"
                            >
                                <Plus className="w-5 h-5" /> New Appointment
                            </motion.button>
                        </div>
                    </div>

                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] -mr-64 -mt-32 opacity-50 pointer-events-none" />
                </div>

                {/* Loading / Error States */}
                {loading && <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 text-brand animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Synchronizing records...</p>
                </div>}

                {!loading && error && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 border border-red-100 rounded-[2rem] p-8 flex items-center gap-6 text-red-600 shadow-xl shadow-red-500/5">
                        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-widest text-[10px] mb-1">Access Error</p>
                            <p className="font-bold text-sm">{error}</p>
                        </div>
                    </motion.div>
                )}

                {/* HI-VET ARCHITECTURE NOIR: FILTER TABS */}
                {!loading && !error && reservations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 pb-8">
                        {tabs.map((tab, i) => {
                            const count = tab === 'All' ? reservations.length : reservations.filter(r => r.status === tab).length;
                            return (
                                <motion.button
                                    key={tab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + (i * 0.05) }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setActiveStatus(tab);
                                        setCurrentPage(1);
                                    }}
                                    className={`group px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 cursor-pointer ${
                                        activeStatus === tab 
                                        ? 'bg-brand text-white shadow-xl shadow-brand/20' 
                                        : 'bg-white text-accent-brown/40 hover:text-accent-brown border border-accent-brown/5 shadow-sm'
                                    }`}
                                >
                                    {tab}
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeStatus === tab ? 'bg-white/20 text-white' : 'bg-slate-50 text-accent-brown/40 border border-accent-brown/5'}`}>
                                        {count}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                )}

                {/* HI-VET ARCHITECTURE NOIR: RESERVATION LIST */}
                {!loading && !error && reservations.length > 0 && (
                    <div className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {filteredReservations.length === 0 ? (
                                <motion.div 
                                    key="empty-filter"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-[3rem] p-24 flex flex-col items-center gap-6 text-center shadow-2xl shadow-accent-brown/5 border border-white"
                                >
                                    <div className="w-20 h-20 bg-accent-peach/10 rounded-full flex items-center justify-center text-accent-brown/20 stroke-[1]">
                                        <CalendarX className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-accent-brown text-2xl tracking-tighter mb-2">No {activeStatus} Records</h4>
                                        <p className="text-accent-brown/40 text-sm font-medium max-w-xs mx-auto">We couldn't find any appointments matching your current filter selection.</p>
                                    </div>
                                    <button onClick={() => setActiveStatus('All')} className="px-8 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-accent-brown rounded-full hover:bg-accent-peach/20 transition-all cursor-pointer">Reset Filters</button>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {paginatedReservations.map((res, i) => (
                                        <motion.div
                                            key={res.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            whileHover={{ y: -4 }}
                                            className="group bg-white rounded-[2.5rem] p-4 sm:p-5 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all flex flex-col lg:flex-row lg:items-center gap-6 cursor-pointer relative overflow-hidden"
                                            onClick={() => setSelectedDetail(res)}
                                        >
                                            {/* Date Badge */}
                                            <div className="w-full lg:w-32 lg:h-[120px] bg-slate-50 rounded-[2rem] flex flex-col items-center justify-center border border-accent-brown/5 group-hover:bg-brand/5 group-hover:border-brand/10 transition-colors shrink-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 group-hover:text-brand/40 transition-colors mb-1">
                                                    {new Date(res.date).toLocaleDateString('en-US', { month: 'short' })}
                                                </p>
                                                <p className="text-4xl font-black text-accent-brown tracking-tighter leading-none group-hover:text-brand transition-colors">
                                                    {new Date(res.date).getDate()}
                                                </p>
                                                <p className="text-[9px] font-black uppercase tracking-tighter text-accent-brown/40 mt-1 whitespace-nowrap">
                                                    {res.time}
                                                </p>
                                            </div>

                                            {/* Core Info */}
                                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/20">{res.id}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${STATUS_STYLES[res.status] || 'bg-slate-100 text-slate-500'}`}>
                                                            {res.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-accent-brown tracking-tight group-hover:translate-x-1 transition-transform">
                                                        {res.service} <span className="text-accent-brown/30 font-bold mx-2">·</span> <span className="text-brand">{res.pet_name}</span>
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">
                                                        <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-accent-brown/5">
                                                            <MapPin className="w-3.5 h-3.5 text-brand" /> {res.location || "Main Clinic"}
                                                        </span>
                                                        <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-accent-brown/5">
                                                            <Clock className="w-3.5 h-3.5 text-brand" /> {res.time}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Stack */}
                                                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-6 sm:gap-4 shrink-0 px-2 sm:px-0">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-1 leading-none">Total Value</p>
                                                        <p className="text-2xl font-black text-accent-brown tracking-tighter leading-none">₱{res.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {res.status === 'Payment Pending' && res.payment_status === 'unpaid' && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    setPaymentSelectionId(res.db_id);
                                                                    setShowMethodSelector(true);
                                                                }}
                                                                disabled={payNowLoading === res.db_id}
                                                                className="h-12 px-6 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                {payNowLoading === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                                                Pay Now
                                                            </motion.button>
                                                        )}
                                                        
                                                        {(res.status === 'Pending' || res.status === 'Confirmed' || res.status === 'Payment Pending') ? (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); handleCancel(res.db_id); }}
                                                                disabled={cancellingId === res.db_id}
                                                                className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg shadow-red-500/5 group/btn"
                                                            >
                                                                {cancellingId === res.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                            </motion.button>
                                                        ) : res.status === 'Cancelled' ? (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1, rotate: 90 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteReservation(res.db_id);
                                                                }}
                                                                className="w-12 h-12 bg-accent-brown text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-accent-brown/20 cursor-pointer"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button
                                                                whileHover={{ x: 4 }}
                                                                className="p-3 bg-slate-50 text-accent-brown/30 hover:text-brand rounded-xl border border-accent-brown/5 transition-all"
                                                            >
                                                                <ChevronRight className="w-5 h-5" />
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Background Glow */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand/10 transition-colors opacity-0 group-hover:opacity-100" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Pagination Controls */}
                        {filteredReservations.length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-t border-accent-brown/5">
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/20 mb-1">Index Summary</p>
                                    <p className="text-[11px] font-black text-accent-brown/40 uppercase tracking-widest">
                                        Showing <span className="text-accent-brown">{(currentPage - 1) * ITEMS_PER_PAGE + 1} – {Math.min(currentPage * ITEMS_PER_PAGE, filteredReservations.length)}</span> of {filteredReservations.length} records
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        whileHover={currentPage > 1 ? { scale: 1.05, border: '1px solid rgba(255,159,28,0.5)' } : {}}
                                        whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-accent-brown/50 border border-accent-brown/5 hover:bg-white hover:text-brand transition-all disabled:opacity-30 disabled:hover:border-accent-brown/5 cursor-pointer"
                                    >
                                        Prev
                                    </motion.button>
                                    
                                    <div className="flex items-center gap-2">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            return (
                                                <motion.button
                                                    key={page}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'bg-white text-accent-brown/40 border border-accent-brown/5 hover:bg-slate-50'}`}
                                                >
                                                    {page}
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    <motion.button
                                        whileHover={currentPage < totalPages ? { scale: 1.05, border: '1px solid rgba(255,159,28,0.5)' } : {}}
                                        whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-accent-brown/50 border border-accent-brown/5 hover:bg-white hover:text-brand transition-all disabled:opacity-30 disabled:hover:border-accent-brown/5 cursor-pointer"
                                    >
                                        Next
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>

                {/* New Reservation Modal */}
                <AnimatePresence>
                    {showModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50 cursor-pointer" />
                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 100 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 100 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.stopPropagation()}>
                                <div className="bg-white rounded-t-[2rem] sm:rounded-[3rem] p-0 w-full max-w-7xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] h-[92vh] sm:h-[85vh] max-h-[900px] flex flex-col overflow-hidden border border-white/20">
                                    {/* Wizard Progress Header */}
                                    <div className="bg-accent-peach/5 border-b border-accent-brown/5 px-8 pt-6 pb-4 shrink-0 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                                        
                                        <div className="flex flex-row items-center justify-between mb-4 relative z-10">
                                            <div className="min-w-0">
                                                <h2 className="text-2xl font-black text-accent-brown tracking-tighter">New Reservation</h2>
                                                <p className="text-[10px] font-black text-accent-brown/40 mt-1 uppercase tracking-[0.2em]">Step {wizardStep} of 4 · {
                                                    wizardStep === 1 ? 'Location & Provider' :
                                                    wizardStep === 2 ? 'Scheduling Details' :
                                                    wizardStep === 3 ? 'Rewards & Notes' : 'Finalize & Payment'
                                                }</p>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 90 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setShowModal(false)}
                                                className="w-10 h-10 bg-white hover:bg-red-50 text-accent-brown/30 hover:text-red-500 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border border-accent-brown/5 cursor-pointer"
                                            >
                                                <X className="w-5 h-5" />
                                            </motion.button>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="flex items-center gap-2 relative z-10">
                                            {[1, 2, 3, 4].map((s) => (
                                                <div key={s} className="flex-1 flex flex-col gap-2">
                                                    <div className={`h-1.5 rounded-full transition-all duration-500 ${wizardStep >= s ? 'bg-brand shadow-[0_0_10px_rgba(255,159,28,0.3)]' : 'bg-accent-brown/5'}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${wizardStep === s ? 'text-brand' : 'text-accent-brown/30'}`}>
                                                        {s === 1 ? 'Provider' : s === 2 ? 'Details' : s === 3 ? 'Extras' : 'Payment'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-hidden flex flex-col relative bg-white">
                                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 relative">
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 px-8 sm:px-10 bg-white">
                                            <AnimatePresence mode="wait">
                                                {/* STEP 1: PROVIDER & SERVICE */}
                                                {wizardStep === 1 && (
                                                    <motion.div
                                                        key="step1"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="h-full flex flex-col lg:flex-row gap-12"
                                                    >
                                                        <div className="flex-1 space-y-8">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-6">Step 1: Select Facility</p>
                                                                {clinics.length === 0 ? (
                                                                    <div className="px-5 py-8 bg-accent-peach/5 rounded-3xl text-sm text-accent-brown/30 font-bold border-2 border-dashed border-accent-peach/20 text-center">No verified clinics available.</div>
                                                                ) : (
                                                                    <div className="space-y-6">
                                                                        <CustomDropdown
                                                                            label="Healthcare Provider"
                                                                            value={form.clinic_id ? form.clinic_id.toString() : ''}
                                                                            options={clinics.map(c => ({ label: c.name, value: c.id.toString() }))}
                                                                            onChange={val => {
                                                                                const c = clinics.find(cl => cl.id.toString() === val);
                                                                                // Default to main branch or first branch
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

                                                                        {(() => {
                                                                            const selectedClinic = clinics.find(c => c.id === form.clinic_id);
                                                                            if (!selectedClinic || (selectedClinic.branches?.length || 0) <= 1) return null;
                                                                            
                                                                            return (
                                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                                                    <CustomDropdown
                                                                                        label="Select Clinic Branch"
                                                                                        value={form.clinic_option_key}
                                                                                        options={selectedClinic.branches.map(b => ({ 
                                                                                            label: b.name, 
                                                                                            value: `${selectedClinic.id}-${b.id}` 
                                                                                        }))}
                                                                                        onChange={val => {
                                                                                            setForm(f => ({ ...f, clinic_option_key: val }));
                                                                                        }}
                                                                                    />
                                                                                </motion.div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {selectedOption && (
                                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                                                    <CustomDropdown
                                                                        label="Medical Service"
                                                                        value={selectedService && !isPackageService(selectedService) ? `${selectedService.name} — ₱${selectedService.price}` : 'Select service...'}
                                                                        options={regularServices.map(s => `${s.name} — ₱${s.price}`)}
                                                                        onChange={val => {
                                                                            const svc = regularServices.find(s => `${s.name} — ₱${s.price}` === val);
                                                                            setForm(f => ({ ...f, service: svc?.name || '', service_id: svc?.id || 0 }));
                                                                        }}
                                                                    />

                                                                    {packageServices.length > 0 && (
                                                                        <button type="button" onClick={() => setShowPackageExplorer(true)}
                                                                            className="w-full py-5 px-6 bg-white border-2 border-[#ea580c]/20 hover:border-[#ea580c] text-[#ea580c] rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between group shadow-lg shadow-black/5">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-10 h-10 bg-[#ea580c]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#ea580c] transition-colors">
                                                                                    <Package className="w-5 h-5 text-[#ea580c] group-hover:text-white" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <span>Clinic Bundles & Packages</span>
                                                                                    <p className="text-[8px] opacity-50 lowercase tracking-normal">Save up to 30% on bundles</p>
                                                                                </div>
                                                                            </div>
                                                                            <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                                        </button>
                                                                    )}

                                                                    {selectedService && isPackageService(selectedService) && (
                                                                        <div className="p-6 bg-[#ea580c]/5 border border-[#ea580c]/20 rounded-3xl">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <span className="text-[10px] font-black text-[#ea580c] uppercase tracking-widest">Active Bundle: {selectedService.name}</span>
                                                                                <button type="button" onClick={() => setForm(f => ({ ...f, service: '', service_id: 0 }))} className="text-[9px] font-black uppercase text-[#ea580c]/60 hover:text-[#ea580c]">Remove</button>
                                                                            </div>
                                                                            {(() => {
                                                                                let items = [];
                                                                                try { items = selectedService.package_items_json ? JSON.parse(selectedService.package_items_json) : []; } catch { items = []; }
                                                                                return (
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {items.map((item: string, idx: number) => (
                                                                                            <span key={idx} className="px-3 py-1.5 bg-white border border-[#ea580c]/10 text-[#ea580c] rounded-xl text-[9px] font-bold shadow-sm">{item}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </div>

                                                        {/* Preview Column */}
                                                        <div className="w-full lg:w-[450px] shrink-0">
                                                            {selectedOption ? (
                                                                <div className="sticky top-0 space-y-6">
                                                                    <div className="bg-accent-peach/5 border border-accent-brown/5 rounded-[2.5rem] p-6 space-y-6 relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                                                        <div className="flex items-start gap-4 relative z-10">
                                                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-md border border-accent-brown/5">
                                                                                <MapPin className="w-6 h-6 text-brand" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#ea580c] mb-1">Clinic Branch</h4>
                                                                                <p className="text-lg font-black text-accent-brown leading-tight mb-2">{selectedOption.label}</p>
                                                                                <p className="text-[11px] font-bold text-accent-brown/40 leading-relaxed max-w-[280px]">
                                                                                    {selectedOption.address_line1}, {selectedOption.address_line2}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        {selectedOption.lat && selectedOption.lng && (
                                                                            <div className="rounded-3xl overflow-hidden aspect-video border-4 border-white shadow-2xl relative group bg-accent-peach/10">
                                                                                <InteractiveStreetView lat={selectedOption.lat} lng={selectedOption.lng} />
                                                                                <div className="absolute inset-0 bg-brand/10 pointer-events-none mix-blend-overlay group-hover:opacity-0 transition-opacity" />
                                                                                <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-accent-brown/5">
                                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown flex items-center gap-2">
                                                                                        <Sparkles className="w-3 h-3 text-brand" /> Live Preview
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-12 bg-accent-peach/5 border-2 border-dashed border-accent-peach/20 rounded-[3rem] text-center">
                                                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border border-accent-brown/5">
                                                                        <Loader2 className="w-8 h-8 text-brand/20 animate-spin" />
                                                                    </div>
                                                                    <h3 className="text-sm font-black text-accent-brown/30 uppercase tracking-widest">Awaiting selection</h3>
                                                                    <p className="text-xs font-bold text-accent-brown/20 mt-2">Select a clinic to view location details</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* STEP 2: SCHEDULING DETAILS */}
                                                {wizardStep === 2 && (
                                                    <motion.div
                                                        key="step2"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="h-full flex flex-col lg:flex-row gap-12"
                                                    >
                                                        <div className="flex-1 space-y-10">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-6">Step 2: Scheduling & Identity</p>
                                                                <div className="space-y-6">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-3 block ml-1">Pet Name *</label>
                                                                        <input required type="text" value={form.pet_name}
                                                                            onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
                                                                            placeholder="e.g. Max"
                                                                            className="w-full px-6 py-5 bg-accent-peach/5 border-2 border-transparent focus:border-[#ea580c]/30 rounded-3xl text-sm font-black text-accent-brown outline-none transition-all placeholder:text-accent-brown/20 shadow-sm" />
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                        <CustomDatePicker label="Preferred Date" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} minDate={new Date().toISOString().split('T')[0]} />
                                                                        <CustomDropdown
                                                                            label="Arrival Time"
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
                                                                                } else { outsideHours = true; }
                                                                                return !isPast && !outsideHours;
                                                                            }).map(t => ({
                                                                                label: t,
                                                                                value: t,
                                                                                disabled: bookedSlots.includes(t),
                                                                                badge: bookedSlots.includes(t) ? 'Booked' : undefined
                                                                            }))}
                                                                            onChange={val => setForm(f => ({ ...f, time: val }))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="w-full lg:w-[450px] shrink-0">
                                                            {todayHours ? (
                                                                <div className={`p-8 rounded-[2.5rem] border-2 transition-all h-full flex flex-col justify-center gap-6 ${todayHours.is_open ? 'bg-green-50/20 border-green-500/10 shadow-xl shadow-green-600/5' : 'bg-red-50/20 border-red-500/10'}`}>
                                                                    <div className="flex items-center gap-5">
                                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${todayHours.is_open ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                                            <Clock3 className="w-7 h-7" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className={`text-lg font-black tracking-tight ${todayHours.is_open ? 'text-green-700' : 'text-red-700'}`}>
                                                                                {todayHours.is_open ? 'Clinic is accepting patients' : 'Clinic is currently closed'}
                                                                            </h4>
                                                                            <p className="text-[11px] font-bold opacity-50 uppercase tracking-widest">{form.date || 'Please select a date'}</p>
                                                                        </div>
                                                                    </div>
                                                                    {todayHours.is_open && (
                                                                        <div className="space-y-3 bg-white/40 backdrop-blur-sm p-6 rounded-3xl border border-green-500/5">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[10px] font-black uppercase text-green-700/40 tracking-widest">Opening Hours</span>
                                                                                <span className="text-sm font-black text-green-800">{todayHours.open_time} – {todayHours.close_time}</span>
                                                                            </div>
                                                                            {todayHours.break_start && (
                                                                                <div className="flex items-center justify-between pt-3 border-t border-green-500/10">
                                                                                    <span className="text-[10px] font-black uppercase text-green-700/40 tracking-widest">Noon Break</span>
                                                                                    <span className="text-xs font-bold text-green-800/60">{todayHours.break_start} – {todayHours.break_end}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-accent-brown/30 mt-4">
                                                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                                        Verified clinic availability for this schedule.
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full flex flex-col items-center justify-center p-12 bg-accent-peach/5 border-2 border-dashed border-accent-peach/20 rounded-[3rem] text-center">
                                                                    <Clock3 className="w-12 h-12 text-accent-brown/20 mb-4" />
                                                                    <p className="text-sm font-black text-accent-brown/30 uppercase tracking-widest">Awaiting Date Selection</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* STEP 3: EXTRAS & REWARDS */}
                                                {wizardStep === 3 && (
                                                    <motion.div
                                                        key="step3"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="h-full flex flex-col lg:flex-row gap-12"
                                                    >
                                                        <div className="flex-1 space-y-10">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-6">Step 3: Rewards & Inclusions</p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {myVouchers.length > 0 ? (
                                                                        myVouchers.map((mv) => (
                                                                            <motion.button key={mv.id} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                                                onClick={() => setAppliedVoucher(appliedVoucher?.id === mv.id ? null : mv)}
                                                                                className={`p-6 rounded-3xl border-2 transition-all text-left flex items-start gap-4 relative overflow-hidden ${appliedVoucher?.id === mv.id ? 'border-[#ea580c] bg-[#ea580c]/5 shadow-xl shadow-[#ea580c]/10' : 'border-accent-brown/5 bg-white hover:border-[#ea580c]/30 shadow-sm'}`}>
                                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${appliedVoucher?.id === mv.id ? 'bg-[#ea580c] text-white shadow-lg' : 'bg-blue-100 text-blue-600'}`}>
                                                                                    <Sparkles className="w-6 h-6" />
                                                                                </div>
                                                                                <div className="min-w-0 pr-6">
                                                                                    <p className={`font-black text-sm mb-1 truncate ${appliedVoucher?.id === mv.id ? 'text-[#ea580c]' : 'text-accent-brown'}`}>{mv.title}</p>
                                                                                    <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em]">{mv.code}</p>
                                                                                </div>
                                                                                {appliedVoucher?.id === mv.id && <div className="absolute top-4 right-4"><CheckCircle className="w-5 h-5 text-[#ea580c]" /></div>}
                                                                            </motion.button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="col-span-1 sm:col-span-2 px-6 py-12 bg-accent-peach/5 border-2 border-dashed border-accent-peach/20 rounded-[2.5rem] flex flex-col items-center gap-3 text-center">
                                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-2"><Gift className="w-8 h-8 text-accent-brown/10" /></div>
                                                                            <p className="text-sm font-black text-accent-brown/30 uppercase tracking-widest leading-none">No digital rewards found</p>
                                                                            <p className="text-xs font-bold text-accent-brown/20 italic">Keep using Hi-Vet to earn exclusive service vouchers</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="w-full lg:w-[450px] shrink-0">
                                                            <div>
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 mb-4 block ml-1">Special Clinical Requests</label>
                                                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                                                    placeholder="Any allergies, previous conditions, or specific details for the vet..."
                                                                    className="w-full h-[320px] px-8 py-6 bg-accent-peach/5 border-2 border-transparent focus:border-[#ea580c]/30 rounded-[2.5rem] text-sm font-bold text-accent-brown outline-none transition-all resize-none placeholder:text-accent-brown/20 shadow-inner" />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* STEP 4: FINALIZE & PAYMENT */}
                                                {wizardStep === 4 && (
                                                    <motion.div
                                                        key="step4"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="h-full flex flex-col lg:flex-row gap-12"
                                                    >
                                                        <div className="flex-1 space-y-10">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-6">Step 4: Secure Checkout</p>
                                                                
                                                                {estimatedTotal === 0 ? (
                                                                    <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] text-center space-y-4 mb-8">
                                                                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                                                                            <Gift className="w-10 h-10" />
                                                                        </div>
                                                                        <h3 className="text-2xl font-black text-emerald-800 tracking-tighter">Complimentary Reservation</h3>
                                                                        <p className="text-sm font-medium text-emerald-600/70 max-w-sm mx-auto leading-relaxed">
                                                                            Your reservation is <span className="font-extrabold">100% free</span> thanks to your applied reward. No payment information is required.
                                                                        </p>
                                                                        <div className="pt-4">
                                                                            <span className="px-4 py-2 bg-white rounded-xl text-[10px] font-black text-emerald-600 uppercase tracking-widest shadow-sm">Verified Reward: {appliedVoucher?.code}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                                        {/* Native QRPh */}
                                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('qrph')}
                                                                            className={`relative p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${selectedPaymentMethod === 'qrph' ? 'border-[#ea580c] bg-[#ea580c]/5 shadow-xl shadow-[#ea580c]/10' : 'border-accent-brown/5 bg-white hover:border-[#ea580c]/20 shadow-sm'}`}>
                                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0038A8] via-[#CE1126] to-[#FCD116] flex items-center justify-center shrink-0 shadow-lg ring-2 ring-white">
                                                                                <QrCode className="w-6 h-6 text-white" />
                                                                            </div>
                                                                            <div className="text-left flex-1 min-w-0">
                                                                                <p className="font-black text-accent-brown text-sm tracking-tight truncate">QRPh Unified</p>
                                                                                <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-widest">Universal Scan</p>
                                                                            </div>
                                                                            {selectedPaymentMethod === 'qrph' && <div className="w-6 h-6 bg-[#ea580c] rounded-full flex items-center justify-center shadow-lg"><CheckCircle className="w-4 h-4 text-white" /></div>}
                                                                        </motion.button>

                                                                        {/* GCash */}
                                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('gcash')}
                                                                            className={`relative p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${selectedPaymentMethod === 'gcash' ? 'border-blue-600 bg-blue-50 shadow-xl shadow-blue-600/10' : 'border-accent-brown/5 bg-white hover:border-blue-600/20 shadow-sm'}`}>
                                                                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg ring-2 ring-white">
                                                                                <Wallet className="w-6 h-6 text-white" />
                                                                            </div>
                                                                            <div className="text-left flex-1 min-w-0">
                                                                                <p className="font-black text-accent-brown text-sm tracking-tight truncate">GCash</p>
                                                                                <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-widest">via PayMongo</p>
                                                                            </div>
                                                                            {selectedPaymentMethod === 'gcash' && <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg"><CheckCircle className="w-4 h-4 text-white" /></div>}
                                                                        </motion.button>

                                                                        {/* Maya */}
                                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('paymaya')}
                                                                            className={`relative p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${selectedPaymentMethod === 'paymaya' ? 'border-emerald-600 bg-emerald-50 shadow-xl shadow-emerald-600/10' : 'border-accent-brown/5 bg-white hover:border-emerald-600/20 shadow-sm'}`}>
                                                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg ring-2 ring-white">
                                                                                <Smartphone className="w-6 h-6 text-white" />
                                                                            </div>
                                                                            <div className="text-left flex-1 min-w-0">
                                                                                <p className="font-black text-accent-brown text-sm tracking-tight truncate">Maya</p>
                                                                                <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-widest">via PayMongo</p>
                                                                            </div>
                                                                            {selectedPaymentMethod === 'paymaya' && <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg"><CheckCircle className="w-4 h-4 text-white" /></div>}
                                                                        </motion.button>

                                                                        {/* Cash */}
                                                                        <motion.button type="button" onClick={() => setSelectedPaymentMethod('cash')}
                                                                            className={`relative p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${selectedPaymentMethod === 'cash' ? 'border-amber-600 bg-amber-50 shadow-xl shadow-amber-600/10' : 'border-accent-brown/5 bg-white hover:border-accent-brown/20 shadow-sm'}`}>
                                                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                                                <Banknote className="w-6 h-6 text-amber-600" />
                                                                            </div>
                                                                            <div className="text-left flex-1 min-w-0">
                                                                                <p className="font-black text-accent-brown text-sm tracking-tight truncate">Cash on Clinic</p>
                                                                                <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-widest">Manual Settle</p>
                                                                            </div>
                                                                            {selectedPaymentMethod === 'cash' && <div className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center shadow-lg"><CheckCircle className="w-4 h-4 text-white" /></div>}
                                                                        </motion.button>
                                                                    </div>

                                                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex items-start gap-4">
                                                                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-slate-200">
                                                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">Encrypted Transaction</h5>
                                                                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed">Your reservation is protected under our medical data privacy protocols. No hidden charges will be applied.</p>
                                                                    </div>
                                                                </div>
                                                                </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="w-full lg:w-[450px] shrink-0">
                                                            <div className="bg-accent-brown/5 rounded-[2.5rem] p-4 flex flex-col h-full border border-accent-brown/5">
                                                                <div className="bg-white rounded-[2rem] p-8 flex-1 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                                                                    
                                                                    <div className="relative z-10">
                                                                        <h4 className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-6">Booking Summary</h4>
                                                                        
                                                                        <div className="space-y-6">
                                                                            <div className="flex justify-between items-start gap-4">
                                                                                <div className="min-w-0">
                                                                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1">Patient & Service</p>
                                                                                    <p className="font-black text-accent-brown text-base tracking-tight leading-tight">{form.pet_name} · {form.service}</p>
                                                                                </div>
                                                                                <div className="w-10 h-10 bg-brand/5 rounded-xl flex items-center justify-center shrink-0">
                                                                                    <Package className="w-5 h-5 text-brand" />
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex justify-between items-start gap-4">
                                                                                <div className="min-w-0">
                                                                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1">Schedule</p>
                                                                                    <p className="font-black text-accent-brown text-base tracking-tight leading-tight">{form.date} · {form.time}</p>
                                                                                </div>
                                                                                <div className="w-10 h-10 bg-brand/5 rounded-xl flex items-center justify-center shrink-0">
                                                                                    <Calendar className="w-5 h-5 text-brand" />
                                                                                </div>
                                                                            </div>

                                                                            <div className="pt-6 border-t border-accent-brown/5 space-y-3">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">Subtotal</span>
                                                                                    <span className="font-black text-accent-brown">₱{(selectedService?.price || 0).toLocaleString()}</span>
                                                                                </div>
                                                                                {appliedVoucher && (
                                                                                    <div className="flex justify-between items-center text-emerald-600">
                                                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Promotion ({appliedVoucher.code})</span>
                                                                                        <span className="font-black">- ₱{(selectedService?.price || 0).toLocaleString()}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-auto relative z-10 pt-6 border-t border-accent-brown/5">
                                                                        <div className="flex justify-between items-end">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mb-1">Order Total</span>
                                                                                <span className="text-4xl font-black text-accent-brown tracking-tighter">₱{estimatedTotal.toLocaleString()}</span>
                                                                            </div>
                                                                            <div className="p-3 bg-brand/10 rounded-2xl">
                                                                                <CreditCard className="w-6 h-6 text-brand" />
                                                                            </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                {/* STEP 5: RESERVATION RECEIPT */}
                                                {wizardStep === 5 && (
                                                    <motion.div
                                                        key="step5"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="h-full flex flex-col items-center justify-center py-12"
                                                    >
                                                        <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-accent-brown/5 w-full max-w-md overflow-hidden relative">
                                                            {/* Success Header */}
                                                            <div className="bg-emerald-500 p-8 text-center relative overflow-hidden">
                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl relative z-10 mb-4">
                                                                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                                                                </motion.div>
                                                                <h3 className="text-2xl font-black text-white tracking-tighter relative z-10">Booking Confirmed</h3>
                                                                <p className="text-[11px] font-black text-white/70 uppercase tracking-widest relative z-10">Transaction Receipt</p>
                                                                {/* Decorative circles */}
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                                                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12" />
                                                            </div>

                                                            {/* Receipt Body */}
                                                            <div className="p-8 space-y-6">
                                                                <div className="space-y-4">
                                                                    <div className="flex justify-between items-center group">
                                                                        <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">Client Name</span>
                                                                        <span className="font-black text-accent-brown group-hover:text-emerald-600 transition-colors uppercase">{user?.first_name} {user?.last_name}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center group">
                                                                        <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">Pet & Service</span>
                                                                        <span className="font-black text-accent-brown transition-colors">{form.pet_name} · {form.service}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center group">
                                                                        <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">Clinic Location</span>
                                                                        <span className="font-black text-accent-brown transition-colors text-right max-w-[150px] truncate">{selectedOption?.address_line1 || 'Main Branch'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center bg-accent-peach/5 p-3 rounded-2xl">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">Schedule</span>
                                                                            <span className="font-black text-accent-brown">{form.date} @ {form.time}</span>
                                                                        </div>
                                                                        <Calendar className="w-5 h-5 text-accent-brown/20" />
                                                                    </div>
                                                                </div>

                                                                <div className="pt-6 border-t border-accent-brown/5">
                                                                    <div className="flex justify-between items-end">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mb-1">Settlement</span>
                                                                            <span className="text-3xl font-black text-accent-brown tracking-tighter">
                                                                                {estimatedTotal === 0 ? 'FREE' : `₱${estimatedTotal.toLocaleString()}`}
                                                                            </span>
                                                                        </div>
                                                                        <div className="px-4 py-2 bg-emerald-100 rounded-xl">
                                                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Paid via Voucher</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <motion.button 
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    onClick={() => setShowModal(false)}
                                                                    className="w-full py-4 bg-accent-brown text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-accent-brown/20 flex items-center justify-center gap-3 cursor-pointer"
                                                                >
                                                                    Return to Dashboard <ChevronRight className="w-4 h-4" />
                                                                </motion.button>
                                                            </div>
                                                            {/* Notch effect */}
                                                            <div className="absolute left-0 top-1/2 -ml-2 w-4 h-4 bg-accent-peach/10 rounded-full ring-4 ring-white" />
                                                            <div className="absolute right-0 top-1/2 -mr-2 w-4 h-4 bg-accent-peach/10 rounded-full ring-4 ring-white" />
                                                        </div>
                                                        <p className="mt-8 text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.3em]">Thank you for choosing Hi-Vet</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* WIZARD ACTIONS FOOTER */}
                                        <div className="py-4 px-8 border-t border-accent-brown/5 bg-white/80 backdrop-blur-md shrink-0 flex items-center justify-between gap-4 sticky bottom-0 z-20">
                                            <div className="hidden sm:flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full border-2 border-accent-brown/5 flex items-center justify-center text-accent-brown/20 font-black text-[10px]">
                                                    0{wizardStep}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest leading-none mb-1">Current Progress</p>
                                                    <p className="text-[11px] font-black text-accent-brown tracking-tight">System validation complete.</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                {wizardStep > 1 && (
                                                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                        onClick={() => setWizardStep(s => s - 1)}
                                                        className="px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-accent-brown/40 hover:text-accent-brown hover:bg-white transition-all cursor-pointer">
                                                        Previous
                                                    </motion.button>
                                                )}
                                                
                                                {wizardStep === 5 ? (
                                                    <div className="w-full flex justify-center">
                                                        <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest flex items-center gap-2">
                                                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Digital Receipt Generated
                                                        </p>
                                                    </div>
                                                ) : wizardStep < 4 ? (
                                                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                        onClick={handleStepContinue}
                                                        disabled={
                                                            (wizardStep === 1 && (!form.clinic_id || !form.service)) ||
                                                            (wizardStep === 2 && (!form.pet_name || !form.date || !form.time))
                                                        }
                                                        className="flex-1 sm:flex-none px-10 bg-accent-brown text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed">
                                                        Continue <ChevronRight className="w-5 h-5" />
                                                    </motion.button>
                                                ) : (
                                                    <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                        disabled={submitting || todayHours?.is_open === false || (estimatedTotal > 0 && !selectedPaymentMethod)}
                                                        className="flex-1 sm:flex-none px-10 bg-brand-dark text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-brand-dark/30 disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-brand" />}
                                                        {submitting ? 'Authenticating...' : 'Confirm Reservation'}
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                    </form>

                                </div>
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
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/50 mb-1">Total Amount</p>
                                        <p className="font-black text-accent-brown text-2xl">&#8369;{selectedDetail.total.toFixed(2)}</p>
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

            {/* Payment Method Selector Modal for Existing Reservations */}
            <AnimatePresence>
                {showMethodSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMethodSelector(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto"
                            >
                                <div className="p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-black text-accent-brown">Settle Payment</h3>
                                        <button onClick={() => setShowMethodSelector(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs font-bold text-accent-brown/40 uppercase tracking-widest mb-8">Choose your preferred provider</p>
                                    
                                    <div className="space-y-4">
                                        {[
                                            { id: 'qrph' as const, name: 'QRPh Unified', icon: QrCode, color: '#ea580c', bg: 'bg-[#ea580c]/5', sub: 'Native Scanner' },
                                            { id: 'gcash' as const, name: 'GCash', icon: Wallet, color: '#2563eb', bg: 'bg-blue-50', sub: 'via PayMongo' },
                                            { id: 'paymaya' as const, name: 'Maya', icon: Smartphone, color: '#059669', bg: 'bg-emerald-50', sub: 'via PayMongo' }
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    if (paymentSelectionId) {
                                                        handlePayExisting(paymentSelectionId, m.id);
                                                        setShowMethodSelector(false);
                                                    }
                                                }}
                                                className="w-full group relative p-5 rounded-2xl border-2 border-slate-100 hover:border-accent-brown/20 bg-white transition-all flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                <div className={`w-12 h-12 rounded-xl ${m.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                                    <m.icon className="w-6 h-6" style={{ color: m.color }} />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <p className="font-black text-accent-brown text-sm">{m.name}</p>
                                                    <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-tight">{m.sub}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent-brown transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Secure Transaction</p>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>


            <QrCodeModal 
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                qrData={qrData}
                amount={qrAmount}
                reference={qrReference}
                referenceLabel="Reservation Reference"
                status={qrStatus}
            />
        </DashboardLayout>
    );
};

export default CustomerReservations;
