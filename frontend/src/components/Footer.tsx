import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, X, Shield, Lock, FileText, Globe, HelpCircle, ArrowUpRight, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

interface FooterProps {
    variant?: 'main' | 'business' | 'rider';
}

type LegalSection = 'Help Center' | 'FAQs' | 'About' | 'Customer Support' | 'Technical Support' | 'Safety Center' | 'Terms of Service' | 'Security' | 'Privacy Policy' | 'Cookies' | 'Direct Line' | null;

export function Footer({ variant = 'main' }: FooterProps) {
    const [activeSection, setActiveSection] = useState<LegalSection>(null);
    const [isCopied, setIsCopied] = useState(false);
    const isBusiness = variant === 'business';
    const isRider = variant === 'rider';

    const brandName = isBusiness ? 'Partner Network' : isRider ? 'Rider Fleet' : 'Hi-Vet';
    const description = isBusiness 
        ? 'High-performance infrastructure for the modern veterinary professional. Built for scale, security, and precision.'
        : isRider 
            ? 'The logistical backbone of pet healthcare. Synchronizing deliveries with surgical precision across the network.'
            : 'Architecting the future of veterinary care through advanced logistics and compassionate technology.';

    const globalEmail = 'hivetveterinary3@gmail.com';
    const globalPhone = '+63-912-345-6789';
    const globalAddress = "Deparo, Brgy 174, Caloocan City, Metro Manila";

    const legalContent = {
        'Help Center': { title: 'Operational Support', icon: HelpCircle, content: 'Our precision response team is available 24/7 to manage logistical synchronization and platform utility.' },
        'FAQs': { title: 'Standard Protocols', icon: HelpCircle, content: 'Comprehensive documentation on operational standards, fulfillment timelines, and network compliance.' },
        'About': { title: 'The Manifesto', icon: Globe, content: 'Hi-Vet is a technological heritage company dedicated to the architectural advancement of pet healthcare delivery.' },
        'Customer Support': { title: 'Concierge Care', icon: Mail, content: 'Direct access to our senior care architects for personalized solution management.' },
        'Technical Support': { title: 'Systems Infrastructure', icon: Shield, content: 'Real-time monitoring and technical maintenance for the Hi-Vet global digital network.' },
        'Safety Center': { title: 'Risk Integrity', icon: Globe, content: 'Our commitment to climate-controlled safety protocols and medical-grade delivery standards.' },
        'Terms of Service': { title: 'Governance Agreement', icon: FileText, content: 'Professional standards of interaction and operational usage for all network participants.' },
        'Security': { title: 'Encryption Standards', icon: Shield, content: 'AES-256 bank-grade encryption protocols protecting the sanctity of medical and personal data.' },
        'Privacy Policy': { title: 'Data Sovereignty', icon: Lock, content: 'Rigorous privacy standards ensuring zero third-party data commercialization.' },
        'Cookies': { title: 'Preference Nodes', icon: Globe, content: 'Essential operational data required for synchronized platform performance.' },
        'Direct Line': { title: 'Direct Response Line', icon: Phone, content: 'Our senior care architects are available for immediate logistical synchronization. Reach us at +63-912-345-6789.' }
    };

    useEffect(() => {
        if (activeSection) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [activeSection]);

    return (
        <footer className="bg-[#0A0A0A] text-white rounded-t-[4rem] relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] -z-0" />
            
            <div className="container mx-auto px-8 pt-16 pb-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 mb-12">
                    {/* Prestigious Branding */}
                    <div className="md:col-span-5 space-y-6">
                        <div className="space-y-4">
                            <Link to="/" className="flex items-center gap-4 group w-fit">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2.5 group-hover:rotate-6 transition-transform shadow-2xl">
                                    <Logo className="w-full h-full text-brand-dark" />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-2xl font-black tracking-tighter uppercase whitespace-nowrap">{brandName}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                                        <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/30">Network Live</span>
                                    </div>
                                </div>
                            </Link>
                            <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm italic">
                                "{description}"
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                <button key={i} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white text-brand-dark transition-all border border-white/10 group">
                                    <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Ecosystem</h4>
                            <ul className="space-y-4">
                                {['About', 'Help Center', 'Safety Center'].map((item) => (
                                    <li key={item}>
                                        <button onClick={() => setActiveSection(item as LegalSection)} className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 group">
                                            {item}
                                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Protocols</h4>
                            <ul className="space-y-4">
                                {['Terms of Service', 'Security', 'Privacy Policy'].map((item) => (
                                    <li key={item}>
                                        <button onClick={() => setActiveSection(item as LegalSection)} className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 group">
                                            {item}
                                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1 space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Direct Sync</h4>
                            <div className="space-y-6">
                                <a href={`mailto:${globalEmail}`} className="block border-l-2 border-brand/20 pl-4 py-1 hover:border-brand transition-colors">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Electronic Mail</p>
                                    <p className="text-sm font-bold text-white/70">{globalEmail}</p>
                                </a>
                                <button 
                                    onClick={() => setActiveSection('Direct Line')} 
                                    className="block w-full text-left border-l-2 border-brand/20 pl-4 py-1 hover:border-brand transition-colors cursor-pointer"
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Direct Line</p>
                                    <p className="text-sm font-bold text-white/70">{globalPhone}</p>
                                </button>
                                <div className="block border-l-2 border-brand/20 pl-4 py-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">HQ Distribution</p>
                                    <p className="text-[11px] font-medium text-white/40 leading-relaxed uppercase tracking-tight">{globalAddress}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">
                            © 2026 HI-VET INFRASTRUCTURE SOLUTIONS.
                        </p>
                    </div>
                    <div className="flex gap-10">
                        {['Cookies', 'Technical Support'].map((item) => (
                            <button key={item} onClick={() => setActiveSection(item as LegalSection)} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 hover:text-brand transition-colors">
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Professional Protocol Modal */}
            <AnimatePresence>
                {activeSection && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveSection(null)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
                        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="relative w-full max-w-2xl bg-[#111] rounded-[3.5rem] p-12 lg:p-16 border border-white/10 shadow-2xl overflow-hidden" >
                            <button onClick={() => setActiveSection(null)} className="absolute top-10 right-10 w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-brand hover:text-accent-brown transition-all" >
                                <X className="w-6 h-6" />
                            </button>
                            <div className="space-y-10">
                                <div className="space-y-6">
                                    <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-[2rem] flex items-center justify-center">
                                        {(() => {
                                            const Icon = legalContent[activeSection].icon;
                                            return <Icon className="w-10 h-10 text-brand" />;
                                        })()}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand">System Protocol</p>
                                        <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{legalContent[activeSection].title}</h3>
                                    </div>
                                </div>
                                <p className="text-xl text-white/50 leading-relaxed italic font-medium">"{legalContent[activeSection].content}"</p>
                                
                                {(activeSection === 'Direct Line' || activeSection === 'Technical Support' || activeSection === 'Customer Support') && (
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(globalPhone);
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 2000);
                                            }}
                                            className="flex-1 bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                        >
                                            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                            {isCopied ? 'Copied to Clipboard' : 'Copy Number'}
                                        </motion.button>
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => window.open(`tel:${globalPhone}`, '_self')}
                                            className="flex-1 bg-brand text-accent-brown py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:brightness-110 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Phone className="w-4 h-4" />
                                            Place Call Now
                                        </motion.button>
                                    </div>
                                )}

                                <button onClick={() => setActiveSection(null)} className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-brand hover:text-accent-brown transition-all" > Close Documentation </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </footer>
    );
}
