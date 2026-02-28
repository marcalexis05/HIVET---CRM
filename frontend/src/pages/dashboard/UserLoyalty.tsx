import { motion } from 'framer-motion';
import { Award, Gift, TrendingUp, Sparkles, Star } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const UserLoyalty = () => {
    const vouchers = [
        { id: 1, title: 'Free Grooming Add-on', cost: 500, type: 'Service', color: 'bg-blue-100 text-blue-600', active: true },
        { id: 2, title: '15% Off Premium Foods', cost: 800, type: 'Discount', color: 'bg-orange-100 text-orange-600', active: true },
        { id: 3, title: 'Complimentary Vet Consult', cost: 2000, type: 'Service', color: 'bg-purple-100 text-purple-600', active: false },
        { id: 4, title: '₱10 Store Credit', cost: 1000, type: 'Credit', color: 'bg-green-100 text-green-600', active: false }
    ];

    return (
        <DashboardLayout title="Loyalty Rewards">
            <div className="space-y-8">

                {/* Status Overview Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-2 bg-gradient-to-br from-brand-dark to-[#3A2D28] rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden"
                    >
                        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8 h-full">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-yellow-200 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                        <Award className="w-6 h-6 text-yellow-700" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Current Status</span>
                                        <span className="font-black text-xl tracking-tight text-brand">Gold Member</span>
                                    </div>
                                </div>
                                <h3 className="text-6xl lg:text-7xl font-black tracking-tighter mb-2">2,450 <span className="text-2xl text-white/40 font-bold">pts</span></h3>
                                <p className="text-white/60 font-medium text-sm">You earn 10 points for every ₱1 spent in our catalog.</p>
                            </div>

                            <div className="w-full md:w-64 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-2">Next Tier: Platinum</span>
                                <div className="w-full h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
                                    <div className="h-full bg-brand rounded-full" style={{ width: '85%' }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-brand">2,450</span>
                                    <span className="text-white/40">2,500 pts</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-4 text-center">
                                    Just 50 points to upgrade!
                                </p>
                            </div>
                        </div>

                        {/* Background Accents */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[80px]" />
                        <Sparkles className="absolute top-10 right-10 w-24 h-24 text-white/5" />
                    </motion.div>

                    {/* How to earn */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-accent-peach/20 rounded-[2rem] p-8 border border-white flex flex-col justify-center"
                    >
                        <h3 className="text-sm font-black uppercase tracking-widest text-accent-brown mb-6 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-dark" />
                            How to Earn
                        </h3>
                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-brand-dark font-black">1</div>
                                <div>
                                    <p className="font-bold text-accent-brown text-sm mb-0.5">Shop the Catalog</p>
                                    <p className="text-[10px] text-accent-brown/50 font-bold uppercase tracking-widest">10 pts per ₱1</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-brand-dark font-black">2</div>
                                <div>
                                    <p className="font-bold text-accent-brown text-sm mb-0.5">Book Reservations</p>
                                    <p className="text-[10px] text-accent-brown/50 font-bold uppercase tracking-widest">50 pts per Visit</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-brand-dark font-black">3</div>
                                <div>
                                    <p className="font-bold text-accent-brown text-sm mb-0.5">Refer a Friend</p>
                                    <p className="text-[10px] text-accent-brown/50 font-bold uppercase tracking-widest">500 pts Bonus</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>
                </div>

                {/* Rewards Rewards Grid */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-accent-brown tracking-tighter">Available Rewards</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Redeem your points</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {vouchers.map((voucher, i) => (
                            <motion.div
                                key={voucher.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className={`bg-white rounded-2xl p-6 shadow-xl shadow-accent-brown/5 border-2 transition-all relative overflow-hidden group ${voucher.active ? 'border-transparent hover:border-brand/30 cursor-pointer' : 'border-transparent opacity-60 grayscale'}`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${voucher.color}`}>
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 bg-accent-peach/50 px-2 py-0.5 rounded-full">
                                        {voucher.type}
                                    </span>
                                </div>
                                <h4 className="font-black text-accent-brown text-lg leading-tight tracking-tight mb-2 pr-4">{voucher.title}</h4>
                                <div className="mt-4 pt-4 border-t border-accent-brown/5 flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-bold text-sm text-brand-dark">
                                        <Star className="w-3.5 h-3.5 fill-brand-dark" />
                                        {voucher.cost}
                                    </span>
                                    {voucher.active ? (
                                        <button className="text-[10px] font-black uppercase tracking-widest bg-brand text-white px-3 py-1.5 rounded-lg group-hover:bg-brand-dark transition-colors">
                                            Redeem
                                        </button>
                                    ) : (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">
                                            Need {(voucher.cost - 2450)} more
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default UserLoyalty;
