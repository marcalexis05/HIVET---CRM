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
    const [showStudyModal, setShowStudyModal] = useState(false);
    const [referralCode, setReferralCode] = useState('');

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
            if (age < 18) {
                setError('Identification requires candidates 18 years and above');
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
                    role: 'customer',
                    referral_code: referralCode
                })
            });
            const data = await res.json();
            if (res.ok) {
                // Redirect to login page with success message instead of auto-logging in
                navigate('/login?msg=reg_success');
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
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2 sm:space-y-2.5">
                        <div className="space-y-0.5">
                            <h3 className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight leading-none">Profile</h3>
                            <p className="text-[10px] sm:text-[11px] text-accent-brown/40 font-medium italic">Identification details.</p>
                        </div>
                        <div className="space-y-2 sm:space-y-2.5">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-1 group">
                                    <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors group-focus-within:text-brand-dark italic block">First Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full bg-transparent py-2.5 sm:py-3 px-5 sm:px-6 text-accent-brown font-bold text-sm sm:text-base outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-1 group">
                                    <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors group-focus-within:text-brand-dark italic block">Last Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-transparent py-2.5 sm:py-3 px-5 sm:px-6 text-accent-brown font-bold text-sm sm:text-base outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-1 group">
                                    <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors group-focus-within:text-brand-dark italic block">Middle Name <span className="text-[10px] lowercase opacity-50 font-bold italic not-uppercase tracking-normal">(Optional)</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" className="w-full bg-transparent py-2.5 sm:py-3 px-5 sm:px-6 text-accent-brown font-bold text-sm sm:text-base outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <CustomDropdown 
                                        label="Suffix" 
                                        isOptional={true} 
                                        value={suffix} 
                                        onChange={setSuffix} 
                                        options={[{ label: 'None', value: '' }, { label: 'Jr.', value: 'Jr.' }, { label: 'Sr.', value: 'Sr.' }, { label: 'II', value: 'II' }]} 
                                        placeholder="None" 
                                        labelClassName="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors italic block mb-1"
                                        buttonClassName="w-full bg-[#F7F6F2] border border-brand-dark/5 transition-all rounded-3xl py-2.5 sm:py-3 px-5 sm:px-6 text-sm sm:text-base font-bold text-accent-brown flex items-center justify-between outline-none shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 group">
                                <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors group-focus-within:text-brand-dark italic block">Mobile Phone <span className="text-brand-dark">*</span></label>
                                <div className="relative flex items-center bg-[#F7F6F2] ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl overflow-hidden transition-all shadow-inner">
                                    <div className="pl-6 pr-4 py-2.5 sm:py-3 text-accent-brown font-black border-r border-accent-brown/10 text-sm sm:text-base opacity-30 transition-opacity group-focus-within:opacity-100">+63</div>
                                    <input type="tel" value={phone} maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9XX XXX XXXX" className="flex-1 bg-transparent py-2.5 sm:py-3 px-5 sm:px-6 text-accent-brown font-bold text-sm sm:text-base outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
                                <div className="space-y-1">
                                    <CustomDatePicker 
                                        label="Birthdate" 
                                        value={birthdate} 
                                        isRequired={true} 
                                        onChange={setBirthdate} 
                                        labelClassName="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors italic block mb-1"
                                        buttonClassName="w-full bg-[#F7F6F2] border border-brand-dark/5 transition-all rounded-3xl py-2.5 sm:py-3 px-5 sm:px-6 text-sm sm:text-base font-bold text-accent-brown flex items-center justify-between outline-none shadow-inner text-left"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] sm:text-[11px] font-black  text-accent-brown/30 block pl-4 sm:pl-6 italic mb-1">Calculated Age</label>
                                    <div className="w-full bg-[#F7F6F2] py-2.5 sm:py-3 px-5 sm:px-6 rounded-3xl text-accent-brown font-black text-sm sm:text-base italic opacity-50 shadow-inner border border-brand-dark/5 flex items-center">{calculateAge(birthdate) || '--'}</div>
                                    <button type="button" onClick={() => setShowStudyModal(true)} className="text-[9px] font-black text-brand-dark  hover:underline italic pl-4 sm:pl-6 block text-left pt-0.5">Why 18+? View BAI Study</button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <CustomDropdown 
                                    label="Sex" 
                                    value={gender} 
                                    isRequired={true} 
                                    onChange={setGender} 
                                    options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Other', value: 'Other' }]} 
                                    placeholder="Select" 
                                    labelClassName="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 transition-colors italic block mb-1"
                                    buttonClassName="w-full bg-[#F7F6F2] border border-brand-dark/5 transition-all rounded-3xl py-2.5 sm:py-3 px-5 sm:px-6 text-sm sm:text-base font-bold text-accent-brown flex items-center justify-between outline-none shadow-inner"
                                />
                            </div>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500  bg-red-50 py-1.5 px-4 rounded-xl border border-red-100 italic text-center">{error}</div>}
                        <button type="submit" className="bg-brand-dark text-white w-full py-3 sm:py-3.5 rounded-full font-black text-xs uppercase tracking-[0.35em] flex items-center justify-center gap-3 hover:shadow-2xl transition-all group mt-1">Next Stage <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" /></button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 sm:space-y-4">
                        <div className="space-y-0.5">
                            <h3 className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight leading-none">Security</h3>
                            <p className="text-[10px] sm:text-[11px] text-accent-brown/40 font-medium italic">Secure your account credentials.</p>
                        </div>
                        <div className="space-y-2.5 sm:space-y-3">
                            <div className="group space-y-1">
                                <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 italic">Email</label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@gmail.com" className="w-full bg-[#F7F6F2] rounded-3xl py-2.5 sm:py-3 pl-14 pr-6 text-accent-brown font-bold text-sm sm:text-base outline-none shadow-inner" />
                                </div>
                            </div>
                            <div className="group space-y-1">
                                <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6">Password</label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#F7F6F2] rounded-3xl py-2.5 sm:py-3 pl-14 pr-12 text-accent-brown font-semibold text-sm sm:text-base outline-none shadow-inner" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-accent-brown/20">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {password && <div className="px-4"><PasswordStrength password={password} /></div>}
                            </div>
                            <div className="group space-y-1">
                                <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 italic">Confirm Password</label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#F7F6F2] rounded-3xl py-2.5 sm:py-3 pl-14 pr-12 text-accent-brown font-semibold text-sm sm:text-base outline-none shadow-inner" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-accent-brown/20">
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="group space-y-1">
                                <label className="text-[10px] sm:text-[11px] font-black text-accent-brown/30  pl-4 sm:pl-6 italic font-brand italic">Referral Code <span className="text-[10px] lowercase opacity-50 font-bold italic not-uppercase tracking-normal">(Optional)</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-sm">
                                    <ArrowRight className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} placeholder="HIVET-XXXX" className="w-full bg-[#F7F6F2] rounded-3xl py-2.5 sm:py-3 pl-14 pr-6 text-accent-brown font-black text-sm sm:text-base outline-none shadow-inner tracking-widest placeholder:tracking-normal placeholder:font-bold" />
                                </div>
                            </div>

                            <div className="pt-0.5 px-4 sm:px-6">
                                <div className="flex items-center gap-3 group/terms cursor-pointer py-1" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                                    <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${agreedToTerms ? 'bg-brand-dark border-brand-dark shadow-md' : 'border-accent-brown/10 bg-white group-hover/terms:border-accent-brown/30'}`}>
                                        {agreedToTerms && <div className="w-2 h-2 bg-white rounded-xs" />}
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] font-black  text-accent-brown/30 group-hover/terms:text-accent-brown transition-colors italic">
                                        I accept the {' '}
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setShowLegalModal(true); }} className="text-brand-dark hover:underline">Terms</button>
                                        {' '} and {' '}
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setShowLegalModal(true); }} className="text-brand-dark hover:underline">Conditions</button>
                                    </p>
                                </div>
                            </div>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500  bg-red-50 py-1.5 px-4 rounded-xl border border-red-100 italic text-center">{error}</div>}
                        <div className="flex gap-4 mt-3">
                            <button type="button" onClick={prevStep} className="flex-1 px-6 py-3 rounded-full font-black text-xs  text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-2">
                                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </button>
                            <button type="submit" disabled={loading} className="bg-brand-dark text-white flex-[2] py-3 rounded-full font-black text-xs  transition-all hover:shadow-2xl shadow-xl italic">{loading ? 'Processing...' : 'Verify Now'}</button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-brand/10 text-brand-dark rounded-2xl flex items-center justify-center"><MailCheck className="w-6 h-6" /></div>
                            <div className="space-y-0.5">
                                <h3 className="text-2xl sm:text-3xl font-black text-accent-brown tracking-tight leading-none italic">Verification</h3>
                                <p className="text-xs text-accent-brown/40 font-medium italic leading-relaxed">Sent 6-digit code to <span className="text-accent-brown font-bold not-italic">{email}</span></p>
                            </div>
                        </div>
                        <div className="flex justify-between gap-2 sm:gap-3">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} onPaste={handlePaste} className="w-11 h-13 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black text-brand-dark bg-[#F7F6F2] rounded-2xl outline-none transition-all ring-1 ring-brand-dark/5 focus:ring-brand-dark/30 shadow-inner" />
                            ))}
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500  bg-red-50 py-1.5 px-4 rounded-xl border border-red-100 italic text-center">{error}</div>}
                        <div className="space-y-3">
                            <p className="text-xs font-black text-accent-brown/30  ml-4 italic">No code? <button type="button" onClick={handleSendOtp} disabled={countdown > 0} className="text-brand-dark font-black hover:text-accent-brown">{countdown > 0 ? `Wait ${countdown}s` : 'Resend'}</button></p>
                            <div className="flex gap-4">
                                <button type="button" onClick={prevStep} className="flex-1 px-6 py-3 rounded-full font-black text-xs  text-accent-brown/30 italic">Review</button>
                                <button type="submit" disabled={loading} className="bg-brand-dark text-white flex-[2] py-3 rounded-full font-black text-xs  transition-all italic">{loading ? 'Creating...' : 'Initialize'}</button>
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
                <div className="relative z-10 flex flex-col h-full justify-between p-10 xl:p-16">
                    <div className="space-y-8 xl:space-y-12">
                        <Link to="/" className="inline-flex items-center gap-4 group/back">
                            <div className="w-12 h-12 xl:w-14 xl:h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <User className="w-6 h-6 xl:w-8 xl:h-8" />
                            </div>
                            <span className="text-2xl xl:text-3xl font-black text-white tracking-tight">Hi-Vet</span>
                        </Link>
                        <div className="space-y-6 xl:space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60  text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Join Network</div>
                            <h1 className="text-5xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">Start your <br /><span className="text-brand-dark italic font-outfit">Journey.</span></h1>
                            <p className="text-base xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Join the world's most innovative community for dedicated pet parents and professionals.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-8 py-3.5 xl:px-10 xl:py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[10px] xl:text-[11px] font-black text-white  italic">Onboarding Stage {step} / 3</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Full Screen Form */}
            <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white px-6 py-4 sm:px-10 sm:py-6 relative overflow-y-auto no-scrollbar">
                <div className="lg:hidden absolute top-4 left-6">
                    <Link to="/" className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <Logo className="w-9 h-9 sm:w-10 sm:h-10" />
                        <span className="text-xl sm:text-2xl font-black text-accent-brown tracking-tight">Hi-Vet</span>
                    </Link>
                </div>
                <div className="w-full max-w-lg flex flex-col justify-center my-auto">
                    <div className="mb-2 sm:mb-2.5 flex items-center justify-between">
                        <div className="flex gap-3">
                            {[1, 2, 3].map(i => <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'w-12 sm:w-16 bg-brand-dark shadow-[0_0_20px_rgba(242,107,33,0.4)]' : 'w-4 bg-accent-brown/10'}`} />)}
                        </div>
                        <Link to="/login" className="text-xs sm:text-sm font-black text-brand-dark uppercase tracking-[0.25em] border-b-2 sm:border-b-4 border-brand-dark/10 pb-0.5 sm:pb-1 italic hover:text-accent-brown transition-all">Sign In Instead</Link>
                    </div>

                    <form onSubmit={handleSubmit} className="overflow-y-visible"><AnimatePresence mode="wait">{renderStep()}</AnimatePresence></form>

                    {step === 1 && (
                        <div className={`mt-2 ${error ? 'space-y-1' : 'space-y-1.5'}`}>
                            <div className="flex items-center gap-6"><div className="flex-1 h-[1px] bg-accent-brown/10" /><span className="text-[10px] font-black text-accent-brown/20 ">Quick Link</span><div className="flex-1 h-[1px] bg-accent-brown/10" /></div>
                            <button type="button" onClick={() => window.location.href = 'http://localhost:8000/auth/google'} className="w-full flex items-center justify-center gap-3 bg-[#F7F6F2] hover:bg-white border border-transparent hover:border-brand-dark/20 py-2.5 sm:py-3 rounded-full font-black text-[10px]  transition-all shadow-sm italic">
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                Sign Up with Google
                            </button>
                        </div>
                    )}

                    <div className="mt-2.5 sm:mt-3 text-center pt-2 border-t border-accent-brown/5">
                        <Link to="/" className="inline-flex items-center gap-3 text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
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
                                <h3 className="text-3xl font-black text-accent-brown tracking-tight leading-none italic">Terms & Conditions</h3>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black  text-brand-dark italic">User Integrity</h4>
                                        <p className="text-md text-accent-brown/70 italic leading-[1.6]">
                                            You agree to provide accurate identification data and maintain the absolute confidentiality of your portal access credentials.
                                        </p>
                                    </div>
                                    <div className="w-full h-[1px] bg-accent-brown/5" />
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black  text-brand-dark italic">Data Protection</h4>
                                        <p className="text-md text-accent-brown/70 italic leading-[1.6]">
                                            Your information is secured via advanced encryption. We uphold strict privacy standards and never compromise your individual data sovereignty.
                                        </p>
                                    </div>
                                    <div className="w-full h-[1px] bg-accent-brown/5" />
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black  text-brand-dark italic">Service Usage</h4>
                                        <p className="text-md text-accent-brown/70 italic leading-[1.6]">
                                            The Hi-Vet ecosystem must be utilized in accordance with professional veterinary ethics and local regulatory requirements.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setAgreedToTerms(true); setShowLegalModal(false); }} className="w-full bg-brand-dark text-white py-6 rounded-full font-black  text-xs shadow-xl shadow-brand-dark/20 hover:shadow-brand-dark/40 hover:-translate-y-1 transition-all">Confirm Acknowledgement</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showStudyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStudyModal(false)} className="absolute inset-0 bg-accent-brown/80 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-[#F7F6F2] rounded-[4rem] p-12 sm:p-20 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <button onClick={() => setShowStudyModal(false)} className="absolute top-12 right-12 text-accent-brown hover:rotate-90 transition-transform"><X className="w-8 h-8" /></button>
                            
                            <div className="space-y-12 text-left">
                                <div className="space-y-6 md:pr-12">
                                    <div className="inline-flex items-center gap-3 text-brand-dark  text-[10px] font-black mb-2 italic">
                                        <div className="w-10 h-[2px] bg-brand-dark" /> 
                                        Regulatory Compliance
                                    </div>
                                    <h3 className="text-4xl md:text-5xl font-black text-accent-brown tracking-tighter uppercase leading-[0.9] italic">BAI Age Policy <br /><span className="text-brand-dark">Research Note</span></h3>
                                </div>

                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-black  text-accent-brown/40 italic">Overview</h4>
                                        <p className="text-md text-accent-brown font-medium italic leading-[1.8] bg-white p-8 rounded-[2.5rem] shadow-sm border border-accent-brown/5">
                                            Hi-Vet enforces a **18-year-old minimum age** requirement to align with the Bureau of Animal Industry (BAI) standards and the Animal Welfare Act (RA 8485).
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black  text-brand-dark italic">Legal Capacity</h4>
                                            <p className="text-sm text-accent-brown/70 italic leading-[1.7]">
                                                Under Philippine law, legal personhood is attained at 18. This ensures every Hi-Vet user is capable of entering into binding service contracts for veterinary care.
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black  text-brand-dark italic">Accountability</h4>
                                            <p className="text-sm text-accent-brown/70 italic leading-[1.7]">
                                                The BAI requires accountable representatives for all animal-related transactions. This prevents legal slippage in animal welfare compliance.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full h-[1px] bg-accent-brown/10" />

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black  text-accent-brown/30 italic">Official References</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {['BAI GUIDELINES', 'RA 8485', 'RA 10631', 'CIVIL CODE'].map(ref => (
                                                <span key={ref} className="px-5 py-2 rounded-full border border-accent-brown/10 text-[10px] font-black text-accent-brown/40 ">{ref}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setShowStudyModal(false)} className="w-full bg-accent-brown text-white py-6 rounded-full font-black  text-xs shadow-2xl hover:brightness-110 transition-all">Close Study</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Register;
