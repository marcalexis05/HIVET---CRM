import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Package, MapPin, Calendar, Clock, ChevronRight, X,
    AlertCircle, CheckCircle, Loader2, Clock3,
    CreditCard, Wallet, Activity, Eye, ShieldCheck,
    Smartphone, Info, Sparkles, Tag, User,
    Cat, Dog, Dna, LayoutGrid, Award, Check,
    Search
} from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import QrCodeModal from '../../components/QrCodeModal';
import PackageDetailsModal from '../../components/PackageDetailsModal';
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
    const [clinicSearchQuery, setClinicSearchQuery] = useState('');
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
        if (!dateStr) return 'â€”';
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

    const shouldReduceMotion = useReducedMotion();

    const formatClinicAddress = (c: { address_line1?: string; address_line2?: string; zip?: string }) => {
        const rawLine1 = (c.address_line1 || '').trim();
        const rawLine2 = (c.address_line2 || '').trim();
        const zip = (c.zip || '').trim();

        let line1 = rawLine1;
        if (zip && line1.startsWith(zip)) {
            line1 = line1.substring(zip.length).trim();
        }

        if (!line1 && !rawLine2) {
            return zip ? `Zip: ${zip}` : 'Address not specified';
        }

        if (!line1) return zip ? `${zip} ${rawLine2}` : rawLine2;
        if (!rawLine2) return zip ? `${zip} ${line1}` : line1;

        const norm1 = line1.toLowerCase().replace(/[^a-z0-9]/g, '');
        const norm2 = rawLine2.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (norm1 === norm2 || norm2.includes(norm1)) {
            return zip ? `${zip} ${rawLine2}` : rawLine2;
        }
        if (norm1.includes(norm2)) {
            return zip ? `${zip} ${line1}` : line1;
        }

        return zip ? `${zip} ${line1}, ${rawLine2}` : `${line1}, ${rawLine2}`;
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

        const filteredClinics = useMemo(() => {
        if (!clinicSearchQuery.trim()) return clinics;
        const query = clinicSearchQuery.toLowerCase().trim();
        return clinics.filter(c => {
            const nameMatch = c.name?.toLowerCase().includes(query);
            const addressMatch = (
                (c.address_line1 && c.address_line1.toLowerCase().includes(query)) ||
                (c.address_line2 && c.address_line2.toLowerCase().includes(query)) ||
                (c.zip && c.zip.toLowerCase().includes(query))
            );
            const branchMatch = c.branches?.some(b => 
                b.name?.toLowerCase().includes(query) ||
                b.address_line1?.toLowerCase().includes(query) ||
                b.address_line2?.toLowerCase().includes(query)
            );
            return Boolean(nameMatch || addressMatch || branchMatch);
        });
    }, [clinics, clinicSearchQuery]);

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
                label: `${c.name} â€” ${b.name}`,
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
                hideHeader={showQrModal}
                hideFooter={showQrModal}
            >
                <div className={`max-w-4xl mx-auto pb-[calc(5rem+24px+env(safe-area-inset-bottom,0px))] px-3 sm:px-4 w-full ${isAnyModalOpen ? 'pointer-events-none select-none' : ''}`}>
                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-4 sm:mb-5 text-center">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-accent-brown tracking-tight leading-tight italic">
                            Pet Reservation
                        </h1>
                    </div>

                    {/* Stepper Header */}
                    <nav aria-label="Reservation Progress" className="w-full max-w-[560px] mx-auto px-2 sm:px-4 mb-5 sm:mb-6">
                        <div className="relative">
                            <div className="absolute top-5 sm:top-6 left-6 right-6 h-1 bg-slate-200 -translate-y-1/2 rounded-full" />
                            <div className="absolute top-5 sm:top-6 left-6 right-6 h-1 -translate-y-1/2">
                                <motion.div
                                    className="h-full bg-brand rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((wizardStep - 1) / 3) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                            <ol className="relative flex justify-between list-none p-0 m-0">
                                {[
                                    { step: 1, label: 'Clinic', icon: Activity },
                                    { step: 2, label: 'Date & Time', icon: Clock },
                                    { step: 3, label: 'Payment', icon: Wallet },
                                    { step: 4, label: 'Review', icon: ShieldCheck }
                                ].map((s) => {
                                    const isCurrent = wizardStep === s.step;
                                    const isCompleted = wizardStep > s.step;
                                    const isUpcoming = wizardStep < s.step;
                                    return (
                                        <li key={s.step} className="flex flex-col items-center flex-1">
                                            <button
                                                type="button"
                                                onClick={() => isCompleted && setWizardStep(s.step)}
                                                disabled={isUpcoming}
                                                aria-current={isCurrent ? 'step' : undefined}
                                                aria-label={`Step ${s.step} of 4: ${s.label}${isCompleted ? ' (Completed)' : isCurrent ? ' (Current)' : ''}`}
                                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 font-bold ${
                                                    isCurrent
                                                        ? 'bg-brand text-white shadow-lg shadow-brand/30 ring-4 ring-brand/20 scale-105'
                                                        : isCompleted
                                                            ? 'bg-brand text-white shadow-sm hover:scale-105 cursor-pointer'
                                                            : 'bg-white border-2 border-slate-200 text-slate-500 cursor-not-allowed'
                                                }`}
                                            >
                                                {isCompleted ? (
                                                    <Check className="w-5 h-5 stroke-[2.8]" />
                                                ) : (
                                                    <s.icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                                                )}
                                            </button>
                                            <span
                                                className={`text-xs mt-2 text-center leading-tight transition-colors px-1 ${
                                                    isCurrent
                                                        ? 'text-brand-dark font-black'
                                                        : isCompleted
                                                            ? 'text-accent-brown font-bold'
                                                            : 'text-slate-500 font-semibold'
                                                }`}
                                            >
                                                {s.label}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </nav>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Main Interaction Area */}
                        <div className="flex-1 min-w-0">
                            <AnimatePresence mode="wait">
                                {wizardStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        {/* Facility Header Card - Clicking container toggles collapse if a clinic is selected */}
                                        <div 
                                            onClick={() => {
                                                if (form.clinic_id) {
                                                    setIsClinicListCollapsed(prev => !prev);
                                                }
                                            }}
                                            className={`bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm transition-all ${
                                                form.clinic_id ? 'cursor-pointer hover:border-brand/40' : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight italic">Pick a Clinic</h2>
                                                        <p className="text-xs font-medium text-slate-500 mt-0.5">Choose where you'd like to bring your pet</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-3 py-1 bg-brand/5 border border-brand/10 rounded-full shrink-0">
                                                        <span className="text-[11px] font-bold text-brand">Available now</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Clinic Cards Directly Below Header - Full Width */}
                                        <div className="space-y-4">
                                            {isClinicListCollapsed && form.clinic_id ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="text-xs font-bold text-brand tracking-wider">Your Selected Clinic</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsClinicListCollapsed(false)}
                                                            className="text-xs font-bold text-brand hover:underline cursor-pointer"
                                                        >
                                                            Change Selection
                                                        </button>
                                                    </div>
                                                    {clinics.filter(c => c.id === form.clinic_id).map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => setIsClinicListCollapsed(false)}
                                                            className="w-full p-4 sm:p-5 rounded-2xl border-2 border-brand bg-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-brand/80 transition-all group"
                                                        >
                                                            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                                                <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 group-hover:scale-105 transition-transform">
                                                                    <Activity className="w-6 h-6" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <h3 className="text-base sm:text-lg font-black text-accent-brown italic tracking-tight mb-1">{c.name}</h3>
                                                                    <div className="flex items-start gap-1.5 text-slate-600">
                                                                        <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                                                                        <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                                                                            {formatClinicAddress(c)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsClinicListCollapsed(false);
                                                                }}
                                                                className="self-start sm:self-center px-4 py-2 bg-brand/5 hover:bg-brand text-brand hover:text-white rounded-xl border border-brand/20 text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer"
                                                            >
                                                                Change Selection
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-3 sm:space-y-4">
                                                    {/* Searchbar and Close Button */}
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className="relative w-full">
                                                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                            <input
                                                                type="text"
                                                                value={clinicSearchQuery}
                                                                onChange={(e) => setClinicSearchQuery(e.target.value)}
                                                                placeholder="Search clinic by name or location..."
                                                                className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl py-3 pl-11 pr-10 text-xs sm:text-sm font-bold text-accent-brown placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-all shadow-inner"
                                                            />
                                                            {clinicSearchQuery && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setClinicSearchQuery('')}
                                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                                                                    aria-label="Clear search"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Filtered Clinics Grid */}
                                                    {filteredClinics.length === 0 ? (
                                                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                                                            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                                                            <h4 className="text-sm font-black text-accent-brown">No clinics found</h4>
                                                            <p className="text-xs text-slate-500 font-medium">
                                                                No clinic facilities matched "{clinicSearchQuery}". Try a different name or location.
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setClinicSearchQuery('')}
                                                                className="text-xs font-bold text-brand hover:underline mt-1 cursor-pointer"
                                                            >
                                                                Clear Search
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                            {filteredClinics.map(c => {
                                                                const isSelected = form.clinic_id === c.id;
                                                                return (
                                                                    <button
                                                                        key={c.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            // Clicking the already selected clinic container again closes it!
                                                                            if (isSelected) {
                                                                                setIsClinicListCollapsed(true);
                                                                                return;
                                                                            }
                                                                            const mainBranch = c.branches?.find(b => b.is_main) || c.branches?.[0];
                                                                            setForm(f => ({
                                                                                ...f,
                                                                                clinic_id: c.id,
                                                                                clinic_option_key: mainBranch ? `${c.id}-${mainBranch.id}` : `${c.id}-main`,
                                                                                service: '',
                                                                                service_id: 0
                                                                            }));
                                                                            setIsClinicListCollapsed(true);
                                                                            setIsServiceListCollapsed(false);
                                                                            setServiceCategory('none');
                                                                        }}
                                                                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all min-h-[64px] flex flex-col justify-between group relative cursor-pointer ${
                                                                            isSelected
                                                                                ? 'border-brand bg-brand/[0.02] shadow-md ring-2 ring-brand/10'
                                                                                : 'border-slate-200 bg-white hover:border-brand/40 hover:shadow-sm'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                                                                    isSelected ? 'bg-brand text-white shadow-sm' : 'bg-brand/5 text-brand group-hover:bg-brand/10'
                                                                                }`}>
                                                                                    <Activity className="w-5 h-5" />
                                                                                </div>
                                                                                <h3 className="text-base sm:text-lg font-black text-accent-brown italic tracking-tight leading-tight">
                                                                                    {c.name}
                                                                                </h3>
                                                                            </div>
                                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                                                                                isSelected ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white group-hover:border-brand/40'
                                                                            }`}>
                                                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-start gap-1.5 text-slate-600 mt-1">
                                                                            <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                                                                            <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                                                                                {formatClinicAddress(c)}
                                                                            </p>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {selectedOption && (
                                            <div className="space-y-4 pt-2">
                                                {/* Branch Selection */}
                                                {clinics.find(c => c.id === form.clinic_id)?.branches.length! > 1 && (
                                                    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-accent-brown">Select Branch</span>
                                                        </div>
                                                        {isBranchListCollapsed ? (
                                                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                                                                <div className="flex items-center gap-3">
                                                                    <Activity className="w-5 h-5 text-brand" />
                                                                    <span className="font-bold text-sm text-accent-brown">
                                                                        {clinics.find(c => c.id === form.clinic_id)?.branches.find(b => `${form.clinic_id}-${b.id}` === form.clinic_option_key)?.name}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsBranchListCollapsed(false)}
                                                                    className="text-xs font-bold text-brand hover:underline"
                                                                >
                                                                    Change
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2.5">
                                                                {clinics.find(c => c.id === form.clinic_id)?.branches.map(b => (
                                                                    <button
                                                                        key={b.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm(f => ({ ...f, clinic_option_key: `${form.clinic_id}-${b.id}` }));
                                                                            setIsBranchListCollapsed(true);
                                                                        }}
                                                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                                            form.clinic_option_key === `${form.clinic_id}-${b.id}`
                                                                                ? 'bg-brand text-white shadow-sm'
                                                                                : 'bg-white border border-slate-200 text-slate-700 hover:border-brand/40'
                                                                        }`}
                                                                    >
                                                                        {b.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Service Selection Card */}
                                                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-accent-brown">
                                                            {isServiceListCollapsed ? 'Selected Service' : 'Choose a Service'}
                                                        </span>
                                                    </div>

                                                    {isServiceListCollapsed && selectedService ? (
                                                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                                                                    <Sparkles className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-base font-black text-accent-brown italic">{selectedService.name}</h4>
                                                                    <div className="flex items-center gap-3 mt-0.5">
                                                                        <span className="text-base font-black text-brand italic">â‚±{selectedService.price.toLocaleString()}</span>
                                                                        {selectedService.loyalty_points > 0 && (
                                                                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                                                +{selectedService.loyalty_points} Points
                                                                            </span>
                                                                        )}
                                                                        {selectedService.duration_minutes > 0 && (
                                                                            <span className="text-xs text-slate-500 font-medium">
                                                                                {selectedService.duration_minutes} mins
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsServiceListCollapsed(false)}
                                                                className="self-start sm:self-center px-4 py-2 bg-brand/5 hover:bg-brand text-brand hover:text-white rounded-xl border border-brand/20 text-xs font-bold tracking-wide transition-all shrink-0"
                                                            >
                                                                Change Selection
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {availableServices.length === 0 ? (
                                                                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-2">
                                                                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                                                                    <h4 className="text-sm font-black text-accent-brown">No Services Currently Available</h4>
                                                                    <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                                                                        This clinic has no active medical procedures or service packages listed yet. Please choose another clinic facility.
                                                                    </p>
                                                                </div>
                                                            ) : serviceCategory === 'none' ? (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setServiceCategory('packages')}
                                                                        className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-brand/40 transition-all text-left group shadow-sm hover:shadow"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all">
                                                                                <LayoutGrid className="w-6 h-6" />
                                                                            </div>
                                                                            <span className="text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                                                                                {packageServices.length} {packageServices.length === 1 ? 'Bundle' : 'Bundles'}
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="text-lg font-black text-accent-brown italic tracking-tight mb-1">Clinical Bundles</h4>
                                                                        <p className="text-xs font-medium text-slate-500 leading-relaxed">High-fidelity service packages and comprehensive treatments.</p>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setServiceCategory('individual')}
                                                                        className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-brand/40 transition-all text-left group shadow-sm hover:shadow"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all">
                                                                                <Tag className="w-6 h-6" />
                                                                            </div>
                                                                            <span className="text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                                                                                {regularServices.length} {regularServices.length === 1 ? 'Service' : 'Services'}
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="text-lg font-black text-accent-brown italic tracking-tight mb-1">Individual Services</h4>
                                                                        <p className="text-xs font-medium text-slate-500 leading-relaxed">Single medical procedures and specific clinic consultations.</p>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setServiceCategory('none')}
                                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                                                                    >
                                                                        <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to Categories
                                                                    </button>

                                                                    {serviceCategory === 'packages' && (
                                                                        packageServices.length === 0 ? (
                                                                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                                                                                <p className="text-xs text-slate-500 font-medium">No clinical bundles are currently listed for this clinic.</p>
                                                                                {regularServices.length > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setServiceCategory('individual')}
                                                                                        className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-sm hover:bg-brand-dark transition-all"
                                                                                    >
                                                                                        View Individual Services ({regularServices.length})
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-3">
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                                    {packageServices.map(pkg => {
                                                                                    const isSelected = form.service_id === pkg.id;
                                                                                    return (
                                                                                        <div
                                                                                            key={pkg.id}
                                                                                            onClick={() => {
                                                                                                setForm(f => ({ ...f, service: pkg.name, service_id: pkg.id }));
                                                                                                setIsServiceListCollapsed(true);
                                                                                            }}
                                                                                            className={`p-4 rounded-2xl border-2 text-left transition-all w-full cursor-pointer flex flex-col justify-between ${
                                                                                                isSelected
                                                                                                    ? 'border-brand bg-brand/[0.02] shadow-sm ring-2 ring-brand/10'
                                                                                                    : 'border-slate-200 bg-white hover:border-brand/30'
                                                                                            }`}
                                                                                        >
                                                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                                                <h5 className="text-base font-black text-accent-brown italic">{pkg.name}</h5>
                                                                                                {isSelected && <Check className="w-4 h-4 text-brand shrink-0 mt-0.5 stroke-[3]" />}
                                                                                            </div>
                                                                                            <div className="flex items-end justify-between gap-2 mt-2">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-lg font-black text-brand italic">â‚±{pkg.price.toLocaleString()}</span>
                                                                                                    {pkg.loyalty_points > 0 && (
                                                                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                                                                            +{pkg.loyalty_points} Points
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={e => { e.stopPropagation(); setPackageModal(pkg); }}
                                                                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all"
                                                                                                >
                                                                                                    Details
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {serviceCategory === 'individual' && (
                                                                        regularServices.length === 0 ? (
                                                                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                                                                                <p className="text-xs text-slate-500 font-medium">No individual services are currently listed for this clinic.</p>
                                                                                {packageServices.length > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setServiceCategory('packages')}
                                                                                        className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-sm hover:bg-brand-dark transition-all"
                                                                                    >
                                                                                        View Care Packages ({packageServices.length})
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-4">
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                                {regularServices.slice((servicePage - 1) * 4, servicePage * 4).map(svc => {
                                                                                    const isSelected = form.service_id === svc.id;
                                                                                    return (
                                                                                        <button
                                                                                            key={svc.id}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setForm(f => ({ ...f, service: svc.name, service_id: svc.id }));
                                                                                                setIsServiceListCollapsed(true);
                                                                                            }}
                                                                                            className={`p-4 rounded-2xl border-2 text-left transition-all w-full flex flex-col justify-between ${
                                                                                                isSelected
                                                                                                    ? 'border-brand bg-brand/[0.02] shadow-sm ring-2 ring-brand/10'
                                                                                                    : 'border-slate-200 bg-white hover:border-brand/30'
                                                                                            }`}
                                                                                        >
                                                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                                                <h5 className="text-base font-black text-accent-brown italic">{svc.name}</h5>
                                                                                                {isSelected && <Check className="w-4 h-4 text-brand shrink-0 mt-0.5 stroke-[3]" />}
                                                                                            </div>
                                                                                            <div className="flex items-center justify-between gap-2 mt-2 w-full">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-lg font-black text-brand italic">â‚±{svc.price.toLocaleString()}</span>
                                                                                                    {svc.loyalty_points > 0 && (
                                                                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                                                                            +{svc.loyalty_points} Points
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                                                                                    <ChevronRight className="w-4 h-4" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {regularServices.length > 4 && (
                                                                                <div className="flex items-center justify-center gap-3 pt-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={servicePage === 1}
                                                                                        onClick={() => setServicePage(p => Math.max(1, p - 1))}
                                                                                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
                                                                                    >
                                                                                        <ChevronRight className="w-4 h-4 rotate-180" />
                                                                                    </button>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        {Array.from({ length: Math.ceil(regularServices.length / 4) }).map((_, i) => (
                                                                                            <button
                                                                                                key={i}
                                                                                                type="button"
                                                                                                onClick={() => setServicePage(i + 1)}
                                                                                                className={`h-2 rounded-full transition-all ${servicePage === i + 1 ? 'bg-brand w-6' : 'bg-slate-200 w-2'}`}
                                                                                            />
                                                                                        ))}
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={servicePage === Math.ceil(regularServices.length / 4)}
                                                                                        onClick={() => setServicePage(p => p + 1)}
                                                                                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
                                                                                    >
                                                                                        <ChevronRight className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Continue Button */}
                                        <div className="pt-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleContinue}
                                                className="w-full sm:w-auto h-12 min-h-[48px] px-8 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                            >
                                                <span>Continue to Schedule</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-sm space-y-6">
                                            <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-slate-100">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight italic">Schedule Appointment</h3>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Pick a date, time & identify the pet</p>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-xs font-bold text-accent-brown mb-2.5">Pet Classification</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { id: 'Dog', label: 'Dogs', icon: Dog },
                                                            { id: 'Cat', label: 'Cats', icon: Cat },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                type="button"
                                                                onClick={() => setForm(f => ({ ...f, pet_type: type.id, pet_breed: '' }))}
                                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                                                    form.pet_type === type.id
                                                                        ? 'border-brand bg-brand/[0.02] shadow-sm ring-2 ring-brand/10'
                                                                        : 'border-slate-200 bg-white hover:border-brand/30'
                                                                }`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                                    form.pet_type === type.id ? 'bg-brand text-white' : 'bg-brand/5 text-brand'
                                                                }`}>
                                                                    <type.icon className="w-5 h-5" />
                                                                </div>
                                                                <span className={`text-xs font-bold ${
                                                                    form.pet_type === type.id ? 'text-brand-dark' : 'text-slate-600'
                                                                }`}>{type.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-accent-brown mb-1.5">Pet's Name</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.pet_name}
                                                                onChange={e => {
                                                                    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                                    setForm(f => ({ ...f, pet_name: lettersOnly }));
                                                                }}
                                                                placeholder="e.g. Buddy, Luna, Max..."
                                                                className="w-full bg-white border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/10 rounded-xl px-4 py-3 text-sm font-semibold text-black outline-none transition-all placeholder:text-slate-300"
                                                            />
                                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                                <Activity className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-accent-brown mb-1.5">Pet Breed</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.pet_breed}
                                                                onChange={e => {
                                                                    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                                    setForm(f => ({ ...f, pet_breed: lettersOnly }));
                                                                }}
                                                                placeholder="e.g. Golden Retriever, Shih Tzu, Aspin..."
                                                                className="w-full bg-white border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/10 rounded-xl px-4 py-3 text-sm font-semibold text-black outline-none transition-all placeholder:text-slate-300"
                                                            />
                                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                                <Dna className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-accent-brown mb-1.5">Operation Date</label>
                                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                            <CustomDatePicker
                                                                label=""
                                                                value={form.date}
                                                                onChange={val => setForm(f => ({ ...f, date: val, time: '' }))}
                                                                minDate={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })}
                                                                isDateAvailable={(dateStr, dateObj) => {
                                                                    const todayPH = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                                                                    if (dateStr < todayPH) return false;
                                                                    if (!selectedOption) return true;
                                                                    const special = selectedOption.special_hours?.find(sh => sh.specific_date === dateStr);
                                                                    if (special) return special.is_open;
                                                                    if (selectedOption.hours && selectedOption.hours.length > 0) {
                                                                        const dow = dateObj.getDay();
                                                                        const h = selectedOption.hours.find(item => item.day_of_week === dow);
                                                                        if (h) return h.is_open;
                                                                    }
                                                                    return true;
                                                                }}
                                                                onModalOpenChange={setIsDatePickerOpen}
                                                            />
                                                        </div>
                                                    </div>

                                                    {form.date && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                                                            <label className="block text-xs font-bold text-accent-brown">Available Time Windows</label>
                                                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                                                                {BASE_TIMES.map(t => {
                                                                    const status = classifySlot(t);
                                                                    const isSelected = form.time === t;
                                                                    const isDisabled = status !== 'available';

                                                                    const btnStyle = isSelected
                                                                        ? 'bg-brand text-white shadow-md ring-2 ring-brand/20 font-bold'
                                                                        : status === 'yours' ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                                                            : status === 'break' ? 'bg-slate-100 border border-slate-200 text-slate-400'
                                                                                : status === 'closed' ? 'bg-slate-100 border border-slate-200 text-slate-300'
                                                                                    : 'bg-white text-slate-700 hover:text-brand hover:border-brand/40 border border-slate-200 shadow-sm';

                                                                    return (
                                                                        <div key={t} className="relative">
                                                                            <button
                                                                                type="button"
                                                                                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                                                                onClick={() => !isDisabled && setForm(f => ({ ...f, time: t }))}
                                                                                className={`w-full py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all ${btnStyle}`}
                                                                            >
                                                                                {t}
                                                                            </button>
                                                                            {status !== 'available' && (
                                                                                <div className="absolute -top-1.5 -right-1">
                                                                                    <div className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold shadow-sm ${
                                                                                        status === 'yours' ? 'bg-amber-500 text-white' :
                                                                                            status === 'break' ? 'bg-blue-400 text-white' :
                                                                                                'bg-slate-400 text-white'
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
                                                        <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200 mb-2">
                                                                <Calendar className="w-6 h-6 text-slate-400" />
                                                            </div>
                                                            <p className="text-xs font-medium text-slate-500">Select an appointment date to see available time slots</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(1)}
                                                    className="w-full sm:w-auto h-12 min-h-[48px] px-6 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                                    <span>Go Back</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleContinue}
                                                    className="w-full sm:w-auto h-12 min-h-[48px] px-8 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    <span>Continue to Payment</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-sm space-y-6">
                                            <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-slate-100">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight italic">Payment Method</h3>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Choose how to pay for your appointment</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                {[
                                                    { id: 'qrph', label: 'QRPh Pay', icon: Smartphone, desc: 'Centralized QR' },
                                                    { id: 'gcash', label: 'GCash Wallet', icon: Wallet, desc: 'Direct Transfer' },
                                                    { id: 'paymaya', label: 'Maya App', icon: CreditCard, desc: 'Digital Finance' },
                                                    { id: 'cash', label: 'Clinic Counter', icon: Activity, desc: 'Pay at Clinic' }
                                                ].map(method => {
                                                    const isSelected = selectedPaymentMethod === method.id;
                                                    return (
                                                        <button
                                                            key={method.id}
                                                            type="button"
                                                            onClick={() => setSelectedPaymentMethod(method.id as any)}
                                                            className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                                                                isSelected
                                                                    ? 'border-brand bg-brand/[0.02] shadow-md ring-2 ring-brand/10'
                                                                    : 'border-slate-200 bg-white hover:border-brand/30'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3 sm:gap-4">
                                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                                                                    isSelected ? 'bg-brand text-white shadow-sm' : 'bg-brand/5 text-brand'
                                                                }`}>
                                                                    <method.icon className="w-5 h-5" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <h4 className="text-sm font-black text-accent-brown italic">{method.label}</h4>
                                                                    <p className="text-xs text-slate-500 font-medium">{method.desc}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                isSelected ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'
                                                            }`}>
                                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Voucher Section */}
                                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-black text-accent-brown italic">Apply Voucher</h4>
                                                        <p className="text-xs text-slate-500 font-medium">Use a reward code for this reservation</p>
                                                    </div>
                                                    {appliedVoucher && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAppliedVoucher(null)}
                                                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Remove Code
                                                        </button>
                                                    )}
                                                </div>

                                                {appliedVoucher ? (
                                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-emerald-200">
                                                                <Sparkles className="w-5 h-5 text-emerald-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-emerald-800 italic">{appliedVoucher.title}</p>
                                                                <p className="text-xs font-semibold text-emerald-600">Voucher Applied</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    myVouchers.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {myVouchers.map(v => (
                                                                <button
                                                                    key={v.id}
                                                                    type="button"
                                                                    onClick={() => setAppliedVoucher(v)}
                                                                    className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 hover:border-brand rounded-xl transition-all text-left group"
                                                                >
                                                                    <div className="w-9 h-9 bg-brand/5 text-brand rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all">
                                                                        <Tag className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-accent-brown truncate">{v.title}</p>
                                                                        <p className="text-[11px] font-semibold text-slate-400">{v.code}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50">
                                                            <p className="text-xs font-medium text-slate-500">No active service vouchers found.</p>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(2)}
                                                    className="w-full sm:w-auto h-12 min-h-[48px] px-6 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                                    <span>Go Back</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleContinue}
                                                    className="w-full sm:w-auto h-12 min-h-[48px] px-8 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    <span>Continue to Review</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-sm space-y-6">
                                            <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-slate-100">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight italic">Final Review</h3>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Please check your details before confirming</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                {/* Clinic */}
                                                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Clinic</span>
                                                    <div className="flex items-start gap-3">
                                                        <Activity className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-accent-brown italic leading-tight">{selectedOption?.clinic_name}</p>
                                                            <p className="text-xs text-slate-500 font-medium mt-1 leading-snug break-words">
                                                                {selectedOption ? formatClinicAddress(selectedOption) : 'â€”'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Procedure */}
                                                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Service or Package</span>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <Eye className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-black text-accent-brown italic leading-tight">{selectedService?.name}</p>
                                                                {selectedService?.duration_minutes ? (
                                                                    <p className="text-xs text-slate-500 font-medium mt-1">{selectedService.duration_minutes} mins duration</p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <p className="text-base font-black text-brand italic shrink-0">â‚±{selectedService?.price.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {/* Schedule */}
                                                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Schedule & Arrival</span>
                                                    <div className="flex items-start gap-3">
                                                        <Calendar className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-black text-accent-brown italic leading-tight">{formatDate(form.date)}</p>
                                                            <p className="text-xs text-slate-500 font-medium mt-1">{form.time} Arrival Window</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pet Info */}
                                                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pet Information</span>
                                                    <div className="flex items-start gap-3">
                                                        {form.pet_type === 'Dog' ? <Dog className="w-5 h-5 text-brand shrink-0 mt-0.5" /> : <Cat className="w-5 h-5 text-brand shrink-0 mt-0.5" />}
                                                        <div>
                                                            <p className="text-sm font-black text-accent-brown italic leading-tight">{form.pet_name || 'Unnamed Pet'}</p>
                                                            <p className="text-xs text-slate-500 font-medium mt-1">{form.pet_type} &bull; {form.pet_breed || 'Mixed Breed'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment Mode */}
                                                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method</span>
                                                    <div className="flex items-start gap-3">
                                                        <CreditCard className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-black text-accent-brown italic leading-tight">
                                                                {selectedPaymentMethod === 'cash' ? 'Clinic Counter' : selectedPaymentMethod.toUpperCase()}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-medium mt-1">Payment Mode</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Owner */}
                                                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer Name</span>
                                                    <div className="flex items-start gap-3">
                                                        <User className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-black text-accent-brown italic leading-tight">{user?.name || user?.first_name || 'Customer'}</p>
                                                            <p className="text-xs text-slate-500 font-medium mt-1">Pet's Owner</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Total Banner */}
                                            <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Amount</span>
                                                    <span className="text-3xl font-black text-brand-dark italic">â‚±{estimatedTotal.toLocaleString()}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleConfirmFinalize}
                                                    disabled={submitting}
                                                    className="w-full sm:w-auto h-12 min-h-[48px] px-8 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                    <span>Complete Booking</span>
                                                </button>
                                            </div>

                                            <div className="pt-2 flex justify-start">
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(3)}
                                                    className="w-full sm:w-auto h-12 min-h-[48px] px-6 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                                    <span>Go Back</span>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Right Sidebar: Receipt Summary â€” Exclusively shown on Step 4 (Review) on large screens */}
                        {wizardStep === 4 && (
                            <div className="w-full lg:w-[320px] shrink-0">
                                <div className="sticky top-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <h3 className="text-base font-black italic tracking-tight text-brand-dark">Receipt Summary</h3>
                                        <Tag className="w-4 h-4 text-brand" />
                                    </div>

                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <span className="font-bold text-slate-400 block mb-0.5">Your Clinic</span>
                                            <p className="font-black text-accent-brown">{selectedOption?.clinic_name || 'â€”'}</p>
                                            <p className="text-slate-500 text-[11px] break-words">{selectedOption ? formatClinicAddress(selectedOption) : ''}</p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100">
                                            <span className="font-bold text-slate-400 block mb-0.5">Pet Information</span>
                                            <p className="font-black text-accent-brown">{form.pet_name || 'â€”'}</p>
                                            <p className="text-slate-500 text-[11px]">{form.pet_type} &bull; {form.pet_breed || 'Mixed Breed'}</p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100">
                                            <span className="font-bold text-slate-400 block mb-0.5">Visit Schedule</span>
                                            <p className="font-black text-accent-brown">{formatDate(form.date)}</p>
                                            <p className="text-slate-500 text-[11px]">{form.time}</p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100">
                                            <span className="font-bold text-slate-400 block mb-0.5">Service</span>
                                            <div className="flex justify-between items-center">
                                                <p className="font-black text-accent-brown">{selectedService?.name || 'â€”'}</p>
                                                <span className="font-black text-brand">â‚±{selectedService?.price.toLocaleString() || '0'}</span>
                                            </div>
                                        </div>

                                        {appliedVoucher && (
                                            <div className="pt-2 border-t border-slate-100 flex justify-between text-emerald-600">
                                                <span>Reward Applied</span>
                                                <span>-â‚±{baseTotal.toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                                            <span className="font-bold text-slate-600">Total Price</span>
                                            <span className="text-xl font-black text-brand-dark italic">â‚±{estimatedTotal.toLocaleString()}</span>
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
                        <motion.div
                            initial={{ opacity: 0, y: -16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -16, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl font-bold text-xs sm:text-sm max-w-[90vw] sm:max-w-md ${
                                toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-rose-600 text-white shadow-rose-900/20'
                            }`}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle className="w-4 h-4 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span className="leading-tight">{toast.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <PackageDetailsModal
                    packageModal={packageModal}
                    onClose={() => setPackageModal(null)}
                    onSelect={(pkg) => {
                        setForm(f => ({ ...f, service: pkg.name, service_id: pkg.id }));
                        setPackageModal(null);
                    }}
                    isSelected={form.service_id === packageModal?.id}
                />

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
                                        Confirm Booking?
                                    </h2>
                                    <p className="text-accent-brown/50 font-bold text-sm tracking-wide leading-relaxed mb-10 max-w-[400px] uppercase">
                                        You are about to book a visit for <span className="text-brand">{form.pet_name}</span> at <span className="text-brand">{selectedOption?.clinic_name}</span>. Please make sure all details are correct.
                                    </p>
                                    
                                    <div className="space-y-4 mb-12">
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand/5 border border-brand/5">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest leading-none mb-1 text-xs">Appointment Date & Time</p>
                                                <p className="text-xs font-black text-accent-brown uppercase italic leading-none">{formatDate(form.date)} &bull; {form.time}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand/5 border border-brand/5 text-xs">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest leading-none mb-1 text-xs">Total Price</p>
                                                <p className="text-xs font-black text-accent-brown uppercase italic leading-none">â‚±{estimatedTotal.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => setIsConfirmModalOpen(false)}
                                            className="flex-1 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-slate-50 text-accent-brown/40 border border-brand/5 hover:text-accent-brown"
                                        >
                                            Go Back & Edit
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            className="flex-1 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-brand text-white shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Confirm & Book
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
