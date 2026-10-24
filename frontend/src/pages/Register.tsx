import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, AlertCircle, Lock, ArrowRight,
    ShieldCheck, MailCheck, Eye, EyeOff, X,
    ChevronLeft, User, Smartphone, Tag
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { calculateAgeFullYears, validateBirthday } from '../utils/dateValidation';
import { checkContactAvailability, isValidPhMobile, isValidEmail } from '../utils/contactValidation';
import { CONTACT_VALIDATION_MESSAGES } from '../constants/contactValidationWording';
import { MAIN_LANDING_TEXT } from '../constants/mainLandingWording';
import { useAuth } from '../context/AuthContext';
import registerHero from '../assets/login_hero_landscape.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const calculateAge = (birthdate: string) => {
    if (!birthdate) return '';
    const age = calculateAgeFullYears(birthdate);
    return age !== null && age >= 0 ? age.toString() : '';
};

const Register = () => {
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;

    useEffect(() => {
        document.title = 'Hi-Vet | Sign Up';
    }, []);

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
    const [sentTo, setSentTo] = useState('');
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneChecking, setPhoneChecking] = useState(false);
    const [emailChecking, setEmailChecking] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [showStudyModal, setShowStudyModal] = useState(false);
    const [referralCode, setReferralCode] = useState('');

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    // Debounced Phone Validation
    useEffect(() => {
        if (!phone) {
            setPhoneError(null);
            return;
        }
        if (phone.length === 10 && !phone.startsWith('9')) {
            setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            return;
        }
        if (phone.length < 10) {
            setPhoneError(null);
            return;
        }
        if (phone.length === 10 && phone.startsWith('9')) {
            const timer = setTimeout(async () => {
                setPhoneChecking(true);
                const res = await checkContactAvailability('phone', phone);
                setPhoneChecking(false);
                setPhoneError(res.error);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [phone]);

    // Debounced Email Validation
    useEffect(() => {
        if (!email) {
            setEmailError(null);
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError(null);
            return;
        }
        const timer = setTimeout(async () => {
            setEmailChecking(true);
            const res = await checkContactAvailability('email', email);
            setEmailChecking(false);
            setEmailError(res.error);
        }, 500);
        return () => clearTimeout(timer);
    }, [email]);

    const handlePhoneBlur = async () => {
        if (!phone) return;
        if (!isValidPhMobile(phone)) {
            setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            return;
        }
        setPhoneChecking(true);
        const res = await checkContactAvailability('phone', phone);
        setPhoneChecking(false);
        setPhoneError(res.error);
    };

    const handleEmailBlur = async () => {
        if (!email) return;
        if (!isValidEmail(email)) {
            setEmailError(CONTACT_VALIDATION_MESSAGES.invalidEmail);
            return;
        }
        setEmailChecking(true);
        const res = await checkContactAvailability('email', email);
        setEmailChecking(false);
        setEmailError(res.error);
    };

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

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
            return setError('Please enter your email and matching passwords.');
        }
        if (password.length < 8) {
            return setError('Password must be at least 8 characters');
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    name: `${firstName} ${lastName}`.trim(),
                    first_name: firstName,
                    last_name: lastName,
                    gender,
                    phone,
                    role: 'customer'
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSentTo(data.channel === 'sms' && data.masked_phone ? data.masked_phone : email);
                setStep(3);
                setCountdown(60);
            } else {
                setError(data.detail || 'Could not send verification code. Please try again.');
            }
        } catch {
            setError('Could not connect. Please try again.');
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
                setError('Please fill in all required fields.');
                return;
            }
            const bVal = validateBirthday(birthdate, 'person birthday');
            if (!bVal.isValid) {
                setError(bVal.error || 'Please choose a valid birthdate.');
                return;
            }
            if (phoneError) {
                setError(phoneError);
                return;
            }
            if (!isValidPhMobile(phone)) {
                setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
                setError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
                return;
            }
            setPhoneChecking(true);
            const pCheck = await checkContactAvailability('phone', phone);
            setPhoneChecking(false);
            if (!pCheck.available) {
                setPhoneError(pCheck.error);
                setError(pCheck.error || CONTACT_VALIDATION_MESSAGES.numberUsed);
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!email || !password || !confirmPassword) {
                setError('Please fill in all required fields.');
                return;
            }
            if (emailError) {
                setError(emailError);
                return;
            }
            if (!isValidEmail(email)) {
                setEmailError(CONTACT_VALIDATION_MESSAGES.invalidEmail);
                setError(CONTACT_VALIDATION_MESSAGES.invalidEmail);
                return;
            }
            setEmailChecking(true);
            const eCheck = await checkContactAvailability('email', email);
            setEmailChecking(false);
            if (!eCheck.available) {
                setEmailError(eCheck.error);
                setError(eCheck.error || CONTACT_VALIDATION_MESSAGES.emailUsed);
                return;
            }

            // Password Strength Validation
            let strengthScore = 0;
            if (password.length > 7) strengthScore += 1;
            if (/[A-Z]/.test(password)) strengthScore += 1;
            if (/[0-9]/.test(password)) strengthScore += 1;
            if (/[^A-Za-z0-9]/.test(password)) strengthScore += 1;

            if (strengthScore < 2) {
                setError('Password must be at least 8 characters with a capital letter, a number, and a symbol.');
                return;
            }

            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
            if (!agreedToTerms) {
                setError('Please accept the Terms of Use and Privacy Policy.');
                return;
            }
            await handleSendOtp();
        }
    };

    const prevStep = () => {
        setError('');
        setStep(s => Math.max(1, s - 1));
    };

    const handleRegister = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return setError('Please enter the full 6-digit code.');
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/api/auth/register`, {
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
                navigate('/login?msg=reg_success');
            } else {
                setError(data.detail || 'Could not create account. Please try again.');
            }
        } catch {
            setError('Could not connect. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Step Content ───────────────────────────────────────────────────────────
    const renderStep = () => {
        switch (step) {
            // ── Step 1: Personal Info ──────────────────────────────────────────
            case 1:
                return (
                    <motion.div key="reg-step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{MAIN_LANDING_TEXT.registerPage.step1Title}</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{MAIN_LANDING_TEXT.registerPage.step1Subtitle}</p>
                        </div>

                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* First & Last Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group space-y-1.5">
                                    <label htmlFor="reg-first-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        First Name <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <User className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                        <input
                                            id="reg-first-name"
                                            type="text"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder="Juan"
                                            autoComplete="given-name"
                                            className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                        />
                                    </div>
                                </div>
                                <div className="group space-y-1.5">
                                    <label htmlFor="reg-last-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        Last Name <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input
                                            id="reg-last-name"
                                            type="text"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder="Dela Cruz"
                                            autoComplete="family-name"
                                            className="w-full bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Middle Name & Suffix */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group space-y-1.5">
                                    <label htmlFor="reg-middle-name" className="text-sm font-bold text-accent-brown flex items-center justify-between">
                                        <span>Middle Name</span>
                                        <span className="text-xs font-normal text-slate-500">Optional</span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input
                                            id="reg-middle-name"
                                            type="text"
                                            value={middleName}
                                            onChange={e => setMiddleName(e.target.value)}
                                            placeholder="Optional"
                                            autoComplete="additional-name"
                                            className="w-full bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                        />
                                    </div>
                                </div>
                                <CustomDropdown
                                    label="Suffix"
                                    isOptional={true}
                                    value={suffix}
                                    onChange={setSuffix}
                                    options={[
                                        { label: 'None', value: '' },
                                        { label: 'Jr.', value: 'Jr.' },
                                        { label: 'Sr.', value: 'Sr.' },
                                        { label: 'II', value: 'II' },
                                        { label: 'III', value: 'III' }
                                    ]}
                                    placeholder="None"
                                />
                            </div>

                            {/* Mobile Phone */}
                            <div className="group space-y-1.5">
                                <label htmlFor="reg-phone" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Mobile Phone <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div
                                    onClick={() => document.getElementById('reg-phone')?.focus()}
                                    className={`relative flex items-center min-h-[52px] sm:min-h-[56px] bg-[#F7F6F2] border ${phoneError ? 'border-red-400' : 'border-accent-brown/15'} focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl overflow-hidden transition-all cursor-text`}
                                >
                                    <div className="px-4 py-3.5 text-slate-700 font-bold border-r border-accent-brown/15 select-none shrink-0 text-base">+63</div>
                                    <input
                                        id="reg-phone"
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoComplete="tel-national"
                                        value={phone}
                                        maxLength={10}
                                        onChange={e => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val.startsWith('0')) val = val.substring(1);
                                            if (val.length > 0 && !val.startsWith('9')) val = '';
                                            setPhone(val.slice(0, 10));
                                            if (phoneError) setPhoneError(null);
                                        }}
                                        onBlur={handlePhoneBlur}
                                        aria-invalid={!!phoneError}
                                        aria-describedby={phoneError ? "reg-phone-error" : undefined}
                                        placeholder="9XX XXX XXXX"
                                        className="flex-1 bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                    />
                                </div>
                                {phoneError && (
                                    <p id="reg-phone-error" role="alert" aria-live="polite" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{phoneError}</span>
                                    </p>
                                )}
                            </div>

                            {/* Birthdate & Calculated Age */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                <CustomDatePicker
                                    mode="person birthday"
                                    label="Birthdate"
                                    isRequired={true}
                                    value={birthdate}
                                    onChange={setBirthdate}
                                />
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-accent-brown">Calculated Age</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowStudyModal(true)}
                                            className="text-xs font-bold text-brand-dark hover:underline cursor-pointer"
                                        >
                                            Why 18+?
                                        </button>
                                    </div>
                                    <div className="flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 rounded-2xl px-4 bg-[#F7F6F2] text-accent-brown font-bold text-base select-none">
                                        {calculateAge(birthdate) ? `${calculateAge(birthdate)} years old` : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Sex / Gender */}
                            <CustomDropdown
                                label="Sex / Gender"
                                isRequired={true}
                                value={gender}
                                onChange={setGender}
                                options={[
                                    { label: 'Male', value: 'Male' },
                                    { label: 'Female', value: 'Female' },
                                    { label: 'Other', value: 'Other' },
                                    { label: 'Rather not say', value: 'Rather not say' }
                                ]}
                                placeholder="Select gender"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!!phoneError || phoneChecking}
                            className="bg-brand-dark hover:bg-brand text-white w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal mt-6 disabled:opacity-50"
                        >
                            <span>Continue</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>

                        {/* Google Sign Up Alternative */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-[1px] bg-accent-brown/10" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Or</span>
                                <div className="flex-1 h-[1px] bg-accent-brown/10" />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const origin = window.location.origin;
                                    window.location.href = `${API}/auth/google?redirect_to=${encodeURIComponent(origin)}`;
                                }}
                                className="w-full min-h-[52px] sm:min-h-[56px] flex items-center justify-center gap-3 bg-[#F7F6F2] hover:bg-white border border-accent-brown/15 hover:border-brand-dark/40 rounded-2xl font-bold text-sm text-accent-brown transition-all shadow-xs cursor-pointer"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Sign Up with Google</span>
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 2: Credentials ────────────────────────────────────────────
            case 2:
                return (
                    <motion.div key="reg-step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{MAIN_LANDING_TEXT.registerPage.step2Title}</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{MAIN_LANDING_TEXT.registerPage.step2Subtitle}</p>
                        </div>

                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Email */}
                            <div className="group space-y-1.5">
                                <label htmlFor="reg-email" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Email Address <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className={`relative flex items-center min-h-[52px] sm:min-h-[56px] border ${emailError ? 'border-red-400' : 'border-accent-brown/15'} focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden`}>
                                    <Mail className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input
                                        id="reg-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={e => {
                                            setEmail(e.target.value);
                                            if (emailError) setEmailError(null);
                                        }}
                                        onBlur={handleEmailBlur}
                                        aria-invalid={!!emailError}
                                        aria-describedby={emailError ? "reg-email-error" : undefined}
                                        placeholder="user@example.com"
                                        className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                    />
                                </div>
                                {emailError && (
                                    <p id="reg-email-error" role="alert" aria-live="polite" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{emailError}</span>
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="group space-y-1.5">
                                <label htmlFor="reg-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Password <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input
                                        id="reg-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-transparent py-3.5 pr-12 text-accent-brown font-semibold text-base placeholder:text-slate-500 outline-none leading-normal"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-brown/40 hover:text-brand-dark transition-colors p-1 cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && <div className="pt-1"><PasswordStrength password={password} /></div>}
                            </div>

                            {/* Confirm Password */}
                            <div className="group space-y-1.5">
                                <label htmlFor="reg-confirm-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Confirm Password <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input
                                        id="reg-confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-transparent py-3.5 pr-12 text-accent-brown font-semibold text-base placeholder:text-slate-500 outline-none leading-normal"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-brown/40 hover:text-brand-dark transition-colors p-1 cursor-pointer"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Referral Code (Optional) */}
                            <div className="group space-y-1.5">
                                <label htmlFor="reg-referral" className="text-sm font-bold text-accent-brown flex items-center justify-between">
                                    <span>Referral Code</span>
                                    <span className="text-xs font-normal text-slate-500">Optional</span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <Tag className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input
                                        id="reg-referral"
                                        type="text"
                                        value={referralCode}
                                        onChange={e => setReferralCode(e.target.value.toUpperCase())}
                                        placeholder="HIVET-XXXX"
                                        className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none uppercase tracking-wider"
                                    />
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="pt-2">
                                <label className="flex items-start gap-3 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={e => setAgreedToTerms(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded-lg border-2 mt-0.5 flex items-center justify-center transition-all shrink-0 ${
                                        agreedToTerms ? 'bg-brand-dark border-brand-dark' : 'border-accent-brown/25 bg-white group-hover:border-brand-dark'
                                    }`}>
                                        {agreedToTerms && <div className="w-2.5 h-2.5 bg-white rounded-xs" />}
                                    </div>
                                    <span className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                                        {MAIN_LANDING_TEXT.registerPage.agreeTermsPrefix}{' '}
                                        <button
                                            type="button"
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowLegalModal(true); }}
                                            className="text-brand-dark font-bold hover:underline"
                                        >
                                            {MAIN_LANDING_TEXT.registerPage.termsLink}
                                        </button>{' '}
                                        and{' '}
                                        <button
                                            type="button"
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowLegalModal(true); }}
                                            className="text-brand-dark font-bold hover:underline"
                                        >
                                            {MAIN_LANDING_TEXT.registerPage.privacyLink}
                                        </button>
                                        .
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Button Row */}
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl font-bold text-base text-slate-600 hover:text-accent-brown hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-brand-dark hover:bg-brand text-white min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] cursor-pointer not-italic tracking-normal disabled:opacity-50"
                            >
                                <span>{loading ? 'Sending Code...' : MAIN_LANDING_TEXT.registerPage.sendCodeBtn}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 3: Verification (OTP) ─────────────────────────────────────
            case 3:
                return (
                    <motion.div key="reg-step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-2">
                            <div className="w-14 h-14 bg-brand/10 text-brand-dark rounded-2xl flex items-center justify-center shadow-xs">
                                {sentTo && sentTo.startsWith('+') ? <Smartphone className="w-7 h-7" /> : <MailCheck className="w-7 h-7" />}
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{MAIN_LANDING_TEXT.registerPage.step3Title}</h1>
                                <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{MAIN_LANDING_TEXT.registerPage.step3Subtitle(sentTo || email)}</p>
                            </div>
                        </div>

                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* OTP Boxes */}
                        <div className="flex justify-between gap-2 sm:gap-3 py-2">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={e => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    className="w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-extrabold text-brand-dark bg-[#F7F6F2] border border-accent-brown/15 focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20 rounded-2xl outline-none transition-all shadow-xs"
                                />
                            ))}
                        </div>

                        {/* Resend text */}
                        <div className="text-center sm:text-left">
                            <p className="text-sm font-medium text-slate-600">
                                Didn't receive a code?{' '}
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={countdown > 0}
                                    className="text-brand-dark font-bold hover:underline cursor-pointer disabled:opacity-50"
                                >
                                    {countdown > 0 ? MAIN_LANDING_TEXT.registerPage.waitCountdown(countdown) : MAIN_LANDING_TEXT.registerPage.resendBtn}
                                </button>
                            </p>
                        </div>

                        {/* Button Row */}
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl font-bold text-base text-slate-600 hover:text-accent-brown hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-brand-dark hover:bg-brand text-white min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] cursor-pointer not-italic tracking-normal disabled:opacity-50"
                            >
                                <span>{loading ? MAIN_LANDING_TEXT.registerPage.creatingAccountBtn : MAIN_LANDING_TEXT.registerPage.completeSignUpBtn}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-white flex font-brand overflow-x-hidden">
            {/* Left Column: Full Screen Hero (Desktop Only) */}
            <div className="hidden lg:block w-1/2 min-h-[100dvh] relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 z-0">
                    <img
                        src={registerHero}
                        alt="Customer Registration"
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                    <div className="space-y-12">
                        <Link to="/" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <User className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black">
                                <div className="w-10 h-[2px] bg-brand-dark" />
                                {MAIN_LANDING_TEXT.registerPage.heroTag}
                            </div>
                            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">
                                {MAIN_LANDING_TEXT.registerPage.heroTitle}
                            </h1>
                            <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">
                                {MAIN_LANDING_TEXT.registerPage.heroSubtitle}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 w-fit">
                        <p className="text-xs font-black text-white uppercase tracking-widest italic">
                            Step {step} of {TOTAL_STEPS}
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Column: Shared Page Shell (Phone, Tablet, Desktop) */}
            <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col justify-between py-6 sm:py-10 px-5 xs:px-6 sm:px-10 lg:px-12 bg-white overflow-y-auto">
                <div className="w-full max-w-[540px] mx-auto flex-1 flex flex-col justify-center my-auto py-2">
                    {/* Top Row: Icon Tile on Left, Login Link on Right */}
                    <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
                        <Link
                            to="/"
                            title="Back to Hi-Vet Home"
                            aria-label="Back to Hi-Vet Home"
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-dark/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <User className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                        </Link>
                        <Link
                            to="/login"
                            className="min-h-[44px] inline-flex items-center text-sm sm:text-base font-bold text-brand-dark hover:text-accent-brown transition-colors underline underline-offset-4 tracking-normal not-italic"
                        >
                            {MAIN_LANDING_TEXT.registerPage.logInInstead}
                        </Link>
                    </div>

                    {/* Progress Bar (3 Equal Steps) */}
                    <div
                        role="progressbar"
                        aria-valuenow={step}
                        aria-valuemin={1}
                        aria-valuemax={TOTAL_STEPS}
                        aria-label={`Step ${step} of ${TOTAL_STEPS}`}
                        className="w-full flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8"
                    >
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                                    step >= i
                                        ? 'bg-brand-dark shadow-[0_0_12px_rgba(242,107,33,0.35)]'
                                        : 'bg-slate-200'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="w-full">
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </form>

                    {/* Back Link Row */}
                    <div className="mt-8 text-center pt-5 border-t border-accent-brown/10">
                        <Link
                            to="/"
                            className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-slate-600 hover:text-brand-dark transition-colors tracking-normal not-italic"
                        >
                            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Back to Home</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Legal Overlays */}
            <AnimatePresence>
                {showLegalModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLegalModal(false)} className="absolute inset-0 bg-accent-brown/80 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <button onClick={() => setShowLegalModal(false)} className="absolute top-6 right-6 text-accent-brown hover:rotate-90 transition-transform cursor-pointer p-2">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="space-y-8 text-left">
                                <div className="w-16 h-16 bg-brand/10 text-brand-dark rounded-2xl flex items-center justify-center">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold text-accent-brown tracking-normal">Terms of Use & Privacy</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-brand-dark">Accurate Information</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            You agree to provide accurate details and keep your account password safe.
                                        </p>
                                    </div>
                                    <div className="w-full h-[1px] bg-accent-brown/10" />
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-brand-dark">Privacy & Security</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Your information is protected with secure encryption. We respect your privacy and never sell your personal details.
                                        </p>
                                    </div>
                                    <div className="w-full h-[1px] bg-accent-brown/10" />
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-brand-dark">Fair Use</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Please use Hi-Vet responsibly and follow local animal care rules.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setAgreedToTerms(true); setShowLegalModal(false); }}
                                    className="w-full bg-brand-dark hover:bg-brand text-white py-4 rounded-2xl font-bold text-base shadow-md shadow-brand-dark/20 transition-all cursor-pointer"
                                >
                                    I Understand and Agree
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Why 18+ Modal */}
            <AnimatePresence>
                {showStudyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStudyModal(false)} className="absolute inset-0 bg-accent-brown/80 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <button onClick={() => setShowStudyModal(false)} className="absolute top-6 right-6 text-accent-brown hover:rotate-90 transition-transform cursor-pointer p-2">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="space-y-6 text-left">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 text-brand-dark text-xs font-bold uppercase tracking-wider">
                                        <div className="w-6 h-[2px] bg-brand-dark" />
                                        Age Requirement
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-extrabold text-accent-brown tracking-normal">Age 18+ Policy Information</h3>
                                </div>

                                <div className="space-y-5">
                                    <div className="bg-[#F7F6F2] p-5 rounded-2xl border border-accent-brown/10">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Why Age 18+?</h4>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                            Hi-Vet requires users to be at least 18 years old to follow the Animal Welfare Act (RA 8485) and Bureau of Animal Industry standards.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1 bg-[#F7F6F2] p-4 rounded-xl border border-accent-brown/10">
                                            <h4 className="text-xs font-bold text-brand-dark">Adult Responsibility</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Under Philippine law, you become an adult at 18. This ensures legal capacity to order supplies and book appointments.
                                            </p>
                                        </div>
                                        <div className="space-y-1 bg-[#F7F6F2] p-4 rounded-xl border border-accent-brown/10">
                                            <h4 className="text-xs font-bold text-brand-dark">Pet Care Decisions</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                An adult must be accountable for clinic consultations, medical procedures, and pet care decisions.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legal References</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {['BAI GUIDELINES', 'RA 8485', 'RA 10631', 'CIVIL CODE'].map(r => (
                                                <span key={r} className="px-3 py-1 rounded-lg border border-accent-brown/15 bg-white text-xs font-bold text-slate-600">
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowStudyModal(false)}
                                    className="w-full bg-accent-brown hover:bg-accent-brown/90 text-white py-4 rounded-2xl font-bold text-base transition-all cursor-pointer mt-4"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Register;
