import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
    { n: '01', title: 'Choose a Product', desc: 'Browse our retail catalog and select what you need.' },
    { n: '02', title: 'Place Your Order', desc: 'Browse real-time availability and lock in a slot.' },
    { n: '03', title: 'Track & Receive', desc: "We handle everything — you'll get live status updates." },
];

export function ReservationsSection() {
    return (
        <section id="orders" className="py-20 md:py-32">
            <div className="container mx-auto px-4 xs:px-6 sm:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-2xl mb-20"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark mb-3 xs:mb-4 block">
                        Orders
                    </span>
                    <h2 className="text-4xl xs:text-5xl md:text-6xl font-black text-accent-brown tracking-tighter leading-none mb-4 xs:mb-6">
                        Order what your<br />pet needs.
                    </h2>
                    <p className="text-accent-brown/60 text-base xs:text-lg font-medium leading-relaxed">
                        Browse our retail catalog and place your order in minutes. Track your order status every step of the way.
                    </p>
                </motion.div>


                {/* How It Works */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-accent-brown rounded-[2.5rem] xs:rounded-[3rem] p-6 xs:p-10 md:p-16 text-white"
                >
                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        <div className="md:w-1/3 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-3 xs:mb-4 block">How It Works</span>
                            <h3 className="text-3xl xs:text-4xl font-black tracking-tighter leading-none mb-4 xs:mb-6">
                                Three steps<br />to your order.
                            </h3>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 bg-brand text-white px-6 xs:px-8 py-3.5 xs:py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-brand-dark transition-colors w-full sm:w-auto shadow-lg shadow-brand/20"
                            >
                                Shop Now <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {steps.map((step) => (
                                <div key={step.n} className="relative">
                                    <span className="text-7xl font-black text-white/5 leading-none block mb-4 -ml-1">{step.n}</span>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4 text-brand shrink-0" />
                                        <h4 className="font-black text-white text-lg tracking-tight">{step.title}</h4>
                                    </div>
                                    <p className="text-white/50 text-sm font-medium leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Service Exclusions */}
                    <div className="mt-8 xs:mt-10 pt-6 xs:pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3 xs:gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <AlertTriangle className="w-4 h-4 text-brand shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Service Exclusions</span>
                        </div>
                        <p className="text-white/40 text-[10px] xs:text-xs font-medium leading-relaxed">
                            The platform is focused on <span className="text-white/70 font-bold">retail and order fulfillment</span>; it strictly excludes
                            <span className="text-white/70 font-bold"> veterinary medical services</span> (clinical consultations, treatments, or surgeries).
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
