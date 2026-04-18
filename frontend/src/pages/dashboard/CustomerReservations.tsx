import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight, Plus, X, AlertCircle, CheckCircle, Loader2, CalendarX, Clock3, CreditCard, Banknote, ShieldCheck, Gift, Sparkles, QrCode, Wallet, Smartphone, Activity, Trophy, Eye, Tag } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
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

    // HI-VET ARCHITECTURE NOIR: Modal State Observer
    useEffect(() => {
        const isActive = !!selectedDetail || showQrModal || showMethodSelector;
        if (isActive) document.body.classList.add('map-modal-active');
        else document.body.classList.remove('map-modal-active');
        return () => document.body.classList.remove('map-modal-active');
    }, [selectedDetail, showQrModal, showMethodSelector]);

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
                setQrReference(resObj?.tracking_id || `HV-${reservationDbId}`);
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
            title: 'De-authorize Protocol',
            message: 'Are you sure you want to nullify this clinical reservation? This action is irreversible.',
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
                        showToast('Protocol nullified successfully.');
                        fetchData();
                    } else {
                        showToast('De-authorization failed.', 'error');
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
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl sm:text-7xl font-black text-accent-brown tracking-tighter leading-[0.9]"
                            >
                                Pet <br /> <span className="text-brand">Reservations</span>
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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black leading-none mb-1">{stat.label}</p>
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
                                    navigate('/dashboard/customer/reservations/checkout');
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">Synchronizing records...</p>
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
                                    className={`group px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 cursor-pointer ${activeStatus === tab
                                        ? 'bg-brand text-white shadow-xl shadow-brand/20'
                                        : 'bg-white text-black hover:text-accent-brown border border-accent-brown/5 shadow-sm'
                                        }`}
                                >
                                    {tab}
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeStatus === tab ? 'bg-white/20 text-white' : 'bg-slate-50 text-black border border-accent-brown/5'}`}>
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
                                    <div className="w-20 h-20 bg-accent-peach/10 rounded-full flex items-center justify-center text-black stroke-[1]">
                                        <CalendarX className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-accent-brown text-2xl tracking-tighter mb-2">No {activeStatus} Records</h4>
                                        <p className="text-black text-sm font-medium max-w-xs mx-auto">We couldn't find any appointments matching your current filter selection.</p>
                                    </div>
                                    <button onClick={() => setActiveStatus('All')} className="px-8 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-accent-brown rounded-full hover:bg-accent-peach/20 transition-all cursor-pointer">Reset Filters</button>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {paginatedReservations.map((res, i) => (
                                        <motion.div
                                            key={res.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="group relative bg-white rounded-3xl p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all flex flex-col h-full cursor-pointer overflow-hidden"
                                            onClick={() => setSelectedDetail(res)}
                                        >
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4 mb-8 relative z-10">
                                                <div className="w-16 h-16 bg-slate-50 rounded-[1.2rem] flex flex-col items-center justify-center border border-accent-brown/5 group-hover:bg-brand/5 group-hover:border-brand/10 transition-colors shrink-0 shadow-inner">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-black group-hover:text-brand/40 transition-colors mb-0.5">
                                                        {new Date(res.date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </p>
                                                    <p className="text-2xl font-black text-accent-brown tracking-tighter leading-none group-hover:text-brand transition-colors">
                                                        {new Date(res.date).getDate()}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end text-right">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">HV-2026-{String(res.id).padStart(6, '0')}</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${STATUS_STYLES[res.status] || 'bg-slate-100 text-slate-500'}`}>
                                                        {res.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Body Focus */}
                                            <div className="flex-1 flex flex-col relative z-10 mb-8">
                                                <h3 className="text-2xl font-black text-accent-brown tracking-tighter leading-none mb-2">
                                                    {res.service}
                                                </h3>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <span className="text-[10px] font-bold text-black uppercase tracking-widest">For</span>
                                                    <span className="text-[10px] font-black tracking-widest uppercase text-brand bg-brand/10 px-2 py-0.5 rounded-md">{res.pet_name}</span>
                                                </div>
                                                
                                                <div className="flex flex-col gap-2 text-[10px] font-bold text-black uppercase tracking-[0.2em] mt-auto">
                                                    <span className="flex items-center gap-3">
                                                        <Clock className="w-3.5 h-3.5 text-brand shrink-0" /> <span className="truncate">{res.time} Arrival</span>
                                                    </span>
                                                    <span className="flex items-center gap-3 text-black">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{res.location || "Main Clinic"}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Stack (Bottom) */}
                                            <div className="border-t border-accent-brown/5 pt-6 flex items-center justify-between gap-4 mt-auto relative z-10">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1 leading-none">Total Value</p>
                                                    <p className="text-xl font-black italic text-accent-brown tracking-tighter leading-none">₱{res.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                </div>

                                                <div className="flex items-center gap-2">
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
                                                            className="h-10 px-4 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                                        >
                                                            {payNowLoading === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                                            Pay
                                                        </motion.button>
                                                    )}

                                                    {['Pending', 'Confirmed', 'Payment Pending'].includes(res.status) ? (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => { e.stopPropagation(); handleCancel(res.db_id); }}
                                                            disabled={cancellingId === res.db_id}
                                                            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm cursor-pointer"
                                                        >
                                                            {cancellingId === res.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-4 h-4" />}
                                                        </motion.button>
                                                    ) : res.status === 'Cancelled' ? (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05, rotate: 90 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteReservation(res.db_id); }}
                                                            className="w-10 h-10 bg-accent-brown text-white rounded-xl flex items-center justify-center hover:bg-black transition-all shadow-md shadow-accent-brown/20 cursor-pointer"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </motion.button>
                                                    ) : (
                                                        <motion.button
                                                            whileHover={{ x: 4 }}
                                                            className="p-2.5 bg-slate-50 text-black hover:text-brand rounded-xl border border-accent-brown/5 transition-all"
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
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-t border-accent-brown/5">
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black mb-1">Index Summary</p>
                                    <p className="text-[11px] font-black text-black uppercase tracking-widest">
                                        Showing <span className="text-accent-brown">{(currentPage - 1) * ITEMS_PER_PAGE + 1} – {Math.min(currentPage * ITEMS_PER_PAGE, filteredReservations.length)}</span> of {filteredReservations.length} records
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        whileHover={currentPage > 1 ? { scale: 1.05, border: '1px solid rgba(255,159,28,0.5)' } : {}}
                                        whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-black border border-accent-brown/5 hover:bg-white hover:text-brand transition-all disabled:opacity-30 disabled:hover:border-accent-brown/5 cursor-pointer"
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
                                                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'bg-white text-black border border-accent-brown/5 hover:bg-slate-50'}`}
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
                                        className="h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-black border border-accent-brown/5 hover:bg-white hover:text-brand transition-all disabled:opacity-30 disabled:hover:border-accent-brown/5 cursor-pointer"
                                    >
                                        Next
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>

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
                                className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-brand/10 flex flex-col md:flex-row max-h-[90vh] overflow-hidden relative"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none z-0" />

                                {/* Left Side: Informational Details */}
                                <div className="flex-1 p-8 md:p-12 overflow-y-auto no-scrollbar relative z-10 border-b md:border-b-0 md:border-r border-brand/5 space-y-10">
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-4xl font-black italic tracking-tighter text-brand-dark mb-1">Receipt Summary</h3>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black block">
                                                {selectedDetail.tracking_id || selectedDetail.id}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Patient Info */}
                                    <div className="space-y-4 border-t border-brand/5 pt-8">
                                        <span className="text-[11px] font-black uppercase text-black tracking-[0.3em] block mb-2">Patient Information</span>
                                        <div>
                                            <h4 className="font-black text-lg tracking-wider mb-0.5 text-accent-brown">{selectedDetail.pet_name}</h4>
                                            <p className="text-xs font-bold text-black tracking-widest truncate">{selectedDetail.pet_type} {selectedDetail.pet_breed ? `• ${selectedDetail.pet_breed}` : ''}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-brand/5 pt-8">
                                        {/* Status */}
                                        <div className="space-y-4">
                                            <span className="text-[11px] font-black uppercase text-black tracking-[0.3em] block mb-2">Current Status</span>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${STATUS_STYLES[selectedDetail.status] || 'bg-gray-100 text-gray-500'}`}>
                                                    {selectedDetail.status}
                                                </span>
                                                {selectedDetail.payment_status === 'paid' ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1 border border-emerald-100/50">
                                                        <CheckCircle className="w-3 h-3" /> Paid
                                                    </span>
                                                ) : selectedDetail.payment_status === 'unpaid' ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-red-50 text-red-500 border border-red-100/50">
                                                        Unpaid
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Visit */}
                                        <div className="space-y-4">
                                            <span className="text-[11px] font-black uppercase text-black tracking-[0.3em] block mb-2">Date & Time</span>
                                            <div>
                                                <h4 className="font-black text-[13px] tracking-wider text-accent-brown mb-1.5">{new Date(selectedDetail.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                                                <p className="text-[11px] font-bold text-black tracking-widest">{selectedDetail.time} Arrival</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {selectedDetail.location && (
                                    <div className="space-y-4 border-t border-brand/5 pt-8">
                                        <span className="text-[11px] font-black uppercase text-black tracking-[0.3em] block mb-2">Service Location</span>
                                        <div>
                                            <h4 className="font-black text-sm tracking-wider text-accent-brown leading-relaxed">{selectedDetail.location}</h4>
                                        </div>
                                    </div>
                                    )}
                                </div>

                                {/* Right Side: Checkout / Actions */}
                                <div className="w-full md:w-[380px] shrink-0 bg-slate-50 flex flex-col relative z-10">
                                    <div className="p-8 md:p-10 flex-1 overflow-y-auto no-scrollbar flex flex-col justify-between">
                                        <div className="flex justify-end mb-8 md:mb-0">
                                            <button onClick={() => setSelectedDetail(null)} className="w-10 h-10 flex items-center justify-center bg-white text-black hover:text-red-500 rounded-full transition-all cursor-pointer border border-accent-brown/5 hover:scale-110 hover:shadow-lg absolute top-8 right-8 md:relative md:top-0 md:right-0 z-20">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-10 mt-14 md:mt-0 flex-1">
                                            {/* Service & Price */}
                                            <div className="space-y-4">
                                                <span className="text-[11px] font-black uppercase text-black tracking-[0.3em] block">Your Service</span>
                                                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-brand/5 shadow-sm">
                                                    <div className="min-w-0 pr-4">
                                                        <h4 className="font-black text-sm tracking-wider text-accent-brown leading-snug">{selectedDetail.service}</h4>
                                                    </div>
                                                    <span className="font-black text-lg tabular-nums text-accent-brown shrink-0">₱{selectedDetail.total.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Payment Details */}
                                            <div className="space-y-2.5 px-1 py-4 border-t border-b border-brand/5">
                                                {selectedDetail.voucher_code && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Applied Voucher</span>
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-[6px]">{selectedDetail.voucher_code}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Payment Mode</span>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">{selectedDetail.payment_method || (selectedDetail.payment_status === 'paid' ? 'Online (PayMongo)' : 'Pay At Clinic (Cash/Card)')}</span>
                                                </div>
                                            </div>

                                            {/* Total Settlement */}
                                            <div>
                                                <p className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-2">Total Settlement</p>
                                                <div className="flex items-center gap-4">
                                                    <h2 className="text-5xl font-black tracking-tighter italic text-brand-dark leading-none">₱{selectedDetail.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                                                    {selectedDetail.payment_status === 'paid' ? <ShieldCheck className="w-10 h-10 text-emerald-400 shrink-0" /> : <ShieldCheck className="w-10 h-10 text-brand/10 shrink-0" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer actions */}
                                        <div className="pt-10 space-y-3 mt-auto">
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
                                                    className="w-full bg-blue-600 text-white py-4 rounded-[1rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 cursor-pointer disabled:opacity-60"
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
                                                    className="w-full bg-red-50 text-red-500 border border-red-100 py-4 rounded-[1rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-1"
                                                >
                                                    {cancellingId === selectedDetail.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                    Cancel Reservation
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
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
                                        <button onClick={() => setShowMethodSelector(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-black hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs font-bold text-black uppercase tracking-widest mb-8">Choose your preferred provider</p>

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
                                                    <p className="text-[10px] font-bold text-black uppercase tracking-tight">{m.sub}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent-brown transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    <p className="text-[10px] font-bold text-black uppercase tracking-widest leading-none">Secure Transaction</p>
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
