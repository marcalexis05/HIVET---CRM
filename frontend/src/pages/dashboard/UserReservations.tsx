import { motion } from 'framer-motion';
import { Package, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const UserReservations = () => {
    const reservations = [
        {
            id: 'RV-8822',
            date: 'Oct 24, 2026',
            status: 'Ready for Pickup',
            items: ['Organic Alpine Salmon (12lb)', 'Premium Velvet Nest'],
            location: 'Main Clinic - Los Angeles',
            total: '₱174.00'
        },
        {
            id: 'RV-8750',
            date: 'Sep 12, 2026',
            status: 'Completed',
            items: ['Leather Trekking Harness', 'Daily Pet Vitamins'],
            location: 'Main Clinic - Los Angeles',
            total: '₱173.00'
        },
        {
            id: 'RV-8611',
            date: 'Aug 05, 2026',
            status: 'Completed',
            items: ['Sensitive Skin Remedy'],
            location: 'Westside Branch',
            total: '₱52.00'
        }
    ];

    return (
        <DashboardLayout title="Reservations">
            <div className="space-y-8">

                {/* Active Reservation Highlight */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-dark rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8"
                >
                    <div className="relative z-10 w-full md:w-2/3">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Ready for Pickup
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Order RV-8822</span>
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tighter mb-4">Your order is packed and waiting!</h2>
                        <p className="text-white/60 font-medium text-sm md:text-base max-w-md">
                            Please pick up your items at the front desk before 7:00 PM today.
                        </p>
                    </div>

                    <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0 min-w-[250px]">
                        <div className="flex items-center gap-3 text-sm font-bold text-white mb-2">
                            <MapPin className="w-4 h-4 text-brand" />
                            Main Clinic
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-white mb-6">
                            <Clock className="w-4 h-4 text-brand" />
                            Open until 7:00 PM
                        </div>
                        <button className="w-full bg-brand text-brand-dark py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors">
                            Get Directions
                        </button>
                    </div>

                    {/* Decorative blobs */}
                    <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-[80px]" />
                </motion.div>

                {/* Reservation History */}
                <div>
                    <h3 className="text-xl font-black text-accent-brown tracking-tighter mb-6">Order History</h3>
                    <div className="space-y-4">
                        {reservations.map((res, i) => (
                            <motion.div
                                key={res.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white rounded-2xl p-6 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${res.status === 'Ready for Pickup' ? 'bg-green-100 text-green-600' : 'bg-accent-peach/50 text-accent-brown/40'}`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{res.id}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${res.status === 'Ready for Pickup' ? 'bg-green-100 text-green-700' : 'bg-accent-brown/5 text-accent-brown/40'}`}>
                                                {res.status}
                                            </span>
                                        </div>
                                        <p className="font-bold text-accent-brown mb-1">{res.items.join(' • ')}</p>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {res.date}</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {res.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-accent-brown/10 pt-4 md:pt-0 md:pl-6">
                                    <p className="font-black text-accent-brown text-lg">{res.total}</p>
                                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-dark group-hover:text-brand transition-colors mt-1">
                                        View Details <ChevronRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default UserReservations;
