import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import { Package, Award, Calendar, Bell, MapPin, ChevronRight, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserDashboard = () => {
    return (
        <DashboardLayout title="My Hub">
            <div className="space-y-8">
                {/* Welcome Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-dark rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden"
                >
                    <div className="relative z-10 w-full md:w-2/3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand mb-2 block">Premium Member</span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">Welcome back,<br />Sarah!</h2>
                        <p className="text-white/60 font-medium text-lg mb-8 max-w-md">Your Golden Retriever, Max, has a grooming appointment coming up in 3 days.</p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/dashboard/user/catalog" className="bg-brand text-brand-dark px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors">
                                Browse Catalog
                            </Link>
                            <button className="bg-white/10 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors">
                                View Pet Profile
                            </button>
                        </div>
                    </div>
                    {/* Decorative blobs */}
                    <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-20%] right-[10%] w-64 h-64 bg-white/10 rounded-full blur-[60px]" />
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Quick Stats Grid */}
                    <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
                        {/* Loyalty Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between group cursor-pointer hover:border-brand/20 transition-all"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Tier Status</span>
                                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Gold Member</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-4xl font-black text-accent-brown tracking-tighter mb-2">2,450 <span className="text-lg text-accent-brown/40 font-bold">pts</span></h3>
                                <div className="flex items-center justify-between mt-4 border-t border-accent-brown/5 pt-4">
                                    <span className="text-xs font-bold text-accent-brown/60">50 pts to Platinum</span>
                                    <ChevronRight className="w-4 h-4 text-brand-dark group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent Reservation Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white flex flex-col justify-between group cursor-pointer hover:border-brand/20 transition-all"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                                    <Package className="w-6 h-6" />
                                </div>
                                <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    Ready
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1 block">Pickup Order RV-8822</span>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight leading-tight mb-4">Organic Alpine Salmon (2 Items)</h3>
                                <div className="flex items-center justify-between border-t border-accent-brown/5 pt-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-accent-brown/60">
                                        <MapPin className="w-3 h-3" />
                                        Main Clinic
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-brand-dark group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Alert Center */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-accent-peach/20 rounded-[2rem] p-8 border border-accent-brown/5 h-full"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-brand-dark" />
                                <h2 className="text-lg font-black text-accent-brown uppercase tracking-widest">Alerts</h2>
                            </div>
                            <span className="w-6 h-6 bg-brand-dark text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-dark"></div>
                                <div className="pl-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-brand-dark mb-1 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> System Msg
                                    </p>
                                    <p className="font-bold text-sm text-accent-brown mb-1 group-hover:text-brand-dark transition-colors">Your order is ready for pickup!</p>
                                    <p className="text-[10px] text-accent-brown/40 font-medium">Order RV-8822 is packed and ready at the front desk.</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                                <div className="pl-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1 flex items-center gap-2">
                                        <Gift className="w-3 h-3" /> Promo Alert
                                    </p>
                                    <p className="font-bold text-sm text-accent-brown mb-1 group-hover:text-brand-dark transition-colors">Double points weekend!</p>
                                    <p className="text-[10px] text-accent-brown/40 font-medium">Earn 2x loyalty points on all grooming accessories this weekend.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default UserDashboard;
