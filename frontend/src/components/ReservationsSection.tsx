import { motion } from 'framer-motion';
import { Scissors, Stethoscope, Home, Star, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
    {
        icon: Scissors,
        title: 'Professional Grooming',
        desc: 'Full-service grooming, nail trimming, and spa treatments by certified groomers.',
        price: 'from ₱150',
        color: 'bg-purple-50 text-purple-600',
        accent: 'before:bg-purple-400',
    },
    {
        icon: Stethoscope,
        title: 'Vet Consultation',
        desc: 'Book same-day or scheduled checkups with our licensed veterinarians.',
        price: 'from ₱200',
        color: 'bg-blue-50 text-blue-600',
        accent: 'before:bg-blue-400',
    },
    {
        icon: Home,
        title: 'Overnight Boarding',
        desc: 'Safe, comfortable, and monitored boarding facilities for your pet.',
        price: 'from ₱300',
        color: 'bg-green-50 text-green-600',
        accent: 'before:bg-green-400',
    },
    {
        icon: Star,
        title: 'Dental Cleaning',
        desc: 'Prevent dental disease with professional pet dental cleaning and polishing.',
        price: 'from ₱250',
        color: 'bg-orange-50 text-orange-600',
        accent: 'before:bg-orange-400',
    },
];

const steps = [
    { n: '01', title: 'Choose a Service', desc: 'Pick from grooming, vet, boarding, or dental.' },
    { n: '02', title: 'Pick a Time', desc: 'Browse real-time availability and lock in a slot.' },
    { n: '03', title: 'Show Up & Relax', desc: "We handle everything — you'll get live status updates." },
];

export function ReservationsSection() {
    return (
        <section id="reservations" className="py-24 md:py-32">
            <div className="container mx-auto px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-2xl mb-20"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark mb-4 block">
                        Reservations
                    </span>
                    <h2 className="text-5xl md:text-6xl font-black text-accent-brown tracking-tighter leading-none mb-6">
                        Book the care<br />your pet deserves.
                    </h2>
                    <p className="text-accent-brown/60 text-lg font-medium leading-relaxed">
                        Skip the waiting room. Reserve a spot online in under a minute and get real-time status updates every step of the way.
                    </p>
                </motion.div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                    {services.map((s, i) => (
                        <motion.div
                            key={s.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="group bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border-2 border-transparent hover:border-brand/20 transition-all flex flex-col"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${s.color}`}>
                                <s.icon className="w-7 h-7" />
                            </div>
                            <h3 className="font-black text-accent-brown text-xl tracking-tight leading-tight mb-3">{s.title}</h3>
                            <p className="text-accent-brown/50 text-sm font-medium leading-relaxed flex-1">{s.desc}</p>
                            <div className="mt-6 pt-6 border-t border-accent-brown/5 flex items-center justify-between">
                                <span className="text-xs font-black text-brand-dark uppercase tracking-widest">{s.price}</span>
                                <div className="w-8 h-8 bg-accent-peach/30 rounded-xl flex items-center justify-center text-accent-brown/50 group-hover:bg-brand group-hover:text-white transition-all">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* How It Works */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-accent-brown rounded-[3rem] p-10 md:p-16 text-white"
                >
                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        <div className="md:w-1/3 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-4 block">How It Works</span>
                            <h3 className="text-4xl font-black tracking-tighter leading-none mb-6">
                                Three steps<br />to perfect care.
                            </h3>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 bg-brand text-brand-dark px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors"
                            >
                                Book a Slot <ArrowRight className="w-4 h-4" />
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
                    <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <AlertTriangle className="w-4 h-4 text-brand shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Service Exclusions</span>
                        </div>
                        <p className="text-white/40 text-xs font-medium leading-relaxed">
                            This platform is focused on <span className="text-white/70 font-bold">retail services only</span>. It does not cover
                            <span className="text-white/70 font-bold"> veterinary medical procedures</span> (surgery, diagnostics, prescriptions)
                            or <span className="text-white/70 font-bold">last-mile delivery logistics</span>.
                            For medical emergencies, please contact your veterinarian directly.
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
