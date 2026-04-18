import { motion } from 'framer-motion';
import { Award, ShoppingBag, Calendar, Users, Gift, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
    { name: 'Bronze', range: '0 – 999 PTS', color: 'from-orange-700 to-orange-500', bg: 'bg-orange-50/50' },
    { name: 'Silver', range: '1,000 – 1,999', color: 'from-slate-400 to-slate-200', bg: 'bg-slate-50/50' },
    { name: 'Gold', range: '2,000 – 2,999', color: 'from-yellow-500 to-yellow-300', bg: 'bg-yellow-50/50' },
    { name: 'Platinum', range: '3,000+ PTS', color: 'from-cyan-500 to-indigo-500', bg: 'bg-cyan-50/50' },
];

const rewards = [
    { icon: Gift, title: 'Free Grooming Add-on', cost: 500 },
    { icon: Star, title: '15% Off Premium Foods', cost: 800 },
    { icon: Award, title: 'Complimentary Vet Consult', cost: 2000 },
    { icon: Gift, title: '₱10 Store Credit', cost: 1000 },
];

export function LoyaltySection() {
    const earning = [
        { icon: ShoppingBag, label: 'Shop the Store', pts: 'Variable' },
        { icon: Calendar, label: 'Book Reservations', pts: 'Variable' },
        { icon: Users, label: 'Refer a Friend', pts: '500 PTS Bonus' },
    ];

    return (
        <section id="loyalty" className="py-24 sm:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="max-w-2xl space-y-6"
                    >
                        <div className="inline-flex items-center gap-3 text-brand-dark uppercase tracking-[0.5em] text-[10px] font-black">
                            <div className="w-8 h-[2px] bg-brand-dark" />
                            Elite Ecosystem
                        </div>
                        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-accent-brown tracking-tighter leading-[0.9] uppercase">
                            Redefining <br />
                            <span className="text-brand-dark italic font-outfit">Pet Loyalty.</span>
                        </h2>
                    </motion.div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <p className="text-lg text-accent-brown/50 font-medium max-w-xs leading-relaxed">
                            A tiered participation model designed to reward long-term health and professional commitment.
                        </p>
                        <Link to="/register" className="group flex items-center gap-4 bg-accent-brown text-white px-10 py-5 rounded-full font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-brand-dark transition-all">
                            Join the Program
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className={`p-10 rounded-[3.5rem] flex flex-col items-center gap-6 text-center border-2 border-transparent hover:border-brand/10 bg-white shadow-sm hover:shadow-xl transition-all duration-500 group`}
                        >
                            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tier.color} p-[2px] shadow-2xl group-hover:scale-110 transition-transform duration-500`}>
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <Award className="w-8 h-8 text-accent-brown" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-accent-brown tracking-tighter uppercase">{tier.name}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark opacity-40">{tier.range}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-12 xl:col-span-5 bg-accent-brown p-12 lg:p-16 rounded-[4rem] text-white shadow-2xl relative overflow-hidden"
                    >
                        <h3 className="text-3xl font-black mb-10 tracking-tight uppercase">Accrual Methods</h3>
                        <div className="space-y-8 relative z-10">
                            {earning.map((e) => (
                                <div key={e.label} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all duration-500">
                                            <e.icon className="w-6 h-6" />
                                        </div>
                                        <p className="font-black text-white text-lg uppercase tracking-widest">{e.label}</p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-brand-dark/10 text-brand-dark rounded-full">
                                        {e.pts}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand/10 rounded-full blur-[80px]" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-12 xl:col-span-7 bg-[#F7F6F2] p-12 lg:p-16 rounded-[4rem] border border-accent-brown/5 shadow-inner"
                    >
                        <h3 className="text-3xl font-black text-accent-brown mb-10 tracking-tight uppercase">Exclusive Redemptions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {rewards.map((r) => (
                                <div key={r.title} className="bg-white p-6 rounded-[2.5rem] flex items-center gap-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-transparent hover:border-brand/10 group">
                                    <div className="w-16 h-16 bg-accent-peach/20 rounded-2xl flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all">
                                        <r.icon className="w-7 h-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-accent-brown text-lg leading-tight uppercase tracking-tight">{r.title}</p>
                                        <div className="flex items-center gap-2">
                                            <Star className="w-3 h-3 text-brand-dark fill-brand-dark" />
                                            <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">{r.cost} PTS REQUIRED</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
