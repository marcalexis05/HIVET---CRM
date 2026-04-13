import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, ShoppingBag, Truck, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
    { n: '01', title: 'Inventory Selection', desc: 'Secure high-grade supplies from our verified clinical inventory.', icon: ShoppingBag },
    { n: '02', title: 'Sync & Verify', desc: 'Real-time availability locking with your preferred fulfillment center.', icon: Target },
    { n: '03', title: 'Precision Delivery', desc: "Active transit tracking for surgical precision in timing.", icon: Truck },
];

export function ReservationsSection() {
    return (
        <section id="orders" className="py-24 sm:py-32 bg-white overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="max-w-2xl"
                    >
                        <div className="inline-flex items-center gap-3 text-brand-dark uppercase tracking-[0.5em] text-[10px] font-black mb-6">
                            <div className="w-8 h-[2px] bg-brand-dark" />
                            Logistics Standard
                        </div>
                        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-accent-brown tracking-tighter leading-[0.9] uppercase">
                            Engineered for <br />
                            <span className="text-brand-dark italic font-outfit">Active Response.</span>
                        </h2>
                    </motion.div>
                    <p className="text-xl text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                        A high-performance procurement infrastructure designed to eliminate wait times and ensure supply chain integrity.
                    </p>
                </div>


                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="bg-accent-brown rounded-[4rem] p-12 lg:p-20 text-white relative overflow-hidden shadow-2xl shadow-accent-brown/30"
                >
                    {/* Background Decorative Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    </div>

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                        <div className="lg:col-span-4 space-y-8">
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand translate-y-2 block">Protocol</span>
                                <h3 className="text-4xl xs:text-5xl font-black tracking-tighter leading-none uppercase">
                                    The Trinity<br />of Trust.
                                </h3>
                            </div>
                            <Link
                                to="/login"
                                className="group inline-flex items-center gap-6 bg-brand-dark text-white px-10 py-5 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-accent-brown transition-all shadow-xl shadow-brand/20"
                            >
                                Start Procurement 
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </Link>
                        </div>

                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                            {steps.map((step) => (
                                <div key={step.n} className="space-y-6 relative group">
                                    <div className="flex items-center justify-between">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all duration-500">
                                            <step.icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-6xl font-black text-white/5 leading-none transition-colors group-hover:text-brand-dark/10">{step.n}</span>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-black text-white text-xl tracking-tight uppercase">{step.title}</h4>
                                        <p className="text-white/40 text-sm font-medium leading-relaxed italic">"{step.desc}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </motion.div>
            </div>
        </section>
    );
}

