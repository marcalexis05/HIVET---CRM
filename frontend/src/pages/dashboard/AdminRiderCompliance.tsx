import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, CheckCircle2, XCircle, Clock, ExternalLink,
    FileText, User, Eye, X, ShieldCheck, ShieldX,
    Truck, RefreshCw, RotateCw
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

type ComplianceStatus = 'pending' | 'verified' | 'non_compliant';

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

const AdminRiderCompliance = () => {
    const [riders, setRiders] = useState<RiderRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | ComplianceStatus>('all');
    const [selected, setSelected] = useState<RiderRecord | null>(null);
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
            const res = await fetch('http://localhost:8000/api/admin/riders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setRiders(await res.json());
        } catch { /* silent */ }
        setLoading(false);
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = riders.filter(r => {
        const matchStatus = filterStatus === 'all' || r.compliance_status === filterStatus;
        const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) ||
            r.email?.toLowerCase().includes(search.toLowerCase()) ||
            String(r.id).includes(search);
        return matchStatus && matchSearch;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const counts = {
        all: riders.length,
        pending: riders.filter(r => r.compliance_status === 'pending').length,
        verified: riders.filter(r => r.compliance_status === 'verified').length,
        non_compliant: riders.filter(r => r.compliance_status === 'non_compliant').length,
    };

    const updateStatus = async (id: number, status: ComplianceStatus, notes?: string) => {
        setActionLoading(true);
        const endpoint = `http://localhost:8000/api/admin/riders/${id}/compliance`;
        try {
            const body: { compliance_status: ComplianceStatus; notes?: string } = { compliance_status: status };
            if (notes) body.notes = notes;

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setRiders(prev => prev.map(r => r.id === id ? { ...r, compliance_status: status } : r));
                if (selected?.id === id) setSelected(prev => prev ? { ...prev, compliance_status: status } : null);
                setConfirmAction(null);
                setRejectionReason('');
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <DashboardLayout title="Rider Compliance" hideHeader={!!viewingDoc}>
            <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Fleet', value: counts.all, icon: <Truck className="w-5 h-5" />, color: 'text-brand-dark', bg: 'bg-brand/10' },
                        { label: 'Applications', value: counts.pending, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-100' },
                        { label: 'Active Riders', value: counts.verified, icon: <ShieldCheck className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-100' },
                        { label: 'Declined', value: counts.non_compliant, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-100' },
                    ].map((c, i) => (
                        <motion.div key={i} whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-accent-brown/5 p-5 flex items-center gap-4 shadow-sm">
                            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.color} shrink-0`}>{c.icon}</div>
                            <div>
                                <p className="text-2xl font-black text-accent-brown">{c.value}</p>
                                <p className="text-[10px] font-black text-black uppercase tracking-widest">{c.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Control Bar */}
                <div className="bg-white rounded-2xl border border-accent-brown/5 p-4 flex flex-col sm:flex-row gap-3 items-center shadow-sm">
                    <div className="relative w-full sm:w-72 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/30 group-focus-within:text-brand-dark transition-colors" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search riders by name..."
                            className="w-full pl-9 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-sm font-bold text-accent-brown placeholder:text-accent-brown/30 transition-all" />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                        {(['all', 'pending', 'verified', 'non_compliant'] as const).map(s => (
                            <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30'}`}>
                                {s === 'all' ? `All (${counts.all})` : s === 'non_compliant' ? `Rejected (${counts.non_compliant})` : `${s} (${counts[s]})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2rem] border border-accent-brown/5 overflow-hidden shadow-sm">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-xs font-black uppercase tracking-widest text-black">
                                    <th className="px-6 py-5">Rider</th>
                                    <th className="px-6 py-5">Vehicle Type</th>
                                    <th className="px-6 py-5">Documents</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && !loading && (
                                    <tr><td colSpan={5}>
                                        <div className="py-20 flex flex-col items-center gap-3 text-center">
                                            <ShieldCheck className="w-10 h-10 text-accent-brown/10" />
                                            <p className="text-xs font-black text-accent-brown/30 uppercase tracking-widest">No rider records found</p>
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
                                                    <Truck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-accent-brown text-base group-hover:text-brand-dark transition-colors">{r.name}</p>
                                                    <p className="text-sm font-bold text-black/70">{r.email} · RD-{String(r.id).padStart(4, '0')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-black font-bold uppercase tracking-widest">{r.vehicle_type || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {r.license_document_url && <span className="text-xs px-2.5 py-1 bg-brand/10 text-brand-dark font-black rounded-full uppercase tracking-widest">License</span>}
                                                {r.nbi_clearance_url && <span className="text-xs px-2.5 py-1 bg-brand/10 text-brand-dark font-black rounded-full uppercase tracking-widest">NBI</span>}
                                            </div>
                                        </td>
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
                                            <Truck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-accent-brown text-sm">{r.name}</p>
                                            <p className="text-[10px] text-accent-brown/40 font-bold">{r.email}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={r.compliance_status} />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-black/60 uppercase tracking-widest">
                            Showing {paginated.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} riders
                        </span>
                        {totalPages > 1 && (
                            <div className="flex gap-1.5 items-center">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors disabled:opacity-30">Prev</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors disabled:opacity-30">Next</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            <AnimatePresence>
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-accent-brown/20 backdrop-blur-md"
                            onClick={() => { setSelected(null); setConfirmAction(null); }} />
                        
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-white shadow-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] z-10">
                            
                            <div className="px-8 py-6 border-b border-accent-brown/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand-dark"><Truck className="w-6 h-6" /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-accent-brown">Rider Verification</h2>
                                        <p className="text-[10px] text-accent-brown/40 font-black uppercase tracking-widest">Profile ID RD-{String(selected.id).padStart(4, '0')}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelected(null); setConfirmAction(null); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-brown/5 hover:bg-red-50 hover:text-red-500 transition-all text-accent-brown/40">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-accent-peach/5">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-6">
                                        <section className="bg-white p-6 rounded-[2rem] border border-accent-brown/10 shadow-sm">
                                            <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest mb-4">Rider Profile</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="sm:col-span-2">
                                                    <p className="text-[9px] text-accent-brown/30 uppercase font-black">Full Name</p>
                                                    <p className="text-sm font-black text-accent-brown">{selected.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-accent-brown/30 uppercase font-black">Contact Email</p>
                                                    <p className="text-sm font-bold text-accent-brown break-all">{selected.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-accent-brown/30 uppercase font-black">Phone Number</p>
                                                    <p className="text-sm font-bold text-accent-brown">{selected.phone || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-accent-brown/30 uppercase font-black">Vehicle Type</p>
                                                    <p className="text-sm font-black text-accent-brown uppercase tracking-widest">{selected.vehicle_type || '—'}</p>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="p-8 bg-brand/5 rounded-[2.5rem] border border-brand/5">
                                            <p className="text-[10px] font-black text-brand-dark/40 uppercase tracking-widest mb-4">Fleet Status Decision</p>
                                            {!confirmAction ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={() => setConfirmAction('reject')} className="py-4 rounded-2xl bg-white text-red-600 border border-red-100 transition-all font-black text-[10px] uppercase tracking-widest">Decline App</button>
                                                    <button onClick={() => setConfirmAction('approve')} className="py-4 rounded-2xl bg-green-500 text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20">Verify Rider</button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="bg-white/60 p-5 rounded-2xl text-center">
                                                        <p className={`text-xs font-black uppercase tracking-widest ${confirmAction === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                                                            {confirmAction === 'approve' ? 'Verify Rider?' : 'Reject Application?'}
                                                        </p>
                                                    </div>
                                                    {confirmAction === 'reject' && (
                                                        <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                                            placeholder="State the reason for rejection..."
                                                            className="w-full h-32 p-4 rounded-2xl bg-white border border-red-100 text-xs font-bold outline-none resize-none shadow-sm" />
                                                    )}
                                                    <div className="flex gap-3">
                                                        <button onClick={() => { setConfirmAction(null); setRejectionReason(''); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Cancel</button>
                                                        <button onClick={() => updateStatus(selected.id, confirmAction === 'approve' ? 'verified' : 'non_compliant', rejectionReason)}
                                                            className={`flex-[2] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${confirmAction === 'approve' ? 'bg-green-600 shadow-green-600/20' : 'bg-red-600 shadow-red-600/20'}`}>
                                                            {actionLoading ? 'Updating...' : 'Confirm'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest mb-4">Verification Artifacts</p>
                                        <div className="grid gap-4">
                                            {[
                                                { label: "Driver's License", url: selected.license_document_url, sub: 'Identity Proof' },
                                                { label: 'Vehicle CR', url: selected.vehicle_cr_url, sub: 'Registration' },
                                                { label: 'Vehicle OR', url: selected.vehicle_or_url, sub: 'Tax Receipt' },
                                                { label: 'NBI / Police Clearance', url: selected.nbi_clearance_url, sub: 'Safety Check' }
                                            ].map((doc, idx) => doc.url ? (
                                                <div key={idx} className="bg-white p-5 rounded-[2rem] border border-accent-brown/10 hover:border-brand/40 transition-all shadow-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <p className="text-xs font-black text-accent-brown">{doc.label}</p>
                                                            <p className="text-[9px] text-accent-brown/30 font-bold uppercase tracking-widest">{doc.sub}</p>
                                                        </div>
                                                    </div>
                                                    <DocLink url={doc.url} label="Open Viewer" onClick={() => doc.url && setViewingDoc({ url: doc.url, name: doc.label, rotation: 0 })} />
                                                </div>
                                            ) : null)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {viewingDoc && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setViewingDoc(null)} />
                        
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center z-10">
                            <div className="absolute top-6 right-6 flex gap-4">
                                <button onClick={() => setViewingDoc(p => p ? { ...p, rotation: (p.rotation + 90) % 360 } : null)} className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><RotateCw className="w-5 h-5" /></button>
                                <button onClick={() => setViewingDoc(null)} className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><X className="w-5 h-5" /></button>
                            </div>
                            <img src={viewingDoc.url} style={{ rotate: `${viewingDoc.rotation}deg` }} className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg" alt="Doc" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default AdminRiderCompliance;
