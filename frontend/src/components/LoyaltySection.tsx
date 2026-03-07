import { motion } from 'framer-motion';
import { Award, ShoppingBag, Calendar, Users, Gift, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
    { name: 'Bronze', range: '0 – 999 pts', color: 'from-orange-700 to-orange-500', ring: 'ring-orange-400/30' },
    { name: 'Silver', range: '1,000 – 1,999', color: 'from-slate-400 to-slate-300', ring: 'ring-slate-400/30' },
    { name: 'Gold', range: '2,000 – 2,999', color: 'from-yellow-500 to-yellow-300', ring: 'ring-yellow-400/30', active: true },
    { name: 'Platinum', range: '3,000 + pts', color: 'from-cyan-400 to-indigo-400', ring: 'ring-cyan-400/30' },
];

const earning = [
    { icon: ShoppingBag, label: 'Shop the Catalog', pts: '10 pts / ₱1' },
    { icon: Calendar, label: 'Book Reservations', pts: '50 pts / Visit' },
    { icon: Users, label: 'Refer a Friend', pts: '500 pts Bonus' },
];

const rewards = [
    { icon: Gift, title: 'Free Grooming Add-on', cost: 500 },
    { icon: Star, title: '15% Off Premium Foods', cost: 800 },
    { icon: Award, title: 'Complimentary Vet Consult', cost: 2000 },
    { icon: Gift, title: '₱10 Store Credit', cost: 1000 },
];

export function LoyaltySection() {
    return (
        <section id="loyalty" className="py-24 md:py-32 bg-accent-cream/20">
            <div className="container mx-auto px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20"
                >
                    <div className="max-w-2xl">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark mb-4 block">
                            Loyalty Program
                        </span>
                        <h2 className="text-5xl md:text-6xl font-black text-accent-brown tracking-tighter leading-none mb-6">
                            Every visit<br />earns rewards.
                        </h2>
                        <p className="text-accent-brown/60 text-lg font-medium leading-relaxed">
                            Shop, book, and refer friends to collect points. Redeem them for free services, discounts, and exclusive perks.
                        </p>
                    </div>
                    <Link
                        to="/register"
                        className="shrink-0 inline-flex items-center gap-2 btn-primary !px-10 !py-4 !text-xs"
                    >
                        Join the Program <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>

                {/* Tier Ladder */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            className={`relative rounded-[2rem] p-6 flex flex-col items-center gap-4 text-center border-2 transition-all ${tier.active ? 'bg-accent-brown border-accent-brown text-white shadow-2xl shadow-accent-brown/30 scale-105' : 'bg-white border-transparent'}`}
                        >
                            {tier.active && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-brand-dark text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                                    Your Tier
                                </span>
                            )}
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tier.color} ring-4 ${tier.ring} flex items-center justify-center shadow-lg`}>
                                <Award className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className={`font-black text-xl tracking-tight ${tier.active ? 'text-white' : 'text-accent-brown'}`}>{tier.name}</h3>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${tier.active ? 'text-white/50' : 'text-accent-brown/40'}`}>{tier.range}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* How to Earn */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="bg-white rounded-[2rem] p-10 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <h3 className="text-2xl font-black text-accent-brown tracking-tight mb-8">How to Earn Points</h3>
                        <div className="space-y-6">
                            {earning.map((e) => (
                                <div key={e.label} className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-accent-peach/30 flex items-center justify-center text-brand-dark shrink-0">
                                        <e.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-accent-brown">{e.label}</p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark bg-brand/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                                        {e.pts}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Sample Rewards */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="bg-white rounded-[2rem] p-10 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <h3 className="text-2xl font-black text-accent-brown tracking-tight mb-8">Sample Rewards</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {rewards.map((r) => (
                                <div key={r.title} className="bg-accent-peach/20 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-dark shadow-sm">
                                        <r.icon className="w-5 h-5" />
                                    </div>
                                    <p className="font-bold text-accent-brown text-sm leading-tight">{r.title}</p>
                                    <span className="flex items-center gap-1 text-[10px] font-black text-brand-dark uppercase tracking-widest">
                                        <Star className="w-3 h-3 fill-brand-dark" /> {r.cost} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
