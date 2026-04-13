import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, BarChart3, Users, PackageCheck, Activity, ShieldCheck, ChevronRight, ChevronLeft, ArrowRight, PawPrint, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';

// Cinematic Clinic Images
import clinicCat1 from '../assets/clinic_cat_1.png';
import clinicCat2 from '../assets/clinic_cat_2.png';
import clinicDog1 from '../assets/clinic_dog_1.png';

const SLIDES = [
    {
        tag: "Digital Transformation",
        title: "The Future of Veterinary Management",
        subtitle: "A comprehensive CRM designed for the modern practice. Seamlessly integrate your clinical workflow with our high-end intelligence tools.",
        image: clinicCat1,
        witty: "Professional Paws, Reliable Tech.",
        icon: <Building2 className="w-5 h-5" />
    },
    {
        tag: "Data-Driven Excellence",
        title: "Intelligence Beyond the Clipboard",
        subtitle: "Real-time BI analytics and growth forecasting. Transform your clinic's performance data into actionable strategic insights.",
        image: clinicCat2,
        witty: "Smart Care for the Smart Clinic.",
        icon: <BarChart3 className="w-5 h-5" />
    },
    {
        tag: "Supply Chain Sync",
        title: "Precision Inventory at a Glance",
        subtitle: "Never out of stock on critical supplies. Our deep inventory sync connects you directly with the Hi-Vet logistical network.",
        image: clinicDog1,
        witty: "Reliability in Every Dose.",
        icon: <PackageCheck className="w-5 h-5" />
    }
];

export default function BusinessLanding() {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % SLIDES.length);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => setCurrent((prev) => (prev + 1) % SLIDES.length);
    const prevSlide = () => setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));

    return (
        <div className="min-h-screen bg-white">
            {/* Cinematic Clinic Hero Slideshow */}
            <section id="features" className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black font-brand">
                {/* Background Slideshow */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0"
                        >
                            <img 
                                src={SLIDES[current].image} 
                                alt="Clinic Hero" 
                                className="w-full h-full object-cover object-center sm:object-right md:object-[75%_center]" 
                            />
                            {/* High-Contrast Professional Mask */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                            <div className="absolute inset-0 bg-black/10" />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Content Container */}
                <div className="container mx-auto px-6 sm:px-12 lg:px-20 relative z-10 w-full h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                                transition={{ duration: 0.8 }}
                                className="space-y-6 sm:space-y-8"
                            >
                                <div className="inline-flex items-center gap-3 bg-brand-dark text-white px-6 py-2 rounded-full text-[12px] font-black uppercase tracking-[0.3em] shadow-lg">
                                    <Building2 className="w-4 h-4" />
                                    {SLIDES[current].tag}
                                </div>

                                <div className="space-y-4">
                                    <h1 className="text-white text-5xl sm:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tighter uppercase drop-shadow-2xl">
                                        {SLIDES[current].title}
                                    </h1>
                                    <div className="text-brand-dark text-2xl sm:text-3xl font-black italic tracking-widest uppercase font-outfit">
                                        {SLIDES[current].witty}
                                    </div>
                                </div>

                                <p className="text-xl sm:text-2xl text-white/80 leading-relaxed font-semibold max-w-lg">
                                    {SLIDES[current].subtitle}
                                </p>

                                <div className="flex flex-col sm:flex-row gap-5 pt-4">
                                    <Link 
                                        to="/register/business" 
                                        className="btn-primary group !px-10 !py-5 !text-sm flex items-center justify-center gap-4"
                                    >
                                        Register Now
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </Link>
                                    <a 
                                        href="#capabilities" 
                                        className="bg-white/10 backdrop-blur-md text-white border-2 border-white/20 px-10 py-5 rounded-full font-black flex items-center justify-center gap-4 text-sm uppercase tracking-[0.15em] hover:bg-white/20 transition-all shadow-xl"
                                    >
                                        Clinic Features
                                    </a>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Slideshow Controls */}
                <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center gap-8">
                    <div className="flex gap-3">
                        {SLIDES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`h-1.5 rounded-full transition-all duration-500 ${current === i ? 'w-16 bg-brand-dark' : 'w-4 bg-white/30 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={prevSlide} className="w-14 h-14 rounded-full border-2 border-white/20 bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-brand-dark hover:border-brand-dark transition-all group">
                            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button onClick={nextSlide} className="w-14 h-14 rounded-full border-2 border-white/20 bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-brand-dark hover:border-brand-dark transition-all group">
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Core Capabilities - Architectural Cards */}
            <section id="capabilities" className="py-24 sm:py-32 bg-[#FAF9F6] relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
                        <div className="max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 text-brand-dark uppercase tracking-[0.4em] text-[10px] font-black">
                                <div className="w-8 h-[2px] bg-brand-dark" />
                                Ecosystem Standard
                            </div>
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-accent-brown tracking-tighter leading-[0.95] uppercase">
                                Infrastructure for <span className="text-brand-dark italic font-outfit">Modern Paws.</span>
                            </h2>
                        </div>
                        <p className="text-lg text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                            Precision-engineered solutions for high-performance veterinary clinics and pharmacies.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
                        {[
                            {
                                icon: Users,
                                title: "Patient CRM",
                                desc: "Architectural management of pet records, owner details, and appointment histories within a high-performance database.",
                                color: "bg-white",
                                accent: "Clinical Records"
                            },
                            {
                                icon: PackageCheck,
                                title: "Inventory Sync",
                                desc: "Real-time supply chain synchronization. Automated low-stock procurement alerts connecting you directly to our logistical network.",
                                color: "bg-accent-brown text-white",
                                accent: "Supply Chain"
                            },
                            {
                                icon: BarChart3,
                                title: "BI Analytics",
                                desc: "Data-driven growth strategies. Automated revenue insights, top-performing SKU analysis, and executive clinical reporting.",
                                color: "bg-white",
                                accent: "Performance BI"
                            }
                        ].map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.6 }}
                                className={`p-10 lg:p-12 rounded-[3.5rem] border border-accent-brown/5 flex flex-col min-h-[400px] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden ${f.color}`}
                            >
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:rotate-6 ${f.color.includes('bg-white') ? 'bg-accent-peach/30 border-brand-dark/10' : 'bg-white/10 border-white/20'}`}>
                                            <f.icon className="w-7 h-7" />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${f.color.includes('bg-white') ? 'text-brand-dark' : 'text-white'}`}>
                                            {f.accent}
                                        </span>
                                    </div>
                                    <div className="mt-auto">
                                        <h3 className="text-2xl lg:text-3xl font-black mb-4 uppercase tracking-tighter leading-none">
                                            {f.title}
                                        </h3>
                                        <p className={`text-base lg:text-lg font-medium leading-relaxed ${f.color.includes('bg-white') ? 'text-accent-brown/60' : 'text-white/80'}`}>
                                            {f.desc}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security & Protocol Section */}
            <section id="security" className="py-24 sm:py-32 bg-white relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center space-y-8 mb-20">
                        <h2 className="text-4xl sm:text-6xl font-black text-accent-brown tracking-tighter uppercase leading-[0.9]">
                            Security <span className="text-brand-dark italic font-outfit">Above and Beyond.</span>
                        </h2>
                        <p className="text-xl text-accent-brown/50 font-medium max-w-2xl mx-auto italic">
                            "Operating under bank-grade encryption and rigorous clinical data protocols to ensure patient confidentiality and trust."
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: ShieldCheck, title: "Secure Vault", desc: "Bank-grade hashing and encryption for all records." },
                            { icon: Activity, title: "Pulse Radar", desc: "Real-time monitoring of clinical efficacy and health trends." },
                            { icon: Target, title: "Precision Roles", desc: "Granular access controls for veterinarians and support staff." },
                            { icon: BarChart3, title: "Elite Reports", desc: "Executive summaries generated with boardroom-level detail." }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-[2.5rem] bg-[#F7F6F2] hover:bg-brand-dark/10 transition-all border border-transparent hover:border-brand-dark/10 group text-center"
                            >
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm mx-auto text-brand-dark group-hover:scale-110 transition-transform">
                                    <item.icon className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-black text-accent-brown mb-3 uppercase tracking-tight">{item.title}</h4>
                                <p className="text-accent-brown/50 text-sm font-medium leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-20 pt-20 border-t border-accent-brown/5 flex flex-col items-center gap-10">
                        <div className="text-center space-y-2">
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-accent-brown/30">Ready to Upgrade your Clinic?</p>
                            <h3 className="text-3xl font-black text-accent-brown uppercase tracking-tighter">Join the Hi-Vet Partner Network</h3>
                        </div>
                        <Link to="/register/business" className="btn-primary">
                            Become a Partner
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
