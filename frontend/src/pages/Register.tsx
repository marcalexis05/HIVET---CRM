import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock, ArrowRight,
    ShieldCheck, MailCheck,
    Eye, EyeOff, X, ChevronLeft, User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { useAuth } from '../context/AuthContext';
import registerHero from '../assets/login_hero_landscape.png';

const calculateAge = (birthdate: string) => {
    if (!birthdate) return '';
    try {
        const birthDate = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age.toString() : '0';
    } catch (e) { return ''; }
};

const Register = () => {
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [suffix, setSuffix] = useState('');
    const [phone, setPhone] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [gender, setGender] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState(false);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

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
                body: JSON.stringify({
                    email,
                    name: `${firstName} ${lastName}`.trim(),
                    gender,
                    last_name: lastName
                })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(3);
                setCountdown(60);
            } else {
                setError(data.detail || 'Failed to send verification email');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 3) {
            handleRegister();
        } else {
            nextStep();
        }
    };

    const nextStep = async () => {
        setError('');
        if (step === 1) {
            if (!firstName || !lastName || !phone || !birthdate || !gender) {
                setError('All mandatory fields must be completed');
                return;
            }
            const age = parseInt(calculateAge(birthdate));
            if (isNaN(age)) {
                setError('A valid birthdate is required for identification');
                return;
            }
            if (age < 12) {
                setError('Identification requires candidates 12 years and above');
                return;
            }
            if (age > 120) {
                setError('Entry exceeds the maximum permissible age limit');
                return;
            }
            if (phone.length !== 10 || !phone.startsWith('9')) {
                setError('Enter a valid 10-digit mobile number');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!email || !password || !confirmPassword) {
                setError('All mandatory fields must be completed');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setError('Enter a valid electronic mail address');
                return;
            }

            // Password Strength Validation
            let strengthScore = 0;
            if (password.length > 7) strengthScore += 1;
            if (/[A-Z]/.test(password)) strengthScore += 1;
            if (/[0-9]/.test(password)) strengthScore += 1;
            if (/[^A-Za-z0-9]/.test(password)) strengthScore += 1;

            if (strengthScore < 2) {
                setError('Security requires 8+ characters with uppercase, numeric, and symbols');
                return;
            }

            if (password !== confirmPassword) {
                setError('Security credentials do not match');
                return;
            }
            if (!agreedToTerms) {
                setError('Acknowledgment of terms and conditions is required');
                return;
            }
            await handleSendOtp();
        }
    };
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const handleRegister = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return setError('Verification requires the complete 6-digit code');
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:8000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    otp: otpCode,
                    first_name: firstName,
                    last_name: lastName,
                    middle_name: middleName,
                    suffix,
                    phone,
                    birthdate,
                    gender,
                    role: 'customer'
                })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                loginWithToken(data.token);
                navigate('/dashboard/customer');
            } else {
                setError(data.detail || 'Registration failed');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-accent-brown tracking-tighter uppercase leading-none">Profile</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Identification details.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 group">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 transition-colors group-focus-within:text-brand-dark italic">First Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full bg-transparent py-4 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-2 group">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 transition-colors group-focus-within:text-brand-dark italic">Last Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-transparent py-4 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 group">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 transition-colors group-focus-within:text-brand-dark italic">Middle Name <span className="text-[11px] lowercase opacity-50 font-bold italic not-uppercase tracking-normal">(Optional)</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" className="w-full bg-transparent py-4 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <CustomDropdown label="Suffix" isOptional={true} value={suffix} onChange={setSuffix} options={[{ label: 'None', value: '' }, { label: 'Jr.', value: 'Jr.' }, { label: 'Sr.', value: 'Sr.' }, { label: 'II', value: 'II' }]} placeholder="None" />
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 transition-colors group-focus-within:text-brand-dark italic">Mobile Phone <span className="text-brand-dark">*</span></label>
                                <div className="relative flex items-center bg-[#F7F6F2] ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl overflow-hidden transition-all shadow-inner">
                                    <div className="pl-8 pr-5 py-4 text-accent-brown font-black border-r border-accent-brown/10 text-base opacity-20 transition-opacity group-focus-within:opacity-100">+63</div>
                                    <input type="tel" value={phone} maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9XX XXX XXXX" className="flex-1 bg-transparent py-4 px-8 text-accent-brown font-bold text-base outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <CustomDatePicker label="Birthdate" value={birthdate} isRequired={true} onChange={setBirthdate} />
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-accent-brown/40 block ml-1">Calculated Age</label>
                                    <div className="w-full bg-[#F7F6F2] py-4 px-6 rounded-2xl text-accent-brown font-black text-xl italic opacity-50">{calculateAge(birthdate) || '--'}</div>
                                </div>
                            </div>
                            <CustomDropdown label="Sex" value={gender} isRequired={true} onChange={setGender} options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Other', value: 'Other' }]} placeholder="Select" />
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-2 px-4 rounded-xl border border-red-100 italic text-center mb-4">{error}</div>}
                        <button type="submit" className="bg-brand-dark text-white w-full py-4 rounded-full font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:shadow-2xl transition-all group">Next Stage <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-accent-brown tracking-tighter uppercase leading-none">Security</h3>
                            <p className="text-sm text-accent-brown/40 font-medium italic">Secure your account credentials.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Email</label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@gmail.com" className="w-full bg-[#F7F6F2] rounded-3xl py-4 pl-16 pr-8 text-accent-brown font-bold text-base outline-none shadow-inner" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-xs font-black text-accent-brown/30 uppercase tracking-[0.3em] pl-6">Password</label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#F7F6F2] rounded-3xl py-5 pl-16 pr-14 text-accent-brown font-semibold outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && <div className="px-6"><PasswordStrength password={password} /></div>}
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Confirm Password</label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#F7F6F2] rounded-3xl py-5 pl-16 pr-14 text-accent-brown font-semibold outline-none shadow-inner" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20">
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="pt-2 px-6">
                                <div className="flex items-center gap-3 group/terms cursor-pointer py-1" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${agreedToTerms ? 'bg-brand-dark border-brand-dark shadow-lg shadow-brand-dark/30' : 'border-accent-brown/10 bg-white group-hover/terms:border-accent-brown/30'}`}>
                                        {agreedToTerms && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-accent-brown/30 group-hover/terms:text-accent-brown transition-colors italic">
                                        I accept the {' '}
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setShowLegalModal(true); }} className="text-brand-dark hover:underline">Terms</button>
                                        {' '} and {' '}
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setShowLegalModal(true); }} className="text-brand-dark hover:underline">Conditions</button>
                                    </p>
                                </div>
                            </div>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-2 px-4 rounded-xl border border-red-100 italic text-center mb-4">{error}</div>}
                        <div className="flex gap-6 mt-6">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="submit" disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic">{loading ? 'Processing...' : 'Verify Now'}</button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                        <div className="space-y-4">
                            <div className="w-20 h-20 bg-brand/10 text-brand-dark rounded-3xl flex items-center justify-center"><MailCheck className="w-10 h-10" /></div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">Verification</h3>
                                <p className="text-sm text-accent-brown/40 font-medium italic leading-relaxed">Sent 6-digit code to <span className="text-accent-brown font-bold not-italic">{email}</span></p>
                            </div>
                        </div>
                        <div className="flex justify-between gap-3">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} onPaste={handlePaste} className="w-12 h-16 sm:w-16 sm:h-20 text-center text-3xl font-black text-brand-dark bg-[#F7F6F2] rounded-3xl outline-none transition-all ring-1 ring-brand-dark/5 focus:ring-brand-dark/30 shadow-inner" />
                            ))}
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-2 px-4 rounded-xl border border-red-100 italic text-center mb-4">{error}</div>}
                        <div className="space-y-8">
                            <p className="text-xs font-black text-accent-brown/30 uppercase tracking-[0.2em] ml-6 italic">No code? <button type="button" onClick={handleSendOtp} disabled={countdown > 0} className="text-brand-dark font-black hover:text-accent-brown">{countdown > 0 ? `Wait ${countdown}s` : 'Resend'}</button></p>
                            <div className="flex gap-4">
                                <button type="button" onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 italic">Review</button>
                                <button type="submit" disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all italic">{loading ? 'Creating...' : 'Initialize'}</button>
                            </div>
                        </div>
                    </motion.div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img src={registerHero} alt="Lifestyle" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-24">
                    <div className="space-y-12">
                        <Link to="/" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <User className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Join Network</div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Start your <br /><span className="text-brand-dark italic font-outfit">Journey.</span></h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Join the world's most innovative community for dedicated pet parents and professionals.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">Onboarding Stage {step} / 3</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Full Screen Form */}
            <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-hidden">
                <div className="lg:hidden absolute top-8 left-12">
                    <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <User className="w-7 h-7" />
                    </div>
                </div>
                <div className="w-full max-w-lg flex flex-col justify-center">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex gap-4">
                            {[1, 2, 3].map(i => <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'w-16 bg-brand-dark shadow-[0_0_20px_rgba(242,107,33,0.4)]' : 'w-4 bg-accent-brown/10'}`} />)}
                        </div>
                        <Link to="/login" className="text-sm font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">Sign In Instead</Link>
                    </div>

                    <form onSubmit={handleSubmit} className="overflow-y-visible"><AnimatePresence mode="wait">{renderStep()}</AnimatePresence></form>

                    {step === 1 && (
                        <div className={`mt-3 ${error ? 'space-y-2' : 'space-y-4'}`}>
                            <div className="flex items-center gap-8"><div className="flex-1 h-[1px] bg-accent-brown/10" /><span className="text-xs font-black text-accent-brown/20 uppercase tracking-[0.6em]">Quick Link</span><div className="flex-1 h-[1px] bg-accent-brown/10" /></div>
                            <button type="button" onClick={() => window.location.href = 'http://localhost:8000/auth/google'} className="w-full flex items-center justify-center gap-4 bg-[#F7F6F2] hover:bg-white border border-transparent hover:border-brand-dark/20 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-sm italic">
                                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                Sign Up with Google
                            </button>
                        </div>
                    )}


                    <div className="mt-6 text-center pt-4 border-t border-accent-brown/5">
                        <Link to="/" className="inline-flex items-center gap-4 text-sm font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                            Return
                        </Link>
                    </div>
                </div>
            </div>

            {/* Legal Overlays */}
            <AnimatePresence>
                {showLegalModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLegalModal(false)} className="absolute inset-0 bg-accent-brown/80 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white rounded-[3.5rem] p-12 sm:p-16 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <button onClick={() => setShowLegalModal(false)} className="absolute top-12 right-12 text-accent-brown hover:rotate-90 transition-transform"><X className="w-8 h-8" /></button>
                            <div className="space-y-10 text-left">
                                <div className="w-20 h-20 bg-brand/10 text-brand-dark rounded-3xl flex items-center justify-center"><ShieldCheck className="w-10 h-10" /></div>
                                <h3 className="text-3xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">Terms & Conditions</h3>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-dark italic">User Integrity</h4>
                                        <p className="text-md text-accent-brown/70 italic leading-[1.6]">
                                            You agree to provide accurate identification data and maintain the absolute confidentiality of your portal access credentials.
                                        </p>
                                    </div>
                                    <div className="w-full h-[1px] bg-accent-brown/5" />
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-dark italic">Data Protection</h4>
                                        <p className="text-md text-accent-brown/70 italic leading-[1.6]">
                                            Your information is secured via advanced encryption. We uphold strict privacy standards and never compromise your individual data sovereignty.
                                        </p>
                                    </div>
                                    <div className="w-full h-[1px] bg-accent-brown/5" />
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-dark italic">Service Usage</h4>
                                        <p className="text-md text-accent-brown/70 italic leading-[1.6]">
                                            The Hi-Vet ecosystem must be utilized in accordance with professional veterinary ethics and local regulatory requirements.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setAgreedToTerms(true); setShowLegalModal(false); }} className="w-full bg-brand-dark text-white py-6 rounded-full font-black uppercase tracking-[0.4em] text-xs shadow-xl shadow-brand-dark/20 hover:shadow-brand-dark/40 hover:-translate-y-1 transition-all">Confirm Acknowledgement</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Register;
