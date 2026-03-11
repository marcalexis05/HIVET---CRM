import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BarChart3, Users, PackageCheck, Activity, ShieldCheck, Mail, Phone, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function BusinessLanding() {
    return (
        <div className="min-h-screen bg-accent-peach">
            {/* Hero Section */}
            <section id="features" className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-16 px-4 overflow-hidden bg-accent-peach">
                <div className="container mx-auto text-center relative z-10 space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="max-w-4xl mx-auto space-y-6"
                    >
                        <div className="flex justify-center gap-4 mb-8">
                            <span className="bg-brand-dark text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm">
                                For Partners
                            </span>
                        </div>

                        <h1 className="heading-xl flex flex-col items-center">
                            <span className="text-accent-brown">Elevate Your</span>
                            <span className="text-brand-dark italic transform -rotate-1 mt-[-6px] xs:mt-[-10px] drop-shadow-sm font-outfit" style={{ fontSize: '1.2em' }}>Veterinary Clinic</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-accent-brown/70 max-w-2xl mx-auto leading-relaxed font-semibold">
                            Empower your practice with our comprehensive CRM, real-time inventory management, and powerful BI analytics.
                        </p>
                    </motion.div>

                    <motion.div
                        id="capabilities"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, delay: 0.2 }}
                        className="relative w-full max-w-5xl mx-auto mt-16"
                    >
                        <div className="absolute inset-0 bg-brand-light/30 rounded-[3rem] -z-10 transform translate-y-8 blur-3xl" />
                        <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 shadow-2xl border-4 border-white/50 relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left relative z-10">
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-brand/20 rounded-2xl flex items-center justify-center text-brand-dark">
                                        <Users className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter">Patient CRM</h3>
                                    <p className="text-accent-brown/70 font-medium">Manage pet records, owner details, and appointment histories seamlessly in one centralized dashboard.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-accent-peach rounded-2xl flex items-center justify-center text-accent-brown">
                                        <PackageCheck className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter">Inventory Sync</h3>
                                    <p className="text-accent-brown/70 font-medium">Keep track of medical supplies and retail stock with automated low-stock alerts and easy reordering.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-brand-dark/10 rounded-2xl flex items-center justify-center text-brand-dark">
                                        <BarChart3 className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter">BI Analytics</h3>
                                    <p className="text-accent-brown/70 font-medium">Make data-driven decisions with real-time insights into revenue, top-selling items, and clinic performance.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section id="security" className="py-24 bg-white relative overflow-hidden text-center rounded-t-[4rem]">
                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="text-3xl xs:text-5xl font-black text-accent-brown mb-16 uppercase tracking-tighter">
                        Built For <span className="text-brand">Modern Practices</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {[
                            { icon: ShieldCheck, title: "Secure Data", desc: "Bank-grade encryption for patient records." },
                            { icon: Activity, title: "Health Tracking", desc: "Monitor treatment efficacy over time." },
                            { icon: Users, title: "Staff Roles", desc: "Granular permissions for your entire team." },
                            { icon: BarChart3, title: "Smart Reports", desc: "Automated daily and monthly reporting." }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-[2rem] bg-accent-peach/30 hover:bg-brand/10 transition-colors border border-brand/5 shadow-sm"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm mx-auto text-brand-dark">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h4 className="text-xl font-black text-accent-brown mb-3 uppercase">{feature.title}</h4>
                                <p className="text-accent-brown/60 text-sm font-medium">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Business Footer */}
            <footer className="py-16 xs:py-24 bg-accent-brown text-accent-cream rounded-t-[3rem] xs:rounded-t-[5rem] mt-12 xs:mt-20">
                <div className="container mx-auto px-6 xs:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 xs:gap-16 pb-12 xs:pb-16">
                        <div className="md:col-span-6 space-y-6 xs:space-y-8">
                            <Link to="/" className="flex items-center gap-3 group w-fit">
                                <div className="w-12 h-12 xs:w-14 xs:h-14 bg-white rounded-2xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                    <Logo className="w-full h-full text-brand-dark" />
                                </div>
                                <span className="text-xl xs:text-2xl font-black tracking-tighter text-white">Hi-Vet Partners</span>
                            </Link>
                            <p className="text-accent-cream/50 text-sm xs:text-base leading-relaxed max-w-sm">
                                The ultimate business management platform designed exclusively for veterinary professionals and clinic owners.
                            </p>
                            <div className="flex gap-3 xs:gap-4">
                                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                    <button key={i} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand hover:text-white transition-all">
                                        <Icon className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-6 space-y-6 xs:space-y-8">
                            <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">Partner Support</h4>
                            <div className="space-y-3 xs:space-y-4">
                                <div className="flex items-center gap-3 xs:gap-4 text-accent-cream/60">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-sm xs:text-base">partners@hi-vet.com</span>
                                </div>
                                <div className="flex items-center gap-3 xs:gap-4 text-accent-cream/60">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-sm xs:text-base">+1 (800) VET-PRO1</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[8px] xs:text-[10px] font-black uppercase tracking-[0.2em] xs:tracking-[0.3em] text-accent-cream/20 text-center md:text-left">
                        <p>© 2026 Hi-Vet Professional CRM. All Rights Reserved.</p>
                        <div className="flex gap-6 xs:gap-8">
                            <button className="hover:text-white transition-colors">Security</button>
                            <button className="hover:text-white transition-colors">Partner Terms</button>
                            <button className="hover:text-white transition-colors">API Status</button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
