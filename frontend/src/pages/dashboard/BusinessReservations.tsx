import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, User, Scissors, CheckCircle,
    AlertCircle, Loader2, Plus, Edit2, Trash2, X,
    ClipboardList, Settings, Tag, Timer, ToggleLeft, ToggleRight, Check,
    ChevronLeft, ChevronRight, Award
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDropdown } from '../../components/CustomDropdown';

const API = 'http://localhost:8000';

const PREDEFINED_SERVICES = [
    "Veterinary Consultation",
    "Vaccination",
    "Deworming",
    "Flea & Tick Treatment",
    "Pet Grooming",
    "Nail Trimming",
    "Dental Cleaning",
    "Spay / Neuter",
    "Microchipping",
    "Pet Boarding",
    "Pet Daycare",
    "Surgery"
];

interface Reservation {
    id: string;
    db_id: number;
    customer_id: number;
    customer_name: string;
    business_id: number;
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

interface OperatingHour {
    id?: number;
    day_of_week: number;
    day_name: string;
    is_open: boolean;
    open_time: string;
    break_start: string | null;
    break_end: string | null;
    close_time: string;
}

interface SpecialDateHour {
    id?: number;
    specific_date: string;
    is_open: boolean;
    open_time: string;
    break_start: string | null;
    break_end: string | null;
    close_time: string;
}

interface Service {
    id: number;
    business_id: number;
    name: string;
    description: string | null;
    price: number;
    duration_minutes: number;
    is_active: boolean;
    loyalty_points: number;
    created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    'Pending':         { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400' },
    'Confirmed':       { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400' },
    'Ready for Pickup': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
    'Completed':       { bg: 'bg-gray-50',    text: 'text-gray-500',   dot: 'bg-gray-300' },
    'Cancelled':       { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400' },
};

const NEXT_STATUSES: Record<string, { label: string; value: string; color: string }[]> = {
    'Pending':   [{ label: 'Confirm', value: 'Confirmed', color: 'bg-blue-500 hover:bg-blue-600 text-white' }, { label: 'Cancel', value: 'Cancelled', color: 'bg-red-500 hover:bg-red-600 text-white' }],
    'Confirmed': [{ label: 'Mark Ready', value: 'Ready for Pickup', color: 'bg-green-500 hover:bg-green-600 text-white' }, { label: 'Cancel', value: 'Cancelled', color: 'bg-red-500 hover:bg-red-600 text-white' }],
    'Ready for Pickup': [{ label: 'Complete', value: 'Completed', color: 'bg-accent-brown hover:bg-black text-white' }],
    'Completed': [],
    'Cancelled': [],
};

const TIME_OPTIONS = ['07:00 AM','07:30 AM','08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM','07:30 PM','08:00 PM','09:00 PM'];

const EMPTY_SERVICE = { name: '', description: '', price: '', duration_minutes: '60', is_active: true, loyalty_points: '50' };

export default function BusinessReservations() {
    const [tab, setTab] = useState<'reservations' | 'hours' | 'special' | 'services'>('reservations');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [hours, setHours] = useState<OperatingHour[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [savingHours, setSavingHours] = useState(false);
    const [hoursSuccess, setHoursSuccess] = useState(false);
    const [filter, setFilter] = useState('All');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
    const [savingService, setSavingService] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Special Date Hours
    const [specialHours, setSpecialHours] = useState<SpecialDateHour[]>([]);
    const [selectedSpecialDate, setSelectedSpecialDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewDate, setViewDate] = useState(new Date());
    const [specialForm, setSpecialForm] = useState<SpecialDateHour>({
        specific_date: new Date().toISOString().split('T')[0],
        is_open: true,
        open_time: '09:00 AM',
        break_start: '12:00 PM',
        break_end: '01:00 PM',
        close_time: '06:00 PM'
    });
    const [savingSpecial, setSavingSpecial] = useState(false);

    const token = localStorage.getItem('hivet_token');
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [resRes, hoursRes, servicesRes, specialRes] = await Promise.all([
                fetch(`${API}/api/reservations`, { headers: authHeaders }),
                fetch(`${API}/api/business/operating-hours`, { headers: authHeaders }),
                fetch(`${API}/api/business/services`, { headers: authHeaders }),
                fetch(`${API}/api/business/special-hours`, { headers: authHeaders }),
            ]);
            if (resRes.ok) { const d = await resRes.json(); setReservations(d.reservations || []); }
            if (hoursRes.ok) { const d = await hoursRes.json(); setHours(d.hours || []); }
            if (servicesRes.ok) { const d = await servicesRes.json(); setServices(d || []); }
            if (specialRes.ok) { const d = await specialRes.json(); setSpecialHours(d || []); }
        } catch { showToast('Could not load data. Is the backend running?', 'error'); }
        finally { setLoading(false); }
    };

    const handleSaveSpecial = async () => {
        setSavingSpecial(true);
        try {
            const res = await fetch(`${API}/api/business/special-hours`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ ...specialForm, specific_date: selectedSpecialDate })
            });
            if (!res.ok) throw new Error();
            const saved = await res.json();
            setSpecialHours(prev => {
                const existing = prev.findIndex(s => s.specific_date === saved.specific_date);
                if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = saved;
                    return next;
                }
                return [...prev, saved].sort((a,b) => a.specific_date.localeCompare(b.specific_date));
            });
            showToast(`Hours saved for ${selectedSpecialDate}`);
        } catch { showToast('Failed to save special hours.', 'error'); }
        finally { setSavingSpecial(false); }
    };

    const handleDeleteSpecial = async (id: number) => {
        try {
            const res = await fetch(`${API}/api/business/special-hours/${id}`, { method: 'DELETE', headers: authHeaders });
            if (!res.ok) throw new Error();
            setSpecialHours(prev => prev.filter(s => s.id !== id));
            showToast('Override removed.');
        } catch { showToast('Failed to delete override.', 'error'); }
    };

    useEffect(() => { fetchAll(); }, []);

    const updateStatus = async (dbId: number, status: string) => {
        setUpdatingId(dbId);
        try {
            const res = await fetch(`${API}/api/reservations/${dbId}/status`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setReservations(prev => prev.map(r => r.db_id === dbId ? { ...r, ...data.reservation } : r));
            showToast(`Status updated to "${status}"`);
        } catch { showToast('Failed to update status.', 'error'); }
        finally { setUpdatingId(null); }
    };

    const saveHours = async () => {
        setSavingHours(true);
        try {
            const res = await fetch(`${API}/api/business/operating-hours`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ hours: hours.map(h => ({ day_of_week: h.day_of_week, is_open: h.is_open, open_time: h.open_time, break_start: h.break_start, break_end: h.break_end, close_time: h.close_time })) }) });
            if (!res.ok) throw new Error();
            showToast('Operating hours saved!');
            setHoursSuccess(true);
            setTimeout(() => setHoursSuccess(false), 3000);
        } catch { showToast('Failed to save hours.', 'error'); }
        finally { setSavingHours(false); }
    };

    const openServiceModal = (service?: Service) => {
        if (service) { 
            setEditingService(service); 
            setServiceForm({ 
                name: service.name, 
                description: service.description || '', 
                price: String(service.price), 
                duration_minutes: String(service.duration_minutes), 
                is_active: service.is_active,
                loyalty_points: String(service.loyalty_points || 0)
            }); 
        }
        else { 
            setEditingService(null); 
            setServiceForm(EMPTY_SERVICE); 
        }
        setShowServiceModal(true);
    };

    const handleSaveService = async () => {
        if (!serviceForm.name.trim() || !serviceForm.price) { showToast('Name and price are required.', 'error'); return; }
        setSavingService(true);
        const payload = { 
            name: serviceForm.name.trim(), 
            description: serviceForm.description || null, 
            price: parseFloat(serviceForm.price) || 0, 
            duration_minutes: parseInt(serviceForm.duration_minutes) || 60, 
            is_active: serviceForm.is_active,
            loyalty_points: parseInt(serviceForm.loyalty_points) || 0
        };
        try {
            let res;
            if (editingService) {
                res = await fetch(`${API}/api/business/services/${editingService.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(payload) });
            } else {
                res = await fetch(`${API}/api/business/services`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
            }
            if (!res.ok) throw new Error();
            const saved: Service = await res.json();
            if (editingService) setServices(prev => prev.map(s => s.id === saved.id ? saved : s));
            else setServices(prev => [saved, ...prev]);
            setShowServiceModal(false);
            showToast(editingService ? 'Service updated!' : 'Service created!');
        } catch { showToast('Failed to save service.', 'error'); }
        finally { setSavingService(false); }
    };

    const handleDeleteService = async (id: number) => {
        setDeletingId(id);
        try {
            const res = await fetch(`${API}/api/business/services/${id}`, { method: 'DELETE', headers: authHeaders });
            if (!res.ok) throw new Error();
            setServices(prev => prev.filter(s => s.id !== id));
            showToast('Service deleted.');
        } catch { showToast('Failed to delete service.', 'error'); }
        finally { setDeletingId(null); }
    };

    const filtered = filter === 'All' ? reservations : reservations.filter(r => r.status === filter);
    const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Ready for Pickup', 'Completed', 'Cancelled'];
    const pending = reservations.filter(r => r.status === 'Pending').length;
    const confirmed = reservations.filter(r => r.status === 'Confirmed').length;

    return (
        <DashboardLayout title="Reservations">
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

                {/* Tab Bar */}
                <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-xl shadow-accent-brown/5 border border-white w-fit">
                    {[
                        { id: 'reservations', label: 'Reservations', icon: ClipboardList },
                        { id: 'hours', label: 'Operating Hours', icon: Clock },
                        { id: 'special', label: 'Special Dates', icon: Calendar },
                        { id: 'services', label: 'Services', icon: Tag },
                    ].map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === id ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                            {id === 'reservations' && (pending + confirmed) > 0 && (
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${tab === id ? 'bg-white text-brand-dark' : 'bg-brand-dark text-white'}`}>{pending + confirmed}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── RESERVATIONS TAB ── */}
                {tab === 'reservations' && (
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total', value: reservations.length, color: 'bg-accent-peach/30 text-accent-brown' },
                                { label: 'Pending', value: pending, color: 'bg-yellow-50 text-yellow-700' },
                                { label: 'Confirmed', value: confirmed, color: 'bg-blue-50 text-blue-700' },
                                { label: 'Completed', value: reservations.filter(r => r.status === 'Completed').length, color: 'bg-green-50 text-green-700' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className={`rounded-2xl p-5 ${color} flex flex-col gap-1`}>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
                                    <span className="text-3xl font-black tracking-tight">{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {STATUS_FILTERS.map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' : 'bg-white text-accent-brown/50 hover:bg-accent-peach/30'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Reservation List */}
                        {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand-dark animate-spin" /></div>}
                        {!loading && filtered.length === 0 && (
                            <div className="bg-white rounded-[2rem] p-16 flex flex-col items-center gap-4 text-center shadow-xl shadow-accent-brown/5">
                                <div className="w-20 h-20 bg-accent-peach/30 rounded-full flex items-center justify-center"><Calendar className="w-10 h-10 text-accent-brown/30" /></div>
                                <div><h3 className="font-black text-accent-brown text-xl tracking-tight">No reservations found</h3><p className="text-accent-brown/50 text-sm mt-1">Bookings from customers will appear here.</p></div>
                            </div>
                        )}
                        <div className="space-y-4">
                            {filtered.map((r, i) => {
                                const style = STATUS_STYLES[r.status] || STATUS_STYLES['Pending'];
                                const actions = NEXT_STATUSES[r.status] || [];
                                return (
                                    <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                                                    <Scissors className={`w-5 h-5 ${style.text}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{r.id}</span>
                                                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                            {r.status}
                                                        </span>
                                                    </div>
                                                    <p className="font-black text-accent-brown text-base mb-2">{r.service} — <span className="text-brand">{r.pet_name}</span></p>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-accent-brown/50">
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {r.date}</span>
                                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {r.time}</span>
                                                        {r.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {r.location}</span>}
                                                        <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {r.customer_name}</span>
                                                    </div>
                                                    {r.notes && <p className="mt-2 text-xs text-accent-brown/60 italic bg-accent-peach/20 px-3 py-1.5 rounded-lg">"{r.notes}"</p>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3 shrink-0">
                                                <p className="font-black text-accent-brown text-xl">₱{r.total.toFixed(2)}</p>
                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                    {actions.map(action => {
                                                        let isActionDisabled = updatingId === r.db_id;
                                                        if (action.value === 'Ready for Pickup') {
                                                            const match = services.find(s => s.name === r.service);
                                                            const duration = match ? match.duration_minutes || 60 : 60;
                                                            const [timeStr, ampm] = r.time.split(' ');
                                                            const [hourStr, minStr] = timeStr.split(':');
                                                            let hour = parseInt(hourStr);
                                                            if (ampm === 'PM' && hour !== 12) hour += 12;
                                                            if (ampm === 'AM' && hour === 12) hour = 0;
                                                            
                                                            const appointmentEnd = new Date(r.date);
                                                            appointmentEnd.setHours(hour, parseInt(minStr) + duration, 0, 0);
                                                            const now = new Date();
                                                            if (now < appointmentEnd) isActionDisabled = true;
                                                        }
                                                        
                                                        return (
                                                            <button key={action.value}
                                                                onClick={() => updateStatus(r.db_id, action.value)}
                                                                disabled={isActionDisabled}
                                                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActionDisabled ? 'opacity-50 cursor-not-allowed filter grayscale' : ''} ${action.color}`}>
                                                                {updatingId === r.db_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                                {action.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── OPERATING HOURS TAB ── */}
                {tab === 'hours' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                            <div className="p-6 sm:p-8 border-b border-accent-brown/5 bg-accent-peach/5">
                                <h3 className="font-black text-accent-brown text-xl tracking-tight">Weekly Schedule</h3>
                                <p className="text-accent-brown/50 text-sm mt-1">Set your clinic's open, break, and closing times for each day.</p>
                            </div>
                            {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand-dark animate-spin" /></div> : (
                                <div className="p-4 sm:p-6 space-y-3">
                                    {hours.map((h, i) => (
                                        <motion.div key={h.day_of_week} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                            className={`rounded-2xl border-2 transition-all ${h.is_open ? 'border-brand/20 bg-white' : 'border-accent-brown/5 bg-accent-peach/10'}`}>
                                            <div className="flex items-center gap-4 p-4">
                                                <button onClick={() => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, is_open: !d.is_open } : d))}
                                                    className="shrink-0">
                                                    {h.is_open
                                                        ? <ToggleRight className="w-8 h-8 text-brand-dark" />
                                                        : <ToggleLeft className="w-8 h-8 text-accent-brown/30" />}
                                                </button>
                                                <div className="w-28 shrink-0">
                                                    <p className={`font-black text-sm ${h.is_open ? 'text-accent-brown' : 'text-accent-brown/30'}`}>{h.day_name}</p>
                                                    {!h.is_open && <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-widest">Closed</p>}
                                                </div>
                                                {h.is_open && (
                                                    <div className="flex flex-wrap items-center gap-3 flex-1">
                                                        {/* Open */}
                                                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Open</label>
                                                            <CustomDropdown
                                                                value={h.open_time || '09:00 AM'}
                                                                options={TIME_OPTIONS}
                                                                onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, open_time: val } : d))}
                                                            />
                                                        </div>
                                                        <span className="font-black text-accent-brown/30 text-xs mt-5">→</span>
                                                        {/* Break Start */}
                                                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Break Start</label>
                                                            <CustomDropdown
                                                                value={h.break_start || 'No break'}
                                                                options={['No break', ...TIME_OPTIONS]}
                                                                onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, break_start: val === 'No break' ? null : val, break_end: val === 'No break' ? null : d.break_end } : d))}
                                                            />
                                                        </div>
                                                        {h.break_start && <>
                                                            <span className="font-black text-accent-brown/30 text-xs mt-5">–</span>
                                                            <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Break End</label>
                                                                <CustomDropdown
                                                                    value={h.break_end || '—'}
                                                                    options={['—', ...TIME_OPTIONS]}
                                                                    onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, break_end: val === '—' ? null : val } : d))}
                                                                />
                                                            </div>
                                                        </>}
                                                        <span className="font-black text-accent-brown/30 text-xs mt-5">→</span>
                                                        {/* Close */}
                                                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Close</label>
                                                            <CustomDropdown
                                                                value={h.close_time || '06:00 PM'}
                                                                options={TIME_OPTIONS}
                                                                onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, close_time: val } : d))}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                            <div className="p-6 border-t border-accent-brown/5 flex justify-end">
                                <button onClick={saveHours} disabled={savingHours}
                                    className="flex items-center gap-2.5 bg-brand-dark text-white px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-brand-dark/20 disabled:opacity-50">
                                    {savingHours ? <Loader2 className="w-4 h-4 animate-spin" /> : hoursSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                    {hoursSuccess ? 'Saved!' : 'Save Schedule'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SPECIAL DATES TAB ── */}
                {tab === 'special' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-accent-brown text-xl tracking-tight">Advanced Overrides</h3>
                                <p className="text-accent-brown/50 text-sm">Manage holidays, breaks, and special operating hours.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                            <div className="p-6 sm:p-8 border-b border-accent-brown/5 bg-accent-peach/5">
                                <h3 className="font-black text-accent-brown text-xl tracking-tight">Special Date Overrides</h3>
                                <p className="text-accent-brown/50 text-sm mt-1">Set custom hours or mark specific dates as closed by selecting them on the calendar.</p>
                            </div>

                            <div className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Left: Inline Calendar */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex flex-col">
                                                <h4 className="text-2xl font-black text-accent-brown tracking-tighter leading-tight">
                                                    {new Date(viewDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                </h4>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Select a date to manage</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                                                    className="w-10 h-10 rounded-full border border-accent-brown/10 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all text-accent-brown/40 hover:text-accent-brown active:scale-90">
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                                    className="w-10 h-10 rounded-full border border-accent-brown/10 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all text-accent-brown/40 hover:text-accent-brown active:scale-90">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-accent-peach/5 border border-accent-brown/5 rounded-[2.5rem] p-6 sm:p-8">
                                            <div className="grid grid-cols-7 gap-1 text-center mb-6">
                                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                                    <span key={d} className="text-[9px] font-black text-brand tracking-widest opacity-30">{d}</span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-7 gap-1">
                                                {/* Empty spaces for previous month */}
                                                {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="aspect-square" />
                                                ))}
                                                
                                                {/* Days of the month */}
                                                {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                                    const d = i + 1;
                                                    const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toLocaleDateString('en-CA');
                                                    const isSelected = selectedSpecialDate === dateStr;
                                                    const hasOverride = specialHours.find(sh => sh.specific_date === dateStr);
                                                    const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

                                                    return (
                                                        <button key={d} onClick={() => {
                                                            setSelectedSpecialDate(dateStr);
                                                            const existing = specialHours.find(sh => sh.specific_date === dateStr);
                                                            if (existing) {
                                                                setSpecialForm({ ...existing });
                                                            } else {
                                                                setSpecialForm({
                                                                    specific_date: dateStr,
                                                                    is_open: true,
                                                                    open_time: '09:00 AM',
                                                                    break_start: '12:00 PM',
                                                                    break_end: '01:00 PM',
                                                                    close_time: '06:00 PM'
                                                                });
                                                            }
                                                        }}
                                                        className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl text-xs font-black transition-all group ${
                                                            isSelected 
                                                            ? 'bg-brand text-white shadow-xl shadow-brand/20 scale-110 z-10' 
                                                            : isToday 
                                                            ? 'bg-brand-dark/5 text-brand-dark' 
                                                            : 'text-accent-brown/60 hover:bg-white hover:shadow-md'
                                                        }`}>
                                                            {d}
                                                            {hasOverride && !isSelected && (
                                                                <div className={`absolute bottom-2 w-1 h-1 rounded-full ${hasOverride.is_open ? 'bg-brand' : 'bg-red-400'}`} />
                                                            )}
                                                            {isSelected && (
                                                                <motion.div layoutId="activeDay" className="absolute bottom-1.5 w-1 h-1 bg-white rounded-full" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 px-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Custom Hours</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Special Closure</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-dark/20" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Override Form */}
                                    <div className="space-y-6">
                                        <div className="bg-accent-peach/5 border border-accent-brown/10 rounded-[2.5rem] p-8 space-y-8">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Managing date</p>
                                                    <h5 className="text-xl font-black text-accent-brown tracking-tight">
                                                        {new Date(selectedSpecialDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </h5>
                                                </div>
                                                {specialHours.find(sh => sh.specific_date === selectedSpecialDate) && (
                                                    <button onClick={() => {
                                                        const id = specialHours.find(sh => sh.specific_date === selectedSpecialDate)?.id;
                                                        if (id) handleDeleteSpecial(id);
                                                    }}
                                                    className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-6">
                                                {/* Toggle */}
                                                <div className="flex items-center justify-between bg-white p-5 rounded-[2rem] border border-accent-brown/5 shadow-sm">
                                                    <div>
                                                        <p className="font-black text-accent-brown text-sm">Open on this date?</p>
                                                        <p className="text-[10px] text-accent-brown/40 uppercase font-black tracking-widest mt-0.5">Toggle to mark as closed</p>
                                                    </div>
                                                    <button onClick={() => setSpecialForm(prev => ({ ...prev, is_open: !prev.is_open }))}>
                                                        {specialForm.is_open ? <ToggleRight className="w-10 h-10 text-brand-dark" /> : <ToggleLeft className="w-10 h-10 text-accent-brown/20" />}
                                                    </button>
                                                </div>

                                                {/* Time Dropdowns */}
                                                <AnimatePresence>
                                                    {specialForm.is_open && (
                                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                                            className="grid grid-cols-2 gap-4">
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Open</label>
                                                                <CustomDropdown value={specialForm.open_time} options={TIME_OPTIONS} onChange={v => setSpecialForm(p => ({ ...p, open_time: v }))} />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Close</label>
                                                                <CustomDropdown value={specialForm.close_time} options={TIME_OPTIONS} onChange={v => setSpecialForm(p => ({ ...p, close_time: v }))} />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Break Start</label>
                                                                <CustomDropdown value={specialForm.break_start || 'No break'} options={['No break', ...TIME_OPTIONS]} onChange={v => setSpecialForm(p => ({ ...p, break_start: v === 'No break' ? null : v }))} />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Break End</label>
                                                                <CustomDropdown value={specialForm.break_end || '—'} options={['—', ...TIME_OPTIONS]} onChange={v => setSpecialForm(p => ({ ...p, break_end: v === '—' ? null : v }))} />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <button onClick={handleSaveSpecial} disabled={savingSpecial}
                                                    className="w-full h-16 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-dark/20 disabled:opacity-50 mt-4">
                                                    {savingSpecial ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                                    Apply Special Hours
                                                </button>
                                            </div>
                                        </div>

                                        {/* Existing Overrides Quick List */}
                                        {specialHours.length > 0 && (
                                            <div className="space-y-3">
                                                <h6 className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Quick Overview</h6>
                                                <div className="flex flex-wrap gap-2">
                                                    {specialHours.slice(0, 5).map(sh => (
                                                        <button key={sh.id} onClick={() => {
                                                            setSelectedSpecialDate(sh.specific_date);
                                                            setSpecialForm({ ...sh });
                                                            setViewDate(new Date(sh.specific_date));
                                                        }}
                                                        className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-tighter transition-all ${
                                                            selectedSpecialDate === sh.specific_date 
                                                            ? 'bg-brand text-white border-brand' 
                                                            : 'bg-white text-accent-brown/60 border-accent-brown/10 hover:border-brand/40'
                                                        }`}>
                                                            {new Date(sh.specific_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            {!sh.is_open && <span className="ml-1.5 opacity-40">Closed</span>}
                                                        </button>
                                                    ))}
                                                    {specialHours.length > 5 && (
                                                        <div className="px-3 py-2 rounded-full bg-accent-peach/10 text-accent-brown/40 text-[10px] font-black uppercase">+{specialHours.length - 5} more</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SERVICES TAB ── */}
                {tab === 'services' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-accent-brown text-xl tracking-tight">{services.length} service{services.length !== 1 ? 's' : ''} offered</h3>
                                <p className="text-accent-brown/50 text-sm">Customers will see these when booking reservations.</p>
                            </div>
                            <button onClick={() => openServiceModal()}
                                className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-brand-dark/20">
                                <Plus className="w-4 h-4" /> Add Service
                            </button>
                        </div>

                        {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand-dark animate-spin" /></div>}
                        {!loading && services.length === 0 && (
                            <div className="bg-white rounded-[2rem] p-16 flex flex-col items-center gap-4 text-center shadow-xl shadow-accent-brown/5">
                                <div className="w-20 h-20 bg-accent-peach/30 rounded-full flex items-center justify-center"><Tag className="w-10 h-10 text-accent-brown/30" /></div>
                                <div><h3 className="font-black text-accent-brown text-xl">No services yet</h3><p className="text-accent-brown/50 text-sm mt-1">Add your first service to allow customers to book.</p></div>
                                <button onClick={() => openServiceModal()} className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors">
                                    <Plus className="w-4 h-4" /> Add Service
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {services.map((s, i) => (
                                <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                    className={`bg-white rounded-2xl p-5 shadow-xl shadow-accent-brown/5 border-2 transition-all group relative overflow-hidden ${s.is_active ? 'border-white hover:border-brand/20' : 'border-accent-brown/5 opacity-60'}`}>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button onClick={() => openServiceModal(s)} className="w-8 h-8 bg-accent-peach/30 hover:bg-brand hover:text-white text-accent-brown/60 rounded-lg flex items-center justify-center transition-all">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteService(s.id)} disabled={deletingId === s.id}
                                            className="w-8 h-8 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-lg flex items-center justify-center transition-all disabled:opacity-50">
                                            {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                                        <Scissors className="w-5 h-5 text-brand-dark" />
                                    </div>
                                    <h4 className="font-black text-accent-brown text-base mb-1 leading-tight pr-20">{s.name}</h4>
                                    {s.description && <p className="text-xs text-accent-brown/50 mb-3 line-clamp-2">{s.description}</p>}
                                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-accent-brown/5">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30">Price</span>
                                            <span className="font-black text-accent-brown text-lg">₱{s.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30">Duration</span>
                                            <span className="font-bold text-accent-brown/60 text-sm flex items-center gap-1"><Timer className="w-3 h-3" />{s.duration_minutes} min</span>
                                        </div>
                                        <div className="ml-auto">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${s.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {s.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── SERVICE MODAL ── */}
                <AnimatePresence>
                    {showServiceModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowServiceModal(false)} className="fixed inset-0 bg-accent-brown/20 backdrop-blur-sm z-50" />
                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 40 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between p-6 border-b border-accent-brown/5 bg-accent-peach/5">
                                        <div>
                                            <h2 className="text-xl font-black text-accent-brown tracking-tight">{editingService ? 'Edit Service' : 'New Service'}</h2>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mt-0.5">{editingService ? 'Update service details' : 'Add to your service menu'}</p>
                                        </div>
                                        <button onClick={() => setShowServiceModal(false)} className="w-10 h-10 bg-white hover:bg-red-50 text-accent-brown/40 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors shadow-sm">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* Left Column: Details */}
                                            <div className="space-y-4">
                                                <div>
                                                    <CustomDropdown
                                                        label="Service Name *"
                                                        value={serviceForm.name}
                                                        options={PREDEFINED_SERVICES.map(s => ({ label: s, value: s }))}
                                                        onChange={(val) => setServiceForm(f => ({ ...f, name: val.toString() }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Description</label>
                                                    <textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..."
                                                        className="w-full px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-sm font-medium text-accent-brown outline-none resize-none h-[116px] placeholder:text-accent-brown/30" />
                                                </div>
                                            </div>

                                            {/* Right Column: Pricing & Setup */}
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Price (₱) *</label>
                                                        <input type="number" min="0" step="0.01" value={serviceForm.price} onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00"
                                                            className="w-full px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-sm font-bold text-accent-brown outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block">Duration (min)</label>
                                                        <input type="number" min="15" step="15" value={serviceForm.duration_minutes} onChange={e => setServiceForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                                            className="w-full px-4 py-3 bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 rounded-xl text-sm font-bold text-accent-brown outline-none" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#ea580c] mb-1.5 block flex items-center gap-2">
                                                        <Award className="w-3 h-3" />
                                                        Loyalty Points Awarded
                                                    </label>
                                                    <input type="number" min="0" value={serviceForm.loyalty_points} onChange={e => setServiceForm(f => ({ ...f, loyalty_points: e.target.value }))} placeholder="50"
                                                        className="w-full px-4 py-3 bg-[#ea580c]/5 border-2 border-[#ea580c]/20 focus:border-[#ea580c] rounded-xl text-sm font-bold text-accent-brown outline-none transition-all" />
                                                    <p className="text-[8px] font-bold text-accent-brown/30 mt-2 pl-1">Points customers earn when this service is completed.</p>
                                                </div>
                                                
                                                <div className="flex items-center justify-between p-4 bg-accent-peach/10 rounded-xl mt-4">
                                                    <div>
                                                        <p className="font-black text-sm text-accent-brown">Active Status</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-brown/50 mt-0.5">{serviceForm.is_active ? 'Visible to customers' : 'Hidden from customers'}</p>
                                                    </div>
                                                    <button onClick={() => setServiceForm(f => ({ ...f, is_active: !f.is_active }))} className="shrink-0 transition-transform active:scale-90">
                                                        {serviceForm.is_active ? <ToggleRight className="w-8 h-8 text-brand-dark" /> : <ToggleLeft className="w-8 h-8 text-accent-brown/30" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-accent-brown/5 flex gap-3 bg-gray-50/50">
                                        <button onClick={() => setShowServiceModal(false)} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-accent-brown/50 bg-accent-peach/20 hover:bg-accent-peach/40 transition-colors">Cancel</button>
                                        <button onClick={handleSaveService} disabled={savingService || !serviceForm.name || !serviceForm.price}
                                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[#ea580c] flex-shrink-0 text-white hover:bg-[#c2410c] hover:text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]">
                                            {savingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            {editingService ? 'Update Service' : 'Add Service'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
