import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, CheckCircle2, XCircle, MoreVertical, Bike, AlertCircle, ShieldCheck, RefreshCw, Mail, Check, Trash2, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import ModernModal from '../../components/ModernModal';
import { useAuth } from '../../context/AuthContext';

interface RiderRecord {
    id: number;
    name: string;
    email: string;
    phone: string;
    vehicle_type: string;
    compliance_status: string;
    created_at: string;
}

const AdminRiders = () => {
    const { user, isLoading: authLoading } = useAuth();
    const [riders, setRiders] = useState<RiderRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All Fleet');
    const [actionMenu, setActionMenu] = useState<{ id: number | null, x: number, y: number }>({ id: null, x: 0, y: 0 });
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const ridersPerPage = 5;

    useEffect(() => {
        if (!authLoading) {
            fetchRiders();
        }
    }, [authLoading, user?.token]);

    const fetchRiders = async () => {
        try {
            const token = user?.token || localStorage.getItem('hivet_token');
            if (!token) return;

            setLoading(true);
            const res = await fetch('http://localhost:8000/api/admin/riders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setRiders(data);
        } catch (err) {
            console.error('Failed to fetch riders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'delete' | 'verify', rider: RiderRecord) => {
        setProcessingId(rider.id);
        setActionMenu({ id: null, x: 0, y: 0 });
        
        try {
            const token = user?.token || localStorage.getItem('hivet_token');
            const url = action === 'delete' 
                ? `http://localhost:8000/api/admin/users/RD-${String(rider.id).padStart(4, '0')}`
                : `http://localhost:8000/api/admin/users/RD-${String(rider.id).padStart(4, '0')}/suspend`;
            
            const res = await fetch(url, {
                method: action === 'delete' ? 'DELETE' : 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                fetchRiders();
            } else {
                setModal({
                    isOpen: true,
                    title: 'Action Failed',
                    message: `Failed to ${action} rider. Please try again.`,
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(`Error performing ${action}:`, err);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'non_compliant': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'verified': return 'Active';
            case 'pending': return 'Pending';
            case 'non_compliant': return 'Inactive';
            default: return 'Unknown';
        }
    };

    const filteredRiders = riders.filter(r => {
        const matchesSearch = (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
                            (r.email || '').toLowerCase().includes(search.toLowerCase()) ||
                            (r.vehicle_type || '').toLowerCase().includes(search.toLowerCase());
                            
        let matchesTab = true;
        if (activeTab === 'Active') matchesTab = r.compliance_status === 'verified';
        if (activeTab === 'Pending') matchesTab = r.compliance_status === 'pending';
        if (activeTab === 'Inactive') matchesTab = r.compliance_status === 'non_compliant';

        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredRiders.length / ridersPerPage);
    const paginatedRiders = filteredRiders.slice((currentPage - 1) * ridersPerPage, currentPage * ridersPerPage);

    return (
        <DashboardLayout title="Platform Riders">
            <div className="space-y-6">
                {/* Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search riders, vehicles or emails..."
                                className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                            />
                        </div>
                        <button className="w-10 h-10 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center md:items-center gap-2 w-full md:w-auto pb-2 md:pb-0">
                        {['All Fleet', 'Active', 'Pending', 'Inactive'].map((tab, _i) => (
                            <button 
                                key={tab} 
                                onClick={() => {
                                    setActiveTab(tab);
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap w-[calc(50%-0.35rem)] md:w-auto shrink-0 ${activeTab === tab ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Riders List Container */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-[9px] font-black uppercase tracking-widest text-accent-brown/40">
                                    <th className="px-6 py-5 whitespace-nowrap">Rider ID</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Full Name & Contact</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Vehicle</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-5 whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan={5}>
                                        <div className="py-16 flex items-center justify-center">
                                            <RefreshCw className="w-6 h-6 text-brand-dark animate-spin" />
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && paginatedRiders.length === 0 && (
                                    <tr><td colSpan={5}>
                                        <div className="py-20 flex flex-col items-center gap-3 text-center">
                                            <ShieldCheck className="w-10 h-10 text-accent-brown/10" />
                                            <p className="text-xs font-black text-accent-brown/30 uppercase tracking-widest">No riders found</p>
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && paginatedRiders.map((rider, i) => (
                                    <motion.tr
                                        key={rider.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="border-b border-accent-brown/5 hover:bg-accent-peach/5 xl:hover:scale-[1.01] transition-all origin-left group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-accent-brown text-xs">RD-{String(rider.id).padStart(4, '0')}</span>
                                            <span className="block text-[10px] text-accent-brown/40 mt-0.5">Joined {new Date(rider.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-accent-peach/40 flex items-center justify-center text-brand-dark shrink-0">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-accent-brown text-xs group-hover:text-brand-dark transition-colors">{rider.name}</span>
                                                    <span className="block text-[10px] text-accent-brown/50 mt-0.5">{rider.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Bike className="w-3 h-3 text-brand-dark" />
                                                    <span className="text-xs font-bold text-accent-brown">{rider.vehicle_type || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(rider.compliance_status)}`}>
                                                {rider.compliance_status === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                                                {rider.compliance_status === 'pending' && <AlertCircle className="w-3 h-3" />}
                                                {rider.compliance_status === 'non_compliant' && <XCircle className="w-3 h-3" />}
                                                {getStatusText(rider.compliance_status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActionMenu({ 
                                                        id: rider.id === actionMenu.id ? null : rider.id, 
                                                        x: rect.left - 160, 
                                                        y: rect.top + window.scrollY 
                                                    });
                                                }}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ml-auto ${actionMenu.id === rider.id ? 'bg-brand text-white' : 'text-accent-brown/40 hover:bg-white hover:text-brand-dark hover:shadow-sm'}`}
                                            >
                                                {processingId === rider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-accent-brown/5">
                        {paginatedRiders.map((rider, i) => (
                            <motion.div
                                key={rider.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-5 space-y-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-accent-peach/30 flex items-center justify-center text-brand-dark shrink-0 shadow-sm">
                                            <Bike className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-black text-accent-brown text-sm truncate">{rider.name}</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium text-accent-brown/50">
                                                <span className="truncate">{rider.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setActionMenu({ 
                                                id: rider.id === actionMenu.id ? null : rider.id, 
                                                x: rect.left - 160, 
                                                y: rect.top + window.scrollY 
                                            });
                                        }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown/40"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Rider Details</p>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold text-accent-brown">{rider.vehicle_type || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Status</p>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(rider.compliance_status)}`}>
                                            {getStatusText(rider.compliance_status)}
                                        </span>
                                    </div>
                                    <div className="space-y-1 col-span-2 border-t border-accent-brown/5 pt-3">
                                        <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest text-[#CB975A]">Reference ID: RD-{String(rider.id).padStart(4, '0')}</p>
                                        <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest">Joined {new Date(rider.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest max-w-[150px] truncate">
                            Showing {paginatedRiders.length === 0 ? 0 : (currentPage - 1) * ridersPerPage + 1}–{Math.min(currentPage * ridersPerPage, filteredRiders.length)} of {filteredRiders.length} riders
                        </span>
                        {totalPages > 1 && (
                            <div className="flex gap-1.5 items-center">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
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
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Floating Action Menu */}
            {actionMenu.id && (
                <div 
                    className="fixed inset-0 z-[300]" 
                    onClick={() => setActionMenu({ id: null, x: 0, y: 0 })}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bg-white rounded-2xl shadow-2xl border border-accent-brown/5 py-2 w-48 z-[301]"
                        style={{ left: actionMenu.x, top: actionMenu.y }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => {
                                const rider = riders.find(r => r.id === actionMenu.id);
                                if (rider) {
                                    navigator.clipboard.writeText(rider.email);
                                    setActionMenu({ id: null, x: 0, y: 0 });
                                }
                            }}
                            className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-accent-peach/20 transition-colors group"
                        >
                            <Mail className="w-4 h-4 text-accent-brown/40 group-hover:text-brand" />
                            <span className="text-xs font-bold text-accent-brown/70 group-hover:text-accent-brown">Copy Email</span>
                        </button>

                        <button 
                            onClick={() => {
                                const rider = riders.find(r => r.id === actionMenu.id);
                                if (rider) {
                                    setModal({
                                        isOpen: true,
                                        title: 'Verify Rider Fleet?',
                                        message: `Do you want to toggle the verification status for ${rider.name}?`,
                                        type: 'confirm',
                                        onConfirm: () => handleAction('verify', rider)
                                    });
                                }
                            }}
                            className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-accent-peach/20 transition-colors group"
                        >
                            <Check className="w-4 h-4 text-accent-brown/40 group-hover:text-green-600" />
                            <span className="text-xs font-bold text-accent-brown/70 group-hover:text-accent-brown">Verify Rider</span>
                        </button>

                        <div className="h-px bg-accent-brown/5 my-1" />

                        <button 
                            onClick={() => {
                                const rider = riders.find(r => r.id === actionMenu.id);
                                if (rider) {
                                    setModal({
                                        isOpen: true,
                                        title: 'Delete Rider Account?',
                                        message: `You are about to permanently remove ${rider.name}. This action cannot be undone.`,
                                        type: 'danger',
                                        onConfirm: () => handleAction('delete', rider)
                                    });
                                }
                            }}
                            className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-50 transition-colors group"
                        >
                            <Trash2 className="w-4 h-4 text-red-300 group-hover:text-red-500" />
                            <span className="text-xs font-bold text-red-400 group-hover:text-red-600">Delete Account</span>
                        </button>
                    </motion.div>
                </div>
            )}
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

export default AdminRiders;
