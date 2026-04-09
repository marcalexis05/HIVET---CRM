import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Mail, Shield, User, Store, MoreVertical, Bike, Loader2, Check, Trash2, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const AdminCustomers = () => {
    const { user, isLoading: authLoading } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All Users');
    const [actionMenu, setActionMenu] = useState<{ id: string | null; x: number; y: number }>({ id: null, x: 0, y: 0 });
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, type: 'delete' | 'suspend', user: any | null }>({ show: false, type: 'delete', user: null });

    useEffect(() => {
        const fetchUsers = async () => {
            // Ensure auth state is restored before fetching
            if (authLoading) return;
            
            const token = user?.token || localStorage.getItem('hivet_token');
            if (!token) return;

            try {
                const res = await fetch('http://localhost:8000/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data.users);
                }
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [authLoading, user?.token]);

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Super Admin': 
            case 'System Admin': return <Shield className="w-4 h-4" />;
            case 'Partner': return <Store className="w-4 h-4" />;
            case 'Customer': return <User className="w-4 h-4" />;
            case 'Rider': return <Bike className="w-4 h-4" />;
            default: return <User className="w-4 h-4" />;
        }
    };

    const getRoleStyle = (role: string) => {
        switch (role) {
            case 'Super Admin':
            case 'System Admin': return 'bg-red-50 text-red-700 border-red-100';
            case 'Partner': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Customer': return 'bg-accent-peach/20 text-accent-brown border-accent-brown/5';
            case 'Rider': return 'bg-orange-50 text-orange-700 border-orange-100';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handleDelete = async (userRecord: any) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${userRecord.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== userRecord.id));
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
                setUsers(data.users);
                setActionMenu({ id: null, x: 0, y: 0 });
                setConfirmModal({ show: false, type: 'suspend', user: null });
            }
        } catch (err) {
            console.error('Suspend failed:', err);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeTab === 'All Users') return matchesSearch;
        if (activeTab === 'Admins') return matchesSearch && (u.role === 'Super Admin' || u.role === 'System Admin');
        if (activeTab === 'Partners') return matchesSearch && u.role === 'Partner';
        if (activeTab === 'Customers') return matchesSearch && u.role === 'Customer';
        if (activeTab === 'Riders') return matchesSearch && u.role === 'Rider';
        return matchesSearch;
    });

    return (
        <DashboardLayout title="Global Users">
            <div className="space-y-6">

                {/* Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                            />
                        </div>
                        <button className="w-10 h-10 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center md:items-center gap-2 w-full md:w-auto pb-2 md:pb-0">
                        {['All Users', 'Admins', 'Partners', 'Customers', 'Riders'].map((tab) => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap w-[calc(50%-0.35rem)] md:w-auto shrink-0 ${activeTab === tab ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Users List Container */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    {/* Desktop Table View (Hidden on mobile) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-[9px] font-black uppercase tracking-widest text-accent-brown/40">
                                    <th className="px-6 py-5 whitespace-nowrap">User Info</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Role</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-5 whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                                                <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">Accessing platform directory...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">No users found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u, i) => (
                                        <motion.tr
                                            key={u.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="border-b border-accent-brown/5 hover:bg-accent-peach/5 xl:hover:scale-[1.01] transition-all origin-left group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-accent-peach/30 flex items-center justify-center text-brand-dark font-black text-xs shrink-0">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-accent-brown text-sm group-hover:text-brand-dark transition-colors">{u.name}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs font-medium text-accent-brown/50">
                                                            <Mail className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate max-w-[150px]">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getRoleStyle(u.role)}`}>
                                                    {getRoleIcon(u.role)}
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    u.status === 'Active' ? 'text-green-600' : 
                                                    u.status === 'Pending' ? 'text-orange-500' :
                                                    'text-red-500'
                                                }`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActionMenu({ 
                                                            id: u.id === actionMenu.id ? null : u.id, 
                                                            x: rect.left - 160, 
                                                            y: rect.top + window.scrollY 
                                                        });
                                                    }}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ml-auto ${actionMenu.id === u.id ? 'bg-brand text-white' : 'text-accent-brown/40 hover:bg-white hover:text-brand-dark hover:shadow-sm'}`}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View (Hidden on desktop) */}
                    <div className="md:hidden divide-y divide-accent-brown/5">
                        {loading ? (
                            <div className="py-20 text-center">
                                <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">Accessing platform directory...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">No users found</p>
                            </div>
                        ) : (
                            filteredUsers.map((u, i) => (
                                <motion.div
                                    key={u.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-5 space-y-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-accent-peach/30 flex items-center justify-center text-brand-dark font-black text-base shadow-sm shrink-0">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-accent-brown text-sm truncate">{u.name}</h4>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-accent-brown/50">
                                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{u.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown/40">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Role</p>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getRoleStyle(u.role)}`}>
                                                {getRoleIcon(u.role)}
                                                {u.role}
                                            </span>
                                        </div>
                                         <div className="space-y-1">
                                             <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Status</p>
                                             <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                 u.status === 'Active' ? 'text-green-600' : 
                                                 u.status === 'Pending' ? 'text-orange-500' :
                                                 'text-red-500'
                                             }`}>
                                                 {u.status}
                                             </span>
                                         </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                    {/* Pagination Footer */}
                    {!loading && (
                        <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest max-w-[150px] truncate">Showing {filteredUsers.length} of {users.length} users</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors" disabled>Prev</button>
                                <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand/10 text-brand-dark">1</button>
                                <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/30 transition-colors">2</button>
                                <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Menu */}
            {actionMenu.id && (
                <div 
                    className="fixed inset-0 z-[300]" 
                    onClick={() => setActionMenu({ id: null, x: 0, y: 0 })}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{ left: actionMenu.x, top: actionMenu.y + 40 }}
                        className="absolute w-48 bg-white rounded-2xl shadow-2xl border border-accent-brown/5 p-2 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => {
                                const user = users.find(u => u.id === actionMenu.id);
                                if (user) navigator.clipboard.writeText(user.email);
                                setActionMenu({ id: null, x: 0, y: 0 });
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/20 hover:text-brand-dark rounded-xl transition-all text-left"
                        >
                            <Mail className="w-3.5 h-3.5" />
                            Copy Email
                        </button>
                        <button 
                            onClick={() => {
                                const targetUser = users.find(u => u.id === actionMenu.id);
                                if (targetUser) setConfirmModal({ show: true, type: 'suspend', user: targetUser });
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/20 hover:text-brand-dark rounded-xl transition-all text-left group"
                        >
                            <Shield className="w-3.5 h-3.5 text-accent-brown/40 group-hover:text-amber-600" />
                            Suspend User
                        </button>

                        <div className="h-px bg-accent-brown/5 my-1" />

                        <button 
                            onClick={() => {
                                const targetUser = users.find(u => u.id === actionMenu.id);
                                if (targetUser) setConfirmModal({ show: true, type: 'delete', user: targetUser });
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-xl transition-all text-left group"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-300 group-hover:text-red-500" />
                            Delete Account
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-accent-brown/20 backdrop-blur-sm"
                        onClick={() => setConfirmModal({ show: false, type: 'delete', user: null })}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md border border-white"
                    >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${confirmModal.type === 'delete' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            {confirmModal.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                        </div>
                        
                        <h3 className="text-xl font-black text-accent-brown leading-tight mb-2 uppercase tracking-tight">
                            {confirmModal.type === 'delete' ? 'Delete User Account?' : 'Update User Status?'}
                        </h3>
                        <p className="text-sm font-medium text-accent-brown/60 mb-8">
                            {confirmModal.type === 'delete' 
                                ? `You are about to permanently remove user ${confirmModal.user?.id}. This action cannot be undone.` 
                                : `Do you want to toggle the suspension status for user ${confirmModal.user?.id}?`}
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmModal({ show: false, type: 'delete', user: null })}
                                className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/20 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => confirmModal.user && (confirmModal.type === 'delete' ? handleDelete(confirmModal.user) : handleSuspend(confirmModal.user))}
                                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all ${confirmModal.type === 'delete' ? 'bg-red-500 shadow-red-200 hover:bg-red-600' : 'bg-amber-500 shadow-amber-200 hover:bg-amber-600'}`}
                            >
                                {confirmModal.type === 'delete' ? 'Delete Now' : 'Confirm'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AdminCustomers;
