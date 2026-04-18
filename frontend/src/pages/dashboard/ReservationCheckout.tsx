import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, MapPin, Calendar, Clock, ChevronRight, X,
    AlertCircle, CheckCircle, Loader2, Clock3,
    CreditCard, Wallet, Activity, Eye, ShieldCheck,
    Smartphone, Info, Sparkles, Tag, User,
    Cat, Dog, Dna, LayoutGrid, Award
} from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import QrCodeModal from '../../components/QrCodeModal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DOG_BREEDS = [
    'Aspin (Askal)', 'Shih Tzu', 'Golden Retriever', 'Poodle', 'Pomeranian',
    'Beagle', 'Labrador Retriever', 'Chihuahua', 'Pug', 'Siberian Husky',
    'German Shepherd', 'Chow Chow', 'Maltese', 'Bulldog', 'Rottweiler',
    'Doberman', 'Corgi', 'Dalmatian', 'Cocker Spaniel', 'Pekingese',
    'Yorkshire Terrier', 'Jack Russell Terrier', 'Other'
];

const CAT_BREEDS = [
    'Puspin (Pusakal)', 'Persian', 'Siamese', 'Maine Coon', 'Bengal',
    'British Shorthair', 'Scottish Fold', 'Ragdoll', 'Sphynx', 'Munchkin',
    'Himalayan', 'Savannah', 'Russian Blue', 'Abyssinian', 'Burmese', 'Other'
];

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
    loyalty_points: number;
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

interface ClinicOption {
    key: string;
    clinic_id: number;
    branch_id: number | null;
    label: string;
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

const BASE_TIMES = [
    '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'
];

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
    return <StreetViewInner lat={lat} lng={lng} />;
};

const ReservationCheckout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        pet_name: '',
        pet_type: 'Dog',
        pet_breed: '',
        service: '',
        service_id: 0,
        date: '',
        time: '',
        clinic_id: 0,
        clinic_option_key: '',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'paymaya' | 'qrph' | 'cash' | ''>('qrph');
    const [wizardStep, setWizardStep] = useState(1);
    const [showPackageExplorer, setShowPackageExplorer] = useState(false);
    const [packageModal, setPackageModal] = useState<ClinicService | null>(null);
    const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
    const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isClinicListCollapsed, setIsClinicListCollapsed] = useState(false);
    const [isBranchListCollapsed, setIsBranchListCollapsed] = useState(false);
    const [isServiceListCollapsed, setIsServiceListCollapsed] = useState(false);
    const [serviceCategory, setServiceCategory] = useState<'none' | 'packages' | 'individual'>('none');
    const [servicePage, setServicePage] = useState(1);

    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState('');
    const [qrReference, setQrReference] = useState('');
    const [qrAmount, setQrAmount] = useState(0);
    const [qrStatus, setQrStatus] = useState<'pending' | 'succeeded' | 'expired' | 'processing'>('pending');
    const pollingInterval = useRef<any>(null);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const token = localStorage.getItem('hivet_token');
    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }), [token]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [clinicsRes, loyaltyRes] = await Promise.all([
                fetch(`${API}/api/clinics`),
                fetch(`${API}/api/loyalty`, { headers: authHeaders })
            ]);

            if (clinicsRes.ok) {
                const d = await clinicsRes.json();
                setClinics(d.clinics || []);
            } else {
                setError('Could not load clinics.');
            }

            if (loyaltyRes.ok) {
                const lData = await loyaltyRes.json();
                setMyVouchers((lData.my_vouchers || []).filter((v: Voucher) => v.type === 'Service'));
            }
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const allClinicOptions: ClinicOption[] = useMemo((): ClinicOption[] => {
        if (!clinics || !Array.isArray(clinics)) return [];
        return clinics.flatMap((c): ClinicOption[] => {
            if (!c.branches || c.branches.length === 0) {
                return [{
                    key: `${c.id}-main`,
                    clinic_id: c.id,
                    branch_id: null,
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
                branch_id: b.id,
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
    }, [clinics]);

    const selectedOption: ClinicOption | null = allClinicOptions.find(o => o.key === form.clinic_option_key) || null;
    const availableServices = selectedOption?.services || [];
    const isPackageService = (s: ClinicService) => s.is_package || s.name.toLowerCase().includes('package');
    const regularServices = availableServices.filter(s => !isPackageService(s));
    const packageServices = availableServices.filter(s => isPackageService(s));
    const selectedService = availableServices.find(s => s.id === form.service_id) || null;
    const baseTotal = selectedService?.price || 0;
    const estimatedTotal = appliedVoucher ? 0 : baseTotal;

    const todayHours = (() => {
        if (!selectedOption || !form.date) return null;
        const special = selectedOption.special_hours?.find(sh => sh.specific_date === form.date);
        if (special) return special;
        const dow = new Date(form.date).getDay();
        return selectedOption.hours.find(h => h.day_of_week === dow);
    })();

    const [myBookedSlots, setMyBookedSlots] = useState<string[]>([]);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const isAnyModalOpen = !!packageModal || showQrModal || isDatePickerOpen;

    useEffect(() => {
        if (form.clinic_id && form.date) {
            fetch(`${API}/api/reservations/booked?clinic_id=${form.clinic_id}&date=${form.date}`, { headers: authHeaders })
                .then(res => res.json())
                .then(data => {
                    setBookedSlots(data.booked_times || []);
                    setMyBookedSlots(data.my_times || []);
                })
                .catch(() => { setBookedSlots([]); setMyBookedSlots([]); });
        } else {
            setBookedSlots([]);
            setMyBookedSlots([]);
        }
    }, [form.clinic_id, form.date, authHeaders]);

    // Convert "HH:MM AM/PM" to minutes from midnight
    const timeToMinutes = (t: string): number => {
        const [time, meridiem] = t.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (meridiem === 'PM' && h !== 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    };

    type SlotStatus = 'available' | 'yours' | 'break' | 'closed';

    const classifySlot = (t: string): SlotStatus => {
        if (myBookedSlots.includes(t)) return 'yours';
        if (!todayHours || !todayHours.is_open) return 'closed';
        const slotMin = timeToMinutes(t);
        const openMin = timeToMinutes(todayHours.open_time || '09:00 AM');
        const closeMin = timeToMinutes(todayHours.close_time || '06:00 PM');
        if (slotMin < openMin || slotMin >= closeMin) return 'closed';
        if (todayHours.break_start && todayHours.break_end) {
            const bStart = timeToMinutes(todayHours.break_start);
            const bEnd = timeToMinutes(todayHours.break_end);
            if (slotMin >= bStart && slotMin < bEnd) return 'break';
        }
        return 'available';
    };

    const handleContinue = () => {
        if (wizardStep === 1) {
            if (!form.clinic_id) {
                showToast('Please select a facility.', 'error');
                return;
            }
            if (!form.service_id) {
                showToast('Please select a medical procedure.', 'error');
                return;
            }
        }
        if (wizardStep === 2) {
            if (!form.pet_name.trim()) {
                showToast('Patient name is required.', 'error');
                return;
            }
            if (!form.date) {
                showToast('Please select a date.', 'error');
                return;
            }
            if (!form.time) {
                showToast('Please select a time slot.', 'error');
                return;
            }
            if (todayHours && !todayHours.is_open) {
                showToast('The clinic is closed on this day.', 'error');
                return;
            }
        }
        if (wizardStep === 3) {
            if (!selectedPaymentMethod) {
                showToast('Please select a payment method.', 'error');
                return;
            }
        }
        setWizardStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleConfirmFinalize = () => {
        if (!selectedPaymentMethod) {
            showToast('Please select a payment method.', 'error');
            return;
        }
        setIsConfirmModalOpen(true);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setIsConfirmModalOpen(false);

        setSubmitting(true);
        try {
            const payload = {
                pet_name: form.pet_name.trim(),
                pet_type: form.pet_type,
                pet_breed: form.pet_breed.trim() || null,
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

            if (newReservation.payment_status === 'paid' || estimatedTotal < 0.01) {
                navigate('/dashboard/customer/reservations/payment-success');
            } else if (selectedPaymentMethod === 'cash') {
                await fetch(`${API}/api/payments/paymongo/reservation-confirm/${newReservation.db_id}`, {
                    method: 'POST',
                    headers: authHeaders,
                });
                navigate('/dashboard/customer/reservations');
                showToast('Reservation booked! Please pay at the clinic.');
            } else {
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
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

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
                        setTimeout(() => navigate('/dashboard/customer/reservations'), 2000);
                    } else if (data.status === 'expired') {
                        setQrStatus('expired');
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                    }
                }
            } catch (err) { console.error('Polling error:', err); }
        }, 5000);
    };

    useEffect(() => {
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
            window.scrollTo(0, 0);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isAnyModalOpen]);

    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <DashboardLayout
                title=""
                hideHeader={isAnyModalOpen}
                hideFooter={isAnyModalOpen}
            >
                <div className={`max-w-[1600px] mx-auto pb-12 w-full ${isAnyModalOpen ? 'opacity-30 blur-2xl pointer-events-none' : 'opacity-100'}`}>
                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-16 text-center">
                        <h1 className="text-4xl sm:text-6xl font-black text-accent-brown tracking-tighter leading-none italic uppercase">
                            Pet Reservation
                        </h1>
                    </div>

                    {/* Stepper Header */}
                    <div className="flex items-center justify-center px-4 mb-20">
                        <div className="w-full max-w-[600px] relative">
                            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-brand-dark/5 -translate-y-1/2" />
                            <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2">
                                <motion.div
                                    className="h-full bg-brand shadow-[0_0_20px_rgba(255,107,0,0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((wizardStep - 1) / 3) * 100}%` }}
                                    transition={{ duration: 0.8, ease: "circOut" }}
                                />
                            </div>
                            <div className="relative flex justify-between">
                                {[
                                    { step: 1, label: 'Facility', icon: Activity },
                                    { step: 2, label: 'Arrival', icon: Clock },
                                    { step: 3, label: 'Settlement', icon: Wallet },
                                    { step: 4, label: 'Review', icon: ShieldCheck }
                                ].map((s) => (
                                    <div key={s.step} className="flex flex-col items-center">
                                        <button
                                            onClick={() => wizardStep > s.step && setWizardStep(s.step)}
                                            className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 relative z-10 ${wizardStep === s.step
                                                ? 'bg-brand-dark text-white shadow-2xl scale-110'
                                                : wizardStep > s.step
                                                    ? 'bg-brand text-white shadow-lg'
                                                    : 'bg-white border border-brand/10 text-brand/20'
                                                }`}
                                        >
                                            <s.icon className={`w-5 h-5 ${wizardStep === s.step ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
                                            {wizardStep > s.step && (
                                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                </div>
                                            )}
                                        </button>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.3em] mt-4 absolute -bottom-8 whitespace-nowrap ${wizardStep === s.step ? 'text-accent-brown opacity-100' : 'text-accent-brown/20'}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 px-4">
                        {/* Main Interaction Area */}
                        <div className="flex-1 min-w-0">
                            <AnimatePresence mode="wait">
                                {wizardStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        {/* Facility Selection */}
                                        <section className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 sm:p-12 border border-brand/5 shadow-2xl shadow-brand/5">
                                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 bg-brand-dark text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                                                        <Activity className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-accent-brown tracking-tight uppercase italic">Pick a Clinic</h3>
                                                        <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Choose where you'd like to bring your pet</p>
                                                    </div>
                                                </div>
                                                <div className="px-5 py-2 bg-brand/5 border border-brand/10 rounded-full">
                                                    <span className="text-[9px] font-black text-brand uppercase tracking-widest">Available now</span>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {isClinicListCollapsed && form.clinic_id ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black uppercase text-brand tracking-[0.3em]">Your Clinic</span>
                                                        </div>
                                                        {clinics.filter(c => c.id === form.clinic_id).map(c => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setIsClinicListCollapsed(false);
                                                                    setForm(f => ({ ...f, clinic_id: 0, clinic_option_key: '', service: '', service_id: 0 }));
                                                                }}
                                                                className="w-full text-left p-8 rounded-[3rem] border-2 border-brand bg-white shadow-2xl shadow-brand/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand/40 transition-all hover:shadow-brand/20 group"
                                                            >
                                                                <div className="flex items-center gap-6">
                                                                    <div className="w-16 h-16 rounded-2xl bg-brand/5 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all">
                                                                        <Activity className="w-8 h-8" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="text-xl font-black text-accent-brown tracking-tighter uppercase italic leading-none mb-2">{c.name}</h4>
                                                                        <div className="flex items-center gap-2 text-accent-brown/40">
                                                                            <MapPin className="w-3 h-3" />
                                                                            <p className="text-[11px] font-bold uppercase truncate">{c.address_line1}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 px-6 py-3 bg-brand/5 rounded-2xl border border-brand/10 self-start md:self-center group-hover:bg-brand group-hover:border-brand transition-all">
                                                                    <div className="w-4 h-4 rounded-full border-2 border-brand group-hover:border-white flex items-center justify-center">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand group-hover:bg-white" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-brand uppercase tracking-widest group-hover:text-white transition-colors">Change Selection</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                        {clinics.map(c => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => {
                                                                    const mainBranch = c.branches?.find(b => b.is_main) || c.branches?.[0];
                                                                    setForm(f => ({
                                                                        ...f,
                                                                        clinic_id: c.id,
                                                                        clinic_option_key: mainBranch ? `${c.id}-${mainBranch.id}` : `${c.id}-main`,
                                                                        service: '',
                                                                        service_id: 0
                                                                    }));
                                                                    setIsClinicListCollapsed(true);
                                                                }}
                                                                className={`p-8 rounded-[3rem] border-2 text-left transition-all group relative overflow-hidden ${form.clinic_id === c.id
                                                                    ? 'border-brand bg-white shadow-2xl shadow-brand/10'
                                                                    : 'border-brand/5 bg-white hover:border-brand/20 hover:shadow-xl'
                                                                    }`}
                                                            >
                                                                <div className="relative z-10">
                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${form.clinic_id === c.id ? 'bg-brand text-white' : 'bg-brand/5 text-brand'
                                                                        }`}>
                                                                        <Activity className="w-7 h-7" />
                                                                    </div>
                                                                    <h4 className="text-lg font-black text-accent-brown tracking-tighter mb-2 uppercase italic leading-none">{c.name}</h4>
                                                                    <div className="flex items-center gap-2 text-accent-brown/40 mb-4">
                                                                        <MapPin className="w-3 h-3" />
                                                                        <p className="text-[11px] font-bold uppercase truncate">
                                                                            {c.zip} {c.address_line1}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-[11px] font-medium text-accent-brown/50 leading-relaxed line-clamp-2 uppercase tracking-wide">
                                                                        {c.address_line1} {c.address_line2}
                                                                    </p>
                                                                </div>
                                                                {form.clinic_id === c.id && (
                                                                    <div className="absolute top-8 right-8">
                                                                        <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center shadow-lg">
                                                                            <CheckCircle className="w-5 h-5 text-white" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedOption && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-16 pt-16 border-t-2 border-brand/5">
                                                    {clinics.find(c => c.id === form.clinic_id)?.branches.length! > 1 && (
                                                        <div className="mb-12">
                                                            <div className="flex items-center justify-between mb-6">
                                                                <div className="flex items-center gap-3">
                                                                    {!isBranchListCollapsed && <div className="w-1.5 h-6 bg-brand rounded-full" />}
                                                                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isBranchListCollapsed ? 'text-brand' : 'text-accent-brown/40'}`}>
                                                                        {isBranchListCollapsed ? 'Your Branch' : 'Select Branch'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            
                                                            {isBranchListCollapsed ? (
                                                                <button
                                                                    onClick={() => setIsBranchListCollapsed(false)}
                                                                    className="w-full text-left p-8 rounded-[3rem] border-2 border-brand bg-white shadow-2xl shadow-brand/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand/40 transition-all hover:shadow-brand/20 group"
                                                                >
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="w-16 h-16 rounded-2xl bg-brand/5 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all">
                                                                            <Activity className="w-8 h-8" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="text-xl font-black text-accent-brown tracking-tighter uppercase italic leading-none">{clinics.find(c => c.id === form.clinic_id)?.branches.find(b => `${form.clinic_id}-${b.id}` === form.clinic_option_key)?.name}</h4>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 px-6 py-3 bg-brand/5 rounded-2xl border border-brand/10 self-start md:self-center group-hover:bg-brand group-hover:border-brand transition-all">
                                                                        <div className="w-4 h-4 rounded-full border-2 border-brand group-hover:border-white flex items-center justify-center">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-brand group-hover:bg-white" />
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand group-hover:text-white transition-colors">Change Selection</span>
                                                                    </div>
                                                                </button>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-4">
                                                                    {clinics.find(c => c.id === form.clinic_id)?.branches.map(b => (
                                                                        <button
                                                                            key={b.id}
                                                                            onClick={() => {
                                                                                setForm(f => ({ ...f, clinic_option_key: `${form.clinic_id}-${b.id}` }));
                                                                                setIsBranchListCollapsed(true);
                                                                            }}
                                                                            className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${form.clinic_option_key === `${form.clinic_id}-${b.id}`
                                                                                ? 'bg-brand-dark text-white shadow-xl shadow-brand/20'
                                                                                : 'bg-white border border-brand/10 text-brand-dark/50 hover:border-brand/30 hover:text-brand shadow-sm'
                                                                                }`}
                                                                        >
                                                                            {b.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-10">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                {!isServiceListCollapsed && <div className="w-1.5 h-6 bg-brand rounded-full" />}
                                                                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isServiceListCollapsed ? 'text-brand' : 'text-accent-brown/40'}`}>
                                                                    {isServiceListCollapsed ? 'Your Service' : 'Choose a Service'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {isServiceListCollapsed && selectedService ? (
                                                            <button
                                                                onClick={() => setIsServiceListCollapsed(false)}
                                                                className="w-full text-left p-8 rounded-[3rem] border-2 border-brand bg-white shadow-2xl shadow-brand/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand/40 transition-all hover:-translate-y-1 group"
                                                            >
                                                                <div className="flex items-center gap-6">
                                                                    <div className="w-16 h-16 rounded-2xl bg-brand/5 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all">
                                                                        <Sparkles className="w-8 h-8" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xl font-black text-accent-brown tracking-tighter uppercase italic leading-none mb-1">{selectedService.name}</h4>
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-2xl font-black text-accent-brown tracking-tighter italic">₱{selectedService.price.toLocaleString()}</span>
                                                                            {selectedService.loyalty_points > 0 && (
                                                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-brand text-white rounded-full shadow-lg shadow-brand/20">
                                                                                    <Award className="w-3 h-3" />
                                                                                    <span className="text-[9px] font-black uppercase tracking-widest">{selectedService.loyalty_points} Points</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2 pr-2">
                                                                    <div className="flex items-center gap-3 px-6 py-3 bg-brand/5 rounded-2xl border border-brand/10 self-start md:self-center group-hover:bg-brand group-hover:border-brand transition-all">
                                                                        <div className="w-4 h-4 rounded-full border-2 border-brand group-hover:border-white flex items-center justify-center">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-brand group-hover:bg-white" />
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand group-hover:text-white transition-colors">Change Selection</span>
                                                                    </div>
                                                                    {selectedService.duration_minutes > 0 && (
                                                                        <span className="text-[9px] text-accent-brown/40 font-black tracking-widest uppercase mr-4">{selectedService.duration_minutes} MIN DURATION</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            <div className="space-y-10">
                                                                {serviceCategory === 'none' ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                                        <button
                                                                            onClick={() => setServiceCategory('packages')}
                                                                            className="group p-10 rounded-[3.5rem] bg-white border-2 border-brand/5 hover:border-brand/40 transition-all text-left relative overflow-hidden shadow-sm hover:shadow-2xl"
                                                                        >
                                                                            <div className="relative z-10">
                                                                                <div className="w-16 h-16 rounded-3xl bg-brand/5 text-brand flex items-center justify-center mb-8 group-hover:bg-brand group-hover:text-white transition-all">
                                                                                    <LayoutGrid className="w-8 h-8" />
                                                                                </div>
                                                                                <h4 className="text-2xl font-black text-accent-brown uppercase italic italic tracking-tighter leading-none mb-3">Clinical Bundles</h4>
                                                                                <p className="text-[11px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] leading-relaxed">High-fidelity service packages and comprehensive treatments.</p>
                                                                            </div>
                                                                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-brand/5 rounded-full blur-3xl transition-all group-hover:bg-brand/10" />
                                                                        </button>

                                                                        <button
                                                                            onClick={() => setServiceCategory('individual')}
                                                                            className="group p-10 rounded-[3.5rem] bg-white border-2 border-brand/5 hover:border-brand/40 transition-all text-left relative overflow-hidden shadow-sm hover:shadow-2xl"
                                                                        >
                                                                            <div className="relative z-10">
                                                                                <div className="w-16 h-16 rounded-3xl bg-brand/5 text-brand flex items-center justify-center mb-8 group-hover:bg-brand group-hover:text-white transition-all">
                                                                                    <Tag className="w-8 h-8" />
                                                                                </div>
                                                                                <h4 className="text-2xl font-black text-accent-brown uppercase italic italic tracking-tighter leading-none mb-3">Individual Services</h4>
                                                                                <p className="text-[11px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] leading-relaxed">Single medical procedures and specific clinic consultations.</p>
                                                                            </div>
                                                                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-brand/5 rounded-full blur-3xl transition-all group-hover:bg-brand/10" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-10">
                                                                        <button 
                                                                            onClick={() => setServiceCategory('none')}
                                                                            className="flex items-center gap-3 text-[10px] font-black text-brand uppercase tracking-[0.2em] hover:gap-4 transition-all"
                                                                        >
                                                                            <ChevronRight className="w-3 h-3 rotate-180" /> Change Service Category
                                                                        </button>

                                                                        {serviceCategory === 'packages' && (
                                                                            <div className="space-y-6">
                                                                                <div className="flex items-center justify-between">
                                                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand flex items-center gap-3 italic">
                                                                                        <Sparkles className="w-4 h-4" /> Comprehensive Packages
                                                                                    </p>
                                                                                </div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                                    {packageServices.map(pkg => (
                                                                                        <button
                                                                                            key={pkg.id}
                                                                                            onClick={() => {
                                                                                                setForm(f => ({ ...f, service: pkg.name, service_id: pkg.id }));
                                                                                                setIsServiceListCollapsed(true);
                                                                                            }}
                                                                                            className={`p-8 rounded-[2.5rem] border-2 text-left transition-all w-full relative overflow-hidden group ${form.service_id === pkg.id
                                                                                                ? 'border-brand bg-white shadow-2xl shadow-brand/10'
                                                                                                : 'border-brand/5 bg-white hover:border-brand/20 shadow-sm hover:shadow-xl'
                                                                                                }`}
                                                                                        >
                                                                                            <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                                                                                                <span className="text-lg font-black text-accent-brown uppercase italic leading-none">{pkg.name}</span>
                                                                                                {form.service_id === pkg.id && <CheckCircle className="w-5 h-5 text-brand shrink-0" />}
                                                                                            </div>
                                                                                            <div className="flex items-end justify-between relative z-10">
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <span className="text-2xl font-black text-accent-brown tracking-tighter italic">₱{pkg.price.toLocaleString()}</span>
                                                                                                    {pkg.loyalty_points > 0 && (
                                                                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-full shadow-lg shadow-brand/20">
                                                                                                            <Award className="w-3.5 h-3.5" />
                                                                                                            <span className="text-[9px] font-black uppercase tracking-widest">{pkg.loyalty_points} Points</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {pkg.duration_minutes > 0 && (
                                                                                                        <span className="text-[9px] text-accent-brown/40 font-black bg-brand/5 px-3 py-1.5 rounded-full uppercase tracking-widest">{pkg.duration_minutes} MIN</span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={e => { e.stopPropagation(); setPackageModal(pkg); }}
                                                                                                    className="px-5 py-2.5 rounded-xl bg-brand/5 border border-brand/10 text-[9px] font-black text-brand uppercase tracking-widest flex items-center gap-2 hover:bg-brand hover:text-white hover:border-brand transition-all shadow-sm active:scale-95"
                                                                                                >
                                                                                                    Details <ChevronRight className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {serviceCategory === 'individual' && (
                                                                            <div className="space-y-8">
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                                                    {regularServices.slice((servicePage - 1) * 4, servicePage * 4).map(svc => (
                                                                                        <button
                                                                                            key={svc.id}
                                                                                            onClick={() => {
                                                                                                setForm(f => ({ ...f, service: svc.name, service_id: svc.id }));
                                                                                                setIsServiceListCollapsed(true);
                                                                                            }}
                                                                                            className={`p-8 rounded-[2.5rem] border-2 text-left transition-all w-full relative overflow-hidden group ${form.service_id === svc.id
                                                                                                ? 'border-brand bg-white shadow-2xl shadow-brand/10'
                                                                                                : 'border-brand/5 bg-white hover:border-brand/20 shadow-sm hover:shadow-xl'
                                                                                                }`}
                                                                                        >
                                                                                            <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                                                                                                <span className="text-lg font-black text-accent-brown uppercase italic leading-none">{svc.name}</span>
                                                                                                {form.service_id === svc.id && <CheckCircle className="w-5 h-5 text-brand shrink-0" />}
                                                                                            </div>
                                                                                            <div className="flex items-end justify-between relative z-10">
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <span className="text-2xl font-black text-accent-brown tracking-tighter italic">₱{svc.price.toLocaleString()}</span>
                                                                                                    {svc.loyalty_points > 0 && (
                                                                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-full shadow-lg shadow-brand/20">
                                                                                                            <span className="text-[9px] font-black uppercase tracking-widest">{svc.loyalty_points} Points</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {svc.duration_minutes > 0 && (
                                                                                                        <span className="text-[9px] text-accent-brown/40 font-black bg-brand/5 px-3 py-1.5 rounded-full uppercase tracking-widest">{svc.duration_minutes} MIN</span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="w-10 h-10 rounded-xl bg-brand/5 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all shrink-0">
                                                                                                    <ChevronRight className="w-5 h-5" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>

                                                                                {regularServices.length > 4 && (
                                                                                    <div className="flex items-center justify-center gap-3">
                                                                                        <button
                                                                                            disabled={servicePage === 1}
                                                                                            onClick={() => setServicePage(p => Math.max(1, p - 1))}
                                                                                            className="w-10 h-10 rounded-xl border border-brand/10 flex items-center justify-center text-accent-brown disabled:opacity-20 hover:bg-brand/5 transition-all"
                                                                                        >
                                                                                            <ChevronRight className="w-4 h-4 rotate-180" />
                                                                                        </button>
                                                                                        <div className="flex items-center gap-2">
                                                                                            {Array.from({ length: Math.ceil(regularServices.length / 4) }).map((_, i) => (
                                                                                                <button
                                                                                                    key={i}
                                                                                                    onClick={() => setServicePage(i + 1)}
                                                                                                    className={`w-2 h-2 rounded-full transition-all ${servicePage === i + 1 ? 'bg-brand w-6' : 'bg-brand/10'}`}
                                                                                                />
                                                                                            ))}
                                                                                        </div>
                                                                                        <button
                                                                                            disabled={servicePage === Math.ceil(regularServices.length / 4)}
                                                                                            onClick={() => setServicePage(p => p + 1)}
                                                                                            className="w-10 h-10 rounded-xl border border-brand/10 flex items-center justify-center text-accent-brown disabled:opacity-20 hover:bg-brand/5 transition-all"
                                                                                        >
                                                                                            <ChevronRight className="w-4 h-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}

                                            <div className="mt-12 flex justify-end">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleContinue}
                                                    className="bg-brand-dark text-white px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand/20 flex items-center gap-4 hover:shadow-brand/40 transition-all"
                                                >
                                                    Continue to Schedule
                                                    <ChevronRight className="w-5 h-5 shadow-inner" />
                                                </motion.button>
                                            </div>
                                        </section>
                                    </motion.div>
                                )}

                                {wizardStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        <section className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 sm:p-12 border border-brand/5 shadow-2xl shadow-brand/5">
                                            <div className="flex items-center gap-6 mb-12">
                                                <div className="w-16 h-16 bg-brand-dark text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                                                    <Clock className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-accent-brown tracking-tight uppercase italic">Schedule Appointment</h3>
                                                    <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Pick a date, time & identify the pet</p>
                                                </div>
                                            </div>

                                            <div className="space-y-12">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-6 ml-2">
                                                        <div className="w-1.5 h-6 bg-brand rounded-full" />
                                                        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-accent-brown/70 italic leading-none">Pet Classification</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {[
                                                            { id: 'Dog', label: 'Dogs', icon: Dog },
                                                            { id: 'Cat', label: 'Cats', icon: Cat },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => setForm(f => ({ ...f, pet_type: type.id, pet_breed: '' }))}
                                                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${form.pet_type === type.id
                                                                    ? 'border-brand bg-white shadow-xl shadow-brand/10'
                                                                    : 'border-brand/5 bg-white hover:border-brand/20'
                                                                    }`}
                                                            >
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${form.pet_type === type.id ? 'bg-brand text-white shadow-lg' : 'bg-brand/5 text-brand group-hover:bg-brand/10'
                                                                    }`}>
                                                                    <type.icon className="w-6 h-6" />
                                                                </div>
                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${form.pet_type === type.id ? 'text-accent-brown' : 'text-accent-brown/40'
                                                                    }`}>{type.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="relative group">
                                                        <label className="block text-[12px] font-black uppercase tracking-[0.3em] text-accent-brown/70 mb-5 ml-2 italic">Pet's Name</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.pet_name}
                                                                onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
                                                                placeholder="E.G. BUDDY, LUNA, MAX..."
                                                                className="w-full bg-white border-2 border-brand/5 focus:border-brand focus:ring-4 focus:ring-brand/5 rounded-[2rem] px-8 py-5 text-base font-black text-accent-brown outline-none transition-all placeholder:text-accent-brown/10 uppercase italic"
                                                            />
                                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-brand/5 rounded-2xl text-accent-brown/40 group-focus-within:text-brand transition-colors">
                                                                <Activity className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative group">
                                                        <label className="block text-[12px] font-black uppercase tracking-[0.3em] text-accent-brown/70 mb-5 ml-2 italic">Pet Breed</label>
                                                        <CustomDropdown
                                                            options={form.pet_type === 'Dog' ? DOG_BREEDS : CAT_BREEDS}
                                                            value={form.pet_breed}
                                                            onChange={val => setForm(f => ({ ...f, pet_breed: val }))}
                                                            placeholder="SELECT BREED..."
                                                            icon={<Dna className="w-5 h-5" />}
                                                            className="w-full bg-white border-2 border-brand/5 focus:border-brand focus:ring-4 focus:ring-brand/5 rounded-[2rem] text-base font-black text-accent-brown outline-none transition-all placeholder:text-accent-brown/10 uppercase italic"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-12">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-5 ml-2">
                                                            <div className="w-1.5 h-6 bg-brand rounded-full" />
                                                            <p className="text-[12px] font-black uppercase tracking-[0.3em] text-accent-brown/70 italic leading-none">Operation Date</p>
                                                        </div>
                                                        <div className="bg-white rounded-[2rem] border border-brand/5 overflow-hidden shadow-sm">
                                                            <CustomDatePicker
                                                                label=""
                                                                value={form.date}
                                                                onChange={val => setForm(f => ({ ...f, date: val }))}
                                                                minDate={new Date().toISOString().split('T')[0]}
                                                                onModalOpenChange={setIsDatePickerOpen}
                                                            />
                                                        </div>
                                                    </div>

                                                    {form.date && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                                            <div className="flex items-center gap-3 mb-6 ml-2">
                                                                <div className="w-1.5 h-6 bg-brand rounded-full" />
                                                                <p className="text-[12px] font-black uppercase tracking-[0.3em] text-accent-brown/70 italic leading-none">Available Windows</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                                                {BASE_TIMES.map(t => {
                                                                    const status = classifySlot(t);
                                                                    const isSelected = form.time === t;
                                                                    const isDisabled = status !== 'available';

                                                                    const btnStyle = isSelected
                                                                        ? 'bg-brand-dark text-white shadow-2xl scale-105 ring-4 ring-brand/10'
                                                                        : status === 'yours' ? 'bg-amber-50 border-2 border-amber-200 text-amber-600'
                                                                            : status === 'break' ? 'bg-blue-50/50 border border-blue-100 text-blue-300'
                                                                                : status === 'closed' ? 'bg-red-50/50 border border-red-50 text-red-200'
                                                                                    : 'bg-white text-accent-brown/60 hover:text-brand hover:border-brand/40 border-2 border-brand/5 shadow-sm';

                                                                    return (
                                                                        <div key={t} className="relative group">
                                                                            <button
                                                                                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                                                                onClick={() => !isDisabled && setForm(f => ({ ...f, time: t }))}
                                                                                className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${btnStyle}`}
                                                                            >
                                                                                {t}
                                                                            </button>
                                                                            {status !== 'available' && (
                                                                                <div className="absolute -top-2 -right-1">
                                                                                    <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm ${status === 'yours' ? 'bg-amber-500 text-white' :
                                                                                        status === 'break' ? 'bg-blue-400 text-white' :
                                                                                            'bg-red-400 text-white'
                                                                                        }`}>
                                                                                        {status === 'yours' ? 'YOU' : status === 'break' ? 'BREAK' : 'OFF'}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {!form.date && (
                                                        <div className="flex flex-col items-center justify-center py-20 text-center bg-brand/5 rounded-[3.5rem] border-4 border-dashed border-brand/10">
                                                            <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-lg border border-brand/5 mb-6">
                                                                <Calendar className="w-10 h-10 text-brand/20" />
                                                            </div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-brown/30 italic">Select operative date to reveal schedule</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-12 flex justify-end">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleContinue}
                                                    className="bg-brand-dark text-white px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand/20 flex items-center gap-4 hover:shadow-brand/40 transition-all"
                                                >
                                                    Continue to Settlement
                                                    <ChevronRight className="w-5 h-5 shadow-inner" />
                                                </motion.button>
                                            </div>
                                        </section>
                                    </motion.div>
                                )}

                                {wizardStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        <section className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 sm:p-12 border border-brand/5 shadow-2xl shadow-brand/5">
                                            <div className="flex items-center gap-6 mb-12">
                                                <div className="w-16 h-16 bg-brand-dark text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                                                    <Wallet className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-accent-brown tracking-tight uppercase italic">Payment Method</h3>
                                                    <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Acquisition of clinical services</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                {[
                                                    { id: 'qrph', label: 'QRPh Pay', icon: Smartphone, desc: 'Centralized QR' },
                                                    { id: 'gcash', label: 'GCash Wallet', icon: Wallet, desc: 'Direct Transfer' },
                                                    { id: 'paymaya', label: 'Maya App', icon: CreditCard, desc: 'Digital Finance' },
                                                    { id: 'cash', label: 'Clinic Counter', icon: Activity, desc: 'Physical Settlement' }
                                                ].map(method => (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setSelectedPaymentMethod(method.id as any)}
                                                        className={`flex items-center justify-between p-8 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden ${selectedPaymentMethod === method.id
                                                            ? 'border-brand bg-white shadow-2xl shadow-brand/10 -translate-y-1'
                                                            : 'border-brand/5 bg-white hover:border-brand/20'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-6 relative z-10">
                                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${selectedPaymentMethod === method.id ? 'bg-brand-dark text-white' : 'bg-brand/5 text-brand/40 group-hover:bg-brand/10 group-hover:text-brand'
                                                                }`}>
                                                                <method.icon className="w-8 h-8" />
                                                            </div>
                                                            <div className="text-left">
                                                                <h4 className="text-xs font-black text-accent-brown uppercase tracking-widest italic">{method.label}</h4>
                                                                <p className="text-[9px] font-bold text-accent-brown/30 uppercase tracking-widest mt-1">{method.desc}</p>
                                                            </div>
                                                        </div>
                                                        {selectedPaymentMethod === method.id && (
                                                            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shadow-lg relative z-10">
                                                                <CheckCircle className="w-5 h-5 text-white" />
                                                            </div>
                                                        )}

                                                        <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl transition-all duration-500 ${selectedPaymentMethod === method.id ? 'bg-brand/10' : 'bg-transparent'}`} />
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="pt-10 mt-10 border-t-2 border-brand/5 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-brand/5 text-brand rounded-[2rem] flex items-center justify-center border border-brand/10">
                                                            <Tag className="w-8 h-8" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-accent-brown tracking-tight uppercase italic">Apply Voucher</h3>
                                                            <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Institutional Voucher Code</p>
                                                        </div>
                                                    </div>
                                                    {appliedVoucher && (
                                                        <button onClick={() => setAppliedVoucher(null)} className="text-[9px] font-black uppercase text-red-500 hover:text-red-400 tracking-widest bg-red-50 px-6 py-3 rounded-full hover:bg-red-100 transition-colors">Withdraw Code</button>
                                                    )}
                                                </div>

                                                {appliedVoucher ? (
                                                    <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] flex items-center justify-between shadow-lg shadow-emerald-500/5">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-emerald-100">
                                                                <Sparkles className="w-8 h-8 text-emerald-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-black text-emerald-800 uppercase tracking-widest italic leading-none mb-1">{appliedVoucher.title}</p>
                                                                <p className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-widest">Authorization Accepted</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    myVouchers.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {myVouchers.map(v => (
                                                                <button
                                                                    key={v.id}
                                                                    onClick={() => setAppliedVoucher(v)}
                                                                    className="flex items-center gap-5 p-6 bg-white border border-brand/10 hover:border-brand hover:bg-brand/5 hover:shadow-xl hover:shadow-brand/5 hover:-translate-y-1 rounded-[2.5rem] transition-all group group text-left"
                                                                >
                                                                    <div className="w-12 h-12 bg-brand/5 text-brand rounded-[1rem] flex items-center justify-center shrink-0 transition-all group-hover:bg-brand group-hover:text-white">
                                                                        <Tag className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-accent-brown uppercase italic leading-none mb-1">{v.title}</p>
                                                                        <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest">{v.code}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-10 border-2 border-dashed border-brand/10 rounded-[2.5rem] text-center bg-white/50">
                                                            <p className="text-[10px] font-black italic uppercase tracking-widest text-accent-brown/30">No active service vouchers found.</p>
                                                            <p className="text-[8px] font-bold uppercase tracking-widest text-accent-brown/20 mt-2">Visit the rewards section to redeem.</p>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="mt-12 flex justify-end">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleContinue}
                                                    className="bg-brand-dark text-white px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand/20 flex items-center gap-4 hover:shadow-brand/40 transition-all"
                                                >
                                                    Continue to Review
                                                    <ChevronRight className="w-5 h-5 shadow-inner" />
                                                </motion.button>
                                            </div>
                                        </section>
                                    </motion.div>
                                )}

                                {wizardStep === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        <section className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 sm:p-12 border border-brand/5 shadow-2xl shadow-brand/5">
                                            <div className="flex items-center gap-6 mb-12">
                                                <div className="w-16 h-16 bg-brand-dark text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                                                    <ShieldCheck className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-accent-brown tracking-tight uppercase italic">Final Review</h3>
                                                    <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] mt-1">Verify all clinical parameters before commitment</p>
                                                </div>
                                            </div>

                                            {/* Full Width Summary for step 4 */}
                                            <div className="space-y-10">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block ml-2">Assigned Facility</span>
                                                        <div className="p-8 bg-white border border-brand/5 rounded-[2.5rem] flex gap-6">
                                                            <div className="w-16 h-16 bg-brand/5 rounded-2xl flex items-center justify-center shrink-0 border border-brand/5">
                                                                <Activity className="w-8 h-8 text-brand" />
                                                            </div>
                                                            <div className="min-w-0 flex flex-col justify-center">
                                                                <p className="text-lg font-black text-accent-brown leading-none uppercase italic truncate mb-2">{selectedOption?.clinic_name}</p>
                                                                <div className="flex items-center gap-2 text-accent-brown/30">
                                                                    <MapPin className="w-3 h-3" />
                                                                    <p className="text-[11px] font-bold uppercase truncate">{selectedOption?.address_line1}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block ml-2">Selected Procedure</span>
                                                        <div className="p-8 bg-white border border-brand/5 rounded-[2.5rem] flex items-center justify-between">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-16 h-16 bg-brand/5 rounded-2xl flex items-center justify-center border border-brand/5">
                                                                    <Eye className="w-8 h-8 text-brand" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-lg font-black text-accent-brown leading-none uppercase italic mb-2">{selectedService?.name}</p>
                                                                    <div className="flex items-center gap-3">

                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-2xl font-black text-accent-brown tracking-tighter italic">₱{selectedService?.price.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <span className="text-[9px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block ml-2">Schedule & Arrival</span>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-6 rounded-[2rem] bg-white border border-brand/10 flex items-center gap-5 shadow-sm">
                                                                <Calendar className="w-6 h-6 text-brand" />
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-black text-accent-brown uppercase tracking-tight truncate leading-none mb-2">{formatDate(form.date)}</p>
                                                                    <p className="text-[10px] font-black text-accent-brown/20 uppercase tracking-[0.2em] leading-none mb-1">Arrival Date</p>
                                                                </div>
                                                            </div>
                                                            <div className="p-6 rounded-[2rem] bg-white border border-brand/10 flex items-center gap-5 shadow-sm">
                                                                <Clock className="w-6 h-6 text-brand" />
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-black text-accent-brown uppercase tracking-tight truncate leading-none mb-2">{form.time}</p>
                                                                    <p className="text-[10px] font-black text-accent-brown/20 uppercase tracking-[0.2em] leading-none mb-1">Arrival Time</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block ml-2">Pet Information</span>
                                                        <div className="p-8 bg-white border border-brand/5 rounded-[2.5rem] flex gap-6">
                                                            <div className="w-16 h-16 bg-brand/5 rounded-2xl flex items-center justify-center shrink-0 border border-brand/5">
                                                                {form.pet_type === 'Dog' ? <Dog className="w-8 h-8 text-brand" /> : <Cat className="w-8 h-8 text-brand" />}
                                                            </div>
                                                            <div className="min-w-0 flex flex-col justify-center">
                                                                <p className="text-lg font-black text-accent-brown leading-none uppercase italic truncate mb-2">{form.pet_name || 'UNNAMED PET'}</p>
                                                                <div className="flex items-center gap-2 text-accent-brown/30">
                                                                    <Dna className="w-3 h-3" />
                                                                    <p className="text-[11px] font-bold uppercase truncate">{form.pet_type} &bull; {form.pet_breed || 'MIXED BREED'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block ml-2">How you'll pay</span>
                                                        <div className="p-8 bg-white border border-brand/10 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
                                                            <div className="w-14 h-14 bg-brand/5 rounded-2xl flex items-center justify-center border border-brand/10">
                                                                <CreditCard className="w-6 h-6 text-brand" />
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-black text-accent-brown leading-none uppercase italic mb-1">{selectedPaymentMethod === 'cash' ? 'Clinic Counter' : selectedPaymentMethod.toUpperCase()}</p>
                                                                <p className="text-[11px] font-bold text-accent-brown/40 uppercase tracking-widest leading-none">Payment Type</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block ml-2">Customer Name</span>
                                                        <div className="p-8 bg-white border border-brand/5 rounded-[2.5rem] flex gap-6">
                                                            <div className="w-16 h-16 bg-brand/5 rounded-2xl flex items-center justify-center shrink-0 border border-brand/5">
                                                                <User className="w-8 h-8 text-brand" />
                                                            </div>
                                                            <div className="min-w-0 flex flex-col justify-center">
                                                                <p className="text-lg font-black text-accent-brown leading-none uppercase italic truncate mb-1">{user?.name || user?.first_name || 'Customer'}</p>
                                                                <p className="text-[11px] font-bold text-accent-brown/40 uppercase tracking-widest leading-none">Pet's Owner</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-1 bg-brand/10 rounded-[3.5rem] overflow-hidden shadow-2xl mt-12 border border-brand/5">
                                                    <div className="bg-white p-10 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden rounded-[3.4rem]">
                                                        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                                                        <div className="relative z-10">
                                                            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-accent-brown/40 mb-2">Total Amount</p>
                                                            <h4 className="text-5xl font-black text-brand-dark uppercase italic tracking-tighter leading-none mb-2">₱{estimatedTotal.toLocaleString()}</h4>
                                                        </div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={handleConfirmFinalize}
                                                            disabled={submitting}
                                                            className="relative z-10 bg-brand text-white px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-brand/30 flex items-center gap-4 disabled:opacity-50 min-w-[280px] justify-center"
                                                        >
                                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 animate-pulse" />}
                                                            Complete Booking
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-8 flex justify-start">
                                {wizardStep > 1 && (
                                    <button
                                        onClick={() => setWizardStep(s => s - 1)}
                                        className="px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-sm bg-white text-accent-brown/50 hover:bg-slate-50 border-2 border-brand/5 hover:text-accent-brown"
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-180" />
                                        Go Back
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Sidebar: Receipt Summary — Exclusively shown on Step 4 (Review) */}
                        {wizardStep === 4 && (
                            <div className="w-full lg:w-[450px] space-y-8">
                                <div className="sticky top-12 space-y-8">
                                    <div className="bg-white rounded-[2.5rem] p-8 text-accent-brown shadow-2xl border border-brand/10 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-2xl font-black italic tracking-tighter text-brand-dark">Receipt Summary</h3>
                                                <Tag className="w-5 h-5 text-brand/20" />
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block">Your Clinic</span>
                                                {selectedOption ? (
                                                    <div className="flex group items-center">
                                                        <div className="min-w-0 flex flex-col justify-center">
                                                            <h4 className="font-black text-xs tracking-wider truncate mb-0.5 text-accent-brown">{selectedOption.clinic_name}</h4>
                                                            <p className="text-[11px] font-bold text-accent-brown/40 tracking-widest truncate">{selectedOption.address_line1}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="py-2 opacity-50">
                                                        <p className="text-[11px] font-black text-accent-brown/20 uppercase tracking-widest">—</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-5 mb-10 border-t border-brand/5 pt-8">
                                                <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block">Pet Information</span>
                                                <div className="flex group items-center gap-4">
                                                    <div className="min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-black text-xs tracking-wider truncate mb-0.5 text-accent-brown">{form.pet_name}</h4>
                                                        <p className="text-[11px] font-bold text-accent-brown/40 tracking-widest truncate">{form.pet_type} &bull; {form.pet_breed}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-5 mb-10 border-t border-brand/5 pt-8">
                                                <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block">Customer Name</span>
                                                <div className="flex group items-center gap-4">
                                                    <div className="min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-black text-xs tracking-wider truncate mb-0.5 text-accent-brown">{user?.name || user?.first_name || 'Customer'}</h4>
                                                        <p className="text-[11px] font-bold text-accent-brown/40 tracking-widest truncate">Pet's Owner</p>
                                                    </div>
                                                </div>
                                            </div>


                                            <div className="space-y-5 mb-10 border-t border-brand/5 pt-8">
                                                <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block">Your Visit</span>
                                                <div className="flex group items-center gap-4">
                                                    <div className="min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-black text-xs tracking-wider truncate mb-0.5 text-accent-brown">{formatDate(form.date)}</h4>
                                                        <p className="text-[11px] font-bold text-accent-brown/40 tracking-widest truncate">{form.time} Arrival</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-5 mb-10 border-t border-brand/5 pt-8">
                                                <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block">Payment Method</span>
                                                <div className="flex group items-center gap-4">
                                                    <div className="min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-black text-xs tracking-wider truncate mb-0.5 text-accent-brown uppercase">{selectedPaymentMethod === 'cash' ? 'Clinic Counter' : selectedPaymentMethod}</h4>
                                                        <p className="text-[11px] font-bold text-accent-brown/40 tracking-widest truncate">Payment Mode</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-5 mb-10 border-t border-brand/5 pt-8">
                                                <span className="text-[11px] font-black uppercase text-accent-brown/40 tracking-[0.3em] block">Your Service</span>
                                                {selectedService ? (
                                                    <div className="flex group justify-between items-center">
                                                        <div className="flex items-center gap-6">
                                                            <div className="min-w-0 flex flex-col justify-center">
                                                                <h4 className="font-black text-xs tracking-wider truncate mb-0.5 text-accent-brown">{selectedService.name}</h4>
                                                                {selectedService.loyalty_points > 0 && (
                                                                    <div className="flex items-center gap-1.5 text-brand">
                                                                        <Award className="w-3 h-3" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">+{selectedService.loyalty_points} Points</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="font-black text-sm tabular-nums text-accent-brown">₱{selectedService.price.toLocaleString()}</span>
                                                    </div>
                                                ) : (
                                                    <div className="py-2 opacity-50">
                                                        <p className="text-[11px] font-black text-accent-brown/20 uppercase tracking-widest">—</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4 pt-8 border-t border-brand/5 text-[10px] font-black uppercase tracking-[0.2em] mb-10">
                                                <div className="flex justify-between text-accent-brown/40">
                                                    <span>Subtotal</span>
                                                    <span className="text-accent-brown">₱{baseTotal.toLocaleString()}</span>
                                                </div>
                                                {appliedVoucher && (
                                                    <div className="flex justify-between items-start text-accent-brown">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="text-emerald-600">Reward Applied</span>
                                                            <span className="text-[7.5px] font-bold text-accent-brown/20 uppercase tracking-[0.3em]">
                                                                {appliedVoucher.type || 'Service'} &bull; {appliedVoucher.code}
                                                            </span>
                                                        </div>
                                                        <span className="text-emerald-600">-₱{baseTotal.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-end mb-4 border-b border-brand/5 pb-8">
                                                <div>
                                                    <p className="text-[9px] font-black text-accent-brown/40 uppercase tracking-[0.3em] mb-1">Total Settlement</p>
                                                    <h2 className="text-4xl font-black tracking-tighter italic text-brand-dark leading-none">₱{estimatedTotal.toLocaleString()}</h2>
                                                </div>
                                                <ShieldCheck className="w-8 h-8 text-brand/10" />
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toasts & Modals */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-8 py-4 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {packageModal && (() => {
                        let items: string[] = [];
                        try {
                            if (packageModal.package_items_json) {
                                const parsed = JSON.parse(packageModal.package_items_json);
                                items = Array.isArray(parsed) ? parsed : [];
                            }
                        } catch { items = []; }

                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[99999] flex items-center justify-center p-6 backdrop-blur-2xl bg-accent-brown/30"
                                style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                                onClick={() => setPackageModal(null)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 40 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 40 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(255,107,0,0.3)] w-full max-w-5xl overflow-hidden border border-white max-h-[90vh] flex flex-col sm:flex-row"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Modal Header */}
                                    <div className="bg-white p-12 relative overflow-hidden sm:w-[40%] flex flex-col justify-center border-r border-brand/5">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-32 -mt-32" />
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-2 h-8 bg-brand rounded-full" />
                                                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-accent-brown/30 leading-none">Pet Care Package</span>
                                                </div>
                                                <h3 className="text-4xl sm:text-5xl font-black text-accent-brown uppercase italic leading-none tracking-tighter mb-4">{packageModal.name}</h3>
                                                <p className="text-[10px] font-bold text-accent-brown/20 uppercase tracking-[0.2em] leading-relaxed">Everything your pet needs in one efficient visit.</p>
                                            </div>

                                            <div className="bg-brand/5 border border-brand/10 rounded-[2.5rem] p-8 mt-12">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">
                                                        <Sparkles className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-[11px] font-black text-accent-brown uppercase tracking-widest leading-none">What's Included</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-accent-brown/40 leading-relaxed italic uppercase">This bundle includes all the care your pet needs in a single efficient session.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="flex-1 p-12 space-y-10 overflow-y-auto no-scrollbar relative">
                                        <button
                                            onClick={() => setPackageModal(null)}
                                            className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-brand/5 border border-brand/10 items-center justify-center text-accent-brown/20 hover:text-brand hover:bg-brand/10 transition-all shrink-0 hidden sm:flex z-20"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="flex items-end gap-10">
                                            <div>
                                                <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1">Standard Price</p>
                                                <span className="text-4xl font-black text-accent-brown tracking-tighter italic leading-none">₱{packageModal.price.toLocaleString()}</span>
                                            </div>
                                            {packageModal.loyalty_points > 0 && (
                                                <div className="bg-brand text-white px-6 py-3 rounded-2xl shadow-lg shadow-brand/20 mb-[2px]">
                                                    <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest leading-none">
                                                        <Award className="w-4 h-4" /> {packageModal.loyalty_points} Points Reward
                                                    </span>
                                                </div>
                                            )}
                                            {packageModal.duration_minutes > 0 && (
                                                <div className="bg-brand/5 px-6 py-3 rounded-2xl border border-brand/10 mb-[2px]">
                                                    <span className="flex items-center gap-3 text-[10px] font-black text-accent-brown uppercase tracking-widest leading-none">
                                                        <Clock3 className="w-4 h-4 text-brand" /> {packageModal.duration_minutes} MIN ESTIMATED TIME
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1 h-4 bg-brand rounded-full" />
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-brown/40">Package Details</p>
                                            </div>

                                            {items.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {items.map((item, i) => (
                                                        <div key={i} className="flex items-center gap-4 p-5 bg-brand/5 border border-brand/10 rounded-[1.5rem] group hover:bg-white hover:border-brand/20 transition-all">
                                                            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-brand/10">
                                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            </div>
                                                            <span className="text-[11px] font-black text-accent-brown uppercase italic tracking-wide group-hover:text-brand transition-colors whitespace-nowrap overflow-hidden text-ellipsis">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-10 border-2 border-dashed border-brand/10 rounded-[2rem] text-center">
                                                    <p className="text-[10px] font-black text-accent-brown/20 uppercase tracking-[0.3em] italic">No technical data available.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-6">
                                            <button
                                                onClick={() => {
                                                    setForm(f => ({ ...f, service: packageModal.name, service_id: packageModal.id }));
                                                    setPackageModal(null);
                                                }}
                                                className={`w-full py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-4 ${form.service_id === packageModal.id
                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                                    : 'bg-brand-dark text-white shadow-brand/20 hover:bg-brand transition-colors'
                                                    }`}
                                            >
                                                {form.service_id === packageModal.id ? (
                                                    <><CheckCircle className="w-5 h-5" /> Package Selected</>
                                                ) : (
                                                    <><Sparkles className="w-5 h-5" /> Select This Package</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>

                <QrCodeModal
                    isOpen={showQrModal}
                    onClose={() => setShowQrModal(false)}
                    qrData={qrData}
                    reference={qrReference}
                    amount={qrAmount}
                    status={qrStatus}
                />

                {/* Confirmation Modal */}
                <AnimatePresence>
                    {isConfirmModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                            <motion.div
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 exit={{ opacity: 0 }}
                                 onClick={() => setIsConfirmModalOpen(false)}
                                 className="absolute inset-0 bg-accent-brown/30 backdrop-blur-2xl"
                                 style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                            />
                            
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white rounded-[3rem] p-10 sm:p-12 w-full max-w-[600px] shadow-2xl relative z-10 overflow-hidden border border-brand/10"
                            >
                                <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                                
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-brand/5 rounded-3xl flex items-center justify-center mb-8 border border-brand/5">
                                        <Sparkles className="w-10 h-10 text-brand animate-pulse" />
                                    </div>
                                    
                                    <h2 className="text-4xl font-black italic tracking-tighter text-brand-dark leading-tight mb-4 uppercase">
                                        Commit Invitation?
                                    </h2>
                                    <p className="text-accent-brown/50 font-bold text-sm tracking-wide leading-relaxed mb-10 max-w-[400px] uppercase">
                                        You are about to finalize a clinical reservation for <span className="text-brand">{form.pet_name}</span> at <span className="text-brand">{selectedOption?.clinic_name}</span>. This commitment cannot be modified once sent.
                                    </p>
                                    
                                    <div className="space-y-4 mb-12">
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand/5 border border-brand/5">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest leading-none mb-1 text-xs">Clinical Schedule</p>
                                                <p className="text-xs font-black text-accent-brown uppercase italic leading-none">{formatDate(form.date)} &bull; {form.time}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand/5 border border-brand/5 text-xs">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest leading-none mb-1 text-xs">Total Settlement</p>
                                                <p className="text-xs font-black text-accent-brown uppercase italic leading-none">₱{estimatedTotal.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => setIsConfirmModalOpen(false)}
                                            className="flex-1 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-slate-50 text-accent-brown/40 border border-brand/5 hover:text-accent-brown"
                                        >
                                            Revise Details
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            className="flex-1 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-brand text-white shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Authorize & Commit
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </DashboardLayout>
        </APIProvider>
    );
};

export default ReservationCheckout;
