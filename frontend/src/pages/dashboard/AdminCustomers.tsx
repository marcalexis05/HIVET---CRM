import { motion } from 'framer-motion';
import { Search, Mail, Phone, MapPin, ExternalLink, Award } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const AdminCustomers = () => {
    const customers = [
        { id: 'C-1044', name: 'Emma Thompson', email: 'emma.t@example.com', phone: '+1 (555) 123-4567', joined: 'Oct 2024', pets: ['Golden Retriever (Max)'], points: 2450, tier: 'Gold' },
        { id: 'C-1045', name: 'James Wilson', email: 'j.wilson@example.com', phone: '+1 (555) 987-6543', joined: 'Nov 2024', pets: ['Siamese Cat (Luna)'], points: 850, tier: 'Silver' },
        { id: 'C-1046', name: 'Sarah Davis', email: 'sarah.d@example.com', phone: '+1 (555) 456-7890', joined: 'Jan 2025', pets: ['French Bulldog (Rocky)', 'Persian Cat (Bella)'], points: 4200, tier: 'Platinum' },
        { id: 'C-1047', name: 'Michael Brown', email: 'mbrown99@example.com', phone: '+1 (555) 234-5678', joined: 'Feb 2025', pets: ['Beagle (Cooper)'], points: 150, tier: 'Bronze' },
        { id: 'C-1048', name: 'Jessica Taylor', email: 'jess.taylor@example.com', phone: '+1 (555) 876-5432', joined: 'Mar 2025', pets: ['Maine Coon (Leo)'], points: 1200, tier: 'Silver' },
        { id: 'C-1049', name: 'David Miller', email: 'd.miller@example.com', phone: '+1 (555) 345-6789', joined: 'Apr 2025', pets: ['Labrador (Daisy)'], points: 3100, tier: 'Platinum' },
    ];

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Platinum': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Gold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Silver': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-orange-50 text-orange-700 border-orange-200';
        }
    };

    return (
        <DashboardLayout title="Customer Data">
            <div className="space-y-6">

                {/* Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="relative flex-1 md:max-w-md w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Name, Email, or Pet..."
                            className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                        />
                    </div>
                </div>

                {/* Customer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customers.map((cus, i) => (
                        <motion.div
                            key={cus.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all group"
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-dark to-brand text-white flex items-center justify-center font-black text-xl shadow-lg shadow-brand/20">
                                        {cus.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-accent-brown text-lg tracking-tight leading-tight group-hover:text-brand-dark transition-colors">{cus.name}</h3>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40">ID: {cus.id}</span>
                                    </div>
                                </div>
                                <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-peach/20 text-accent-brown/40 hover:bg-brand hover:text-white transition-all">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-3 mb-6 bg-accent-peach/10 p-4 rounded-2xl border border-accent-peach/50">
                                <div className="flex items-center gap-3 text-xs font-medium text-accent-brown/70">
                                    <Mail className="w-3.5 h-3.5 text-accent-brown/40 shrink-0" />
                                    <span className="truncate">{cus.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-medium text-accent-brown/70">
                                    <Phone className="w-3.5 h-3.5 text-accent-brown/40 shrink-0" />
                                    <span className="truncate">{cus.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-medium text-accent-brown/70">
                                    <MapPin className="w-3.5 h-3.5 text-accent-brown/40 shrink-0" />
                                    <span className="truncate">Local Branch</span>
                                </div>
                            </div>

                            {/* Pets */}
                            <div className="mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-2 block">Registered Pets</span>
                                <div className="flex flex-wrap gap-2">
                                    {cus.pets.map(pet => (
                                        <span key={pet} className="bg-white border border-accent-brown/10 text-accent-brown text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                            {pet}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Loyalty Footer */}
                            <div className="pt-4 border-t border-accent-brown/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-brand-dark" />
                                    <span className="text-sm font-black text-accent-brown">{cus.points} <span className="text-[10px] text-accent-brown/40 uppercase tracking-widest">pts</span></span>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getTierColor(cus.tier)}`}>
                                    {cus.tier}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center pt-4">
                    <button className="px-8 py-3 rounded-xl bg-white border-2 border-accent-brown/10 text-xs font-black uppercase tracking-widest text-accent-brown hover:border-brand/30 hover:text-brand-dark transition-all shadow-sm">
                        Load More Customers
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminCustomers;
