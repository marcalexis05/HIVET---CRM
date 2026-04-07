import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, X, Shield, Lock, FileText, Globe, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

interface FooterProps {
    variant?: 'main' | 'business' | 'rider';
}

type LegalSection = 'Help Center' | 'Safety Center' | 'Terms of Service' | 'Security' | 'Privacy Policy' | 'Cookies' | null;

export function Footer({ variant = 'main' }: FooterProps) {
    const [activeSection, setActiveSection] = useState<LegalSection>(null);
    const isBusiness = variant === 'business';
    const isRider = variant === 'rider';

    const brandName = isBusiness ? 'Hi-Vet Partners' : isRider ? 'Hi-Vet Riders' : 'Hi-Vet';
    const description = isBusiness 
        ? 'The ultimate business management platform designed exclusively for veterinary professionals and clinic owners.'
        : isRider 
            ? 'Join the premier network of pet healthcare delivery drivers. Turn your miles into meaningful missions.'
            : 'Redefining the standard of pet care with professional tools and a community-driven approach. Your pet\'s wellbeing is our priority.';

    const supportTitle = isBusiness ? 'Partner Support' : isRider ? 'Rider Support' : 'Support';
    const supportEmail = isBusiness ? 'partners@hi-vet.com' : isRider ? 'riders@hi-vet.com' : 'hello@hi-vet.com';
    const supportPhone = isBusiness ? '+1 (800) VET-PRO1' : isRider ? '+1 (800) HIVET-GO' : '+1 (555) 123-4567';

    const globalEmail = 'hivetveterinary3@gmail.com';
    const globalPhone = '+63-912-345-6789';
    const globalAddress = (
        <>
            Deparo,<br />
            Brgy 174, Caloocan City,<br />
            Metro Manila, 1421, Philippines
        </>
    );

    const legalContent = {
        'Help Center': {
            title: 'How can we help?',
            icon: HelpCircle,
            content: 'We are humbly committed to providing the support you need. Our team is available to assist you with order tracking, platform navigation, and account management. Please reach out to our dedicated support channels for immediate assistance.'
        },
        'Safety Center': {
            title: 'Our Safety Commitment',
            icon: Globe,
            content: 'The well-being of your pets and the integrity of our medical deliveries are our highest priorities. We utilize climate-controlled logistics and strict verification protocols to ensure every treatment reaches its destination safely.'
        },
        'Terms of Service': {
            title: 'Platform Agreements',
            icon: FileText,
            content: 'By utilizing the Hi-Vet platform, you agree to our professional standards of care. We maintain a transparent relationship with all users, partners, and riders to ensure a fair and efficient healthcare ecosystem.'
        },
        'Security': {
            title: 'Advanced Protection',
            icon: Shield,
            content: 'Your data is secured using industry-leading AES-256 encryption. We implement rigorous security audits and proactive threat monitoring to protect your personal and medical information around the clock.'
        },
        'Privacy Policy': {
            title: 'Your Privacy Matters',
            icon: Lock,
            content: 'We humbly respect your privacy. Hi-Vet never sells user data. We only collect essential information required to facilitate life-saving care and improve our dedicated services for the pet community.'
        },
        'Cookies': {
            title: 'Cookie Preferences',
            icon: Globe,
            content: 'We use essential cookies to provide a personalized and secure experience. These small data points help us remember your preferences and ensure our platform functions with the professional speed you expect.'
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (activeSection) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [activeSection]);

    return (
        <footer className="py-16 xs:py-24 bg-accent-brown text-accent-cream rounded-t-[3rem] xs:rounded-t-[5rem] mt-12 xs:mt-20 relative">
            <div className="container mx-auto px-6 xs:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-12 xs:gap-16 md:gap-8 pb-12 xs:pb-16">
                    {/* Branding Column */}
                    <div className="md:col-span-4 space-y-6 xs:space-y-8">
                        <Link to="/" className="flex items-center gap-3 group w-fit">
                            <div className="w-12 h-12 xs:w-14 xs:h-14 bg-white rounded-2xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-xl xs:text-2xl font-black tracking-tighter text-white">{brandName}</span>
                        </Link>
                        <p className="text-accent-cream/50 text-sm xs:text-base leading-relaxed max-w-sm font-medium">
                            {description}
                        </p>
                        <div className="flex gap-3 xs:gap-4">
                            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                <button key={i} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand hover:text-white transition-all border border-white/5">
                                    <Icon className="w-5 h-5" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links / Platform */}
                    <div className="md:col-span-2 space-y-6 xs:space-y-8">
                        <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">Platform</h4>
                        <ul className="space-y-3 xs:space-y-4 text-accent-cream/60 font-medium text-sm xs:text-base">
                            <li><Link to="/catalog" className="hover:text-white transition-colors">Catalog</Link></li>
                            <li><a href="/#orders" className="hover:text-white transition-colors">Orders</a></li>
                            <li><a href="/#loyalty" className="hover:text-white transition-colors">Loyalty Program</a></li>
                            <li><Link to="/for-clinics" className="hover:text-brand transition-colors text-brand font-bold">For Clinic Owners</Link></li>
                            <li><Link to="/for-riders" className="hover:text-brand transition-colors text-brand font-bold">For Riders</Link></li>
                        </ul>
                    </div>

                    {/* Support / Help */}
                    <div className="md:col-span-2 space-y-6 xs:space-y-8">
                        <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">{supportTitle}</h4>
                        <ul className="space-y-3 xs:space-y-4 text-accent-cream/60 font-medium text-sm xs:text-base">
                            {['Help Center', 'Safety Center', 'Terms of Service'].map((item) => (
                                <li key={item}>
                                    <button 
                                        onClick={() => setActiveSection(item as LegalSection)}
                                        className="hover:text-white transition-colors text-left uppercase text-[10px] tracking-widest font-black"
                                    >
                                        {item}
                                    </button>
                                </li>
                            ))}
                            {isBusiness || isRider ? (
                                <>
                                    <li className="pt-2 flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest">
                                        <Mail className="w-3 h-3" /> {supportEmail}
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest">
                                        <Phone className="w-3 h-3" /> {supportPhone}
                                    </li>
                                </>
                            ) : null}
                        </ul>
                    </div>

                    {/* Stay Connected */}
                    <div className="md:col-span-4 space-y-6 xs:space-y-8">
                        <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">Stay Connected</h4>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-brand/20 group-hover:border-brand/30 transition-all duration-300">
                                    <Mail className="w-5 h-5 text-accent-cream/70 group-hover:text-brand transition-colors" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Email Us</span>
                                    <span className="font-semibold text-sm xs:text-base text-accent-cream/80 group-hover:text-white transition-colors">{globalEmail}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-brand/20 group-hover:border-brand/30 transition-all duration-300">
                                    <Phone className="w-5 h-5 text-accent-cream/70 group-hover:text-brand transition-colors" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Call Us</span>
                                    <span className="font-semibold text-sm xs:text-base text-accent-cream/80 group-hover:text-white transition-colors">{globalPhone}</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-brand/20 group-hover:border-brand/30 transition-all duration-300">
                                    <MapPin className="w-5 h-5 text-accent-cream/70 group-hover:text-brand transition-colors" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Visit Us</span>
                                    <span className="font-semibold text-sm xs:text-base text-accent-cream/80 leading-relaxed group-hover:text-white transition-colors">
                                        {globalAddress}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[8px] xs:text-[10px] font-black uppercase tracking-[0.2em] xs:tracking-[0.3em] text-accent-cream/20 text-center md:text-left">
                    <p>© 2026 {brandName}. All Rights Reserved.</p>
                    <div className="flex gap-6 xs:gap-8">
                        {['Security', 'Privacy Policy', 'Cookies'].map((item) => (
                            <button 
                                key={item}
                                onClick={() => setActiveSection(item as LegalSection)}
                                className="hover:text-white transition-colors"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legal Overlay Modal */}
            <AnimatePresence>
                {activeSection && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveSection(null)}
                            className="absolute inset-0 bg-accent-brown/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 xs:p-12 shadow-2xl overflow-hidden"
                        >
                            <button 
                                onClick={() => setActiveSection(null)}
                                className="absolute top-8 right-8 w-10 h-10 bg-accent-peach/20 rounded-full flex items-center justify-center text-accent-brown hover:bg-brand hover:text-white transition-all transform hover:rotate-90"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center">
                                    {(() => {
                                        const Icon = legalContent[activeSection].icon;
                                        return <Icon className="w-8 h-8 text-brand" />;
                                    })()}
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="text-2xl xs:text-3xl font-black text-accent-brown tracking-tighter">
                                        {legalContent[activeSection].title}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Legal & Transparency</p>
                                </div>

                                <p className="text-sm xs:text-base text-accent-brown/60 leading-relaxed font-medium">
                                    {legalContent[activeSection].content}
                                </p>

                                <div className="pt-6">
                                    <button 
                                        onClick={() => setActiveSection(null)}
                                        className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand/20"
                                    >
                                        I Understand
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </footer>
    );
}
