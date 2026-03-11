import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, Mail, Lock, ArrowRight, ArrowLeft,
    ShieldCheck, MailCheck, Building2, Eye, EyeOff, ClipboardList
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PasswordStrength } from '../components/PasswordStrength';
import { useAuth } from '../context/AuthContext';

const BusinessRegister = () => {
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form state
    const [clinicName, setClinicName] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

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

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            // Focus the last filled input or the next empty one
            const nextIndex = Math.min(pastedData.length, 5);
            const nextInput = document.getElementById(`otp-${nextIndex}`);
            nextInput?.focus();
        }
    };

    const handleSendOtp = async () => {
        if (!email || !password || password !== confirmPassword) {
            return setError('Please check your email and passwords');
        }
        if (password.length < 8) {
            return setError('Password must be at least 8 characters');
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:8000/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(3);
            } else {
                setError(data.detail || 'Failed to send verification email');
            }
        } catch (err) {
            setError('An error occurred while sending the email.');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!clinicName) {
                setError('Clinic Name is required');
                return;
            }
            setError('');
            setStep(2);
        } else if (step === 2) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 8) {
                setError('Password must be at least 8 characters');
                return;
            }
            handleSendOtp();
        }
    };
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const handleRegister = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return setError('Please enter the full 6-digit code');
        setLoading(true);
        setError('');
        try {
            // Note: Update this endpoint when the backend adds a specific business registration route
            const res = await fetch('http://localhost:8000/api/auth/register', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    otp: otpCode,
                    // Sending business-specific fields mapped to backend model or using separate fields if supported
                    first_name: clinicName, 
                    last_name: "Clinic", // Placeholder format to satisfy existing Customer registration if used as fallback
                    phone,
                    role: 'business', // Might be needed for backend to differentiate
                    license_number: licenseNumber
                })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                loginWithToken(data.token);
                navigate('/dashboard/business'); // Navigate to business dashboard
            } else {
                setError(data.detail || 'Partner registration failed');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred during partner registration.');
        } finally {
            setLoading(false);
        }
    };

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
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Clinic Information</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">Tell us about your veterinary practice.</p>
                        </div>
                        
                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Google OAuth Button */}
                        <button
                            type="button"
                            onClick={() => window.location.href = 'http://localhost:8000/auth/google'}
                            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-accent-brown/10 hover:border-brand/30 hover:bg-accent-peach/20 text-accent-brown font-bold rounded-[2rem] py-5 px-6 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Register easily with Google</span>
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-accent-brown/10" />
                            <span className="text-xs font-bold text-accent-brown/30 uppercase tracking-widest">or fill in manually</span>
                            <div className="flex-1 h-px bg-accent-brown/10" />
                        </div>

                        <div className="space-y-4">
                            {/* Clinic Name */}
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Clinic Name *</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Happy Paws Veterinary Clinic" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-4 pl-11 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                </div>
                            </div>
                            
                            {/* License Number & Phone */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">License Number (Optional)</label>
                                    <div className="relative">
                                        <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="PRC-123456" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-4 pl-11 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Phone Number</label>
                                    <div className="relative flex items-center bg-accent-peach/20 border-2 border-transparent focus-within:border-brand/30 focus-within:bg-white rounded-[2rem] transition-all overflow-hidden">
                                        <div className="flex items-center gap-2 pl-5 pr-3 shrink-0 text-accent-brown font-black text-sm border-r border-accent-brown/10">
                                            <Phone className="w-4 h-4 text-accent-brown/30" />
                                            <span>+63</span>
                                        </div>
                                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9XX XXX XXXX" className="flex-1 bg-transparent py-4 pl-4 pr-6 text-accent-brown font-semibold outline-none text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={nextStep} className="btn-primary w-full group flex items-center justify-center gap-3 h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6">
                            Proceed to Account Setup
                            <ArrowRight className="w-4 h-4 xs:w-5 xs:h-5 group-hover:translate-x-1 transition-transform" />
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
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Owner Credentials</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">Secure access for your business dashboard.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Business Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@happy-paws.com" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Account Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-12 text-accent-brown font-semibold outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="px-4">
                                        <PasswordStrength password={password} />
                                    </div>
                                )}
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Confirm Password</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-12 text-accent-brown font-semibold outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-red-500 text-xs font-bold pl-4">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-2 xs:gap-3 h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6">
                                Verify Clinic Email
                                <ArrowRight className="w-4 h-4 xs:w-5 xs:h-5 group-hover:translate-x-1 transition-transform" />
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
                            <div className="w-12 h-12 xs:w-16 xs:h-16 bg-brand/10 text-brand-dark rounded-full flex items-center justify-center">
                                <MailCheck className="w-6 h-6 xs:w-8 xs:h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Partner Verification</h3>
                                <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">
                                    We've sent a 6-digit security code to <br />
                                    <span className="text-accent-brown font-bold not-italic">{email || 'your email'}</span>
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between gap-2 xs:gap-3">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    className="w-10 xs:w-12 md:w-14 h-14 xs:h-16 md:h-18 text-center text-xl xs:text-3xl font-black text-brand-dark bg-accent-peach/20 border-2 border-brand-dark focus:border-brand-dark focus:bg-white rounded-xl xs:rounded-2xl outline-none transition-all"
                                />
                            ))}
                        </div>

                        <div className="space-y-6">
                            <p className="text-xs font-bold text-accent-brown/40 ml-4">
                                No code yet? {' '}
                                <button onClick={handleSendOtp} disabled={loading} className="text-brand-dark hover:underline underline-offset-4 disabled:opacity-50">Resend Code</button>
                            </p>

                            <div className="flex gap-4">
                                <button onClick={prevStep} disabled={loading} className="flex-1 px-8 py-5 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50">
                                    Review
                                </button>
                                <button onClick={handleRegister} disabled={loading} className="btn-primary flex-[2] bg-brand-dark h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6 disabled:opacity-50">
                                    {loading ? 'Creating Partner...' : 'Complete Registration'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-accent-cream flex items-center justify-center p-4 xs:p-6 sm:p-8 select-none relative py-12 xs:py-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-6xl w-full grid md:grid-cols-2 bg-white rounded-[2.5rem] xs:rounded-[3.5rem] shadow-2xl shadow-brand/10 border border-brand/5 overflow-hidden relative z-10"
            >
                {/* Left Side: Illustration Hero */}
                <div className="hidden md:flex flex-col justify-between p-16 bg-accent-peach/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors duration-500" />

                    <div className="relative z-10">
                        <Link to="/for-clinics" className="flex items-center gap-3 mb-12 hover:scale-105 transition-transform w-fit">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-accent-brown">Hi-Vet Partners</span>
                        </Link>

                        <div className="space-y-4 max-w-sm">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Transform your <br />
                                <span className="text-brand-dark">clinic's growth</span> <br />
                                today.
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed">
                                Join our network of professional veterinarians and unlock advanced business management tools.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        {/* Could replace with a specific business register hero image later */}
                        <motion.img
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            src="/images/register_hero.png"
                            alt="Partner Registration Illustration"
                            className="w-full max-w-[450px] mx-auto drop-shadow-2xl"
                        />
                    </div>

                    <div className="relative z-10 flex gap-4">
                        <div className="bg-white/50 backdrop-blur-md px-6 py-3 rounded-full border border-white text-[10px] font-black uppercase tracking-widest text-accent-brown/40">
                            Partner Setup - Step {step} of 3
                        </div>
                    </div>
                </div>

                {/* Right Side: Register Form */}
                <div className="p-6 xs:p-10 md:p-20 flex flex-col justify-center">
                    <div className="mb-10 flex items-center justify-between">
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-2 rounded-full transition-all duration-700 ${step >= i ? 'w-10 bg-brand-dark' : 'w-2 bg-accent-brown/10'}`} />
                            ))}
                        </div>
                        <Link to="/login/business" className="text-[10px] font-black text-brand-dark hover:text-brand transition-colors uppercase tracking-[0.2em] border-b-2 border-brand/20 pb-0.5">
                            Partner Login
                        </Link>
                    </div>

                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>

                    <div className="mt-12 text-center">
                        <Link to="/for-clinics" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Building2 className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                            Back to Landing
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default BusinessRegister;
