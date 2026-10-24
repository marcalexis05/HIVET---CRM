import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, ChevronLeft, ShieldCheck, MailCheck, Bike, Eye, EyeOff, User,
    FileText, Lock, Mail as MailIcon, MapPin, Upload, X, Clock, CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useAuth } from '../context/AuthContext';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { calculateAgeFullYears, validateBirthday } from '../utils/dateValidation';
import { checkContactAvailability, isValidPhMobile, isValidEmail } from '../utils/contactValidation';
import { CONTACT_VALIDATION_MESSAGES } from '../constants/contactValidationWording';
import { RIDER_LANDING_TEXT } from '../constants/riderLandingWording';
import loginHero from '../assets/login_hero_landscape.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── File Upload Field Component ─────────────────────────────────────────────
const FileUploadField = ({
    label,
    required = false,
    hint,
    value,
    docType,
    onUpload
}: {
    label: string;
    required?: boolean;
    hint?: string;
    value: string;
    docType: string;
    onUpload: (url: string) => void;
}) => {
    const [uploading, setUploading] = useState(false);
    const [fileName, setFileName] = useState('');
    const ref = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setFileName(file.name);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', docType);

        try {
            const res = await fetch(`${API}/api/business/upload-document`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) onUpload(data.url);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-accent-brown flex items-center gap-1">
                    {label} {required && <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>}
                </label>
                {!required && <span className="text-xs font-normal text-slate-500">Optional</span>}
            </div>

            {value ? (
                <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-800 truncate">{fileName || 'Document uploaded'}</p>
                        <p className="text-xs text-green-600 font-semibold">{RIDER_LANDING_TEXT.registerPage.upload.verifiedTitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { onUpload(''); setFileName(''); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors shrink-0 cursor-pointer"
                        aria-label="Remove document"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-accent-brown/25 hover:border-brand-dark bg-[#F7F6F2] hover:bg-white rounded-2xl py-6 px-4 transition-all group cursor-pointer disabled:opacity-50"
                >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs border border-accent-brown/10 group-hover:scale-105 transition-transform">
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                        ) : (
                            <Upload className="w-5 h-5 text-slate-500 group-hover:text-brand-dark transition-colors" />
                        )}
                    </div>
                    <div className="text-center space-y-0.5">
                        <span className="block text-sm font-bold text-accent-brown group-hover:text-brand-dark transition-colors">
                            {uploading ? RIDER_LANDING_TEXT.registerPage.upload.uploading : 'Choose document file'}
                        </span>
                        <span className="block text-xs text-slate-500 font-normal">PDF, JPG, or PNG · Up to 5MB</span>
                    </div>
                </button>
            )}
            <input ref={ref} type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
            {hint && <p className="text-xs text-slate-500 leading-normal">{hint}</p>}
        </div>
    );
};

// ─── Requirement Checkbox Component ──────────────────────────────────────────
const RequirementCheckbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
    <label className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#F7F6F2] border border-accent-brown/15 hover:border-brand-dark/40 transition-all cursor-pointer select-none">
        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
            checked ? 'bg-brand-dark border-brand-dark' : 'border-accent-brown/25 bg-white'
        }`}>
            {checked && <div className="w-2.5 h-2.5 bg-white rounded-xs" />}
        </div>
        <span className="text-sm font-bold text-accent-brown leading-tight">{label}</span>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
    </label>
);

// ─── Pending Approval Screen ─────────────────────────────────────────────────
const PendingApproval = ({ email }: { email: string }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-[100dvh] w-full bg-white flex font-brand overflow-x-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 min-h-[100dvh] relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt="Hi-Vet Riders" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                    <div className="space-y-12">
                        <Link to="/for-riders" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Bike className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Riders</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black">
                                <div className="w-10 h-[2px] bg-brand-dark" />
                                {RIDER_LANDING_TEXT.registerPage.heroTag}
                            </div>
                            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">
                                {RIDER_LANDING_TEXT.registerPage.heroTitlePrefix} <br />
                                <span className="text-brand-dark italic font-outfit">{RIDER_LANDING_TEXT.registerPage.heroTitleHighlight}</span>
                            </h1>
                            <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">
                                {RIDER_LANDING_TEXT.registerPage.heroSubtitle}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Pending Approval Card */}
            <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-y-auto">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-8 my-auto py-8">
                    <div className="w-20 h-20 bg-brand/10 text-brand-dark rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-brand/5">
                        <Clock className="w-10 h-10 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{RIDER_LANDING_TEXT.registerPage.pending.title}</h2>
                        <p className="text-sm text-slate-600 font-normal">{RIDER_LANDING_TEXT.registerPage.pending.submittedFor(email)}</p>
                    </div>
                    <div className="bg-accent-peach/10 p-6 sm:p-8 rounded-2xl border border-accent-brown/10 text-left space-y-5">
                        <div className="flex gap-3.5">
                            <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                            <p className="text-sm text-slate-700 leading-relaxed">{RIDER_LANDING_TEXT.registerPage.pending.step1Text}</p>
                        </div>
                        <div className="flex gap-3.5 opacity-60">
                            <div className="w-6 h-6 rounded-full bg-brand-dark/20 text-accent-brown/60 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                            <p className="text-sm text-slate-600 leading-relaxed">{RIDER_LANDING_TEXT.registerPage.pending.step2Text}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/for-riders')}
                        className="bg-brand-dark hover:bg-brand text-white w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base shadow-md shadow-brand-dark/20 transition-all cursor-pointer"
                    >
                        Back to Rider Page
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

// ─── Main RiderRegister Component ───────────────────────────────────────────
const RiderRegister = () => {
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 4;

    useEffect(() => {
        document.title = 'Hi-Vet | Rider Sign Up';
    }, []);

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [suffix, setSuffix] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneChecking, setPhoneChecking] = useState(false);
    const [emailChecking, setEmailChecking] = useState(false);

    // Address
    const [homeHouseNumber, setHomeHouseNumber] = useState('');
    const [homeBlockNumber, setHomeBlockNumber] = useState('');
    const [homeStreet, setHomeStreet] = useState('');
    const [homeSubdivision, setHomeSubdivision] = useState('');
    const [homeSitio, setHomeSitio] = useState('');
    const [homeBarangay, setHomeBarangay] = useState('');
    const [homeCity, setHomeCity] = useState('');
    const [homeDistrict, setHomeDistrict] = useState('');
    const [homeProvince, setHomeProvince] = useState('');
    const [homeZip, setHomeZip] = useState('');
    const [homeRegion, setHomeRegion] = useState('Philippines');
    const [homeLat, setHomeLat] = useState<number | null>(null);
    const [homeLng, setHomeLng] = useState<number | null>(null);
    const [homeLandmark, setHomeLandmark] = useState('');

    // Vehicle & Compliance
    const [vehicleType, setVehicleType] = useState('Motorcycle');
    const [driverLicense, setDriverLicense] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState('');
    const [licenseUrl, setLicenseUrl] = useState('');
    const [vehicleCrUrl, setVehicleCrUrl] = useState('');
    const [vehicleOrUrl, setVehicleOrUrl] = useState('');
    const [nbiClearanceUrl, setNbiClearanceUrl] = useState('');
    const [is18Above, setIs18Above] = useState(false);
    const [hasAndroid6, setHasAndroid6] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

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

    const calculateAge = (bday: string) => {
        if (!bday) return 0;
        const age = calculateAgeFullYears(bday);
        return age !== null && age >= 0 ? age : 0;
    };

    useEffect(() => {
        const age = calculateAge(birthday);
        if (age >= 18) setIs18Above(true);
        else setIs18Above(false);
    }, [birthday]);

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
            return setError(RIDER_LANDING_TEXT.registerPage.errors.checkEmailPasswords);
        }
        if (password.length < 8) {
            return setError(RIDER_LANDING_TEXT.registerPage.errors.passwordLength);
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone, role: 'rider' })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(4);
                setCountdown(60);
            } else {
                setError(data.detail || RIDER_LANDING_TEXT.registerPage.errors.sendCodeFailed);
            }
        } catch {
            setError(RIDER_LANDING_TEXT.registerPage.errors.networkError);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 4) {
            handleRegister();
        } else {
            await nextStep();
        }
    };

    const nextStep = async () => {
        setError('');
        if (step === 1) {
            if (!firstName || !lastName || !phone || !homeCity || !birthday || !gender) {
                return setError(RIDER_LANDING_TEXT.registerPage.errors.requiredFields);
            }
            if (phoneError) {
                return setError(phoneError);
            }
            if (!isValidPhMobile(phone)) {
                setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
                return setError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            }
            setPhoneChecking(true);
            const pCheck = await checkContactAvailability('phone', phone);
            setPhoneChecking(false);
            if (!pCheck.available) {
                setPhoneError(pCheck.error);
                return setError(pCheck.error || CONTACT_VALIDATION_MESSAGES.numberUsed);
            }
            const bVal = validateBirthday(birthday, 'person birthday');
            if (!bVal.isValid) {
                return setError(bVal.error || 'Please choose a valid birthdate.');
            }
            setStep(2);
        } else if (step === 2) {
            if (vehicleType !== 'Bicycle') {
                if (!driverLicense) {
                    return setError(RIDER_LANDING_TEXT.registerPage.errors.licenseRequired);
                }
                if (!licenseUrl || !vehicleCrUrl || !vehicleOrUrl) {
                    return setError(RIDER_LANDING_TEXT.registerPage.errors.vehicleDocsRequired);
                }
            }
            setStep(3);
        } else if (step === 3) {
            if (!nbiClearanceUrl) {
                return setError(RIDER_LANDING_TEXT.registerPage.errors.nbiRequired);
            }
            if (!is18Above || !hasAndroid6) {
                return setError(RIDER_LANDING_TEXT.registerPage.errors.mustMeetRequirements);
            }
            if (emailError) {
                return setError(emailError);
            }
            if (!isValidEmail(email)) {
                setEmailError(CONTACT_VALIDATION_MESSAGES.invalidEmail);
                return setError(CONTACT_VALIDATION_MESSAGES.invalidEmail);
            }
            setEmailChecking(true);
            const eCheck = await checkContactAvailability('email', email);
            setEmailChecking(false);
            if (!eCheck.available) {
                setEmailError(eCheck.error);
                return setError(eCheck.error || CONTACT_VALIDATION_MESSAGES.emailUsed);
            }
            if (!email || password !== confirmPassword || password.length < 8) {
                return setError(RIDER_LANDING_TEXT.registerPage.errors.checkEmailPasswords);
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
        if (otpCode.length !== 6) return setError(RIDER_LANDING_TEXT.registerPage.errors.codeIncomplete);
        setLoading(true);
        setError('');
        const isBicycle = vehicleType === 'Bicycle';
        try {
            const res = await fetch(`${API}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    otp: otpCode,
                    first_name: firstName,
                    middle_name: middleName,
                    last_name: lastName,
                    suffix,
                    phone,
                    home_address: [homeHouseNumber, homeBlockNumber, homeStreet, homeSubdivision, homeSitio, homeBarangay, homeCity, homeProvince, homeZip].filter(Boolean).join(' '),
                    home_house_number: homeHouseNumber,
                    home_block_number: homeBlockNumber,
                    home_street: homeStreet,
                    home_subdivision: homeSubdivision,
                    home_sitio: homeSitio,
                    home_barangay: homeBarangay,
                    home_city: homeCity,
                    home_district: homeDistrict,
                    home_province: homeProvince,
                    home_zip: homeZip,
                    home_region: homeRegion,
                    home_lat: homeLat,
                    home_lng: homeLng,
                    birthday,
                    gender,
                    role: 'rider',
                    driver_license: isBicycle ? null : driverLicense,
                    vehicle_type: vehicleType,
                    license_document_url: isBicycle ? null : licenseUrl,
                    vehicle_cr_url: isBicycle ? null : vehicleCrUrl,
                    vehicle_or_url: isBicycle ? null : vehicleOrUrl,
                    nbi_police_clearance_url: nbiClearanceUrl,
                    is_18_above: is18Above,
                    has_android_6: hasAndroid6
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'pending_approval') {
                setIsPending(true);
            } else if (res.ok && data.token) {
                loginWithToken(data.token);
                navigate('/dashboard/rider');
            } else {
                setError(data.detail || RIDER_LANDING_TEXT.registerPage.errors.regFailed);
            }
        } catch {
            setError(RIDER_LANDING_TEXT.registerPage.errors.networkError);
        } finally {
            setLoading(false);
        }
    };

    // ─── Step Rendering ─────────────────────────────────────────────────────────
    const renderStep = () => {
        switch (step) {
            // ── Step 1: Personal Info ──────────────────────────────────────────
            case 1:
                return (
                    <motion.div key="rider-s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{RIDER_LANDING_TEXT.registerPage.step1Title}</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{RIDER_LANDING_TEXT.registerPage.step1Subtitle}</p>
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
                                    <label htmlFor="rider-first-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        {RIDER_LANDING_TEXT.registerPage.firstName} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <User className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                        <input
                                            id="rider-first-name"
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
                                    <label htmlFor="rider-last-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        {RIDER_LANDING_TEXT.registerPage.lastName} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input
                                            id="rider-last-name"
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
                                    <label htmlFor="rider-middle-name" className="text-sm font-bold text-accent-brown flex items-center justify-between">
                                        <span>{RIDER_LANDING_TEXT.registerPage.middleName}</span>
                                        <span className="text-xs font-normal text-slate-500">Optional</span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input
                                            id="rider-middle-name"
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
                                    label={RIDER_LANDING_TEXT.registerPage.suffix}
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

                            {/* Birthdate & Calculated Age */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                <CustomDatePicker
                                    mode="person birthday"
                                    label={RIDER_LANDING_TEXT.registerPage.birthdate}
                                    isRequired={true}
                                    value={birthday}
                                    onChange={setBirthday}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-accent-brown">{RIDER_LANDING_TEXT.registerPage.age}</label>
                                    <div className="flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 rounded-2xl px-4 bg-[#F7F6F2] text-accent-brown font-bold text-base select-none">
                                        {birthday ? `${calculateAge(birthday)} years old` : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Gender */}
                            <CustomDropdown
                                label={RIDER_LANDING_TEXT.registerPage.gender}
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

                            {/* Mobile Phone */}
                            <div className="group space-y-1.5">
                                <label htmlFor="rider-phone" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    {RIDER_LANDING_TEXT.registerPage.phone} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div
                                    onClick={() => document.getElementById('rider-phone')?.focus()}
                                    className={`relative flex items-center min-h-[52px] sm:min-h-[56px] bg-[#F7F6F2] border ${phoneError ? 'border-red-400' : 'border-accent-brown/15'} focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl overflow-hidden transition-all cursor-text`}
                                >
                                    <div className="px-4 py-3.5 text-slate-700 font-bold border-r border-accent-brown/15 select-none shrink-0 text-base">+63</div>
                                    <input
                                        id="rider-phone"
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
                                        aria-describedby={phoneError ? "rider-phone-error" : undefined}
                                        placeholder="9XX XXX XXXX"
                                        className="flex-1 bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                    />
                                </div>
                                {phoneError && (
                                    <p id="rider-phone-error" role="alert" aria-live="polite" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{phoneError}</span>
                                    </p>
                                )}
                            </div>

                            {/* Home Address Autocomplete */}
                            <div className="group space-y-1.5">
                                <label className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    {RIDER_LANDING_TEXT.registerPage.address} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <MapPin className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark shrink-0 ml-4 mr-3 z-10 transition-colors" />
                                    <AddressAutocomplete
                                        onAddressSelect={(_addr, _components, geometry, granular) => {
                                            if (granular) {
                                                setHomeHouseNumber(granular.houseNumber);
                                                setHomeBlockNumber(granular.blockNumber);
                                                setHomeStreet(granular.street);
                                                setHomeSubdivision(granular.subdivision);
                                                setHomeSitio(granular.sitio);
                                                setHomeBarangay(granular.barangay);
                                                setHomeCity(granular.city);
                                                setHomeDistrict(granular.district);
                                                setHomeProvince(granular.province);
                                                setHomeZip(granular.zip);
                                                setHomeRegion(granular.region);
                                            }
                                            setHomeLandmark(_addr);
                                            if (geometry) {
                                                setHomeLat(geometry.lat);
                                                setHomeLng(geometry.lng);
                                            }
                                        }}
                                        defaultValue={[homeHouseNumber, homeBlockNumber, homeStreet, homeSubdivision, homeBarangay, homeCity, homeProvince, homeZip].filter(Boolean).join(', ')}
                                        initialLocation={homeLat && homeLng ? { lat: homeLat, lng: homeLng } : undefined}
                                        initialGranular={{
                                            houseNumber: homeHouseNumber,
                                            blockNumber: homeBlockNumber,
                                            street: homeStreet,
                                            subdivision: homeSubdivision,
                                            sitio: homeSitio,
                                            barangay: homeBarangay,
                                            city: homeCity,
                                            district: homeDistrict,
                                            province: homeProvince,
                                            zip: homeZip,
                                            region: homeRegion
                                        }}
                                        placeholder={RIDER_LANDING_TEXT.registerPage.addressPlaceholder}
                                        className="!pl-0 !bg-transparent !border-0 !shadow-none !rounded-2xl !py-3.5 text-base font-bold text-accent-brown"
                                    />
                                </div>
                            </div>

                            {/* Validated Address Preview */}
                            <div className="p-4 bg-accent-peach/10 rounded-2xl border border-accent-brown/10 space-y-1.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{RIDER_LANDING_TEXT.registerPage.validatedAddressLabel}</p>
                                <p className="text-sm font-bold text-accent-brown leading-relaxed capitalize">
                                    {[homeHouseNumber, homeBlockNumber, homeStreet, homeSubdivision, homeSitio, homeBarangay, homeCity, homeProvince, homeZip].filter(Boolean).join(' ') || 'No address selected yet'}
                                </p>
                                {!homeCity && (
                                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 pt-0.5">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>{RIDER_LANDING_TEXT.registerPage.locationIncomplete}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!!phoneError || phoneChecking}
                            className="bg-brand-dark hover:bg-brand text-white w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal mt-6 disabled:opacity-50"
                        >
                            <span>{RIDER_LANDING_TEXT.registerPage.nextBtn}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>
                    </motion.div>
                );

            // ── Step 2: Vehicle Details ────────────────────────────────────────
            case 2:
                return (
                    <motion.div key="rider-s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{RIDER_LANDING_TEXT.registerPage.step2Title}</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{RIDER_LANDING_TEXT.registerPage.step2Subtitle}</p>
                        </div>

                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            <CustomDropdown
                                label={RIDER_LANDING_TEXT.registerPage.vehicleTypeLabel}
                                isRequired={true}
                                value={vehicleType}
                                onChange={setVehicleType}
                                options={[
                                    { label: 'Motorcycle', value: 'Motorcycle' },
                                    { label: 'Bicycle', value: 'Bicycle' }
                                ]}
                                placeholder="Select vehicle category"
                            />

                            {vehicleType === 'Bicycle' ? (
                                <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-2xl">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                        <Bike className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-green-800">{RIDER_LANDING_TEXT.registerPage.bicycleNoticeTitle}</p>
                                        <p className="text-xs text-green-700 leading-relaxed font-medium">{RIDER_LANDING_TEXT.registerPage.bicycleNoticeDesc}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Driver's License Number */}
                                    <div className="group space-y-1.5">
                                        <label htmlFor="rider-license-num" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                            {RIDER_LANDING_TEXT.registerPage.licenseNumberLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                        </label>
                                        <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                            <ShieldCheck className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                            <input
                                                id="rider-license-num"
                                                type="text"
                                                value={driverLicense}
                                                onChange={e => setDriverLicense(e.target.value.toUpperCase())}
                                                placeholder="AXX-XX-XXXXXX"
                                                className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal uppercase tracking-wider"
                                            />
                                        </div>
                                    </div>

                                    {/* License Document Upload */}
                                    <FileUploadField
                                        label={RIDER_LANDING_TEXT.registerPage.licenseUploadLabel}
                                        required={true}
                                        docType="driver_license"
                                        value={licenseUrl}
                                        onUpload={setLicenseUrl}
                                    />

                                    {/* Vehicle CR & OR */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FileUploadField
                                            label={RIDER_LANDING_TEXT.registerPage.crUploadLabel}
                                            required={true}
                                            docType="vehicle_cr"
                                            value={vehicleCrUrl}
                                            onUpload={setVehicleCrUrl}
                                        />
                                        <FileUploadField
                                            label={RIDER_LANDING_TEXT.registerPage.orUploadLabel}
                                            required={true}
                                            docType="vehicle_or"
                                            value={vehicleOrUrl}
                                            onUpload={setVehicleOrUrl}
                                        />
                                    </div>
                                </div>
                            )}
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
                                type="button"
                                onClick={nextStep}
                                className="flex-1 bg-brand-dark hover:bg-brand text-white min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] cursor-pointer not-italic tracking-normal"
                            >
                                <span>{RIDER_LANDING_TEXT.registerPage.nextBtn}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 3: Required Documents & Credentials ───────────────────────
            case 3:
                return (
                    <motion.div key="rider-s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{RIDER_LANDING_TEXT.registerPage.step3Title}</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{RIDER_LANDING_TEXT.registerPage.step3Subtitle}</p>
                        </div>

                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* NBI / Police Clearance Upload */}
                            <FileUploadField
                                label={RIDER_LANDING_TEXT.registerPage.nbiUploadLabel}
                                required={true}
                                docType="nbi_clearance"
                                value={nbiClearanceUrl}
                                onUpload={setNbiClearanceUrl}
                            />

                            {/* Age & Device Requirements */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-green-50 border border-green-200">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-green-700">{RIDER_LANDING_TEXT.registerPage.ageVerifiedTitle}</p>
                                        <p className="text-xs text-green-600 font-medium">{RIDER_LANDING_TEXT.registerPage.ageVerifiedDesc}</p>
                                    </div>
                                </div>
                                <RequirementCheckbox
                                    label={RIDER_LANDING_TEXT.registerPage.hardwareRequirement}
                                    checked={hasAndroid6}
                                    onChange={setHasAndroid6}
                                />
                            </div>

                            {/* Email & Passwords */}
                            <div className="space-y-4 border-t border-accent-brown/10 pt-5">
                                {/* Email */}
                                <div className="group space-y-1.5">
                                    <label htmlFor="rider-email" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        {RIDER_LANDING_TEXT.registerPage.emailLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className={`relative flex items-center min-h-[52px] sm:min-h-[56px] border ${emailError ? 'border-red-400' : 'border-accent-brown/15'} focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden`}>
                                        <MailIcon className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                        <input
                                            id="rider-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={e => {
                                                setEmail(e.target.value);
                                                if (emailError) setEmailError(null);
                                            }}
                                            onBlur={handleEmailBlur}
                                            aria-invalid={!!emailError}
                                            aria-describedby={emailError ? "rider-email-error" : undefined}
                                            placeholder={RIDER_LANDING_TEXT.registerPage.emailPlaceholder}
                                            className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal"
                                        />
                                    </div>
                                    {emailError && (
                                        <p id="rider-email-error" role="alert" aria-live="polite" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{emailError}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Password & Confirm Password */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="group space-y-1.5">
                                        <label htmlFor="rider-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                            {RIDER_LANDING_TEXT.registerPage.passwordLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                        </label>
                                        <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                            <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                            <input
                                                id="rider-password"
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
                                    </div>

                                    <div className="group space-y-1.5">
                                        <label htmlFor="rider-confirm-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                            {RIDER_LANDING_TEXT.registerPage.confirmPasswordLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                        </label>
                                        <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                            <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                            <input
                                                id="rider-confirm-password"
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
                                </div>
                                {password && <div className="pt-1"><PasswordStrength password={password} /></div>}
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
                                <span>{loading ? RIDER_LANDING_TEXT.registerPage.sendingCodeBtn : RIDER_LANDING_TEXT.registerPage.sendCodeBtn}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 4: Account Verification (OTP) ─────────────────────────────
            case 4:
                return (
                    <motion.div key="rider-s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-2">
                            <div className="w-14 h-14 bg-brand/10 text-brand-dark rounded-2xl flex items-center justify-center shadow-xs">
                                <MailCheck className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">{RIDER_LANDING_TEXT.registerPage.step4Title}</h1>
                                <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">{RIDER_LANDING_TEXT.registerPage.step4Subtitle(email)}</p>
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
                                {RIDER_LANDING_TEXT.registerPage.noCodeText}{' '}
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={countdown > 0}
                                    className="text-brand-dark font-bold hover:underline cursor-pointer disabled:opacity-50"
                                >
                                    {countdown > 0 ? RIDER_LANDING_TEXT.registerPage.waitCountdown(countdown) : RIDER_LANDING_TEXT.registerPage.resendBtn}
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
                                type="button"
                                onClick={handleRegister}
                                disabled={loading}
                                className="flex-1 bg-brand-dark hover:bg-brand text-white min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] cursor-pointer not-italic tracking-normal disabled:opacity-50"
                            >
                                <span>{loading ? RIDER_LANDING_TEXT.registerPage.creatingAccountBtn : RIDER_LANDING_TEXT.registerPage.completeSignUpBtn}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    if (isPending) return <PendingApproval email={email} />;

    return (
        <div className="min-h-[100dvh] w-full bg-white flex font-brand overflow-x-hidden">
            {/* Left Column: Full Screen Hero (Desktop Only) */}
            <div className="hidden lg:block w-1/2 min-h-[100dvh] relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 z-0">
                    <img
                        src={loginHero}
                        alt={RIDER_LANDING_TEXT.registerPage.heroImageAlt}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                    <div className="space-y-12">
                        <Link to="/for-riders" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Bike className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Riders</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black">
                                <div className="w-10 h-[2px] bg-brand-dark" />
                                {RIDER_LANDING_TEXT.registerPage.heroTag}
                            </div>
                            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">
                                {RIDER_LANDING_TEXT.registerPage.heroTitlePrefix} <br />
                                <span className="text-brand-dark italic font-outfit">{RIDER_LANDING_TEXT.registerPage.heroTitleHighlight}</span>
                            </h1>
                            <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">
                                {RIDER_LANDING_TEXT.registerPage.heroSubtitle}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 w-fit">
                        <p className="text-xs font-black text-white uppercase tracking-widest italic">
                            {RIDER_LANDING_TEXT.registerPage.heroStepBadge(step)}
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
                            to="/for-riders"
                            title="Back to Hi-Vet for Riders"
                            aria-label="Back to Hi-Vet for Riders"
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-dark/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <Bike className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                        </Link>
                        <Link
                            to="/login/rider"
                            className="min-h-[44px] inline-flex items-center text-sm sm:text-base font-bold text-brand-dark hover:text-accent-brown transition-colors underline underline-offset-4 tracking-normal not-italic"
                        >
                            {RIDER_LANDING_TEXT.registerPage.logInInstead}
                        </Link>
                    </div>

                    {/* Progress Bar (4 Equal Steps) */}
                    <div
                        role="progressbar"
                        aria-valuenow={step}
                        aria-valuemin={1}
                        aria-valuemax={TOTAL_STEPS}
                        aria-label={`Step ${step} of ${TOTAL_STEPS}`}
                        className="w-full flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8"
                    >
                        {[1, 2, 3, 4].map(i => (
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
                            to="/for-riders"
                            className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-slate-600 hover:text-brand-dark transition-colors tracking-normal not-italic"
                        >
                            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{RIDER_LANDING_TEXT.registerPage.backToLanding}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderRegister;
