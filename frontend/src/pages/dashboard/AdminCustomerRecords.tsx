import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Mail, User, Phone, Award, Clock, MoreVertical, Loader2, Trash2, Shield, ShieldCheck, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const AdminCustomerRecords = () => {
    const { user, isLoading: authLoading } = useAuth();
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionMenu, setActionMenu] = useState<{ id: string | null; x: number; y: number }>({ id: null, x: 0, y: 0 });
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, type: 'delete' | 'suspend', user: any | null }>({ show: false, type: 'delete', user: null });
    const [currentPage, setCurrentPage] = useState(1);
    const customersPerPage = 5;

    const fetchCustomers = async () => {
        const t = user?.token || localStorage.getItem('hivet_token');
        if (!t) return;
        try {
            const res = await fetch('http://localhost:8000/api/admin/users', {
                headers: { 'Authorization': `Bearer ${t}` }
            });
            if (res.ok) {
                const data = await res.json();
                const onlyCustomers = data.users.filter((u: any) => u.role === 'Customer');
                setCustomers(onlyCustomers);
            }
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        fetchCustomers();
        // Auto-refresh every 30 seconds to keep Last Active current
        const interval = setInterval(fetchCustomers, 30000);
        return () => clearInterval(interval);
    }, [authLoading, user?.token]);

    const handleDelete = async (userRecord: any) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${userRecord.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCustomers(prev => prev.filter(u => u.id !== userRecord.id));
                setActionMenu({ id: null, x: 0, y: 0 });
                setConfirmModal({ show: false, type: 'delete', user: null });
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleSuspend = async (userRecord: any) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${userRecord.id}/suspend`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Refresh list
                const refreshed = await fetch('http://localhost:8000/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await refreshed.json();
                const onlyCustomers = data.users.filter((u: any) => u.role === 'Customer');
                setCustomers(onlyCustomers);
                setActionMenu({ id: null, x: 0, y: 0 });
                setConfirmModal({ show: false, type: 'suspend', user: null });
            }
        } catch (err) {
            console.error('Suspend failed:', err);
        }
    };

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Refresh every minute
        return () => clearInterval(timer);
    }, []);

    const formatRelativeTime = (isoString: string) => {
        if (!isoString || isoString === 'Never') return 'Never';
        try {
            const date = new Date(isoString);
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `${diffInHours}h ago`;
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 30) return `${diffInDays}d ago`;
            
            return date.toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const filteredCustomers = customers.filter(u => {
        return u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (u.id && u.id.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * customersPerPage, currentPage * customersPerPage);

    return (
        <DashboardLayout title="Customer Records">
            <div className="space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] border border-accent-brown/5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand-dark">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-accent-brown">{customers.length}</p>
                                <p className="text-[10px] font-black text-black uppercase tracking-widest">Total Registered</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] border border-accent-brown/5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-accent-brown">{customers.filter(c => c.status === 'Active').length}</p>
                                <p className="text-[10px] font-black text-black uppercase tracking-widest">Active Accounts</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2rem] border border-accent-brown/5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent-peach/20 flex items-center justify-center text-brand-dark">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-accent-brown">
                                    {customers.reduce((acc, curr) => acc + (curr.loyalty_points || 0), 0)}
                                </p>
                                <p className="text-[10px] font-black text-black uppercase tracking-widest">Global Loyalty Points</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Control Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-11 pr-4 py-3 bg-accent-peach/10 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/30 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-4 py-2.5 bg-accent-peach/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:text-brand-dark transition-all flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5" />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-xs font-black uppercase tracking-widest text-black/60">
                                    <th className="px-8 py-6">Customer</th>
                                    <th className="px-6 py-6">Connectivity</th>
                                    <th className="px-6 py-6">Last Active</th>
                                    <th className="px-6 py-6">Status</th>
                                    <th className="px-8 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                                                <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">Querying customer records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">No customer records matching your search</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustomers.map((u, i) => (
                                        <motion.tr key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                            className="border-b border-accent-brown/5 hover:bg-accent-peach/5 transition-all cursor-pointer group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-accent-peach/30 flex items-center justify-center text-brand-dark font-black text-sm shrink-0 shadow-inner">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-accent-brown text-base group-hover:text-brand-dark transition-colors">{u.name}</p>
                                                        <p className="text-xs font-black text-black/60 uppercase tracking-widest mt-1">{u.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-black/80">
                                                        <Mail className="w-4 h-4 text-brand" />
                                                        {u.email}
                                                    </div>
                                                    {u.phone && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-black/60">
                                                            <Phone className="w-4 h-4" />
                                                            {u.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-sm font-bold text-black/80">
                                                    <Clock className="w-4 h-4 text-black/40" />
                                                    {formatRelativeTime(u.lastActive)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    u.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                    u.status === 'Suspended' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-orange-50 text-orange-700 border-orange-100'
                                                }`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActionMenu({ id: u.id, x: rect.left - 180, y: rect.top + window.scrollY });
                                                }} className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-lg hover:shadow-accent-brown/5 flex items-center justify-center text-black/30 hover:text-brand-dark transition-all">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-6 border-t border-accent-brown/5 flex items-center justify-between bg-accent-peach/5">
                        <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">
                            Showing {paginatedCustomers.length} of {filteredCustomers.length} records
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                                className="w-12 h-12 rounded-2xl bg-white border border-accent-brown/5 flex items-center justify-center text-black hover:text-brand transition-all disabled:opacity-20 shadow-sm"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-12 h-12 rounded-2xl text-xs font-black transition-all shadow-md ${
                                        currentPage === p 
                                        ? 'bg-brand text-white shadow-brand/20' 
                                        : 'bg-white text-accent-brown hover:text-brand'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages}
                                className="w-12 h-12 rounded-2xl bg-white border border-accent-brown/5 flex items-center justify-center text-black hover:text-brand transition-all disabled:opacity-20 shadow-sm"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Menu */}
            {actionMenu.id && (
                <div className="fixed inset-0 z-[100]" onClick={() => setActionMenu({ id: null, x: 0, y: 0 })}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ left: actionMenu.x, top: actionMenu.y + 45 }}
                        className="absolute w-56 bg-white rounded-2xl shadow-2xl border border-accent-brown/5 p-2 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => {
                            const user = customers.find(u => u.id === actionMenu.id);
                            if (user) setConfirmModal({ show: true, type: 'suspend', user });
                            setActionMenu({ id: null, x: 0, y: 0 });
                        }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/20 hover:text-brand-dark rounded-xl transition-all">
                            <Shield className="w-4 h-4" /> Suspend Customer
                        </button>
                        <button onClick={() => {
                            const user = customers.find(u => u.id === actionMenu.id);
                            if (user) setConfirmModal({ show: true, type: 'delete', user });
                            setActionMenu({ id: null, x: 0, y: 0 });
                        }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" /> Permanent Delete
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-accent-brown/20 backdrop-blur-sm" onClick={() => setConfirmModal({ show: false, type: 'delete', user: null })} />
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-white">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${confirmModal.type === 'delete' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            {confirmModal.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                        </div>
                        <h3 className="text-xl font-black text-accent-brown leading-tight mb-2 uppercase tracking-tight">
                            {confirmModal.type === 'delete' ? 'Delete Customer?' : 'Suspend Customer?'}
                        </h3>
                        <p className="text-sm font-medium text-accent-brown/60 mb-8">
                            Are you sure you want to perform this action on <b>{confirmModal.user?.name}</b>? This may affect their ability to access the platform.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal({ show: false, type: 'delete', user: null })} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Cancel</button>
                            <button onClick={() => confirmModal.user && (confirmModal.type === 'delete' ? handleDelete(confirmModal.user) : handleSuspend(confirmModal.user))}
                                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white ${confirmModal.type === 'delete' ? 'bg-red-600 shadow-lg shadow-red-200' : 'bg-amber-500 shadow-lg shadow-amber-200'}`}>Confirm</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AdminCustomerRecords;
