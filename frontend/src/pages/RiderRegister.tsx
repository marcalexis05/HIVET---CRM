import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, ArrowLeft, ChevronLeft, ShieldCheck, MailCheck, Bike, Eye, EyeOff, User,
    FileText, CheckCircle, Lock, Phone as PhoneIcon, Mail as MailIcon, MapPin, Upload, X, Clock, CheckCircle2,
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

const FileUploadField = ({ label, icon: Icon, onUpload, value, docType }: any) => {
    const [uploading, setUploading] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
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
        <div className="space-y-2">
            <div className="flex items-center justify-between pl-6">
                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] italic">{label} <span className="text-brand-dark">*</span></label>
            </div>
            {value ? (
                <div className="flex items-center gap-4 bg-green-50 border border-green-100 rounded-[2rem] px-6 py-4 shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-green-700 truncate italic">{RIDER_LANDING_TEXT.registerPage.upload.verifiedTitle}</p>
                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest leading-none">{RIDER_LANDING_TEXT.registerPage.upload.verifiedSubtitle}</p>
                    </div>
                    <button type="button" onClick={() => onUpload('')} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 ring-1 ring-brand-dark/5 hover:ring-brand-dark/30 bg-[#F7F6F2] hover:bg-white rounded-[2.5rem] py-8 px-6 transition-all group shadow-inner"
                >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {uploading ? <div className="w-6 h-6 border-4 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" /> : <Upload className="w-6 h-6 text-accent-brown/20 group-hover:text-brand-dark transition-colors" />}
                    </div>
                    <div className="text-center">
                        <span className="block text-[10px] font-black text-accent-brown uppercase tracking-[0.3em] group-hover:text-brand-dark transition-colors italic">{uploading ? RIDER_LANDING_TEXT.registerPage.upload.uploading : RIDER_LANDING_TEXT.registerPage.upload.uploadPrompt}</span>
                        <span className="block text-[9px] text-accent-brown/30 font-bold uppercase tracking-widest mt-1 italic">{RIDER_LANDING_TEXT.registerPage.upload.acceptedTypes}</span>
                    </div>
                    <input ref={ref} type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                </button>
            )}
        </div>
    );
};

const RequirementCheckbox = ({ label, checked, onChange }: any) => (
    <label className="flex items-center gap-4 p-6 rounded-[2rem] bg-[#F7F6F2] border border-accent-brown/5 hover:bg-white hover:ring-1 hover:ring-brand-dark/30 transition-all cursor-pointer group">
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${checked ? 'bg-brand-dark border-brand-dark shadow-xl shadow-brand-dark/20' : 'bg-white border-accent-brown/10 group-hover:border-brand-dark'}`}>
            {checked && <CheckCircle className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1">
             <span className={`text-xs font-black uppercase tracking-widest italic transition-colors ${checked ? 'text-accent-brown' : 'text-accent-brown/40'}`}>{label}</span>
        </div>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="hidden" />
    </label>
);

const PendingApproval = ({ email, vehicleType }: { email: string; vehicleType: string }) => (
    <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
        <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
            <div className="absolute inset-0 z-0">
                <img src={loginHero} alt={RIDER_LANDING_TEXT.registerPage.heroImageAlt} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                <div className="absolute inset-0 bg-black/20" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between p-24">
                <div className="space-y-12">
                     <Link to="/" className="inline-flex items-center gap-4 group/back">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                            <Bike className="w-8 h-8" />
                        </div>
                        <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Riders</span>
                    </Link>
                    <div className="space-y-8 max-w-lg">
                        <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />{RIDER_LANDING_TEXT.registerPage.heroTag}</div>
                        <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">{RIDER_LANDING_TEXT.registerPage.heroTitlePrefix} <br /><span className="text-brand-dark italic font-outfit">{RIDER_LANDING_TEXT.registerPage.heroTitleHighlight}</span></h1>
                        <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">{RIDER_LANDING_TEXT.registerPage.heroSubtitle}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-hidden">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-8">
                <div className="w-24 h-24 bg-brand/10 text-brand-dark rounded-[3rem] flex items-center justify-center mx-auto shadow-xl shadow-brand/5">
                    <Clock className="w-12 h-12 animate-pulse" />
                </div>
                <div className="space-y-3">
                    <h2 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">{RIDER_LANDING_TEXT.registerPage.pending.title}</h2>
                    <p className="text-sm text-accent-brown/50 font-medium italic">{RIDER_LANDING_TEXT.registerPage.pending.submittedFor(email)}</p>
                </div>
                <div className="bg-accent-peach/10 p-8 rounded-[2.5rem] border border-accent-brown/5 text-left space-y-6">
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                        <p className="text-xs text-accent-brown/70 italic leading-relaxed">{RIDER_LANDING_TEXT.registerPage.pending.step1Text}</p>
                    </div>
                    <div className="flex gap-4 opacity-50">
                        <div className="w-6 h-6 rounded-full bg-brand-dark/20 text-accent-brown/40 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                        <p className="text-xs text-accent-brown/40 italic leading-relaxed">{RIDER_LANDING_TEXT.registerPage.pending.step2Text}</p>
                    </div>
                </div>
                <button onClick={() => window.location.href = '/for-riders'} className="bg-brand-dark text-white w-full py-5 rounded-full font-black text-[10px] uppercase tracking-[0.5em] shadow-xl shadow-brand-dark/20 hover:shadow-brand-dark/40 transition-all italic">{RIDER_LANDING_TEXT.registerPage.pending.returnBtn}</button>
            </motion.div>
        </div>
    </div>
);

const RiderRegister = () => {
    const [step, setStep] = useState(1);
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
    const [vehicleType, setVehicleType] = useState('Motorcycle');
    const [driverLicense, setDriverLicense] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState('');
    
    // Compliance state
    const [licenseUrl, setLicenseUrl] = useState('');
    const [vehicleCrUrl, setVehicleCrUrl] = useState('');
    const [vehicleOrUrl, setVehicleOrUrl] = useState('');
    const [nbiClearanceUrl, setNbiClearanceUrl] = useState('');
    const [is18Above, setIs18Above] = useState(false);
    const [hasAndroid6, setHasAndroid6] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

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
        } catch (err) {
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

    const prevStep = () => setStep(s => Math.max(1, s - 1));

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
        } catch (err) {
            console.error(err);
            setError(RIDER_LANDING_TEXT.registerPage.errors.networkError);
        } finally {
            setLoading(false);
        }
    };


    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">{RIDER_LANDING_TEXT.registerPage.step1Title}</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">{RIDER_LANDING_TEXT.registerPage.step1Subtitle}</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center text-sm">{error}</div>}
                        
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.firstName} <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <User className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.lastName} <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.middleName} <span className="text-[11px] lowercase opacity-50 font-bold italic not-uppercase tracking-normal">(Optional)</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" className="w-full bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <CustomDropdown
                                    label={`${RIDER_LANDING_TEXT.registerPage.suffix}`}
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

                            <div className="grid grid-cols-2 gap-4">
                                <CustomDatePicker
                                    mode="person birthday"
                                    label={`${RIDER_LANDING_TEXT.registerPage.birthdate} *`}
                                    value={birthday}
                                    onChange={setBirthday}
                                />
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-accent-brown/40 block ml-1 italic">{RIDER_LANDING_TEXT.registerPage.age}</label>
                                    <div className="w-full bg-[#F7F6F2] py-5 px-8 rounded-3xl text-accent-brown font-black text-xl italic opacity-50 ring-1 ring-brand-dark/5">{birthday ? `${calculateAge(birthday)}` : '--'}</div>
                                </div>
                            </div>

                             <div>
                                <CustomDropdown
                                    label={`${RIDER_LANDING_TEXT.registerPage.gender} *`}
                                    value={gender}
                                    onChange={setGender}
                                    options={[
                                        { label: 'Male', value: 'Male' },
                                        { label: 'Female', value: 'Female' },
                                        { label: 'Other', value: 'Other' },
                                        { label: 'Rather not say', value: 'Rather not say' }
                                    ]}
                                    placeholder="Select"
                                />
                            </div>

                            <div className="group space-y-2">
                                <label htmlFor="rider-phone" className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.phone} <span className="text-brand-dark">*</span></label>
                                <div className={`relative flex items-center bg-[#F7F6F2] ring-1 ${phoneError ? 'ring-red-400' : 'ring-brand-dark/5 focus-within:ring-brand-dark/30'} rounded-3xl overflow-hidden transition-all shadow-inner`}>
                                    <div className="pl-6 pr-4 py-5 text-accent-brown font-black border-r border-accent-brown/10 text-sm opacity-20 transition-opacity group-focus-within:opacity-100">+63</div>
                                    <input 
                                        id="rider-phone"
                                        type="tel" 
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
                                        className="flex-1 bg-transparent py-5 px-6 text-accent-brown font-bold text-base outline-none" 
                                    />
                                </div>
                                {phoneError && (
                                    <p id="rider-phone-error" role="alert" aria-live="polite" className="text-xs font-bold text-red-500 flex items-center gap-1.5 pl-6 mt-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        {phoneError}
                                    </p>
                                )}
                            </div>

                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.address} <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <MapPin className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark z-10 transition-colors" />
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
                                        className="!pl-16 !bg-transparent !border-0 !shadow-none !rounded-3xl !py-5 text-base font-bold text-accent-brown"
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-accent-peach/5 rounded-[2.5rem] border border-accent-peach/10 space-y-3 relative overflow-hidden group/addr">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/addr:opacity-20 transition-opacity"><User className="w-16 h-16" /></div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">{RIDER_LANDING_TEXT.registerPage.validatedAddressLabel}</p>
                                <div className="space-y-2 relative z-10">
                                    <p className="text-lg font-black text-accent-brown leading-tight capitalize">
                                        {[homeHouseNumber, homeBlockNumber, homeStreet, homeSubdivision, homeSitio, homeBarangay, homeCity, homeProvince, homeZip].filter(Boolean).join(' ')}
                                    </p>
                                    {!homeCity && <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest italic border border-red-100">{RIDER_LANDING_TEXT.registerPage.locationIncomplete}</div>}
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="bg-brand-dark text-white w-full py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">
                            {RIDER_LANDING_TEXT.registerPage.nextBtn} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">{RIDER_LANDING_TEXT.registerPage.step2Title}</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">{RIDER_LANDING_TEXT.registerPage.step2Subtitle}</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center text-sm">{error}</div>}
                        
                        <div className="space-y-6 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                             <CustomDropdown
                                label={RIDER_LANDING_TEXT.registerPage.vehicleTypeLabel}
                                value={vehicleType}
                                onChange={setVehicleType}
                                options={[
                                    { label: 'Motorcycle', value: 'Motorcycle' },
                                    { label: 'Bicycle', value: 'Bicycle' }
                                ]}
                                placeholder="Select Category"
                            />

                            {vehicleType === 'Bicycle' ? (
                                <div className="flex items-start gap-4 p-8 bg-green-50 border border-green-100 rounded-[2.5rem]">
                                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                                        <Bike className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-green-700 uppercase tracking-tighter">{RIDER_LANDING_TEXT.registerPage.bicycleNoticeTitle}</p>
                                        <p className="text-[11px] text-green-600/80 font-bold uppercase tracking-widest leading-relaxed mt-2 italic">{RIDER_LANDING_TEXT.registerPage.bicycleNoticeDesc}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="group space-y-2">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.licenseNumberLabel} <span className="text-brand-dark">*</span></label>
                                        <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                            <ShieldCheck className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                            <input type="text" value={driverLicense} onChange={e => setDriverLicense(e.target.value)} placeholder="AXX-XX-XXXXXX" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                        </div>
                                    </div>
                                    <FileUploadField label={RIDER_LANDING_TEXT.registerPage.licenseUploadLabel} icon={ShieldCheck} docType="driver_license" value={licenseUrl} onUpload={setLicenseUrl} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FileUploadField label={RIDER_LANDING_TEXT.registerPage.crUploadLabel} icon={FileText} docType="vehicle_cr" value={vehicleCrUrl} onUpload={setVehicleCrUrl} />
                                        <FileUploadField label={RIDER_LANDING_TEXT.registerPage.orUploadLabel} icon={FileText} docType="vehicle_or" value={vehicleOrUrl} onUpload={setVehicleOrUrl} />
                                    </div>
                                </div>
                            )}
                        </div>

                         <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="submit" className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">{RIDER_LANDING_TEXT.registerPage.nextBtn} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">{RIDER_LANDING_TEXT.registerPage.step3Title}</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">{RIDER_LANDING_TEXT.registerPage.step3Subtitle}</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center text-sm">{error}</div>}
                        
                        <div className="space-y-6 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                             <FileUploadField label={RIDER_LANDING_TEXT.registerPage.nbiUploadLabel} icon={ShieldCheck} docType="nbi_clearance" value={nbiClearanceUrl} onUpload={setNbiClearanceUrl} />
                             
                             <div className="space-y-4">
                                <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-green-50/50 border border-green-100">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-700">{RIDER_LANDING_TEXT.registerPage.ageVerifiedTitle}</p>
                                        <p className="text-[11px] font-bold text-green-600/70 italic uppercase tracking-widest">{RIDER_LANDING_TEXT.registerPage.ageVerifiedDesc}</p>
                                    </div>
                                </div>
                                <RequirementCheckbox label={RIDER_LANDING_TEXT.registerPage.hardwareRequirement} checked={hasAndroid6} onChange={setHasAndroid6} />
                             </div>

                             <div className="space-y-6 border-t border-accent-brown/5 pt-6">
                                <div className="group space-y-2">
                                    <label htmlFor="rider-email" className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.emailLabel} <span className="text-brand-dark">*</span></label>
                                    <div className={`relative ring-1 ${emailError ? 'ring-red-400' : 'ring-brand-dark/5 focus-within:ring-brand-dark/30'} rounded-3xl transition-all shadow-inner bg-[#F7F6F2]`}>
                                        <MailIcon className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input 
                                            id="rider-email"
                                            type="email" 
                                            value={email} 
                                            onChange={e => {
                                                setEmail(e.target.value);
                                                if (emailError) setEmailError(null);
                                            }} 
                                            onBlur={handleEmailBlur}
                                            aria-invalid={!!emailError}
                                            aria-describedby={emailError ? "rider-email-error" : undefined}
                                            placeholder={RIDER_LANDING_TEXT.registerPage.emailPlaceholder} 
                                            className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" 
                                        />
                                    </div>
                                    {emailError && (
                                        <p id="rider-email-error" role="alert" aria-live="polite" className="text-xs font-bold text-red-500 flex items-center gap-1.5 pl-6 mt-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            {emailError}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group space-y-2">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.passwordLabel} <span className="text-brand-dark">*</span></label>
                                        <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                            <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-12 text-accent-brown font-bold text-base outline-none" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark">
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="group space-y-2">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">{RIDER_LANDING_TEXT.registerPage.confirmPasswordLabel} <span className="text-brand-dark">*</span></label>
                                        <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                            <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                            <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-12 text-accent-brown font-bold text-base outline-none" />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark">
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {password && <PasswordStrength password={password} />}
                             </div>
                        </div>

                         <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="submit" disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4 disabled:opacity-50">
                                {loading ? RIDER_LANDING_TEXT.registerPage.sendingCodeBtn : RIDER_LANDING_TEXT.registerPage.sendCodeBtn} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                        <div className="space-y-4">
                            <div className="w-20 h-20 bg-brand/10 text-brand-dark rounded-[2.5rem] flex items-center justify-center"><MailCheck className="w-10 h-10" /></div>
                            <div className="space-y-2">
                                <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">{RIDER_LANDING_TEXT.registerPage.step4Title}</h3>
                                <p className="text-sm text-accent-brown/40 font-medium italic leading-relaxed">{RIDER_LANDING_TEXT.registerPage.step4Subtitle(email)}</p>
                            </div>
                        </div>

                        <div className="flex justify-between gap-3">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} onPaste={handlePaste} className="w-14 h-20 text-center text-3xl font-black text-brand-dark bg-[#F7F6F2] rounded-3xl outline-none transition-all ring-1 ring-brand-dark/5 focus:ring-brand-dark/30 shadow-inner" />
                            ))}
                        </div>

                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center mb-4">{error}</div>}

                        <div className="space-y-8">
                             <p className="text-xs font-black text-accent-brown/30 uppercase tracking-[0.2em] ml-6 italic">{RIDER_LANDING_TEXT.registerPage.noCodeText} <button type="button" onClick={handleSendOtp} disabled={countdown > 0} className="text-brand-dark font-black hover:text-accent-brown">{countdown > 0 ? RIDER_LANDING_TEXT.registerPage.waitCountdown(countdown) : RIDER_LANDING_TEXT.registerPage.resendBtn}</button></p>
                             <div className="flex gap-4">
                                <button type="button" onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 italic">{RIDER_LANDING_TEXT.registerPage.reviewBtn}</button>
                                <button type="button" onClick={handleRegister} disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all italic flex items-center justify-center gap-4 group">
                                    {loading ? RIDER_LANDING_TEXT.registerPage.creatingAccountBtn : RIDER_LANDING_TEXT.registerPage.completeSignUpBtn}
                                    {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                                </button>
                             </div>
                        </div>
                    </motion.div>
                );
            default: return null;
        }
    };

    const stepLabels = [
        'Personal Info',
        'Vehicle Details',
        'Required Documents',
        'Account Verification',
    ];

    if (isPending) return <PendingApproval email={email} vehicleType={vehicleType} />;

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt={RIDER_LANDING_TEXT.registerPage.heroImageAlt} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-24">
                    <div className="space-y-12">
                         <Link to="/for-riders" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Bike className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Riders</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />{RIDER_LANDING_TEXT.registerPage.heroTag}</div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">{RIDER_LANDING_TEXT.registerPage.heroTitlePrefix} <br /><span className="text-brand-dark italic font-outfit">{RIDER_LANDING_TEXT.registerPage.heroTitleHighlight}</span></h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">{RIDER_LANDING_TEXT.registerPage.heroSubtitle}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">{RIDER_LANDING_TEXT.registerPage.heroStepBadge(step)}</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Dynamic Form */}
            <div className="w-full lg:w-1/2 h-full flex flex-col bg-white overflow-hidden relative">
                <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-24">
                    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'w-10 bg-brand-dark shadow-[0_0_20px_rgba(242,107,33,0.4)]' : 'w-3 bg-accent-brown/10'}`} />
                                ))}
                            </div>
                            <Link to="/login/rider" className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">{RIDER_LANDING_TEXT.registerPage.logInInstead}</Link>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <AnimatePresence mode="wait">
                                {renderStep()}
                            </AnimatePresence>
                        </form>
                    </div>
                </div>

                <div className="p-12 border-t border-accent-brown/5 flex justify-center">
                    <Link to="/for-riders" className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
                        {RIDER_LANDING_TEXT.registerPage.backToLanding}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RiderRegister;
