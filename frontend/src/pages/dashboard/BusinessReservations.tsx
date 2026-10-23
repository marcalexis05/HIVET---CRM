import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, User, Scissors, CheckCircle,
    AlertCircle, Loader2, Plus, Edit2, Trash2, X, XCircle,
    ClipboardList, Settings, Tag, Timer, ToggleLeft, ToggleRight, Check,
    ChevronLeft, ChevronRight, Award, Package, Archive, Syringe, Activity, Stethoscope
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { CustomDropdown } from '../../components/CustomDropdown';
import BranchSelector from '../../components/BranchSelector';
import { CLINIC_TEXT } from '../../constants/clinicWording';
import { formatReviewId, getReviewIdAriaLabel } from '../../utils/textFormatters';
import { 
    validateDay, 
    validateWeeklySchedule, 
    getScheduleDropdownOptions 
} from '../../utils/scheduleValidation';

const API = 'http://localhost:8000';

const SERVICE_CATEGORIES: Record<string, string[]> = {
    "Consultation": [
        "General Veterinary Consultation",
        "Emergency Consultation",
        "Specialist Consultation",
        "Teleconsultation",
        "Follow-up Consultation",
        "Second Opinion Consultation",
    ],
    "Vaccination": [
        "Vaccination - Core (Dogs)",
        "Vaccination - Core (Cats)",
        "Vaccination - Rabies",
        "Vaccination - Bordetella",
        "Vaccination - Leptospirosis",
        "Vaccination - Distemper",
        "Vaccination - Parvovirus",
        "Vaccination - Feline Leukemia",
        "Vaccination - Adenovirus",
        "Vaccination - Parainfluenza",
    ],
    "Preventive Care": [
        "Deworming",
        "Flea & Tick Treatment",
        "Heartworm Prevention",
        "Flea & Tick Prevention (Topical)",
        "Flea & Tick Prevention (Oral)",
        "Microchipping",
        "Parasite Prevention",
    ],
    "Wellness Exam": [
        "Annual Wellness Exam",
        "Senior Wellness Exam",
        "Puppy Wellness Package",
        "Kitten Wellness Package",
        "Pre-Surgical Health Exam",
        "Travel Health Certificate Exam",
    ],
    "Grooming": [
        "Full Grooming (Bath + Haircut)",
        "Bath & Blow Dry",
        "Nail Trimming",
        "Ear Cleaning",
        "Anal Gland Expression",
        "Teeth Brushing",
        "Haircut & Styling",
        "De-shedding Treatment",
        "Flea Bath",
        "Paw Treatment",
        "Eye Cleaning",
    ],
    "Dental Care": [
        "Dental Cleaning (Scaling & Polishing)",
        "Dental Extraction",
        "Dental X-Ray",
        "Oral Exam & Consultation",
        "Periodontal Treatment",
        "Teeth Brushing Session",
    ],
    "Diagnostics & Imaging": [
        "Blood Chemistry Panel",
        "Complete Blood Count (CBC)",
        "Urinalysis",
        "Fecal Exam",
        "Skin Scraping & Cytology",
        "X-Ray (Radiography)",
        "Ultrasound",
        "Echocardiogram (ECG/EKG)",
        "Allergy Testing",
        "Thyroid Panel",
        "FELV / FIV Test",
        "Parvovirus Test",
        "Distemper Test",
        "Heartworm Test",
        "Histopathology / Biopsy",
    ],
    "Surgery": [
        "Spay (Female Sterilization)",
        "Neuter (Male Sterilization)",
        "Tumor / Mass Removal",
        "Wound Repair & Suturing",
        "Orthopedic Surgery",
        "Eye Surgery",
        "Ear Surgery",
        "C-Section (Cesarian Section)",
        "Foreign Body Removal",
        "Bladder Stone Removal",
        "Hernia Repair",
        "Amputation",
    ],
    "Hospitalization": [
        "Pet Boarding",
        "Pet Daycare",
        "Hospitalization (Day Rate)",
        "ICU Care",
        "Post-Surgery Recovery Care",
        "IV Fluid Therapy",
        "Oxygen Therapy",
        "Kidney Dialysis Support",
    ],
    "Therapy & Rehabilitation": [
        "Physical Therapy",
        "Hydrotherapy",
        "Laser Therapy",
        "Acupuncture",
        "Pain Management",
        "Post-Surgery Rehabilitation",
    ],
    "Other Services": [
        "Euthanasia & Aftercare",
        "Cremation Coordination",
        "Pet Travel Health Certificate",
        "Nutritional Counseling",
        "Behavioral Consultation",
        "Pregnancy Monitoring",
        "Whelping Assistance",
        "Microchip Registration",
    ],
};



interface Reservation {
    id: string;
    db_id: number;
    customer_id: number;
    customer_name: string;
    business_id: number;
    branch_id: number | null;
    pet_name: string;
    pet_type: string;
    pet_breed?: string;
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
    is_package: boolean;
    package_items_json: string | null;
    created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    'Pending': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
    'Confirmed': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    'Ready for Pickup': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Cancelled': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
};

const NEXT_STATUSES: Record<string, { label: string; value: string; color: string; icon: any }[]> = {
    'Pending': [
        { label: 'Confirm', value: 'Confirmed', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: CheckCircle },
        { label: 'Cancel', value: 'Cancelled', color: 'bg-red-500 hover:bg-red-600 text-white', icon: X }
    ],
    'Confirmed': [
        { label: 'Mark Ready', value: 'Ready for Pickup', color: 'bg-green-500 hover:bg-green-600 text-white', icon: Package },
        { label: 'Cancel', value: 'Cancelled', color: 'bg-red-500 hover:bg-red-600 text-white', icon: X }
    ],
    'Ready for Pickup': [
        { label: 'Complete', value: 'Completed', color: 'bg-accent-brown hover:bg-black text-white', icon: Award }
    ],
    'Completed': [],
    'Cancelled': [],
};

const TIME_OPTIONS = ['07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '09:00 PM'];

const EMPTY_SERVICE = {
    name: '',
    description: '',
    price: '',
    duration_minutes: '60',
    is_active: true,
    loyalty_points: '50',
    is_package: false,
    package_items_json: null as string | null
};

export default function BusinessReservations() {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [tab, setTab] = useState<'reservations' | 'hours' | 'special' | 'services'>('reservations');
    const [branchId, setBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (saved === 'all') return null;
        return saved ? parseInt(saved) : null;
    });
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [hours, setHours] = useState<OperatingHour[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [savingHours, setSavingHours] = useState(false);
    const [hoursSuccess, setHoursSuccess] = useState(false);
    const [filter, setFilter] = useState('All');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showServiceEditor, setShowServiceEditor] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
    const [savingService, setSavingService] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [showServicePickerModal, setShowServicePickerModal] = useState(false);
    const [serviceCategory, setServiceCategory] = useState<string>('');
    const [selectionCategory, setSelectionCategory] = useState<string>('');
    const [servicesPage, setServicesPage] = useState(1);
    const [reservationsPage, setReservationsPage] = useState(1);
    const SERVICES_PER_PAGE = 6;
    const RESERVATIONS_PER_PAGE = 6;

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
            const query = branchId ? `?branch_id=${branchId}` : '';
            const [resRes, hoursRes, servicesRes, specialRes] = await Promise.all([
                fetch(`${API}/api/reservations${query}`, { headers: authHeaders }),
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
                return [...prev, saved].sort((a, b) => a.specific_date.localeCompare(b.specific_date));
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
            showToast('Special day removed.');
        } catch { showToast('Failed to delete special day.', 'error'); }
    };

    useEffect(() => { fetchAll(); }, [branchId]);

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

    const [hasAttemptedSaveHours, setHasAttemptedSaveHours] = useState(false);
    const [showAllClosedConfirm, setShowAllClosedConfirm] = useState(false);

    // Live validation for weekly schedule
    const scheduleValidation = validateWeeklySchedule(hours);
    const hasScheduleErrors = !scheduleValidation.isValid;

    const scrollToFirstError = (invalidDaysList = scheduleValidation.invalidDays) => {
        if (!invalidDaysList || invalidDaysList.length === 0) return;
        const firstDay = invalidDaysList[0];
        const errors = scheduleValidation.dayResults[firstDay.day_of_week]?.errors || {};
        const errorKeys = Object.keys(errors) as (keyof typeof errors)[];
        const firstKey = errorKeys[0];
        const fieldId = `schedule-field-${firstDay.day_of_week}-${firstKey}`;
        const el = document.getElementById(fieldId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = el.querySelector('button, input, [tabindex="0"]') as HTMLElement | null;
            focusable?.focus();
        } else {
            const row = document.getElementById(`schedule-day-row-${firstDay.day_of_week}`);
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleSaveHours = () => {
        setHasAttemptedSaveHours(true);
        const validation = validateWeeklySchedule(hours);
        if (!validation.isValid) {
            scrollToFirstError(validation.invalidDays);
            showToast('Fix invalid schedule days before saving', 'error');
            return;
        }
        if (validation.allDaysClosed) {
            setShowAllClosedConfirm(true);
            return;
        }
        saveHours();
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
                loyalty_points: String(service.loyalty_points || 0),
                is_package: service.is_package || false,
                package_items_json: service.package_items_json || null
            });
            // Pre-select category when editing
            const detectedCategory = Object.keys(SERVICE_CATEGORIES).find(cat =>
                SERVICE_CATEGORIES[cat].includes(service.name)
            ) || '';
            setServiceCategory(detectedCategory);
        }
        else {
            setEditingService(null);
            setServiceForm(EMPTY_SERVICE);
            setServiceCategory('');
        }
        setShowServiceEditor(true);
        setShowSelectionModal(false);
        setShowServicePickerModal(false);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlTab = params.get('tab');
        if (urlTab && ['reservations', 'hours', 'special', 'services'].includes(urlTab)) {
            setTab(urlTab as any);
        }
        
        const action = params.get('action');
        if (action === 'launch' && urlTab === 'services') {
            openServiceModal();
            // Clear the action so it doesn't trigger on every re-render
            navigate('/dashboard/business/reservations?tab=services', { replace: true });
        }
    }, [location.search, navigate]);

    const togglePackageItem = (name: string) => {
        const current = serviceForm.package_items_json ? JSON.parse(serviceForm.package_items_json) : [];
        let next;
        if (current.includes(name)) {
            next = current.filter((n: string) => n !== name);
        } else {
            next = [...current, name];
        }

        // Auto-calculate totals by matching names against existing services
        const selectedServices = next.map((n: string) => services.find(s => s.name === n)).filter(Boolean);
        const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0);
        const totalDuration = selectedServices.reduce((sum: number, s: any) => sum + s.duration_minutes, 0);
        const totalPoints = selectedServices.reduce((sum: number, s: any) => sum + s.loyalty_points, 0);

        setServiceForm(f => ({
            ...f,
            package_items_json: JSON.stringify(next),
            price: next.length > 0 ? String(totalPrice) : f.price,
            duration_minutes: next.length > 0 ? String(totalDuration) : f.duration_minutes,
            loyalty_points: next.length > 0 ? String(totalPoints) : f.loyalty_points
        }));
    };

    const toggleCategoryItems = (itemNames: string[]) => {
        const currentNames = serviceForm.package_items_json ? JSON.parse(serviceForm.package_items_json) : [];
        const allSelected = itemNames.length > 0 && itemNames.every(n => currentNames.includes(n));

        let next;
        if (allSelected) {
            next = currentNames.filter((n: string) => !itemNames.includes(n));
        } else {
            next = Array.from(new Set([...currentNames, ...itemNames]));
        }

        const selectedServices = next.map((n: string) => services.find(s => s.name === n)).filter(Boolean);
        const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0);
        const totalDuration = selectedServices.reduce((sum: number, s: any) => sum + s.duration_minutes, 0);
        const totalPoints = selectedServices.reduce((sum: number, s: any) => sum + s.loyalty_points, 0);

        setServiceForm(f => ({
            ...f,
            package_items_json: JSON.stringify(next),
            price: next.length > 0 ? String(totalPrice) : f.price,
            duration_minutes: next.length > 0 ? String(totalDuration) : f.duration_minutes,
            loyalty_points: next.length > 0 ? String(totalPoints) : f.loyalty_points
        }));
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
            loyalty_points: parseInt(serviceForm.loyalty_points) || 0,
            is_package: serviceForm.is_package,
            package_items_json: serviceForm.package_items_json
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
            setShowServiceEditor(false);
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

    if (showServiceEditor) {
        return (
            <DashboardLayout title="Service Editor">
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Header Block */}
                    <div className="relative rounded-[3rem] bg-brand p-12 text-white shadow-2xl shadow-brand/20 overflow-hidden">
                        <div className="absolute inset-0">
                            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand/10 blur-[100px]" />
                            <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-accent-peach/5 blur-[100px]" />
                        </div>

                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-1 w-12 bg-white rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{CLINIC_TEXT.services.configTitle}</span>
                                </div>
                                <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-4 text-white">
                                    {editingService ? CLINIC_TEXT.services.editServiceTitle(editingService.name) : CLINIC_TEXT.services.newServiceTitle}
                                </h2>
                                <p className="text-sm font-medium text-white max-w-md">{CLINIC_TEXT.services.subtitle}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowServiceEditor(false)}
                                    className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all border border-white/10">
                                    {CLINIC_TEXT.services.discardButton}
                                </button>
                                <button onClick={handleSaveService} disabled={savingService}
                                    className="flex items-center gap-3 bg-brand text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-brand/20 disabled:opacity-50">
                                    {savingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    {CLINIC_TEXT.services.saveButton}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        {/* Configuration Column */}
                        <div className="xl:col-span-4 space-y-8">
                            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-accent-brown/5 border border-white space-y-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand"><Settings className="w-6 h-6" /></div>
                                    <h4 className="text-xl font-black text-accent-brown tracking-tight">{CLINIC_TEXT.services.configTitle}</h4>
                                </div>

                                <div className="space-y-6">
                                    <div className="group space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-black pl-2">Service Name</label>
                                            <button onClick={() => setShowServicePickerModal(true)} className="text-[9px] font-black uppercase tracking-widest text-brand hover:underline">Pick from Catalog</button>
                                        </div>
                                        <div className="relative">
                                            <input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                                                className="w-full bg-accent-peach/5 border-2 border-transparent focus:border-brand/30 rounded-2xl px-6 py-4.5 text-sm font-bold text-accent-brown transition-all shadow-inner placeholder:text-black/20" placeholder="e.g., Premium Grooming & Bath" />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand rounded-full" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black pl-2">Service Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => setServiceForm({ ...serviceForm, is_package: false, package_items_json: '[]' })}
                                                className={`py-4 px-6 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${!serviceForm.is_package ? 'bg-brand border-brand text-white shadow-xl' : 'bg-white border-accent-brown/5 text-black hover:border-brand/20'}`}>
                                                Standard
                                            </button>
                                            <button onClick={() => setServiceForm({ ...serviceForm, is_package: true })}
                                                className={`py-4 px-6 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${serviceForm.is_package ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-xl' : 'bg-white border-accent-brown/5 text-black hover:border-brand/20'}`}>
                                                Package
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black pl-2">Description</label>
                                        <textarea value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} rows={4}
                                            className="w-full bg-accent-peach/5 border-2 border-transparent focus:border-brand/30 rounded-3xl px-6 py-5 text-sm font-medium text-black transition-all shadow-inner resize-none" placeholder="Write details about this service..." />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-accent-brown/5 border border-white space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xl font-black text-accent-brown tracking-tight">Visibility</h4>
                                    <button onClick={() => setServiceForm({ ...serviceForm, is_active: !serviceForm.is_active })} className="transition-transform active:scale-95">
                                        {serviceForm.is_active ? <ToggleRight className="w-12 h-12 text-brand" /> : <ToggleLeft className="w-12 h-12 text-black" />}
                                    </button>
                                </div>
                                <p className="text-[10px] font-black text-black uppercase tracking-widest opacity-60">Control whether this service is available for public booking.</p>
                            </div>
                        </div>

                        {/* Financials & Deliverables Column */}
                        <div className="xl:col-span-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { label: `${CLINIC_TEXT.services.priceLabel} (₱)`, icon: Scissors, value: serviceForm.price, key: 'price', color: 'text-brand', prefix: '₱' },
                                    { label: CLINIC_TEXT.services.timeAllocated, icon: Timer, value: serviceForm.duration_minutes, key: 'duration_minutes', color: 'text-blue-500', suffix: ' Min' },
                                    { label: CLINIC_TEXT.services.rewardPoints, icon: Award, value: serviceForm.loyalty_points, key: 'loyalty_points', color: 'text-green-500', suffix: ' Points' },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-accent-brown/5 border border-white space-y-6 group hover:border-brand/20 transition-all duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl bg-accent-peach/10 flex items-center justify-center ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black">{stat.label}</label>
                                        </div>
                                        <div className="relative">
                                            <input type="number" value={stat.value} onChange={e => setServiceForm({ ...serviceForm, [stat.key]: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-accent-peach/5 border-none focus:ring-0 text-3xl font-black text-accent-brown tracking-tighter p-0 bg-transparent placeholder:text-black/10" />
                                            <div className="absolute bottom-0 left-0 h-0.5 w-8 bg-brand/40 group-hover:w-full transition-all duration-700" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {serviceForm.is_package && (
                                <div className="bg-white rounded-[4rem] p-10 md:p-14 shadow-2xl shadow-accent-brown/10 border border-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#ea580c]/5 rounded-full blur-[80px] -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-125" />
                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-14 rounded-2xl bg-[#ea580c]/10 flex items-center justify-center text-[#ea580c] shadow-lg shadow-[#ea580c]/10"><Package className="w-7 h-7" /></div>
                                                    <h4 className="text-3xl font-black text-accent-brown tracking-tighter">Package Contents</h4>
                                                </div>
                                                <p className="text-black text-sm font-medium max-w-sm">Bundle multiple standard offerings into a high-value package for your customers.</p>
                                            </div>
                                            <button onClick={() => setShowSelectionModal(true)}
                                                className="flex items-center gap-4 bg-[#ea580c] text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-[#ea580c]/20">
                                                <Plus className="w-5 h-5 transition-transform duration-500 hover:rotate-90" strokeWidth={3} />
                                                Add Services
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <AnimatePresence mode="popLayout">
                                                {JSON.parse(serviceForm.package_items_json || '[]').map((item: string, idx: number) => (
                                                    <motion.div key={item} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                                        className="group flex items-center justify-between p-6 bg-accent-peach/5 border border-accent-brown/5 rounded-[2rem] hover:bg-white hover:shadow-xl hover:shadow-accent-brown/5 transition-all duration-300">
                                                        <div className="flex items-center gap-5">
                                                            <div className="h-12 w-1.5 bg-[#ea580c] rounded-full group-hover:h-8 transition-all" />
                                                            <p className="font-black text-accent-brown text-base tracking-tight">{item}</p>
                                                        </div>
                                                        <button onClick={() => togglePackageItem(item)} className="w-10 h-10 rounded-xl bg-white text-black/20 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {JSON.parse(serviceForm.package_items_json || '[]').length === 0 && (
                                                <div className="col-span-full py-20 border-2 border-dashed border-accent-brown/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-center">
                                                    <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center text-accent-brown/30"><Archive className="w-8 h-8" /></div>
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-black/40">No services bundled yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Toast Notification for Editor */}
                            <AnimatePresence>
                                {toast && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                        className={`fixed bottom-10 right-10 z-[100] flex items-center gap-3 px-8 py-5 rounded-[2rem] shadow-2xl font-black text-[10px] uppercase tracking-widest border-2 ${toast.type === 'success' ? 'bg-white border-green-500 text-green-600' : 'bg-white border-red-500 text-red-600'}`}>
                                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        {toast.msg}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Editor Specific Sub-Modals */}
                <AnimatePresence>
                    {showSelectionModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSelectionModal(false)} className="absolute inset-0 bg-accent-brown/80 backdrop-blur-2xl" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
                                className="relative bg-white rounded-[4rem] w-full max-w-5xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white" style={{ height: '85vh' }}>
                                <div className="p-12 border-b border-accent-brown/5 bg-accent-peach/5 flex items-center justify-between shrink-0 relative">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#ea580c]/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                                    <div className="relative z-10">
                                        <h3 className="text-4xl font-black text-accent-brown tracking-tighter">Package Builder</h3>
                                        <p className="text-[10px] font-black text-brand uppercase tracking-[0.4em] mt-3 bg-brand/10 px-4 py-1 rounded-full w-fit">
                                            {JSON.parse(serviceForm.package_items_json || '[]').length} Components Selected
                                        </p>
                                    </div>
                                    <button onClick={() => setShowSelectionModal(false)} className="w-14 h-14 hover:bg-white rounded-2xl flex items-center justify-center transition-all shadow-sm border border-transparent hover:border-accent-brown/5 group">
                                        <X className="w-8 h-8 text-black group-hover:text-accent-brown transition-colors" />
                                    </button>
                                </div>

                                <div className="flex flex-1 overflow-hidden">
                                    <div className="w-80 shrink-0 border-r border-accent-brown/5 overflow-y-auto p-8 space-y-4 bg-accent-peach/5 custom-scrollbar">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black mb-6 px-2 opacity-40">Categories</p>
                                        {Object.keys(SERVICE_CATEGORIES).map(cat => {
                                            const catItems = SERVICE_CATEGORIES[cat];
                                            const selectedNames = JSON.parse(serviceForm.package_items_json || '[]') as string[];
                                            const isAllSelected = catItems.length > 0 && catItems.every(name => selectedNames.includes(name));
                                            const isSomeSelected = !isAllSelected && catItems.some(name => selectedNames.includes(name));

                                            return (
                                                <div key={cat} className="group flex items-center gap-3 p-1.5 rounded-3xl hover:bg-white transition-all duration-300">
                                                    <button type="button" onClick={() => toggleCategoryItems(catItems)}
                                                        className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl border-2 transition-all ${isAllSelected ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-lg' : isSomeSelected ? 'bg-white border-[#ea580c]/40 text-[#ea580c]' : 'bg-white border-black text-black group-hover:border-black'
                                                            }`}>
                                                        {isAllSelected ? <Check className="w-6 h-6" strokeWidth={4} /> : isSomeSelected ? <div className="w-3 h-0.5 rounded-full bg-[#ea580c]" /> : <Plus className="w-5 h-5" />}
                                                    </button>
                                                    <button type="button" onClick={() => setSelectionCategory(cat)}
                                                        className={`flex-1 text-left px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${(selectionCategory || Object.keys(SERVICE_CATEGORIES)[0]) === cat ? 'bg-accent-brown text-white shadow-xl' : 'text-black hover:text-accent-brown'}`}>
                                                        {cat}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                                        {(() => {
                                            const activeCat = selectionCategory || Object.keys(SERVICE_CATEGORIES)[0];
                                            const selectedNames = JSON.parse(serviceForm.package_items_json || '[]') as string[];
                                            return activeCat && (
                                                <motion.div key={activeCat} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-4">
                                                    {SERVICE_CATEGORIES[activeCat].map((name: string) => {
                                                        const isSelected = selectedNames.includes(name);
                                                        const match = services.find(s => s.name === name);
                                                        return (
                                                            <button key={name} type="button" onClick={() => togglePackageItem(name)}
                                                                className={`w-full flex items-center gap-8 p-8 rounded-[2.5rem] border-2 transition-all duration-500 text-left relative overflow-hidden group ${isSelected ? 'border-brand bg-brand text-white shadow-2xl shadow-brand/20' : 'border-transparent bg-accent-peach/5 hover:bg-white hover:border-brand/20 text-accent-brown'
                                                                    }`}>
                                                                <div className="flex-1 min-w-0 relative z-10">
                                                                    <p className={`text-xl font-black tracking-tight truncate ${isSelected ? 'text-white' : 'text-accent-brown'}`}>{name}</p>
                                                                    <div className="flex items-center gap-4 mt-3">
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>Standard Offer</span>
                                                                        {match && <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${isSelected ? 'text-white/40' : 'text-black/40'}`}>₱{match.price} · {match.duration_minutes}M</span>}
                                                                    </div>
                                                                </div>
                                                                {isSelected ? <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center relative z-10"><Check className="w-7 h-7 text-white" strokeWidth={4} /></div> : <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all"><Plus className="w-6 h-6 text-black" /></div>}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="p-10 border-t border-accent-brown/5 bg-accent-peach/5 shrink-0">
                                    <button onClick={() => setShowSelectionModal(false)}
                                        className="w-full h-20 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] bg-brand text-white hover:bg-black transition-all shadow-2xl shadow-brand/20 active:scale-95 leading-none">
                                        Update Bundle Components
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showServicePickerModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowServicePickerModal(false)} className="absolute inset-0 bg-accent-brown/80 backdrop-blur-2xl" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
                                className="relative bg-white rounded-[4rem] w-full max-w-5xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white" style={{ height: '85vh' }}>
                                <div className="p-12 border-b border-accent-brown/5 bg-accent-peach/5 flex items-center justify-between shrink-0 relative">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                                    <div className="relative z-10">
                                        <h3 className="text-4xl font-black text-accent-brown tracking-tighter">Service Library</h3>
                                        <p className="text-[10px] font-black text-black uppercase tracking-[0.4em] mt-3 opacity-60">Template Catalog</p>
                                    </div>
                                    <button onClick={() => setShowServicePickerModal(false)} className="w-14 h-14 hover:bg-white rounded-2xl flex items-center justify-center transition-all shadow-sm border border-transparent hover:border-accent-brown/5 group">
                                        <X className="w-8 h-8 text-black group-hover:text-accent-brown transition-colors" />
                                    </button>
                                </div>

                                <div className="flex flex-1 overflow-hidden">
                                    <div className="w-80 shrink-0 border-r border-accent-brown/5 overflow-y-auto p-8 space-y-4 bg-accent-peach/5 custom-scrollbar">
                                        {Object.keys(SERVICE_CATEGORIES).map(cat => (
                                            <button key={cat} type="button" onClick={() => setServiceCategory(cat)}
                                                className={`w-full text-left px-8 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${(serviceCategory || Object.keys(SERVICE_CATEGORIES)[0]) === cat ? 'bg-brand text-white shadow-2xl shadow-brand/20 scale-[1.05]' : 'text-black hover:text-accent-brown hover:bg-white shadow-sm'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                                        {(() => {
                                            const activeCat = serviceCategory || Object.keys(SERVICE_CATEGORIES)[0];
                                            return activeCat && (
                                                <motion.div key={activeCat} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    {SERVICE_CATEGORIES[activeCat].map(service => {
                                                        const isSelected = serviceForm.name === service;
                                                        return (
                                                            <button key={service} type="button"
                                                                onClick={() => { setServiceForm(f => ({ ...f, name: service })); setShowServicePickerModal(false); }}
                                                                className={`w-full p-8 rounded-[2.5rem] border-2 transition-all duration-500 text-left relative overflow-hidden group ${isSelected ? 'border-brand bg-brand text-white shadow-2xl shadow-brand/20' : 'border-transparent bg-accent-peach/5 hover:bg-white hover:border-brand/20 text-accent-brown'}`}>
                                                                <p className={`text-xl font-black tracking-tight leading-tight ${isSelected ? 'text-white' : 'text-accent-brown'}`}>{service}</p>
                                                                <div className="flex items-center gap-3 mt-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-brand'}`} />
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-brand'}`}>Deploy Service</span>
                                                                </div>
                                                                {isSelected && <Check className="absolute top-8 right-8 w-6 h-6 text-white" strokeWidth={4} />}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="">
            <div className="w-full max-w-[1280px] mx-auto space-y-5 sm:space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
                {/* Redesigned Header Area */}
                <div className="relative rounded-[20px] sm:rounded-[24px] bg-brand p-4 min-[400px]:p-5 sm:p-6 lg:p-8 text-white shadow-xl shadow-brand/20">
                    <div className="absolute inset-0 rounded-[20px] sm:rounded-[24px] overflow-hidden pointer-events-none">
                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
                        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-accent-peach/5 blur-3xl pointer-events-none" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                        <div>
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <div className="h-1 w-8 sm:w-10 bg-white rounded-full" />
                                <span className="text-xs font-bold uppercase tracking-wider text-white/90">{CLINIC_TEXT.bookings.badge}</span>
                            </div>
                            <h2 className="text-2xl min-[360px]:text-[28px] sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-1.5 sm:mb-2">{CLINIC_TEXT.bookings.title}</h2>
                            <p className="text-sm text-white/90 max-w-xl leading-relaxed">{CLINIC_TEXT.bookings.description}</p>
                        </div>
                        <div className="w-full sm:w-[280px] md:w-[320px] shrink-0">
                            {token && <BranchSelector token={token} onBranchChange={setBranchId} currentBranchId={branchId} />}
                        </div>
                    </div>

                    {/* Integrated Tab Navigation */}
                    <div className="relative z-10 mt-5 sm:mt-6">
                        {/* Mobile 2x2 grid (phones < 640px) */}
                        <div className="grid grid-cols-2 gap-2 sm:hidden w-full">
                            {[
                                { id: 'reservations', label: CLINIC_TEXT.bookings.tabs.reservations, icon: ClipboardList },
                                { id: 'hours', label: CLINIC_TEXT.bookings.tabs.schedule, icon: Clock },
                                { id: 'special', label: CLINIC_TEXT.bookings.tabs.overrides, icon: Calendar },
                                { id: 'services', label: CLINIC_TEXT.bookings.tabs.services, icon: Tag },
                            ].map(({ id, label, icon: Icon }) => {
                                const isActive = tab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setTab(id as any)}
                                        className={`min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                                            isActive
                                                ? 'bg-white text-accent-brown shadow-md'
                                                : 'bg-black/20 text-white hover:bg-black/30'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand' : 'text-white/80'}`} />
                                        <span className="truncate">{label}</span>
                                        {id === 'reservations' && (pending + confirmed) > 0 && (
                                            <span className={`shrink-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                                                isActive ? 'bg-brand text-white' : 'bg-white/20 text-white'
                                            }`}>
                                                {pending + confirmed}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tablet/Desktop horizontal row */}
                        <div className="hidden sm:inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md rounded-2xl p-1.5 border border-white/10">
                            {[
                                { id: 'reservations', label: CLINIC_TEXT.bookings.tabs.reservations, icon: ClipboardList },
                                { id: 'hours', label: CLINIC_TEXT.bookings.tabs.schedule, icon: Clock },
                                { id: 'special', label: CLINIC_TEXT.bookings.tabs.overrides, icon: Calendar },
                                { id: 'services', label: CLINIC_TEXT.bookings.tabs.services, icon: Tag },
                            ].map(({ id, label, icon: Icon }) => {
                                const isActive = tab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setTab(id as any)}
                                        className={`min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 ${
                                            isActive
                                                ? 'bg-white text-accent-brown shadow-md scale-[1.02]'
                                                : 'text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand' : 'text-white/70'}`} />
                                        <span>{label}</span>
                                        {id === 'reservations' && (pending + confirmed) > 0 && (
                                            <span className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                                                isActive ? 'bg-brand text-white' : 'bg-white/20 text-white'
                                            }`}>
                                                {pending + confirmed}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Toast Notification */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
                            className={`fixed top-28 left-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl font-black text-[10px] uppercase tracking-widest border-2 ${toast.type === 'success' ? 'bg-white border-green-500 text-green-600' : 'bg-white border-red-500 text-red-600'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── RESERVATIONS TAB ── */}
                {tab === 'reservations' && (
                    <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* More Professional Stats Grid */}
                        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                            {[
                                { label: CLINIC_TEXT.bookings.cards.totalBookings, value: reservations.length, icon: ClipboardList, color: 'text-accent-brown', bg: 'bg-accent-peach/20', trend: CLINIC_TEXT.bookings.cards.allTime },
                                { label: CLINIC_TEXT.bookings.cards.waitingForYou, value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: CLINIC_TEXT.bookings.cards.needsAction },
                                { label: CLINIC_TEXT.bookings.cards.confirmedBookings, value: confirmed, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', trend: CLINIC_TEXT.bookings.cards.booked },
                                { label: CLINIC_TEXT.bookings.cards.completedBookings, value: reservations.filter(r => r.status === 'Completed').length, icon: Award, color: 'text-green-600', bg: 'bg-green-50', trend: CLINIC_TEXT.bookings.cards.done },
                            ].map(({ label, value, icon: Icon, color, bg, trend }) => (
                                <div key={label} className="bg-white rounded-[20px] p-4 sm:p-5 shadow-sm border border-accent-brown/10 hover:border-brand/20 transition-all duration-200 flex flex-col justify-between h-full">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                                            {trend}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1 truncate">{label}</span>
                                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-accent-brown">{value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Integrated Filter System */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white rounded-[20px] p-3 sm:p-4 shadow-sm border border-accent-brown/10">
                            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                                {STATUS_FILTERS.map(f => {
                                    const count = f === 'All' ? reservations.length : reservations.filter(r => r.status === f).length;
                                    const isActive = filter === f;
                                    return (
                                        <button key={f} onClick={() => setFilter(f)}
                                            className={`min-h-[44px] shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                                                isActive
                                                    ? 'bg-brand text-white shadow-md shadow-brand/20'
                                                    : 'text-slate-700 hover:bg-accent-peach/20 hover:text-accent-brown'
                                            }`}>
                                            <span>{f}</span>
                                            <span className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-lg px-1.5 text-xs font-bold tabular-nums transition-colors ${
                                                isActive ? 'bg-white text-brand' : 'bg-accent-brown/10 text-slate-700'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 sm:border-l sm:border-accent-brown/10 sm:pl-4 pt-1 sm:pt-0 shrink-0">
                                <Calendar className="w-4 h-4 text-brand shrink-0" />
                                <span>{CLINIC_TEXT.bookings.countFound(filtered.length)}</span>
                            </div>
                        </div>

                        {/* Reservation List with Enhanced Visual Hierarchy */}
                        {loading && <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-brand animate-spin" /></div>}
                        {!loading && filtered.length === 0 && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[20px] p-8 sm:p-12 flex flex-col items-center gap-4 text-center shadow-sm border border-accent-brown/10">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-peach rounded-full flex items-center justify-center border-4 border-white shadow-md">
                                    <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-brand" />
                                </div>
                                <div>
                                    <h3 className="font-black text-accent-brown text-xl sm:text-2xl tracking-tight mb-1.5">{CLINIC_TEXT.bookings.empty.title}</h3>
                                    <p className="text-slate-600 text-sm max-w-md">{CLINIC_TEXT.bookings.empty.description(filter)}</p>
                                </div>
                                <button onClick={() => setFilter('All')} className="text-xs font-bold uppercase tracking-wider text-brand hover:underline pt-2">{CLINIC_TEXT.bookings.empty.viewAll}</button>
                            </motion.div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                            {filtered.slice((reservationsPage - 1) * RESERVATIONS_PER_PAGE, reservationsPage * RESERVATIONS_PER_PAGE).map((r, i) => {
                                const style = STATUS_STYLES[r.status] || STATUS_STYLES['Pending'];
                                const actions = NEXT_STATUSES[r.status] || [];

                                // Dynamic iconography based on service name
                                let ServiceIcon = Activity;
                                const lowerService = (r.service || "").toLowerCase();
                                if (lowerService.includes('vaccin') || lowerService.includes('rabies') || lowerService.includes('deworm')) ServiceIcon = Syringe;
                                else if (lowerService.includes('groom') || lowerService.includes('trim') || lowerService.includes('bath')) ServiceIcon = Scissors;
                                else if (lowerService.includes('consult') || lowerService.includes('check')) ServiceIcon = Stethoscope;

                                return (
                                    <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className="group relative bg-white rounded-[20px] p-4 sm:p-5 shadow-sm border border-accent-brown/10 hover:border-brand/20 transition-all duration-200 flex flex-col justify-between h-full">

                                        {/* Profile/Service Top Block */}
                                        <div className="flex flex-col gap-4 flex-1">
                                            {/* Header Row: Icon & Status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="relative shrink-0">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${style.bg}`}>
                                                        <ServiceIcon className={`w-6 h-6 ${style.text}`} />
                                                    </div>
                                                    <div className={`absolute -right-1 -bottom-1 w-4 h-4 rounded-md flex items-center justify-center border-2 border-white shadow-sm ${style.dot}`} />
                                                </div>
                                                <div className="flex flex-col items-end text-right">
                                                    <span
                                                        className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 select-all"
                                                        aria-label={getReviewIdAriaLabel(r.id)}
                                                    >
                                                        {formatReviewId(r.id)}
                                                    </span>
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{r.status}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Service Title & Sub-Services */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight leading-snug break-words">
                                                        {r.service}
                                                    </h4>
                                                    {r.pet_name && (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className="text-brand text-xs sm:text-sm font-bold bg-brand/10 px-2.5 py-0.5 rounded-lg break-words">for {r.pet_name}</span>
                                                            <span className="text-xs font-semibold text-slate-600 break-words">{r.pet_type}{r.pet_breed ? ` • ${r.pet_breed}` : ''}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Specify Sub-Services if Package */}
                                                {(() => {
                                                    const matchedService = services.find(s => s.name === r.service);
                                                    if (matchedService && matchedService.is_package && matchedService.package_items_json) {
                                                        try {
                                                            const items = JSON.parse(matchedService.package_items_json);
                                                            if (Array.isArray(items) && items.length > 0) {
                                                                return (
                                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                                        {items.map((it: string, idx: number) => (
                                                                            <span key={idx} className="text-[10px] font-bold tracking-wide uppercase bg-accent-peach/20 text-slate-700 px-2 py-0.5 rounded-md border border-accent-brown/10 break-words">
                                                                                {it}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            }
                                                        } catch (e) { }
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* Details Grid (2x2) */}
                                            <div className="grid grid-cols-2 gap-3 mt-auto pt-3 border-t border-accent-brown/5">
                                                <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-accent-peach/20 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-brand" /></div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Date</span>
                                                        <span className="text-xs font-bold text-slate-800 break-words leading-tight">{r.date}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-accent-peach/20 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-brand" /></div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Time</span>
                                                        <span className="text-xs font-bold text-slate-800 break-words leading-tight">{r.time}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-accent-peach/20 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-brand" /></div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cust</span>
                                                        <span className="text-xs font-bold text-slate-800 break-words leading-tight">{r.customer_name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-accent-peach/20 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-brand" /></div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Loc</span>
                                                        <span className="text-xs font-bold text-slate-800 break-words leading-tight">{r.location || 'Clinic'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action & Price Section */}
                                        <div className="bg-accent-peach/10 rounded-xl p-4 flex flex-col gap-4 border border-accent-brown/5 mt-4">
                                            <div className="flex items-baseline justify-between border-b border-accent-brown/5 pb-2.5">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</span>
                                                <p className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight">₱{r.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {actions.length > 0 ? actions.map(action => {
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

                                                    const ActionIcon = action.icon;
                                                    return (
                                                        <button key={action.value}
                                                            onClick={() => updateStatus(r.db_id, action.value)}
                                                            disabled={isActionDisabled}
                                                            className={`w-full min-h-[44px] flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-md ${isActionDisabled ? 'bg-accent-brown/10 text-slate-400 cursor-not-allowed shadow-none select-none' : `${action.color} shadow-accent-brown/10 active:scale-95 cursor-pointer`}`}>
                                                            {updatingId === r.db_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ActionIcon className="w-4 h-4" />}
                                                            {action.label}
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="py-2.5 text-center rounded-xl bg-white/50 border border-dashed border-accent-brown/20">
                                                        <span className="text-xs font-semibold text-slate-500 italic">No actions available</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {filtered.length > RESERVATIONS_PER_PAGE && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-[20px] p-4 shadow-sm border border-accent-brown/10">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <ClipboardList className="w-4 h-4 text-brand shrink-0" />
                                    <span>Showing {(reservationsPage - 1) * RESERVATIONS_PER_PAGE + 1}-{Math.min(reservationsPage * RESERVATIONS_PER_PAGE, filtered.length)} of {filtered.length} entries</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setReservationsPage(p => Math.max(1, p - 1))} disabled={reservationsPage === 1}
                                        aria-label="Previous page"
                                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-accent-brown/10 text-accent-brown hover:text-brand hover:shadow-md transition-all disabled:opacity-30">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.ceil(filtered.length / RESERVATIONS_PER_PAGE) }).map((_, idx) => (
                                            <button key={idx} onClick={() => setReservationsPage(idx + 1)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${reservationsPage === idx + 1 ? 'bg-brand text-white shadow-md' : 'bg-accent-peach/20 text-slate-700 hover:bg-accent-peach/40'}`}>
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setReservationsPage(p => Math.min(Math.ceil(filtered.length / RESERVATIONS_PER_PAGE), p + 1))} disabled={reservationsPage >= Math.ceil(filtered.length / RESERVATIONS_PER_PAGE)}
                                        aria-label="Next page"
                                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-accent-brown/10 text-accent-brown hover:text-brand hover:shadow-md transition-all disabled:opacity-30">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── OPERATING HOURS TAB ── */}
                {tab === 'hours' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[3rem] shadow-2xl shadow-accent-brown/5 border border-white overflow-hidden">
                            <div className="p-8 sm:p-12 border-b border-accent-brown/5 bg-accent-peach/5 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                                <div className="relative z-10">
                                    <h3 className="font-black text-accent-brown text-3xl tracking-tighter">Weekly Schedule</h3>
                                    <p className="text-black text-sm font-medium mt-2 max-w-xl">Define your clinic's core operating hours, including standard opening times and midday breaks for coordination.</p>
                                </div>
                            </div>

                            {/* Top Summary: Schedule Errors Banner */}
                            {hasAttemptedSaveHours && !scheduleValidation.isValid && (
                                <div
                                    role="alert"
                                    className="mx-6 sm:mx-10 mt-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-rose-900">
                                                Fix {scheduleValidation.invalidDays.length} day{scheduleValidation.invalidDays.length > 1 ? 's' : ''} before saving: {scheduleValidation.invalidDays.map(d => d.day_name).join(', ')}
                                            </p>
                                            <p className="text-xs text-rose-700 font-medium mt-0.5">
                                                Review the highlighted operating hours and break intervals below.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => scrollToFirstError(scheduleValidation.invalidDays)}
                                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
                                    >
                                        Go to first error &rarr;
                                    </button>
                                </div>
                            )}

                            {/* All Days Closed Warning */}
                            {scheduleValidation.allDaysClosed && (
                                <div
                                    role="status"
                                    className="mx-6 sm:mx-10 mt-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 shadow-sm animate-in fade-in"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-amber-900">
                                            {CLINIC_TEXT.hours.noDaysOpenWarning}
                                        </p>
                                        <p className="text-xs text-amber-700 font-medium mt-0.5">
                                            {CLINIC_TEXT.hours.allDaysClosedNote}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {loading ? (
                                <div className="flex justify-center py-24"><Loader2 className="w-12 h-12 text-brand animate-spin" /></div>
                            ) : (
                                <div className="p-6 sm:p-10 space-y-4">
                                    {hours.map((h, i) => {
                                        const dayValidation = scheduleValidation.dayResults[h.day_of_week] || { isValid: true, errors: {} };
                                        const dayHasErrors = h.is_open && !dayValidation.isValid;

                                        return (
                                            <motion.div 
                                                key={h.day_of_week} 
                                                id={`schedule-day-row-${h.day_of_week}`}
                                                initial={{ opacity: 0, x: -20 }} 
                                                animate={{ opacity: 1, x: 0 }} 
                                                transition={{ delay: i * 0.05 }}
                                                className={`group relative rounded-[2rem] border-2 transition-all duration-300 overflow-hidden ${
                                                    !h.is_open 
                                                        ? 'border-accent-brown/5 bg-accent-peach/5 opacity-60 grayscale' 
                                                        : dayHasErrors
                                                            ? 'border-rose-400 bg-rose-50/20 shadow-xl shadow-rose-500/5'
                                                            : 'border-accent-peach/50 bg-white shadow-xl shadow-accent-brown/5'
                                                }`}
                                            >
                                                <div className="flex flex-col xl:flex-row xl:items-start gap-6 sm:gap-8 p-5 sm:p-6 lg:p-8">
                                                    <div className="flex items-center gap-4 sm:gap-6 min-w-[200px] pt-1">
                                                        <button 
                                                            onClick={() => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, is_open: !d.is_open } : d))}
                                                            className="shrink-0 transition-transform active:scale-90 duration-300"
                                                            aria-label={`Toggle ${h.day_name} open or closed`}
                                                        >
                                                            {h.is_open
                                                                ? <div className="w-14 h-8 bg-brand rounded-full p-1 flex items-center justify-end transition-colors"><div className="w-6 h-6 bg-white rounded-full shadow-lg" /></div>
                                                                : <div className="w-14 h-8 bg-accent-brown/10 rounded-full p-1 flex items-center transition-colors"><div className="w-6 h-6 bg-white rounded-full shadow-md" /></div>}
                                                        </button>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className={`text-xl font-black tracking-tight ${h.is_open ? (dayHasErrors ? 'text-rose-900' : 'text-accent-brown') : 'text-black'}`}>
                                                                    {h.day_name}
                                                                </p>
                                                                {dayHasErrors && (
                                                                    <span className="p-1 rounded-full bg-rose-100 text-rose-600 shrink-0" title="Schedule configuration error">
                                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                                                                !h.is_open 
                                                                    ? 'text-black' 
                                                                    : dayHasErrors 
                                                                        ? 'text-rose-600' 
                                                                        : 'text-brand'
                                                            }`}>
                                                                {!h.is_open ? CLINIC_TEXT.hours.closed : dayHasErrors ? CLINIC_TEXT.hours.fixErrors : CLINIC_TEXT.hours.open}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {h.is_open && (
                                                        <div className="flex-1 grid grid-cols-1 min-[340px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
                                                            {/* Opening Time */}
                                                            <div className="space-y-1.5 min-w-[140px]" id={`schedule-field-${h.day_of_week}-open_time`}>
                                                                <div className="flex items-center gap-1.5 px-1">
                                                                    <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
                                                                    <label className="text-xs font-black uppercase tracking-wider text-black">Opening Time</label>
                                                                </div>
                                                                <CustomDropdown
                                                                    label="Opening Time"
                                                                    hideInlineLabel={true}
                                                                    value={h.open_time || '09:00 AM'}
                                                                    options={getScheduleDropdownOptions('open_time', h, TIME_OPTIONS)}
                                                                    buttonClassName={`w-full min-h-[48px] h-12 py-3 px-4 rounded-2xl bg-accent-peach/15 border-2 text-sm sm:text-base font-black text-accent-brown flex items-center justify-between transition-all outline-none ${
                                                                        dayValidation.errors.open_time
                                                                            ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-200'
                                                                            : 'border-transparent hover:border-accent-peach/50 hover:bg-white'
                                                                    }`}
                                                                    onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, open_time: val } : d))}
                                                                />
                                                                {dayValidation.errors.open_time && (
                                                                    <div 
                                                                        id={`error-${h.day_of_week}-open_time`}
                                                                        className="flex items-start gap-1.5 px-1 pt-1 text-xs font-bold text-rose-600 leading-tight animate-in fade-in"
                                                                        role="alert"
                                                                    >
                                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                                                        <span>{dayValidation.errors.open_time}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Break Starts */}
                                                            <div className="space-y-1.5 min-w-[140px]" id={`schedule-field-${h.day_of_week}-break_start`}>
                                                                <div className="flex items-center gap-1.5 px-1">
                                                                    <div className="w-3.5 h-3.5 border-2 border-accent-brown/30 rounded-sm shrink-0" />
                                                                    <label className="text-xs font-black uppercase tracking-wider text-black">Break Starts</label>
                                                                </div>
                                                                <CustomDropdown
                                                                    label="Break Starts"
                                                                    hideInlineLabel={true}
                                                                    value={h.break_start || 'No break'}
                                                                    options={getScheduleDropdownOptions('break_start', h, TIME_OPTIONS)}
                                                                    buttonClassName={`w-full min-h-[48px] h-12 py-3 px-4 rounded-2xl bg-accent-peach/15 border-2 text-sm sm:text-base font-black text-accent-brown flex items-center justify-between transition-all outline-none ${
                                                                        dayValidation.errors.break_start
                                                                            ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-200'
                                                                            : 'border-transparent hover:border-accent-peach/50 hover:bg-white'
                                                                    }`}
                                                                    onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, break_start: val === 'No break' ? null : val, break_end: val === 'No break' ? null : d.break_end } : d))}
                                                                />
                                                                {dayValidation.errors.break_start && (
                                                                    <div 
                                                                        id={`error-${h.day_of_week}-break_start`}
                                                                        className="flex items-start gap-1.5 px-1 pt-1 text-xs font-bold text-rose-600 leading-tight animate-in fade-in"
                                                                        role="alert"
                                                                    >
                                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                                                        <span>{dayValidation.errors.break_start}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Break Ends */}
                                                            {(h.break_start || h.break_end) ? (
                                                                <div className="space-y-1.5 min-w-[140px]" id={`schedule-field-${h.day_of_week}-break_end`}>
                                                                    <div className="flex items-center gap-1.5 px-1">
                                                                        <div className="w-3.5 h-3.5 border-2 border-brand/60 rounded-sm bg-brand/10 shrink-0" />
                                                                        <label className="text-xs font-black uppercase tracking-wider text-black">Break Ends</label>
                                                                    </div>
                                                                    <CustomDropdown
                                                                        label="Break Ends"
                                                                        hideInlineLabel={true}
                                                                        value={h.break_end || '—'}
                                                                        options={getScheduleDropdownOptions('break_end', h, TIME_OPTIONS)}
                                                                        buttonClassName={`w-full min-h-[48px] h-12 py-3 px-4 rounded-2xl bg-accent-peach/15 border-2 text-sm sm:text-base font-black text-accent-brown flex items-center justify-between transition-all outline-none ${
                                                                            dayValidation.errors.break_end
                                                                                ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-200'
                                                                                : 'border-transparent hover:border-accent-peach/50 hover:bg-white'
                                                                        }`}
                                                                        onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, break_end: val === '—' ? null : val } : d))}
                                                                    />
                                                                    {dayValidation.errors.break_end && (
                                                                        <div 
                                                                            id={`error-${h.day_of_week}-break_end`}
                                                                            className="flex items-start gap-1.5 px-1 pt-1 text-xs font-bold text-rose-600 leading-tight animate-in fade-in"
                                                                            role="alert"
                                                                        >
                                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                                                            <span>{dayValidation.errors.break_end}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="hidden lg:block" />
                                                            )}

                                                            {/* Closing Time */}
                                                            <div className="space-y-1.5 min-w-[140px] lg:col-start-4" id={`schedule-field-${h.day_of_week}-close_time`}>
                                                                <div className="flex items-center gap-1.5 px-1">
                                                                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                                    <label className="text-xs font-black uppercase tracking-wider text-black">Closing Time</label>
                                                                </div>
                                                                <CustomDropdown
                                                                    label="Closing Time"
                                                                    hideInlineLabel={true}
                                                                    value={h.close_time || '06:00 PM'}
                                                                    options={getScheduleDropdownOptions('close_time', h, TIME_OPTIONS)}
                                                                    buttonClassName={`w-full min-h-[48px] h-12 py-3 px-4 rounded-2xl bg-accent-peach/15 border-2 text-sm sm:text-base font-black text-accent-brown flex items-center justify-between transition-all outline-none ${
                                                                        dayValidation.errors.close_time
                                                                            ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-200'
                                                                            : 'border-transparent hover:border-accent-peach/50 hover:bg-white'
                                                                    }`}
                                                                    onChange={val => setHours(prev => prev.map((d, idx) => idx === i ? { ...d, close_time: val } : d))}
                                                                />
                                                                {dayValidation.errors.close_time && (
                                                                    <div 
                                                                        id={`error-${h.day_of_week}-close_time`}
                                                                        className="flex items-start gap-1.5 px-1 pt-1 text-xs font-bold text-rose-600 leading-tight animate-in fade-in"
                                                                        role="alert"
                                                                    >
                                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                                                        <span>{dayValidation.errors.close_time}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="p-8 border-t border-accent-brown/5 bg-accent-peach/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-3 text-black">
                                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-accent-brown/5"><CheckCircle className="w-5 h-5" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Last synced with <br />branch database</span>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                    {hasScheduleErrors && (
                                        <p className="text-xs font-bold text-rose-600 text-center sm:text-right">
                                            Fix schedule errors above to save
                                        </p>
                                    )}
                                    <button 
                                        onClick={handleSaveHours} 
                                        disabled={hasScheduleErrors || savingHours}
                                        title={hasScheduleErrors ? "Please resolve schedule errors before saving" : undefined}
                                        aria-disabled={hasScheduleErrors || savingHours}
                                        className={`group relative flex items-center gap-4 text-white pl-8 pr-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl min-w-[240px] w-full sm:w-auto ${
                                            hasScheduleErrors 
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                                : 'bg-brand hover:bg-black shadow-brand/20 active:scale-[0.98]'
                                        }`}
                                    >
                                        <div className="flex-1 flex items-center gap-3 justify-center">
                                            {savingHours ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-brand" />
                                            ) : hoursSuccess ? (
                                                <Check className="w-5 h-5 text-green-400" />
                                            ) : (
                                                <Settings className="w-5 h-5 text-brand group-hover:rotate-90 transition-transform duration-700" />
                                            )}
                                            {hoursSuccess ? 'Success!' : 'Save Schedule'}
                                        </div>
                                        {!hasScheduleErrors && <div className="absolute right-4 w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Confirmation dialog for all days closed */}
                        {showAllClosedConfirm && (
                            <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowAllClosedConfirm(false)}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-none cursor-pointer"
                                />
                                <motion.div
                                    role="alertdialog"
                                    aria-modal="true"
                                    aria-labelledby="all-closed-title"
                                    aria-describedby="all-closed-desc"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-100 space-y-5"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 id="all-closed-title" className="text-lg font-black text-accent-brown">
                                            Save With All Days Closed?
                                        </h4>
                                        <p id="all-closed-desc" className="text-xs text-black/70 font-medium mt-1 leading-relaxed">
                                            No days are open. Residents will not be able to book any appointments at this branch while all days are closed.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAllClosedConfirm(false)}
                                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-accent-brown hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAllClosedConfirm(false);
                                                saveHours();
                                            }}
                                            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                                        >
                                            Confirm & Save
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── SPECIAL DATES TAB ── */}
                {tab === 'special' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[3rem] shadow-2xl shadow-accent-brown/5 border border-white overflow-hidden">
                            <div className="p-8 sm:p-12 border-b border-accent-brown/5 bg-accent-peach/5 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="font-black text-accent-brown text-3xl tracking-tighter">{CLINIC_TEXT.specialDays.title}</h3>
                                        <p className="text-black text-sm font-medium mt-2 max-w-xl">{CLINIC_TEXT.specialDays.subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-white/50">
                                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand"><Calendar className="w-5 h-5" /></div>
                                        <div className="pr-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-black">{CLINIC_TEXT.specialDays.activeBadge}</p>
                                            <p className="text-lg font-black text-accent-brown leading-none">{specialHours.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-10">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Left: Premium Calendar */}
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <h4 className="text-3xl font-black text-accent-brown tracking-tighter leading-tight">
                                                        {new Date(viewDate).toLocaleDateString(undefined, { month: 'long' })}
                                                    </h4>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">{viewDate.getFullYear()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 bg-accent-peach/10 p-1.5 rounded-2xl border border-accent-brown/5">
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white hover:text-brand hover:shadow-lg transition-all text-black active:scale-95">
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white hover:text-brand hover:shadow-lg transition-all text-black active:scale-95">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-accent-brown/5 border border-accent-brown/5 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-accent-peach/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            <div className="relative z-10">
                                                <div className="grid grid-cols-7 gap-2 text-center mb-8">
                                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                                        <span key={d} className="text-[9px] font-black text-brand tracking-widest opacity-40">{d}</span>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-7 gap-3">
                                                    {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                                                        <div key={`empty-${i}`} className="aspect-square opacity-0" />
                                                    ))}

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
                                                                className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl text-[11px] font-black transition-all duration-300 ${isSelected
                                                                ? 'bg-brand text-white shadow-2xl shadow-brand/20 scale-110 z-10'
                                                                    : isToday
                                                                        ? 'bg-brand/10 text-brand ring-2 ring-brand ring-offset-2 ring-offset-white'
                                                                        : 'text-accent-brown/60 hover:bg-accent-peach/20'
                                                                    }`}>
                                                                {d}
                                                                {hasOverride && !isSelected && (
                                                                    <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${hasOverride.is_open ? 'bg-brand' : 'bg-red-400'} animate-pulse shadow-sm`} />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-6 px-4">
                                            {[
                                                { label: 'Custom Hours', color: 'bg-brand' },
                                                { label: CLINIC_TEXT.specialDays.closedForService, color: 'bg-red-400' },
                                                { label: 'Current Date', color: 'bg-brand/20 ring-2 ring-brand' }
                                            ].map(item => (
                                                <div key={item.label} className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-black">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right: Modern Override Form */}
                                    <div className="space-y-8">
                                        <div className="bg-accent-peach/10 rounded-[3rem] p-8 lg:p-10 border border-white shadow-xl shadow-accent-brown/5 space-y-10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                                            <div className="flex items-start justify-between relative z-10">
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand mb-1">{CLINIC_TEXT.specialDays.detailsTitle}</p>
                                                    <h5 className="text-3xl font-black text-accent-brown tracking-tighter">
                                                        {new Date(selectedSpecialDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                                    </h5>
                                                </div>
                                                {specialHours.find(sh => sh.specific_date === selectedSpecialDate) && (
                                                    <button onClick={() => {
                                                        const id = specialHours.find(sh => sh.specific_date === selectedSpecialDate)?.id;
                                                        if (id) handleDeleteSpecial(id);
                                                    }}
                                                        className="w-12 h-12 rounded-2xl bg-white text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 group">
                                                        <Trash2 className="w-5 h-5 mx-auto group-hover:rotate-12 transition-transform" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-8 relative z-10">
                                                {/* Toggle Switch Card */}
                                                <div className="bg-white p-6 rounded-[2rem] border border-accent-brown/5 shadow-sm group hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${specialForm.is_open ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-400'}`}>
                                                                {specialForm.is_open ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-accent-brown text-base tracking-tight">Facility Status</p>
                                                                <p className="text-[10px] text-black uppercase font-black tracking-widest mt-1">Open for business on {new Date(selectedSpecialDate).getDate()}th?</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setSpecialForm(prev => ({ ...prev, is_open: !prev.is_open }))}
                                                            className="transition-transform active:scale-90 overflow-hidden">
                                                            {specialForm.is_open ? <ToggleRight className="w-12 h-12 text-brand" /> : <ToggleLeft className="w-12 h-12 text-black" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Time Dropdowns Container */}
                                                <AnimatePresence mode="wait">
                                                    {specialForm.is_open ? (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                                            className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/50 p-2 rounded-[2.5rem]">
                                                            {[
                                                                { label: 'Opening Time', icon: Clock, value: specialForm.open_time, key: 'open_time', options: TIME_OPTIONS },
                                                                { label: 'Closing Time', icon: MapPin, value: specialForm.close_time, key: 'close_time', options: TIME_OPTIONS },
                                                                { label: 'Break Start', icon: Timer, value: specialForm.break_start || 'No break', key: 'break_start', options: ['No break', ...TIME_OPTIONS] },
                                                                { label: 'Break End', icon: CheckCircle, value: specialForm.break_end || '—', key: 'break_end', options: ['—', ...TIME_OPTIONS] }
                                                            ].map(field => (
                                                                <div key={field.label} className="bg-white p-5 rounded-3xl shadow-sm border border-accent-brown/5 space-y-3">
                                                                    <div className="flex items-center gap-2 px-1">
                                                                        <field.icon className="w-3.5 h-3.5 text-brand" />
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-black">{field.label}</label>
                                                                    </div>
                                                                    <CustomDropdown
                                                                        label={field.label}
                                                                        hideInlineLabel={true}
                                                                        value={field.value}
                                                                        options={field.options}
                                                                        onChange={v => setSpecialForm(p => ({ ...p, [field.key]: v === 'No break' || v === '—' ? null : v }))}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 px-10 text-center bg-red-400/5 rounded-[2.5rem] border border-dashed border-red-400/20">
                                                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-400 shadow-inner"><XCircle className="w-8 h-8" /></div>
                                                            <h6 className="font-black text-accent-brown text-lg tracking-tight">{CLINIC_TEXT.specialDays.closedForService}</h6>
                                                            <p className="text-black text-xs font-medium mt-2">{CLINIC_TEXT.specialDays.closedSlotNotice}</p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <button onClick={handleSaveSpecial} disabled={savingSpecial}
                                                    className="w-full h-20 bg-brand text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl shadow-brand/20 disabled:opacity-50 mt-6 relative group overflow-hidden">
                                                    <div className="absolute inset-0 bg-brand opacity-0 group-hover:opacity-10 transition-opacity" />
                                                    {savingSpecial ? <Loader2 className="w-6 h-6 animate-spin text-brand" /> : <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />}
                                                    {CLINIC_TEXT.specialDays.applyButton}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SERVICES TAB ── */}
                {tab === 'services' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-6 w-1.5 bg-brand rounded-full" />
                                    <h3 className="font-black text-accent-brown text-3xl tracking-tighter">{CLINIC_TEXT.services.title}</h3>
                                </div>
                                <p className="text-black text-sm font-medium">{CLINIC_TEXT.services.subtitle}</p>
                            </div>
                            <button onClick={() => openServiceModal()}
                                className="group flex items-center gap-4 bg-brand text-white pl-8 pr-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-brand/20 min-w-[240px]">
                                <div className="flex-1 flex items-center gap-3 justify-center">
                                    <Plus className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-500" />
                                    {CLINIC_TEXT.services.launchButton}
                                </div>
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-32"><Loader2 className="w-12 h-12 text-brand animate-spin" /></div>
                        ) : services.length === 0 ? (
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[3rem] p-32 flex flex-col items-center gap-8 text-center shadow-2xl shadow-accent-brown/5 border border-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-accent-peach/5 opacity-40" />
                                <div className="relative z-10">
                                    <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl border border-accent-brown/5 mb-6 mx-auto"><Tag className="w-16 h-16 text-brand/20" /></div>
                                    <h3 className="font-black text-accent-brown text-3xl tracking-tight mb-3">{CLINIC_TEXT.services.emptyTitle}</h3>
                                    <p className="text-black text-base max-w-sm font-medium">{CLINIC_TEXT.services.emptySubtitle}</p>
                                    <button onClick={() => openServiceModal()} className="mt-10 flex items-center gap-3 bg-brand text-white px-10 py-5 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-lg mx-auto">
                                        <Plus className="w-4 h-4" /> {CLINIC_TEXT.services.initializeButton}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {services.slice((servicesPage - 1) * SERVICES_PER_PAGE, servicesPage * SERVICES_PER_PAGE).map((s, i) => (
                                        <motion.div key={s.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                            className={`group relative bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-accent-brown/5 border-2 transition-all duration-500 flex flex-col ${s.is_active ? 'border-transparent hover:border-brand/20 shadow-accent-brown/10' : 'border-dashed border-accent-brown/10 opacity-60 grayscale scale-[0.98]'}`}>

                                            {/* Status & Package Badge */}
                                            <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
                                                {s.is_package && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ea580c] text-white rounded-full shadow-lg shadow-[#ea580c]/20">
                                                        <Package className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{CLINIC_TEXT.services.packageBundle}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions Floating */}
                                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 z-20">
                                                <button onClick={() => openServiceModal(s)} className="w-10 h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-accent-brown hover:text-brand transition-all border border-accent-brown/5">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteService(s.id)} disabled={deletingId === s.id}
                                                    className="w-10 h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-red-300 hover:text-red-500 transition-all border border-accent-brown/5 disabled:opacity-50">
                                                    {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            <div className="pt-12 mb-8 flex-1">
                                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:scale-110 duration-500 ${s.is_package ? 'bg-orange-50 text-[#ea580c]' : 'bg-brand/5 text-brand'}`}>
                                                    <Scissors className="w-10 h-10" />
                                                </div>
                                                <h4 className="font-black text-accent-brown text-2xl tracking-tighter mb-3 leading-none group-hover:text-brand transition-colors">{s.name}</h4>
                                                {s.description ? (
                                                    <p className="text-sm text-black line-clamp-2 font-medium leading-relaxed mb-6">{s.description}</p>
                                                ) : (
                                                    <div className="h-10 mb-6 flex items-center"><span className="text-[10px] italic text-black uppercase font-black tracking-widest">No description provided</span></div>
                                                )}

                                                <div className="flex flex-wrap gap-3">
                                                    <div className="px-4 py-2 bg-accent-peach/10 rounded-2xl flex items-center gap-2 border border-accent-brown/5">
                                                        <Timer className="w-3.5 h-3.5 text-black" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/70">{s.duration_minutes} Minutes</span>
                                                    </div>
                                                    <div className="px-4 py-2 bg-brand/5 rounded-2xl flex items-center gap-2 border border-brand/10">
                                                        <Award className="w-3.5 h-3.5 text-brand" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand">{s.loyalty_points} Points</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-6 border-t border-accent-brown/5 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-black mb-1">{CLINIC_TEXT.services.priceLabel}</span>
                                                    <span className="text-3xl font-black text-accent-brown tracking-tighter">₱{s.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${s.is_active ? 'bg-green-50 border-green-100 text-green-600' : 'bg-accent-brown/5 border-transparent text-black'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-green-500 animate-pulse' : 'bg-accent-brown/20'}`} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{s.is_active ? CLINIC_TEXT.services.activeStatus : CLINIC_TEXT.services.hiddenStatus}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Pagination Controls */}
                                {services.length > SERVICES_PER_PAGE && (
                                    <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-xl shadow-accent-brown/5 border border-white">
                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-black">
                                            <Tag className="w-4 h-4" />
                                            Showing {(servicesPage - 1) * SERVICES_PER_PAGE + 1}-{Math.min(servicesPage * SERVICES_PER_PAGE, services.length)} of {services.length} services
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setServicesPage(p => Math.max(1, p - 1))} disabled={servicesPage === 1}
                                                className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-white border border-accent-brown/5 text-accent-brown hover:text-brand hover:shadow-lg transition-all disabled:opacity-30">
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                {Array.from({ length: Math.ceil(services.length / SERVICES_PER_PAGE) }).map((_, idx) => (
                                                    <button key={idx} onClick={() => setServicesPage(idx + 1)}
                                                        className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-black text-[10px] transition-all duration-300 ${servicesPage === idx + 1 ? 'bg-brand text-white shadow-lg' : 'bg-accent-peach/5 text-black hover:bg-accent-peach/20'}`}>
                                                        {idx + 1}
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => setServicesPage(p => Math.min(Math.ceil(services.length / SERVICES_PER_PAGE), p + 1))} disabled={servicesPage >= Math.ceil(services.length / SERVICES_PER_PAGE)}
                                                className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-white border border-accent-brown/5 text-accent-brown hover:text-brand hover:shadow-lg transition-all disabled:opacity-30">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

