import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Phone, MapPin, Mail,
    Lock, ArrowRight, ArrowLeft,
    ShieldCheck, MailCheck,
    Home
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

const Register = () => {
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const navigate = useNavigate();

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const nextStep = () => setStep(s => Math.min(3, s + 1));
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter">Personal Information</h3>
                            <p className="text-sm text-accent-brown/50 font-medium italic">Let's start with your profile details.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="text" placeholder="Johnathan Doe" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Address / Region</label>
                                <div className="relative">
                                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="text" placeholder="Beverly Hills, CA" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <button onClick={nextStep} className="btn-primary w-full group flex items-center justify-center gap-3 h-16">
                            Proceed to Basics
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter">Account Basics</h3>
                            <p className="text-sm text-accent-brown/50 font-medium italic">Secure your professional credentials.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="email" placeholder="john@hi-vet.com" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="password" placeholder="••••••••" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Confirm Security</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="password" placeholder="••••••••" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-3 h-16">
                                Verify Now
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-brand/10 text-brand-dark rounded-full flex items-center justify-center">
                                <MailCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-accent-brown tracking-tighter">Verification Code</h3>
                                <p className="text-sm text-accent-brown/50 font-medium italic">
                                    We've sent a 6-digit code to <br />
                                    <span className="text-accent-brown font-bold not-italic">john@hi-vet.com</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between gap-3">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    className="w-12 md:w-14 h-16 md:h-18 text-center text-3xl font-black text-brand-dark bg-accent-peach/20 border-2 border-transparent focus:border-brand focus:bg-white rounded-2xl outline-none transition-all"
                                />
                            ))}
                        </div>

                        <div className="space-y-6">
                            <p className="text-xs font-bold text-accent-brown/40 ml-4">
                                No code yet? {' '}
                                <button className="text-brand-dark hover:underline underline-offset-4">Resend Protocol</button>
                            </p>

                            <div className="flex gap-4">
                                <button onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px]">
                                    Review
                                </button>
                                <button onClick={() => navigate('/')} className="btn-primary flex-[2] bg-brand-dark h-16">
                                    Complete Sign Up
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-accent-cream flex items-center justify-center p-4 md:p-8 select-none overflow-hidden relative">

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-6xl w-full grid md:grid-cols-2 bg-white rounded-[3.5rem] shadow-2xl shadow-brand/10 border border-brand/5 overflow-hidden relative z-10"
            >
                {/* Left Side: Illustration Hero */}
                <div className="hidden md:flex flex-col justify-between p-16 bg-accent-peach/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors duration-500" />

                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 mb-12 hover:scale-105 transition-transform w-fit">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-accent-brown">Hi-Vet</span>
                        </Link>

                        <div className="space-y-4 max-w-sm">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Your journey to <br />
                                <span className="text-brand-dark">premium pet care</span> <br />
                                starts here.
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed">
                                Join our network of animal lovers and access world-class veterinary service tools.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <motion.img
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            src="/images/register_hero.png"
                            alt="Register Illustration"
                            className="w-full max-w-[450px] mx-auto drop-shadow-2xl"
                        />
                    </div>

                    <div className="relative z-10 flex gap-4">
                        <div className="bg-white/50 backdrop-blur-md px-6 py-3 rounded-full border border-white text-[10px] font-black uppercase tracking-widest text-accent-brown/40">
                            Step {step} of 3
                        </div>
                    </div>
                </div>

                {/* Right Side: Register Form */}
                <div className="p-10 md:p-20 flex flex-col justify-center">
                    <div className="mb-10 flex items-center justify-between">
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-2 rounded-full transition-all duration-700 ${step >= i ? 'w-10 bg-brand-dark' : 'w-2 bg-accent-brown/10'}`} />
                            ))}
                        </div>
                        <Link to="/login" className="text-[10px] font-black text-brand-dark hover:text-brand transition-colors uppercase tracking-[0.2em] border-b-2 border-brand/20 pb-0.5">
                            Login instead
                        </Link>
                    </div>

                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>

                    <div className="mt-12 text-center">
                        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Home className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                            Return to Landing
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
