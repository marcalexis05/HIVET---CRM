import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, CheckCircle2, XCircle, Clock, ExternalLink,
    FileText, Store, User, MapPin, Eye, X, ShieldCheck, ShieldX,
    Truck, Building2, RefreshCw, RotateCw
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';

type ComplianceStatus = 'pending' | 'verified' | 'non_compliant';
type Tab = 'clinics' | 'riders';

interface ClinicRecord {
    id: number;
    clinic_name: string;
    owner_name: string;
    owner_middle_name?: string;
    owner_suffix?: string;
    email: string;
    location: string;
    bai_number: string;
    bai_document_url: string;
    mayors_permit: string;
    mayors_permit_url: string;
    owner_id_document_url?: string;
    compliance_status: ComplianceStatus;
    created_at: string;
}

interface RiderRecord {
    id: number;
    name: string;
    email: string;
    phone: string;
    compliance_status: ComplianceStatus;
    created_at: string;
    vehicle_type?: string;
    license_document_url?: string;
    vehicle_cr_url?: string;
    vehicle_or_url?: string;
    nbi_clearance_url?: string;
}

type AnyRecord = ClinicRecord | RiderRecord;

const statusConfig: Record<ComplianceStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <Clock className="w-3 h-3" /> },
    verified: { label: 'Verified', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    non_compliant: { label: 'Non-Compliant', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

const DocLink = ({ url, label, onClick }: { url?: string; label: string; onClick?: () => void }) =>
    url ? (
        <button 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClick) onClick();
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-brand/20 text-brand-dark text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand/5 transition-colors">
            <ExternalLink className="w-3 h-3" /> {label}
        </button>
    ) : (
        <div className="flex items-center justify-center w-full py-2.5 bg-accent-brown/5 rounded-xl">
            <p className="text-[9px] font-bold text-accent-brown/30 italic">No document uploaded</p>
        </div>
    );

const StatusBadge = ({ status }: { status: ComplianceStatus }) => {
    const sc = statusConfig[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${sc.bg} ${sc.color} ${sc.border}`}>
            {sc.icon} {sc.label}
        </span>
    );
};

const getDisplayName = (r: AnyRecord, t: Tab) =>
    t === 'clinics' ? (r as ClinicRecord).clinic_name || '—' : (r as RiderRecord).name;

const AdminCompliance = () => {
    const [searchParams] = useSearchParams();
    const tab: Tab = (searchParams.get('tab') as Tab) || 'clinics';

    const [clinics, setClinics] = useState<ClinicRecord[]>([]);
    const [riders, setRiders] = useState<RiderRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | ComplianceStatus>('all');
    const [selected, setSelected] = useState<AnyRecord | null>(null);
    const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<{ url: string, name: string, rotation: number } | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    const token = localStorage.getItem('hivet_token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [clinicRes, riderRes] = await Promise.all([
                fetch('http://localhost:8000/api/admin/compliance', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch('http://localhost:8000/api/admin/riders', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            if (clinicRes.ok) setClinics(await clinicRes.json());
            if (riderRes.ok) setRiders(await riderRes.json());
        } catch { /* silent */ }
        setLoading(false);
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Reset state when tab changes via URL
    useEffect(() => {
        setSearch('');
        setFilterStatus('all');
        setSelected(null);
        setConfirmAction(null);
        setRejectionReason('');
        setCurrentPage(1);
    }, [tab]);

    const records = tab === 'clinics' ? clinics : riders;
    const filtered = records.filter(r => {
        const matchStatus = filterStatus === 'all' || r.compliance_status === filterStatus;
        const name = getDisplayName(r, tab);
        const matchSearch = name?.toLowerCase().includes(search.toLowerCase()) ||
            r.email?.toLowerCase().includes(search.toLowerCase()) ||
            String(r.id).includes(search);
        return matchStatus && matchSearch;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const counts = (src: AnyRecord[]) => ({
        all: src.length,
        pending: src.filter(r => r.compliance_status === 'pending').length,
        verified: src.filter(r => r.compliance_status === 'verified').length,
        non_compliant: src.filter(r => r.compliance_status === 'non_compliant').length,
    });

    const clinicCounts = counts(clinics);
    const riderCounts = counts(riders);
    const currentCounts = tab === 'clinics' ? clinicCounts : riderCounts;

    const updateStatus = async (id: number, status: ComplianceStatus, notes?: string) => {
        setActionLoading(true);
        const endpoint = tab === 'clinics'
            ? `http://localhost:8000/api/admin/compliance/${id}`
            : `http://localhost:8000/api/admin/riders/${id}/compliance`;
        try {
            const body: { compliance_status: ComplianceStatus; notes?: string } = { compliance_status: status };
            if (notes) {
                body.notes = notes;
            }

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                if (tab === 'clinics') {
                    setClinics(prev => prev.map(r => r.id === id ? { ...r, compliance_status: status } : r));
                } else {
                    setRiders(prev => prev.map(r => r.id === id ? { ...r, compliance_status: status } : r));
                }
                if (selected?.id === id) setSelected(prev => prev ? { ...prev, compliance_status: status } : null);
                setConfirmAction(null);
                setRejectionReason('');
            } else {
                console.error('Failed to update status:', res.status, await res.text());
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const selectedClinic = selected && tab === 'clinics' ? selected as ClinicRecord : null;
    const selectedRider = selected && tab === 'riders' ? selected as RiderRecord : null;

    return (
        <DashboardLayout title="Compliance Review" hideHeader={!!viewingDoc}>
            <div className="space-y-6">

                {/* ── Overview Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {([
                        { label: 'Total Clinics', value: clinicCounts.all, icon: <Building2 className="w-5 h-5" />, color: 'text-brand-dark', bg: 'bg-brand/10' },
                        { label: 'Clinics Pending', value: clinicCounts.pending, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-100' },
                        { label: 'Total Riders', value: riderCounts.all, icon: <Truck className="w-5 h-5" />, color: 'text-brand-dark', bg: 'bg-brand/10' },
                        { label: 'Riders Pending', value: riderCounts.pending, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-100' },
                    ]).map((c, i) => (
                        <motion.div key={i} whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-accent-brown/5 p-5 flex items-center gap-4 shadow-sm">
                            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.color} shrink-0`}>{c.icon}</div>
                            <div>
                                <p className="text-2xl font-black text-accent-brown">{c.value}</p>
                                <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">{c.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>


                {/* ── Control Bar ── */}
                <div className="bg-white rounded-2xl border border-accent-brown/5 p-4 flex flex-col sm:flex-row gap-3 items-center shadow-sm">
                    <div className="relative w-full sm:w-72 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/30 group-focus-within:text-brand-dark transition-colors" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={`Search ${tab}...`}
                            className="w-full pl-9 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/30 transition-all" />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                        {(['all', 'pending', 'verified', 'non_compliant'] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30'}`}>
                                {s === 'all' ? `All (${currentCounts.all})` : s === 'non_compliant' ? `Non-Compliant (${currentCounts.non_compliant})` : `${s} (${currentCounts[s]})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-[2rem] border border-accent-brown/5 overflow-hidden shadow-sm">
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">
                                    <th className="px-6 py-5">{tab === 'clinics' ? 'Clinic' : 'Rider'}</th>
                                    <th className="px-6 py-5">Documents</th>
                                    <th className="px-6 py-5">Email</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && !loading && (
                                    <tr><td colSpan={5}>
                                        <div className="py-20 flex flex-col items-center gap-3 text-center">
                                            <ShieldCheck className="w-10 h-10 text-accent-brown/10" />
                                            <p className="text-xs font-black text-accent-brown/30 uppercase tracking-widest">No records found</p>
                                        </div>
                                    </td></tr>
                                )}
                                {loading && (
                                    <tr><td colSpan={5}>
                                        <div className="py-16 flex items-center justify-center">
                                            <RefreshCw className="w-6 h-6 text-brand-dark animate-spin" />
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && paginated.map((r, i) => (
                                    <motion.tr key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                        className="border-b border-accent-brown/5 hover:bg-accent-peach/5 transition-all cursor-pointer group"
                                        onClick={() => setSelected(r)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-accent-peach/40 flex items-center justify-center text-brand-dark shrink-0">
                                                    {tab === 'clinics' ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-accent-brown text-sm group-hover:text-brand-dark transition-colors">
                                                        {getDisplayName(r, tab)}
                                                    </p>
                                                    <p className="text-xs text-accent-brown/40">
                                                        {tab === 'clinics' ? (r as ClinicRecord).owner_name : (r as RiderRecord).phone} · {tab === 'clinics' ? 'CL-' : 'RD-'}{String(r.id).padStart(4, '0')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {tab === 'clinics' ? (
                                                    <>
                                                        {(r as ClinicRecord).bai_document_url ? (
                                                            <a href={(r as ClinicRecord).bai_document_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                                                className="text-[9px] text-brand-dark font-black flex items-center gap-1 hover:underline">
                                                                <ExternalLink className="w-2.5 h-2.5" /> BAI Doc
                                                            </a>
                                                        ) : <span className="text-[9px] text-accent-brown/30 italic">No BAI doc</span>}
                                                        {(r as ClinicRecord).mayors_permit_url ? (
                                                            <a href={(r as ClinicRecord).mayors_permit_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                                                className="text-[9px] text-brand-dark font-black flex items-center gap-1 hover:underline">
                                                                <ExternalLink className="w-2.5 h-2.5" /> Mayor's Permit
                                                            </a>
                                                        ) : <span className="text-[9px] text-accent-brown/30 italic">No permit doc</span>}
                                                    </>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {(r as RiderRecord).license_document_url ? (
                                                            <a href={(r as RiderRecord).license_document_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                                                className="text-[9px] text-brand-dark font-black flex items-center gap-1 hover:underline">
                                                                <ExternalLink className="w-2.5 h-2.5" /> License
                                                            </a>
                                                        ) : <span className="text-[9px] text-accent-brown/30 italic">No License</span>}
                                                        
                                                        {(r as RiderRecord).nbi_clearance_url ? (
                                                            <a href={(r as RiderRecord).nbi_clearance_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                                                className="text-[9px] text-brand-dark font-black flex items-center gap-1 hover:underline">
                                                                <ExternalLink className="w-2.5 h-2.5" /> NBI
                                                            </a>
                                                        ) : <span className="text-[9px] text-accent-brown/30 italic">No NBI</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-accent-brown/60 font-bold">{r.email}</td>
                                        <td className="px-6 py-4"><StatusBadge status={r.compliance_status} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={e => { e.stopPropagation(); setSelected(r); }}
                                                className="flex items-center gap-1.5 ml-auto text-xs font-black uppercase tracking-widest text-accent-brown/40 hover:text-brand-dark hover:bg-brand/5 px-4 py-2 rounded-xl transition-all">
                                                <Eye className="w-3.5 h-3.5" /> Review
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-accent-brown/5">
                        {paginated.map((r, i) => (
                            <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                className="p-5 cursor-pointer" onClick={() => setSelected(r)}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent-peach/30 flex items-center justify-center text-brand-dark shrink-0">
                                            {tab === 'clinics' ? <Store className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-accent-brown text-sm">
                                                {getDisplayName(r, tab)}
                                            </p>
                                            <p className="text-[10px] text-accent-brown/40 font-bold">{r.email}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={r.compliance_status} />
                                </div>
                            </motion.div>
                        ))}
                        {filtered.length === 0 && !loading && (
                            <div className="py-16 flex flex-col items-center gap-3 text-center">
                                <ShieldCheck className="w-10 h-10 text-accent-brown/10" />
                                <p className="text-xs font-black text-accent-brown/30 uppercase tracking-widest">No records found</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-accent-brown/40 uppercase tracking-widest">
                            Showing {paginated.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} {tab}
                        </span>
                        {totalPages > 1 && (
                            <div className="flex gap-1.5 items-center">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Prev
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                                    .map((p, idx, arr) => {
                                        const prev = arr[idx - 1];
                                        const showEllipsis = prev && p - prev > 1;
                                        return (
                                            <span key={p} className="flex items-center gap-1.5">
                                                {showEllipsis && <span className="text-[10px] text-accent-brown/30 font-bold">…</span>}
                                                <button
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${currentPage === p ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/60 hover:bg-accent-peach/30'}`}
                                                >
                                                    {p}
                                                </button>
                                            </span>
                                        );
                                    })}
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Review Modal ── */}
            <AnimatePresence>
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-accent-brown/20 backdrop-blur-md"
                            onClick={() => { setSelected(null); setConfirmAction(null); }} 
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-5xl bg-white shadow-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] z-10"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-accent-brown/5 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand-dark">
                                        {tab === 'clinics' ? <Store className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-accent-brown tracking-tight leading-tight">
                                            {tab === 'clinics' ? 'Clinic Verification' : 'Rider Verification'}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-accent-brown/40 font-black uppercase tracking-widest">Profile ID {tab === 'clinics' ? 'CL-' : 'RD-'}{String(selected.id).padStart(4, '0')}</span>
                                            <span className="w-1 h-1 rounded-full bg-accent-brown/20" />
                                            <span className="text-[10px] text-accent-brown/40 font-black uppercase tracking-widest">
                                                Joined {new Date(selected.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setSelected(null); setConfirmAction(null); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-brown/5 hover:bg-red-50 hover:text-red-500 transition-all text-accent-brown/40 group"
                                >
                                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-accent-peach/5">
                                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                    {/* Left Column: Information */}
                                    <div className="space-y-6">
                                        <section>
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">Platform Profile</p>
                                                <StatusBadge status={selected.compliance_status} />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-5 bg-white rounded-[1.5rem] border border-accent-brown/5 group shadow-sm transition-all hover:border-brand/30">
                                                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1 group-hover:text-brand-dark transition-colors">Professional Name</p>
                                                    <p className="text-sm font-black text-accent-brown">{getDisplayName(selected, tab)}</p>
                                                </div>
                                                <div className="p-5 bg-white rounded-[1.5rem] border border-accent-brown/5 group shadow-sm transition-all hover:border-brand/30">
                                                    <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest mb-1 group-hover:text-brand-dark transition-colors">Primary Email</p>
                                                    <p className="text-sm font-bold text-accent-brown break-all">{selected.email}</p>
                                                </div>
                                                
                                                {selectedClinic && (
                                                    <>
                                                        <div className="p-5 bg-white rounded-[1.5rem] border border-accent-brown/5 group shadow-sm transition-all hover:border-brand/30">
                                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1 group-hover:text-brand-dark transition-colors">Lead Veterinarian / Owner</p>
                                                            <p className="text-sm font-black text-accent-brown">{selectedClinic.owner_name || '—'}</p>
                                                        </div>
                                                        <div className="p-5 bg-white rounded-[1.5rem] border border-accent-brown/5 group shadow-sm transition-all hover:border-brand/30 sm:col-span-2">
                                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1 group-hover:text-brand-dark transition-colors">Business Location</p>
                                                            <div className="flex items-start gap-2">
                                                                <MapPin className="w-4 h-4 text-brand-dark mt-0.5 shrink-0" />
                                                                <p className="text-sm font-bold text-accent-brown">{selectedClinic.location || '—'}</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {selectedRider && (
                                                    <>
                                                        <div className="p-5 bg-white rounded-[1.5rem] border border-accent-brown/5 group shadow-sm transition-all hover:border-brand/30">
                                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1 group-hover:text-brand-dark transition-colors">Registered Contact</p>
                                                            <p className="text-sm font-black text-accent-brown">{selectedRider.phone || '—'}</p>
                                                        </div>
                                                        <div className="p-5 bg-white rounded-[1.5rem] border border-accent-brown/5 group shadow-sm transition-all hover:border-brand/30">
                                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest mb-1 group-hover:text-brand-dark transition-colors">Vehicle Type</p>
                                                            <p className="text-sm font-black text-accent-brown">{selectedRider.vehicle_type || '—'}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </section>

                                        <section className="p-8 bg-brand/5 rounded-[2.5rem] border border-brand/5">
                                            <p className="text-[10px] font-black text-brand-dark/40 uppercase tracking-widest mb-4">Case Determination</p>
                                            
                                            {!confirmAction ? (
                                                <div className="space-y-3">
                                                    {selected.compliance_status === 'pending' ? (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button onClick={() => setConfirmAction('reject')}
                                                                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-red-600 hover:bg-red-50 border border-red-100 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                                <ShieldX className="w-4 h-4" /> Decline
                                                            </button>
                                                            <button onClick={() => setConfirmAction('approve')}
                                                                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                                                                <ShieldCheck className="w-4 h-4" /> Verify
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => updateStatus(selected.id, 'pending')}
                                                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-orange-100 text-orange-600 hover:bg-orange-50 transition-all text-[10px] font-black uppercase tracking-widest">
                                                            <Clock className="w-4 h-4" /> Revert to Pending
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="text-center bg-white/60 p-5 rounded-2xl border border-white/80">
                                                        <p className={`text-xs font-black uppercase tracking-widest ${confirmAction === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                                                            {confirmAction === 'approve' ? 'Finalize Verification?' : 'Reject Submission?'}
                                                        </p>
                                                        <p className="text-[10px] text-accent-brown/50 font-bold mt-1">
                                                            {confirmAction === 'approve' 
                                                                ? 'Status will be updated and an approval email will be sent.' 
                                                                : 'A detailed rejection email will be sent to the owner.'}
                                                        </p>
                                                    </div>

                                                    {confirmAction === 'reject' && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest ml-1">Reasons for Rejection</p>
                                                            <textarea 
                                                                value={rejectionReason}
                                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                                placeholder="e.g. Mayor's Permit is expired or blurry. BAI Registration number doesn't match."
                                                                className="w-full h-32 p-4 rounded-2xl bg-white border border-red-100 text-xs font-bold text-accent-brown placeholder:text-accent-brown/20 focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all resize-none shadow-sm"
                                                            />
                                                            <p className="text-[9px] text-accent-brown/40 italic ml-1">* The clinic owner will see these reasons in their notification email.</p>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-3">
                                                        <button onClick={() => { setConfirmAction(null); setRejectionReason(''); }}
                                                            className="flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-white transition-all">Cancel</button>
                                                        <button onClick={() => updateStatus(selected.id, confirmAction === 'approve' ? 'verified' : 'non_compliant', confirmAction === 'reject' ? rejectionReason : undefined)}
                                                            disabled={actionLoading || (confirmAction === 'reject' && !rejectionReason.trim())}
                                                            className={`flex-[2] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 shadow-lg ${confirmAction === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}>
                                                            {actionLoading ? 'Finalizing...' : 'Submit Decision'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    {/* Right Column: Documents */}
                                    <div className="space-y-6">
                                        <section>
                                            <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest mb-4">Verification Artifacts</p>
                                            
                                            {selectedClinic ? (
                                                <div className="grid gap-4">
                                                    {[
                                                        { label: 'BAI Registration', sub: 'Animal Welfare Act Compliance', icon: <ShieldCheck className="w-5 h-5 text-brand" />, url: selectedClinic.bai_document_url, num: selectedClinic.bai_number },
                                                        { label: "Mayor's Permit", sub: 'Business Operation License', icon: <Building2 className="w-5 h-5 text-brand" />, url: selectedClinic.mayors_permit_url, num: selectedClinic.mayors_permit },
                                                        { label: 'Owner Identity', sub: 'Government Issued Identification', icon: <User className="w-5 h-5 text-brand" />, url: selectedClinic.owner_id_document_url }
                                                    ].map((doc, idx) => (
                                                        <div key={idx} className="bg-white p-5 rounded-[2rem] border border-accent-brown/10 hover:border-brand/40 transition-all shadow-sm group">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-accent-peach/10 flex items-center justify-center">
                                                                        {doc.icon}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-accent-brown group-hover:text-brand-dark transition-colors">{doc.label}</p>
                                                                        <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-tight">{doc.sub}</p>
                                                                    </div>
                                                                </div>
                                                                {doc.num && (
                                                                    <span className="px-2.5 py-1 bg-accent-brown/5 rounded-full text-[9px] font-black text-accent-brown/60">Ref: {doc.num}</span>
                                                                )}
                                                            </div>
                                                            <DocLink 
                                                                url={doc.url} 
                                                                label="Open Document Viewer" 
                                                                onClick={() => doc.url && setViewingDoc({ url: doc.url, name: doc.label, rotation: 0 })}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : selectedRider ? (
                                                <div className="grid gap-4">
                                                    {[
                                                        { label: "Driver's License", sub: 'Identity Proof', icon: <User className="w-5 h-5 text-brand" />, url: selectedRider.license_document_url },
                                                        { label: 'Vehicle CR', sub: 'Registration', icon: <Truck className="w-5 h-5 text-brand" />, url: selectedRider.vehicle_cr_url },
                                                        { label: 'Vehicle OR', sub: 'Official Receipt', icon: <FileText className="w-5 h-5 text-brand" />, url: selectedRider.vehicle_or_url },
                                                        { label: 'Clearance', sub: 'NBI / Police Clearance', icon: <ShieldCheck className="w-5 h-5 text-brand" />, url: selectedRider.nbi_clearance_url }
                                                    ].map((doc, idx) => doc.url ? (
                                                        <div key={idx} className="bg-white p-5 rounded-[2rem] border border-accent-brown/10 hover:border-brand/40 transition-all shadow-sm group">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-accent-peach/10 flex items-center justify-center">
                                                                        {doc.icon}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-accent-brown group-hover:text-brand-dark transition-colors">{doc.label}</p>
                                                                        <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-tight">{doc.sub}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <DocLink 
                                                                url={doc.url} 
                                                                label="Open Document Viewer" 
                                                                onClick={() => setViewingDoc({ url: doc.url!, name: doc.label, rotation: 0 })}
                                                            />
                                                        </div>
                                                    ) : null)}
                                                    
                                                    {(!selectedRider.license_document_url && !selectedRider.vehicle_cr_url && !selectedRider.nbi_clearance_url) && (
                                                        <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-accent-brown/10 shadow-inner">
                                                            <FileText className="w-12 h-12 text-accent-brown/10 mx-auto mb-4" />
                                                            <p className="text-xs font-black text-accent-brown/30 uppercase tracking-widest italic leading-relaxed">No documents uploaded.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {viewingDoc && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-10">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-xl"
                            onClick={() => setViewingDoc(null)} 
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center gap-6 z-10"
                        >
                            {/* Toolbar */}
                            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none">
                                <div className="pointer-events-auto">
                                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">{viewingDoc.name}</h3>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Verification Document View</p>
                                </div>
                                <div className="flex items-center gap-3 pointer-events-auto">
                                    <button 
                                        onClick={() => setViewingDoc(prev => prev ? { ...prev, rotation: (prev.rotation + 90) % 360 } : null)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all group"
                                        title="Rotate Image"
                                    >
                                        <RotateCw className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    </button>
                                    <button 
                                        onClick={() => setViewingDoc(null)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                                <motion.img 
                                    key={viewingDoc.url + viewingDoc.rotation}
                                    src={viewingDoc.url}
                                    style={{ rotate: viewingDoc.rotation }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default AdminCompliance;
