import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, X, Shield, Lock, FileText, Globe, HelpCircle, ArrowUpRight, Copy, Check, ArrowUp, QrCode } from 'lucide-react';
import { PwaInstallModal } from './PwaInstallModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

interface FooterProps {
    variant?: 'main' | 'business' | 'rider';
    className?: string;
}

type LegalSection = 'Help & Support' | 'About Hi-Vet' | 'Customer Support' | 'Technical Help' | 'Pet Safety' | 'Terms of Use' | 'Safe and Secure' | 'Privacy Policy' | 'Cookie Policy' | 'Direct Line' | null;

export function Footer({ variant = 'main', className = '' }: FooterProps) {
    const [activeSection, setActiveSection] = useState<LegalSection>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [showFloatingTop, setShowFloatingTop] = useState(false);
    const [showPwaModal, setShowPwaModal] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowFloatingTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');
    const showFloating = showFloatingTop && !isDashboard;
    const isBusiness = variant === 'business';
    const isRider = variant === 'rider';

    const brandName = isBusiness ? 'Hi-Vet for Clinics' : isRider ? 'Hi-Vet Riders' : 'Hi-Vet';
    const description = isBusiness 
        ? 'Simple tools to help clinics manage bookings, orders, and deliveries in one place.'
        : isRider 
            ? 'Deliver pet food and medicine, help local pet owners, and earn on your schedule.'
            : 'Helping pet owners get quality pet food, supplies, and vet care easily.';

    const globalEmail = 'hivetveterinary3@gmail.com';
    const globalPhone = '+63-912-345-6789';
    const globalAddress = "Deparo, Brgy 174, Caloocan City, Metro Manila";

    const legalContent = {
        'Help & Support': { title: 'Help & Support', icon: HelpCircle, content: 'Our friendly support team is ready to help you with your orders and clinic visits.' },
        'About Hi-Vet': { title: 'About Hi-Vet', icon: Globe, content: 'Hi-Vet connects pet owners with trusted clinics and riders for easy, reliable pet care.' },
        'Customer Support': { title: 'Customer Support', icon: Mail, content: 'Contact our team anytime for help with your pet orders, products, or clinic visits.' },
        'Technical Help': { title: 'Technical Help', icon: Shield, content: 'Need help with your account or the website? Reach out to our technical team.' },
        'Pet Safety': { title: 'Pet Safety', icon: Globe, content: 'All our clinics and products meet strict quality and safety guidelines for your pets.' },
        'Terms of Use': { title: 'Terms of Use', icon: FileText, content: 'Our terms and rules for using the Hi-Vet website and ordering platform.' },
        'Safe and Secure': { title: 'Safe and Secure', icon: Shield, content: 'We protect your data and payment information with modern security standards.' },
        'Privacy Policy': { title: 'Privacy Policy', icon: Lock, content: 'We care about your privacy. Your personal information is never sold to third parties.' },
        'Cookie Policy': { title: 'Cookie Policy', icon: Globe, content: 'We use cookies to keep you signed in and give you a smooth browsing experience.' },
        'Direct Line': { title: 'Call Us', icon: Phone, content: 'Need quick help? Call our support team directly at +63-912-345-6789.' }
    };

    useEffect(() => {
        if (activeSection) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [activeSection]);

    return (
        <footer className={`block bg-[#0A0A0A] text-white rounded-t-[2rem] sm:rounded-t-[3rem] relative overflow-hidden ${className}`}>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[100px] -z-0 pointer-events-none" />
            
            <div className="container mx-auto px-6 sm:px-8 pt-8 sm:pt-10 pb-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 mb-8">
                    {/* Prestigious Branding */}
                    <div className="md:col-span-5 space-y-3 sm:space-y-4">
                        <Link to="/" className="flex items-center gap-3 group w-fit">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 group-hover:rotate-6 transition-transform shadow-lg">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-xl sm:text-2xl font-black tracking-tight whitespace-nowrap">{brandName}</span>
                        </Link>
                        <p className="text-white/40 text-xs sm:text-sm font-medium leading-relaxed max-w-sm italic">
                            "{description}"
                        </p>
                        
                        <div className="flex gap-2.5 pt-1">
                            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                <button key={i} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white text-white/80 hover:text-brand-dark transition-all border border-white/10 group">
                                    <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                </button>
                            ))}
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={() => setShowPwaModal(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold border border-white/10 transition-all hover:border-brand/40 group"
                            >
                                <QrCode className="w-4 h-4 text-brand group-hover:scale-110 transition-transform" />
                                <span>Get Mobile App (QR Code)</span>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-brand">About & Help</h4>
                            <ul className="space-y-2.5">
                                {['About Hi-Vet', 'Help & Support', 'Pet Safety'].map((item) => (
                                    <li key={item}>
                                        <button onClick={() => setActiveSection(item as LegalSection)} className="text-white/40 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 group cursor-pointer">
                                            {item}
                                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-brand">Legal & Privacy</h4>
                            <ul className="space-y-2.5">
                                {['Terms of Use', 'Safe and Secure', 'Privacy Policy'].map((item) => (
                                    <li key={item}>
                                        <button onClick={() => setActiveSection(item as LegalSection)} className="text-white/40 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 group cursor-pointer">
                                            {item}
                                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-3">
                            <h4 className="text-xs font-bold text-brand">Contact Us</h4>
                            <div className="space-y-2.5">
                                <a href={`mailto:${globalEmail}`} className="block border-l-2 border-brand/30 pl-3 py-0.5 hover:border-brand transition-colors">
                                    <p className="text-[10px] text-white/40">Email</p>
                                    <p className="text-xs font-semibold text-white/80 truncate">{globalEmail}</p>
                                </a>
                                <button 
                                    onClick={() => setActiveSection('Direct Line')} 
                                    className="block w-full text-left border-l-2 border-brand/30 pl-3 py-0.5 hover:border-brand transition-colors cursor-pointer"
                                >
                                    <p className="text-[10px] text-white/40">Call Us</p>
                                    <p className="text-xs font-semibold text-white/80">{globalPhone}</p>
                                </button>
                                <div className="block border-l-2 border-brand/30 pl-3 py-0.5">
                                    <p className="text-[10px] text-white/40">Address</p>
                                    <p className="text-[11px] text-white/50 leading-tight">{globalAddress}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-4 sm:pt-5 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                    <p className="text-[11px] font-medium text-white/20">
                        © 2026 Hi-Vet. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        {['Cookie Policy', 'Technical Help'].map((item) => (
                            <button key={item} onClick={() => setActiveSection(item as LegalSection)} className="text-[11px] font-medium text-white/20 hover:text-brand transition-colors cursor-pointer">
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Information Modal */}
            <AnimatePresence>
                {activeSection && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveSection(null)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
                        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="relative w-full max-w-2xl bg-[#111] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-16 border border-white/10 shadow-2xl overflow-hidden" >
                            <button onClick={() => setActiveSection(null)} className="absolute top-5 right-5 sm:top-8 sm:right-8 w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-brand hover:text-accent-brown transition-all" >
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
                                        <p className="text-xs font-bold text-brand">Help & Information</p>
                                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">{legalContent[activeSection].title}</h3>
                                    </div>
                                </div>
                                <p className="text-base sm:text-lg text-white/60 leading-relaxed italic font-medium">"{legalContent[activeSection].content}"</p>
                                
                                {(activeSection === 'Direct Line' || activeSection === 'Technical Help' || activeSection === 'Customer Support') && (
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(globalPhone);
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 2000);
                                            }}
                                            className="flex-1 bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                        >
                                            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                            {isCopied ? 'Copied to Clipboard' : 'Copy Phone Number'}
                                        </motion.button>
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => window.open(`tel:${globalPhone}`)}
                                            className="flex-1 bg-brand text-accent-brown py-5 rounded-2xl font-bold text-xs hover:bg-brand-dark transition-all flex items-center justify-center gap-3"
                                        >
                                            <Phone className="w-4 h-4" />
                                            Call Directly
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating Back to Top Button */}
            {showFloating && (
                <button
                    onClick={scrollToTop}
                    aria-label="Back to top"
                    className="fixed bottom-6 right-6 z-40 bg-brand text-white p-3.5 rounded-full shadow-2xl hover:bg-brand-dark transition-all transform hover:-translate-y-1 active:scale-95"
                >
                    <ArrowUp className="w-5 h-5 text-white stroke-[2.5]" />
                </button>
            )}
            <PwaInstallModal
                isOpen={showPwaModal}
                onClose={() => setShowPwaModal(false)}
                initialRole={isBusiness ? 'business' : isRider ? 'rider' : 'customer'}
            />
        </footer>
    );
}
