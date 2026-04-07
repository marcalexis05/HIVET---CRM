import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, CheckCircle2, XCircle, MoreVertical,
    Store, AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const API_BASE = 'http://localhost:8000';
const PAGE_SIZE = 10;

interface Business {
    id: string;
    db_id: number;
    name: string;
    owner: string;
    email: string;
    phone: string;
    status: 'Active' | 'Pending' | 'Inactive';
    compliance_status: string;
    joined: string;
}

interface ApiResponse {
    businesses: Business[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

const STATUS_TABS = ['All Partners', 'Active', 'Pending', 'Inactive'] as const;

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'Active':   return 'bg-green-100 text-green-700 border-green-200';
        case 'Pending':  return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'Inactive': return 'bg-red-100 text-red-700 border-red-200';
        default:         return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'Active')   return <CheckCircle2 className="w-3 h-3" />;
    if (status === 'Pending')  return <AlertCircle className="w-3 h-3" />;
    if (status === 'Inactive') return <XCircle className="w-3 h-3" />;
    return null;
};

const AdminBusinesses = () => {
    const [businesses, setBusinesses]   = useState<Business[]>([]);
    const [total, setTotal]             = useState(0);
    const [totalPages, setTotalPages]   = useState(1);
    const [page, setPage]               = useState(1);
    const [search, setSearch]           = useState('');
    const [activeTab, setActiveTab]     = useState<typeof STATUS_TABS[number]>('All Partners');
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [actionMenu, setActionMenu]   = useState<number | null>(null);   // db_id of open menu
    const [updating, setUpdating]       = useState<number | null>(null);   // db_id being updated
    const searchTimeout                 = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchBusinesses = useCallback(async (pg: number, q: string, tab: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('hivet_token');
            const statusParam = tab === 'All Partners' ? '' : `&status=${tab}`;
            const searchParam = q ? `&search=${encodeURIComponent(q)}` : '';
            const url = `${API_BASE}/api/admin/businesses?page=${pg}&limit=${PAGE_SIZE}${statusParam}${searchParam}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
            const data: ApiResponse = await res.json();
            setBusinesses(data.businesses);
            setTotal(data.total);
            setTotalPages(data.total_pages);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load businesses');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + tab/page change
    useEffect(() => {
        fetchBusinesses(page, search, activeTab);
    }, [page, activeTab, fetchBusinesses]);

    // Debounced search
    const handleSearch = (val: string) => {
        setSearch(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setPage(1);
            fetchBusinesses(1, val, activeTab);
        }, 400);
    };

    const handleTabChange = (tab: typeof STATUS_TABS[number]) => {
        setActiveTab(tab);
        setPage(1);
    };

    const handleStatusUpdate = async (dbId: number, newComplianceStatus: string) => {
        setUpdating(dbId);
        setActionMenu(null);
        try {
            const token = localStorage.getItem('hivet_token');
            const res = await fetch(`${API_BASE}/api/admin/businesses/${dbId}/status`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ compliance_status: newComplianceStatus }),
            });
            if (!res.ok) throw new Error('Update failed');
            // Refresh current view
            await fetchBusinesses(page, search, activeTab);
        } catch {
            setError('Failed to update Status');
        } finally {
            setUpdating(null);
        }
    };

    const statusToCompliance: Record<string, string> = {
        Active:   'verified',
        Pending:  'pending',
        Inactive: 'non_compliant',
    };

    // Close action menu on outside click
    useEffect(() => {
        const close = () => setActionMenu(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    const visiblePages = pageNumbers.filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1));

    return (
        <DashboardLayout title="Partner Businesses">
            <div className="space-y-6">

                {/* Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                            <input
                                type="text"
                                placeholder="Search clinics or owners..."
                                value={search}
                                onChange={e => handleSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => fetchBusinesses(page, search, activeTab)}
                            className="w-10 h-10 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center md:items-center gap-2 w-full md:w-auto pb-2 md:pb-0">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap w-[calc(50%-0.35rem)] md:w-auto shrink-0 ${activeTab === tab ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Businesses List Container */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">

                    {/* Loading / Error */}
                    {loading && (
                        <div className="flex items-center justify-center py-24 gap-3 text-accent-brown/40">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm font-bold">Loading businesses…</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-red-500">
                            <XCircle className="w-8 h-8" />
                            <span className="text-sm font-bold">{error}</span>
                            <button onClick={() => fetchBusinesses(page, search, activeTab)} className="mt-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest">Retry</button>
                        </div>
                    )}

                    {!loading && !error && businesses.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-accent-brown/30">
                            <Store className="w-10 h-10" />
                            <span className="text-sm font-bold">No businesses found</span>
                        </div>
                    )}

                    {/* Desktop Table View */}
                    {!loading && !error && businesses.length > 0 && (
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-accent-brown/5 text-[9px] font-black uppercase tracking-widest text-accent-brown/40">
                                        <th className="px-6 py-5 whitespace-nowrap">Business ID</th>
                                        <th className="px-6 py-5 whitespace-nowrap">Clinic / Store</th>
                                        <th className="px-6 py-5 whitespace-nowrap">Status</th>
                                        <th className="px-6 py-5 whitespace-nowrap text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {businesses.map((biz, i) => (
                                            <motion.tr
                                                key={biz.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="border-b border-accent-brown/5 hover:bg-accent-peach/5 xl:hover:scale-[1.01] transition-all origin-left group cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-accent-brown text-xs">{biz.id}</span>
                                                    <span className="block text-[10px] text-accent-brown/40 mt-0.5">Joined {biz.joined}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-accent-peach/40 flex items-center justify-center text-brand-dark shrink-0">
                                                            <Store className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <span className="block font-bold text-accent-brown text-xs group-hover:text-brand-dark transition-colors">{biz.name}</span>
                                                            <span className="block text-[10px] text-accent-brown/50 mt-0.5">{biz.owner}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {updating === biz.db_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-brand" />
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(biz.status)}`}>
                                                            <StatusIcon status={biz.status} />
                                                            {biz.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="relative inline-block">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === biz.db_id ? null : biz.db_id); }}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown/40 hover:bg-white hover:text-brand-dark hover:shadow-sm transition-all ml-auto"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        {actionMenu === biz.db_id && (
                                                            <div
                                                                onClick={e => e.stopPropagation()}
                                                                className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-2xl border border-accent-brown/10 min-w-[160px] overflow-hidden"
                                                            >
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 px-4 pt-3 pb-1">Set Status</p>
                                                                {(['Active', 'Pending', 'Inactive'] as const).map(s => (
                                                                    <button
                                                                        key={s}
                                                                        disabled={biz.status === s}
                                                                        onClick={() => handleStatusUpdate(biz.db_id, statusToCompliance[s])}
                                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${biz.status === s ? 'text-accent-brown/30 cursor-default' : 'text-accent-brown hover:bg-accent-peach/30'}`}
                                                                    >
                                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(s)}`}>
                                                                            <StatusIcon status={s} />{s}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Mobile Card View */}
                    {!loading && !error && businesses.length > 0 && (
                        <div className="md:hidden divide-y divide-accent-brown/5">
                            {businesses.map((biz, i) => (
                                <motion.div
                                    key={biz.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="p-5 space-y-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-accent-peach/30 flex items-center justify-center text-brand-dark shrink-0 shadow-sm">
                                                <Store className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-accent-brown text-sm truncate">{biz.name}</h4>
                                                <p className="text-[10px] font-bold text-accent-brown/50 mt-0.5 uppercase tracking-wide">{biz.owner}</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === biz.db_id ? null : biz.db_id); }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown/40"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {actionMenu === biz.db_id && (
                                                <div
                                                    onClick={e => e.stopPropagation()}
                                                    className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-2xl border border-accent-brown/10 min-w-[160px] overflow-hidden"
                                                >
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 px-4 pt-3 pb-1">Set Status</p>
                                                    {(['Active', 'Pending', 'Inactive'] as const).map(s => (
                                                        <button
                                                            key={s}
                                                            disabled={biz.status === s}
                                                            onClick={() => handleStatusUpdate(biz.db_id, statusToCompliance[s])}
                                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${biz.status === s ? 'text-accent-brown/30 cursor-default' : 'text-accent-brown hover:bg-accent-peach/30'}`}
                                                        >
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(s)}`}>
                                                                <StatusIcon status={s} />{s}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Business ID</p>
                                            <p className="text-xs font-bold text-accent-brown">{biz.id}</p>
                                            <p className="text-[8px] text-accent-brown/40 font-bold uppercase tracking-[0.1em]">Joined {biz.joined}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Status</p>
                                            {updating === biz.db_id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(biz.status)}`}>
                                                    <StatusIcon status={biz.status} />{biz.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Pagination Footer */}
                    {!loading && !error && (
                        <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">
                                Showing {businesses.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                            </span>
                            <div className="flex gap-1.5 items-center">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <ChevronLeft className="w-3 h-3" /> Prev
                                </button>
                                {visiblePages.map((p, idx) => {
                                    const prev = visiblePages[idx - 1];
                                    const showEllipsis = prev && p - prev > 1;
                                    return (
                                        <span key={p} className="flex items-center gap-1.5">
                                            {showEllipsis && <span className="text-[10px] text-accent-brown/30 font-bold">…</span>}
                                            <button
                                                onClick={() => setPage(p)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${page === p ? 'bg-brand/10 text-brand-dark' : 'text-accent-brown/60 hover:bg-accent-peach/30'}`}
                                            >
                                                {p}
                                            </button>
                                        </span>
                                    );
                                })}
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    Next <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminBusinesses;
