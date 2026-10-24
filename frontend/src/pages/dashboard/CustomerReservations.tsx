import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight, Plus, X, AlertCircle, CheckCircle, Loader2, CalendarX, Clock3, CreditCard, Banknote, ShieldCheck, Gift, Sparkles, QrCode, Wallet, Smartphone, Activity, Trophy, Eye, Tag } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import ModernModal from '../../components/ModernModal';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import QrCodeModal from '../../components/QrCodeModal';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase, toSentenceCase, formatName, formatReviewId, getReviewIdAriaLabel } from '../../utils/textFormatters';

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

interface Reservation {
    id: string;
    db_id: number;
    pet_name: string;
    pet_type: string;
    pet_breed?: string;
    service: string;
    date: string;
    time: string;
    status: string;
    payment_status: string;
    payment_method?: string;
    voucher_code?: string;
    location: string;
    notes: string;
    total: number;
    tracking_id: string;
    created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
    'Payment Pending': 'bg-blue-100 text-blue-700',
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Confirmed': 'bg-blue-100 text-blue-700',
    'Ready for Pickup': 'bg-green-100 text-green-700',
    'Completed': 'bg-emerald-100 text-emerald-700',
    'Cancelled': 'bg-red-100 text-red-500',
};

// Format reservation / review number display in standard short format: e.g. #RV-2026-9907
export const formatReservationNumber = (id: string | number | undefined | null) => {
    if (!id) return '';
    const cleaned = String(id).trim().replace(/^HV-2026-/i, '').replace(/^HV-/i, '');
    return formatReviewId(cleaned);
};

const CustomerReservations = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Core State
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeStatus, setActiveStatus] = useState('All');
    const filterTabsContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll selected status chip into view
    useEffect(() => {
        if (!filterTabsContainerRef.current) return;
        const activeBtn = filterTabsContainerRef.current.querySelector<HTMLElement>(`[data-tab="${activeStatus}"]`);
        if (activeBtn) {
            const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            activeBtn.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, [activeStatus]);
    
    // Action State
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [payNowLoading, setPayNowLoading] = useState<number | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<Reservation | null>(null);
    const [showMethodSelector, setShowMethodSelector] = useState(false);
    const [paymentSelectionId, setPaymentSelectionId] = useState<number | null>(null);
    
    // Modal & Toast Handlers
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Constants
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

    const shouldReduceMotion = useReducedMotion();
    const lastActiveElementRef = useRef<HTMLElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);

    // Smoothly lock body scroll when receipt modal is open without wiping header/nav layout
    useEffect(() => {
        if (!selectedDetail) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [selectedDetail]);

    // Focus close button on open
    useEffect(() => {
        if (selectedDetail) {
            setTimeout(() => {
                closeButtonRef.current?.focus();
            }, 60);
        }
    }, [selectedDetail]);

    // Close Receipt Modal handler with browser back button restoration
    const closeReceiptModal = useCallback(() => {
        setSelectedDetail(null);
        if (typeof window !== 'undefined' && window.history.state?.hivetReceiptModal) {
            window.history.back();
        }
        setTimeout(() => {
            lastActiveElementRef.current?.focus();
        }, 50);
    }, []);

    // Hardware/Browser Back button and Escape key support for Receipt Modal
    useEffect(() => {
        if (!selectedDetail) return;

        window.history.pushState({ hivetReceiptModal: true }, '');

        const handlePopState = () => {
            setSelectedDetail(null);
            setTimeout(() => {
                lastActiveElementRef.current?.focus();
            }, 50);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeReceiptModal();
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedDetail, closeReceiptModal]);

    // Modal state observer for full-screen dialogs (QR / Method selector)
    useEffect(() => {
        const isActive = showQrModal || showMethodSelector;
        if (isActive) document.body.classList.add('map-modal-active');
        else document.body.classList.remove('map-modal-active');
        return () => document.body.classList.remove('map-modal-active');
    }, [showQrModal, showMethodSelector]);

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
                            fetchData();
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resRes, clinicsRes] = await Promise.all([
                fetch(`${API}/api/reservations`, { headers: authHeaders }),
                fetch(`${API}/api/clinics`),
            ]);
            if (resRes.ok) {
                const d = await resRes.json();
                setReservations(d.reservations || []);
            } else {
                setError('Could not load reservations. Please log in again.');
            }
            if (clinicsRes.ok) {
                const d = await clinicsRes.json();
                setClinics(d.clinics || []);
            }
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        fetchData();
        return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
    }, [fetchData]);

    const handlePayExisting = async (reservationDbId: number, method: 'gcash' | 'paymaya' | 'qrph' = 'qrph') => {
        const resObj = reservations.find(r => r.db_id === reservationDbId);
        if (resObj && resObj.total <= 0) {
            showToast('Success! This reservation has been marked as confirmed.', 'success');
            fetchData();
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
                setQrReference(formatReservationNumber(resObj?.tracking_id || resObj?.id || `RV-${reservationDbId}`));
                setQrAmount(resObj?.total || 0);
                setShowQrModal(true);
                startPolling(data.intent_id);
            } else if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                showToast('Failed to initiate payment gateway.', 'error');
            }
        } catch (error) {
            showToast('An error occurred during payment initiation.', 'error');
        } finally {
            setPayNowLoading(null);
        }
    };

    const handleCancel = async (id: number) => {
        setModal({
            isOpen: true,
            title: 'Cancel Visit',
            message: 'Are you sure you want to cancel this visit? This cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                setCancellingId(id);
                try {
                    const res = await fetch(`${API}/api/reservations/${id}/cancel`, { 
                        method: 'PATCH', 
                        headers: authHeaders 
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setReservations(prev => prev.map(r => r.db_id === id ? { ...r, ...data.reservation } : r));
                        showToast('Visit cancelled successfully.');
                        fetchData();
                    } else {
                        showToast('Failed to cancel visit.', 'error');
                    }
                } catch {
                    showToast('Connection error.', 'error');
                } finally {
                    setCancellingId(null);
                    setModal(m => ({ ...m, isOpen: false }));
                }
            }
        });
    };

    const handleDeleteReservation = async (dbId: number) => {
        try {
            const res = await fetch(`${API}/api/reservations/${dbId}`, { 
                method: 'DELETE', 
                headers: authHeaders 
            });
            if (!res.ok) throw new Error();
            setReservations(prev => prev.filter(r => r.db_id !== dbId));
            showToast('Reservation removed permanently.');
        } catch {
            showToast('Could not remove this reservation.', 'error');
        }
    };

    // Derived filtering and pagination data
    const filteredReservations = reservations.filter(res => {
        if (activeStatus === 'All') return true;
        return res.status === activeStatus;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);
    const paginatedReservations = filteredReservations.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const activeCount = reservations.filter(r => ['Pending', 'Confirmed', 'Payment Pending'].includes(r.status)).length;
    const pendingPaymentCount = reservations.filter(r => r.payment_status === 'unpaid' && r.status === 'Payment Pending').length;
    const completedCount = reservations.filter(r => r.status === 'Completed').length;

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [filteredReservations.length, totalPages, currentPage]);

    return (
        <DashboardLayout title="" hideHeader={!!selectedDetail || showQrModal || showMethodSelector}>
            <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-24 lg:pb-16 px-1 sm:px-2">

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

                {/* Visually hidden heading for a11y */}
                <h1 className="sr-only">Pet Reservations</h1>

                {/* CINEMATIC HEADER CONTROLS */}
                <div className="relative">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 relative z-10 mb-6 sm:mb-8">
                        {/* 3 Counters in 1 row on screens >= 340px */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto">
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
                                    className="bg-white p-2.5 sm:p-3.5 md:px-5 md:py-3.5 rounded-2xl md:rounded-[1.75rem] shadow-md shadow-accent-brown/5 border border-accent-brown/5 flex items-center gap-2 sm:gap-3 justify-center md:justify-start"
                                >
                                    <div className={`p-1.5 sm:p-2 rounded-xl bg-slate-50 ${stat.color} shrink-0 hidden min-[380px]:flex`}>
                                        <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-black leading-none mb-1 truncate">{stat.label}</p>
                                        <p className="text-lg sm:text-xl font-black text-accent-brown leading-none">{stat.count}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.03, backgroundColor: '#000' }}
                            whileTap={{ scale: 0.97 }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            onClick={() => {
                                navigate('/dashboard/customer/reservations/checkout');
                            }}
                            className="bg-brand-dark text-white min-h-[48px] h-[50px] md:h-[54px] px-6 rounded-2xl md:rounded-[1.75rem] font-bold text-xs flex items-center justify-center gap-2.5 shadow-xl shadow-brand-dark/20 cursor-pointer w-full md:w-auto"
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> New Appointment
                        </motion.button>
                    </div>

                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] -mr-64 -mt-32 opacity-50 pointer-events-none" />
                </div>

                {/* Loading / Error States */}
                {loading && <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 text-brand animate-spin" />
                    <p className="text-xs font-medium text-black">Synchronizing records...</p>
                </div>}

                {!loading && error && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 border border-red-100 rounded-[2rem] p-8 flex items-center gap-6 text-red-600 shadow-xl shadow-red-500/5">
                        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="font-bold text-xs mb-1">Access Error</p>
                            <p className="font-bold text-sm">{error}</p>
                        </div>
                    </motion.div>
                )}

                {/* HI-VET ARCHITECTURE NOIR: FILTER TABS */}
                {!loading && !error && reservations.length > 0 && (
                    <div 
                        ref={filterTabsContainerRef}
                        className="flex md:flex-wrap items-center gap-2 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory pb-4 sm:pb-6 -mx-1 px-1 scroll-smooth"
                    >
                        {tabs.map((tab, i) => {
                            const count = tab === 'All' ? reservations.length : reservations.filter(r => r.status === tab).length;
                            const isSelected = activeStatus === tab;
                            return (
                                <motion.button
                                    key={tab}
                                    data-tab={tab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + (i * 0.04) }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        setActiveStatus(tab);
                                        setCurrentPage(1);
                                    }}
                                    className={`shrink-0 snap-start min-h-[44px] px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer select-none ${isSelected
                                        ? 'bg-brand text-white shadow-lg shadow-brand/25'
                                        : 'bg-white text-black hover:text-accent-brown border border-accent-brown/5 shadow-sm'
                                        }`}
                                >
                                    <span>{tab}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-black border border-accent-brown/5'}`}>
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
                                    className="bg-white rounded-[2rem] sm:rounded-[3rem] p-12 sm:p-24 flex flex-col items-center gap-6 text-center shadow-2xl shadow-accent-brown/5 border border-white"
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-peach/10 rounded-full flex items-center justify-center text-black stroke-[1]">
                                        <CalendarX className="w-8 h-8 sm:w-10 sm:h-10" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-accent-brown text-xl sm:text-2xl tracking-tighter mb-2">No {activeStatus} Records</h4>
                                        <p className="text-black text-xs sm:text-sm font-medium max-w-xs mx-auto">We couldn't find any appointments matching your current filter selection.</p>
                                    </div>
                                    <button onClick={() => setActiveStatus('All')} className="min-h-[44px] px-8 py-3 bg-slate-50 text-xs font-bold text-accent-brown rounded-full hover:bg-accent-peach/20 transition-all cursor-pointer">Reset Filters</button>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    {paginatedReservations.map((res, i) => (
                                        <motion.div
                                            key={res.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="group relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all flex flex-col h-full cursor-pointer overflow-hidden"
                                            onClick={(e) => {
                                                lastActiveElementRef.current = e.currentTarget;
                                                setSelectedDetail(res);
                                            }}
                                        >
                                            {/* Header: Date Block + Status Badge */}
                                            <div className="flex items-center justify-between gap-3 relative z-10">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-accent-brown/5 group-hover:bg-brand/5 group-hover:border-brand/10 transition-colors shrink-0 shadow-inner">
                                                    <p className="text-[11px] font-bold text-black group-hover:text-brand/60 transition-colors mb-0.5">
                                                        {new Date(res.date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </p>
                                                    <p className="text-xl sm:text-2xl font-black text-accent-brown tracking-tighter leading-none group-hover:text-brand transition-colors">
                                                        {new Date(res.date).getDate()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[res.status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {toTitleCase(res.status)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Reservation ID on its own line */}
                                            <div className="mt-3 mb-2 flex items-center gap-1.5 relative z-10">
                                                <span className="text-[10px] font-bold text-black/50">ID:</span>
                                                <span
                                                    className="text-xs font-black text-brand tracking-wider break-all select-all"
                                                    aria-label={getReviewIdAriaLabel(res.id)}
                                                >
                                                    {formatReservationNumber(res.id)}
                                                </span>
                                            </div>

                                            {/* Body Focus */}
                                            <div className="flex-1 flex flex-col relative z-10 mb-4">
                                                <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight leading-snug mb-2 line-clamp-2">
                                                    {res.service}
                                                </h3>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-xs font-medium text-black">For</span>
                                                    <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-lg">
                                                        {formatName(res.pet_name)}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col gap-2 text-xs font-medium text-black mt-auto">
                                                    <span className="flex items-center gap-2.5">
                                                        <Clock className="w-4 h-4 text-brand shrink-0" />
                                                        <span className="truncate">{res.time} arrival</span>
                                                    </span>
                                                    <span className="flex items-center gap-2.5 text-black">
                                                        <MapPin className="w-4 h-4 shrink-0 text-brand/70" />
                                                        <span className="truncate">{formatName(res.location || "Main Clinic")}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Stack (Bottom) */}
                                            <div className="border-t border-accent-brown/5 pt-4 flex items-center justify-between gap-3 mt-auto relative z-10">
                                                <div>
                                                    <p className="text-[10px] font-bold text-black mb-1 leading-none">Total value</p>
                                                    <p className="text-lg sm:text-xl font-black italic text-accent-brown tracking-tight leading-none">₱{res.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {res.status === 'Payment Pending' && res.payment_status === 'unpaid' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.04 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPaymentSelectionId(res.db_id);
                                                                setShowMethodSelector(true);
                                                            }}
                                                            disabled={payNowLoading === res.db_id}
                                                            className="min-h-[44px] h-11 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {payNowLoading === res.db_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                                            Pay
                                                        </motion.button>
                                                    )}

                                                    {['Pending', 'Confirmed', 'Payment Pending'].includes(res.status) ? (
                                                        <motion.button
                                                            whileHover={{ scale: 1.04 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={(e) => { e.stopPropagation(); handleCancel(res.db_id); }}
                                                            disabled={cancellingId === res.db_id}
                                                            className="min-h-[44px] h-11 min-w-[44px] w-11 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm cursor-pointer"
                                                            title="Cancel reservation"
                                                        >
                                                            {cancellingId === res.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                        </motion.button>
                                                    ) : res.status === 'Cancelled' ? (
                                                        <motion.button
                                                            whileHover={{ scale: 1.04, rotate: 90 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteReservation(res.db_id); }}
                                                            className="min-h-[44px] h-11 min-w-[44px] w-11 bg-accent-brown text-white rounded-xl flex items-center justify-center hover:bg-black transition-all shadow-md shadow-accent-brown/20 cursor-pointer"
                                                            title="Delete reservation"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </motion.button>
                                                    ) : (
                                                        <motion.button
                                                            whileHover={{ x: 3 }}
                                                            className="min-h-[44px] h-11 min-w-[44px] w-11 bg-slate-50 text-black hover:text-brand rounded-xl border border-accent-brown/5 transition-all flex items-center justify-center"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Background Glow */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand/10 transition-colors opacity-0 group-hover:opacity-100 pointer-events-none" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Pagination Controls */}
                        {filteredReservations.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                scrollToTop={true}
                                className="mt-8 pt-6 border-t border-accent-brown/5"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* â”€â”€ View Details / Receipt Summary Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <AnimatePresence>
                {selectedDetail && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="detail-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
                            onClick={closeReceiptModal}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] cursor-pointer"
                            aria-hidden="true"
                        />

                        {/* Modal Dialog Container */}
                        <div
                            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 pointer-events-none"
                        >
                            <motion.div
                                key="detail-panel"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="receipt-summary-title"
                                aria-describedby="receipt-summary-res-number"
                                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 35, scale: 0.98 }}
                                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 35, scale: 0.98 }}
                                transition={shouldReduceMotion ? { duration: 0.1 } : { type: 'spring', damping: 28, stiffness: 320 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full sm:max-w-xl bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-slate-200/90 flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden relative pointer-events-auto select-text"
                            >
                                {/* Ambient glow */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none z-0" aria-hidden="true" />

                                {/* Fixed Top Header - Always visible with title & close button */}
                                <div className="sticky top-0 bg-white z-20 px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                                    <div className="min-w-0 pr-2">
                                        <h3 id="receipt-summary-title" className="text-2xl sm:text-3xl font-black italic tracking-tight text-brand-dark leading-tight break-words">
                                            Receipt Summary
                                        </h3>
                                        <span
                                            id="receipt-summary-res-number"
                                            className="text-xs font-bold text-brand block mt-1 tracking-normal select-all"
                                            aria-label={getReviewIdAriaLabel(selectedDetail.tracking_id || selectedDetail.id)}
                                        >
                                            {formatReservationNumber(selectedDetail.tracking_id || selectedDetail.id)}
                                        </span>
                                    </div>
                                    <button
                                        ref={closeButtonRef}
                                        type="button"
                                        onClick={closeReceiptModal}
                                        aria-label="Close receipt summary"
                                        className="w-11 h-11 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 hover:text-black flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    >
                                        <X className="w-5 h-5 stroke-[2.2]" />
                                    </button>
                                </div>

                                {/* Scrollable Content Body */}
                                <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-7 py-5 sm:py-6 space-y-6 overscroll-contain relative z-10">
                                    {/* Patient Information */}
                                    <div>
                                        <span className="text-xs font-bold text-slate-500 block mb-1.5">
                                            Patient information
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-lg sm:text-xl text-accent-brown leading-snug break-words">
                                                {formatName(selectedDetail.pet_name)}
                                            </h4>
                                            <p className="text-sm font-medium text-slate-600 mt-0.5 break-words">
                                                {toTitleCase(selectedDetail.pet_type)}
                                                {selectedDetail.pet_breed ? ` â€¢ ${toTitleCase(selectedDetail.pet_breed)}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Visit Details: Status & Schedule */}
                                    <div className="border-t border-slate-100 pt-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Current status */}
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 block mb-2">
                                                    Current status
                                                </span>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[selectedDetail.status] || 'bg-gray-100 text-gray-700'}`}>
                                                        {toTitleCase(selectedDetail.status)}
                                                    </span>
                                                    {selectedDetail.payment_status === 'paid' ? (
                                                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1 border border-emerald-100/50">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Paid
                                                        </span>
                                                    ) : selectedDetail.payment_status === 'unpaid' ? (
                                                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-50 text-red-500 border border-red-100/50">
                                                            Unpaid
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* Date & time */}
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 block mb-2">
                                                    Date & time
                                                </span>
                                                <div>
                                                    <h4 className="font-bold text-sm text-accent-brown">
                                                        {new Date(selectedDetail.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </h4>
                                                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                                                        {selectedDetail.time} arrival
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Service location */}
                                        {selectedDetail.location && (
                                            <div className="border-t border-slate-100 pt-4">
                                                <span className="text-xs font-bold text-slate-500 block mb-1">
                                                    Service location
                                                </span>
                                                <h4 className="font-bold text-sm text-accent-brown leading-relaxed break-words">
                                                    {formatName(selectedDetail.location)}
                                                </h4>
                                            </div>
                                        )}
                                    </div>

                                    {/* Your Service Card */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-500 block">
                                            Your service
                                        </span>
                                        <div className="bg-slate-50 border border-slate-200/70 p-4 sm:p-5 rounded-2xl space-y-3">
                                            {selectedDetail.service && selectedDetail.service.includes(',') ? (
                                                selectedDetail.service.split(',').map((svc, idx) => (
                                                    <div key={idx} className="flex items-start justify-between gap-3 text-left">
                                                        <h4 className="font-bold text-sm sm:text-base text-accent-brown leading-snug break-words flex-1 line-clamp-3">
                                                            {toTitleCase(svc.trim())}
                                                        </h4>
                                                        {idx === 0 && (
                                                            <span
                                                                className="font-black text-base sm:text-lg tabular-nums text-accent-brown shrink-0 whitespace-nowrap ml-3"
                                                                aria-label={`${selectedDetail.total.toFixed(2)} pesos`}
                                                            >
                                                                ₱{selectedDetail.total.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-start justify-between gap-3 text-left">
                                                    <h4 className="font-bold text-sm sm:text-base text-accent-brown leading-snug break-words flex-1 line-clamp-3">
                                                        {toTitleCase(selectedDetail.service || 'Service')}
                                                    </h4>
                                                    <span
                                                        className="font-black text-base sm:text-lg tabular-nums text-accent-brown shrink-0 whitespace-nowrap ml-3"
                                                        aria-label={`${selectedDetail.total.toFixed(2)} pesos`}
                                                    >
                                                        ₱{selectedDetail.total.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="border-t border-slate-100 pt-4 space-y-3">
                                        {selectedDetail.voucher_code && (
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold text-slate-500">Applied voucher</span>
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
                                                    {selectedDetail.voucher_code}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 xs:gap-3">
                                            <span className="text-xs font-bold text-slate-500 shrink-0">
                                                Payment mode
                                            </span>
                                            <span className="text-sm font-bold text-brand-dark xs:text-right break-words">
                                                {selectedDetail.payment_method || (selectedDetail.payment_status === 'paid' ? 'Online (PayMongo)' : 'Pay At Clinic (Cash/Card)')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Total Settlement */}
                                    <div className="border-t border-slate-100 pt-5">
                                        <p className="text-xs font-bold text-slate-500 mb-2">Total Price</p>
                                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                                            <h2
                                                className="text-3xl xs:text-4xl sm:text-5xl font-black italic tracking-tight text-brand-dark leading-none tabular-nums"
                                                aria-label={`${selectedDetail.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} pesos`}
                                            >
                                                ₱{selectedDetail.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </h2>
                                            <div className="flex items-center gap-1.5 shrink-0" aria-label={selectedDetail.payment_status === 'paid' ? 'Payment secured and paid' : 'Payment pending'}>
                                                {selectedDetail.payment_status === 'paid' ? (
                                                    <>
                                                        <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500 shrink-0" aria-hidden="true" />
                                                        <span className="sr-only">Payment secured and paid</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-brand/35 shrink-0" aria-hidden="true" />
                                                        <span className="sr-only">Payment Pending</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions / Bottom Clearance */}
                                    <div className="pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-3">
                                        {selectedDetail.status === 'Payment Pending' && (
                                            <motion.button
                                                whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
                                                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                                                onClick={() => {
                                                    if (selectedDetail) {
                                                        const dbId = selectedDetail.db_id;
                                                        closeReceiptModal();
                                                        handlePayExisting(dbId, 'gcash');
                                                    }
                                                }}
                                                disabled={payNowLoading === selectedDetail.db_id}
                                                className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-60"
                                            >
                                                {payNowLoading === selectedDetail.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                                Pay Now
                                            </motion.button>
                                        )}
                                        {(selectedDetail.status === 'Pending' || selectedDetail.status === 'Confirmed') && (
                                            <motion.button
                                                whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
                                                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                                                onClick={() => {
                                                    if (selectedDetail) {
                                                        const dbId = selectedDetail.db_id;
                                                        closeReceiptModal();
                                                        handleCancel(dbId);
                                                    }
                                                }}
                                                disabled={cancellingId === selectedDetail.db_id}
                                                className="w-full min-h-[48px] bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                                            >
                                                {cancellingId === selectedDetail.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                Cancel Reservation
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
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
                                        <button onClick={() => setShowMethodSelector(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-black hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs font-medium text-black mb-8">Choose your preferred provider</p>

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
                                                    <p className="font-bold text-accent-brown text-sm">{m.name}</p>
                                                    <p className="text-xs font-medium text-black">{m.sub}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent-brown transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    <p className="text-xs font-bold text-black leading-none">Secure transaction</p>
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
