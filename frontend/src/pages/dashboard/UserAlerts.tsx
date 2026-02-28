import { motion } from 'framer-motion';
import { Calendar, Gift, Info, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const UserAlerts = () => {
    const alerts = [
        {
            id: 1,
            type: 'System',
            icon: Calendar,
            color: 'bg-brand text-brand-dark',
            title: 'Your order is ready for pickup!',
            desc: 'Order RV-8822 is packed and ready at the front desk.',
            time: '2 hours ago',
            read: false
        },
        {
            id: 2,
            type: 'Promo',
            icon: Gift,
            color: 'bg-orange-400 text-white',
            title: 'Double points weekend!',
            desc: 'Earn 2x loyalty points on all grooming accessories this weekend.',
            time: '1 day ago',
            read: false
        },
        {
            id: 3,
            type: 'Reminder',
            icon: Info,
            color: 'bg-blue-400 text-white',
            title: 'Upcoming Appointment',
            desc: 'Max has a grooming session scheduled for Oct 28 at 2:00 PM.',
            time: '2 days ago',
            read: true
        },
        {
            id: 4,
            type: 'System',
            icon: CheckCircle2,
            color: 'bg-green-400 text-white',
            title: 'Reservation Completed',
            desc: 'Order RV-8750 has been picked up. Thank you for shopping with us!',
            time: 'Oct 12, 2026',
            read: true
        }
    ];

    return (
        <DashboardLayout title="Alert Center">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Controls */}
                <div className="flex items-center justify-between pb-4 border-b border-accent-brown/10">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <button className="text-brand-dark px-4 py-2 bg-brand/10 rounded-full border border-brand/20">All Alerts (4)</button>
                        <button className="text-accent-brown/40 hover:text-accent-brown transition-colors">Unread (2)</button>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-brand-dark transition-colors flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark all as read
                    </button>
                </div>

                {/* Alerts List */}
                <div className="space-y-4">
                    {alerts.map((alert, i) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-6 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer transition-all border ${alert.read
                                ? 'bg-transparent border-accent-brown/5 hover:bg-white'
                                : 'bg-white border-brand/20 shadow-xl shadow-brand/5'
                                }`}
                        >
                            <div className="flex items-start gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${alert.color}`}>
                                    <alert.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${alert.read ? 'bg-accent-brown/5 text-accent-brown/40' : 'bg-brand/10 text-brand-dark'
                                            }`}>
                                            {alert.type}
                                        </span>
                                        {!alert.read && <span className="w-2 h-2 rounded-full bg-brand"></span>}
                                    </div>
                                    <h3 className={`text-lg font-black tracking-tight mb-1 ${alert.read ? 'text-accent-brown/60' : 'text-accent-brown'}`}>
                                        {alert.title}
                                    </h3>
                                    <p className={`text-sm font-medium ${alert.read ? 'text-accent-brown/40' : 'text-accent-brown/70'}`}>
                                        {alert.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="sm:text-right pl-[68px] sm:pl-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 whitespace-nowrap">
                                    {alert.time}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default UserAlerts;
