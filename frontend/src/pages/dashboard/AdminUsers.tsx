import { motion } from 'framer-motion';
import { Search, Filter, Mail, Shield, User, Store, MoreVertical } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const AdminUsers = () => {
    const users = [
        { id: 'USR-901', name: 'Gene Admin', email: 'admin@hivet.com', role: 'Super Admin', status: 'Active', lastActive: '2 mins ago' },
        { id: 'USR-902', name: 'Dr. Sarah Jenkins', email: 'business@hivet.com', role: 'Partner', status: 'Active', lastActive: '1 hour ago' },
        { id: 'USR-903', name: 'Mike Roberts', email: 'mike.r@business.com', role: 'Partner', status: 'Active', lastActive: '3 hours ago' },
        { id: 'USR-904', name: 'John Doe', email: 'user@hivet.com', role: 'Owner', status: 'Active', lastActive: '5 hours ago' },
        { id: 'USR-905', name: 'Emma Thompson', email: 'emma.t@example.com', role: 'Owner', status: 'Active', lastActive: '1 day ago' },
        { id: 'USR-906', name: 'Test User', email: 'test@example.com', role: 'Owner', status: 'Inactive', lastActive: '2 weeks ago' },
    ];

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Super Admin': return <Shield className="w-4 h-4" />;
            case 'Partner': return <Store className="w-4 h-4" />;
            case 'Owner': return <User className="w-4 h-4" />;
            default: return <User className="w-4 h-4" />;
        }
    };

    const getRoleStyle = (role: string) => {
        switch (role) {
            case 'Super Admin': return 'bg-red-100 text-red-700 border-red-200';
            case 'Partner': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Owner': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

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
                                className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                            />
                        </div>
                        <button className="w-10 h-10 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown/60 hover:text-brand-dark hover:bg-accent-peach/60 transition-colors shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                        {['All Users', 'Admins', 'Partners', 'Owners'].map((tab, i) => (
                            <button key={tab} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${i === 0 ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-accent-brown/5 text-[9px] font-black uppercase tracking-widest text-accent-brown/40">
                                    <th className="px-6 py-5 whitespace-nowrap">User Info</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Role</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Last Active</th>
                                    <th className="px-6 py-5 whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
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
                                                        <span className="truncate">{u.email}</span>
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
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-green-600' : 'text-red-500'}`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-xs text-accent-brown/70">{u.lastActive}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown/40 hover:bg-white hover:text-brand-dark hover:shadow-sm transition-all ml-auto">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-accent-brown/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest max-w-[100px] truncate">Showing 1 to 6 of 8,420 users</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/30 transition-colors" disabled>Prev</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand/10 text-brand-dark">1</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-brown/60 hover:bg-accent-peach/30 transition-colors">2</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-brand/10 transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminUsers;
