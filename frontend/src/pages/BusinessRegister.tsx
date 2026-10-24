import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, AlertCircle, Lock, ArrowRight, ChevronLeft,
    ShieldCheck, MailCheck, Building2, Eye, EyeOff,
    FileCheck, Landmark, User, MapPin, Upload, X, CheckCircle2, Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { calculateAgeFullYears, validateBirthday } from '../utils/dateValidation';
import { checkContactAvailability, isValidPhMobile, isValidEmail } from '../utils/contactValidation';
import { CONTACT_VALIDATION_MESSAGES } from '../constants/contactValidationWording';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useAuth } from '../context/AuthContext';
import loginHero from '../assets/login_hero_landscape.png';
import { CLINIC_LANDING_TEXT } from '../constants/clinicLandingWording';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const calculateAge = (birthday: string) => {
    if (!birthday) return '';
    const age = calculateAgeFullYears(birthday);
    return age !== null && age >= 0 ? age.toString() : '';
};

// ─── File Upload Input Component ──────────────────────────────────────────────
const FileUploadField = ({
    label, required = false, hint, value, onChange
}: {
    label: string; required?: boolean; hint?: string;
    value: File | null; onChange: (f: File | null) => void;
}) => {
    const ref = useRef<HTMLInputElement>(null);
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
                        <p className="text-sm font-bold text-green-800 truncate">{value.name}</p>
                        <p className="text-xs text-green-600 font-semibold">{(value.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => onChange(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors shrink-0 cursor-pointer" aria-label="Remove file">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-accent-brown/25 hover:border-brand-dark bg-[#F7F6F2] hover:bg-white rounded-2xl py-6 px-4 transition-all group cursor-pointer"
                >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs border border-accent-brown/10 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5 text-slate-500 group-hover:text-brand-dark transition-colors" />
                    </div>
                    <div className="text-center space-y-0.5">
                        <span className="block text-sm font-bold text-accent-brown group-hover:text-brand-dark transition-colors">Choose document file</span>
                        <span className="block text-xs text-slate-500 font-normal">PDF, JPG, or PNG · Up to 5MB</span>
                    </div>
                </button>
            )}
            <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
            {hint && <p className="text-xs text-slate-500 leading-normal">{hint}</p>}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const BusinessRegister = () => {
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 6;

    useEffect(() => {
        document.title = 'Hi-Vet';
    }, []);
    const [pendingApproval, setPendingApproval] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Step 1 — Clinic Info
    const [clinicName, setClinicName] = useState('');
    const [phone, setPhone] = useState('');

    // Step 2 — Owner Profile
    const [ownerFirstName, setOwnerFirstName] = useState('');
    const [ownerLastName, setOwnerLastName] = useState('');
    const [ownerMiddleName, setOwnerMiddleName] = useState('');
    const [ownerSuffix, setOwnerSuffix] = useState('');
    const [ownerHomeAddress, setOwnerHomeAddress] = useState('');
    const [ownerHouseNumber, setOwnerHouseNumber] = useState('');
    const [ownerStreet, setOwnerStreet] = useState('');
    const [ownerSubdivision, setOwnerSubdivision] = useState('');
    const [ownerBarangay, setOwnerBarangay] = useState('');
    const [ownerCity, setOwnerCity] = useState('');
    const [ownerProvince, setOwnerProvince] = useState('');
    const [ownerZip, setOwnerZip] = useState('');
    const [ownerLat, setOwnerLat] = useState<number | null>(null);
    const [ownerLng, setOwnerLng] = useState<number | null>(null);
    const [ownerLandmark, setOwnerLandmark] = useState('');
    const [ownerIdDocument, setOwnerIdDocument] = useState<File | null>(null);
    const [ownerPhone, setOwnerPhone] = useState('');
    const [ownerBirthday, setOwnerBirthday] = useState('');
    const [ownerGender, setOwnerGender] = useState('');

    // Step 3 — Clinic Location
    const [clinicHouseNumber, setClinicHouseNumber] = useState('');
    const [clinicBlockNumber, setClinicBlockNumber] = useState('');
    const [clinicStreet, setClinicStreet] = useState('');
    const [clinicSubdivision, setClinicSubdivision] = useState('');
    const [clinicSitio, setClinicSitio] = useState('');
    const [clinicBarangay, setClinicBarangay] = useState('');
    const [clinicCity, setClinicCity] = useState('');
    const [clinicDistrict, setClinicDistrict] = useState('');
    const [clinicProvince, setClinicProvince] = useState('');
    const [clinicZip, setClinicZip] = useState('');
    const [clinicRegion, setClinicRegion] = useState('Philippines');
    const [clinicLat, setClinicLat] = useState<number | null>(null);
    const [clinicLng, setClinicLng] = useState<number | null>(null);

    // Step 4 — Regulatory
    const [baiNumber, setBaiNumber] = useState('');
    const [baiDocument, setBaiDocument] = useState<File | null>(null);
    const [mayorsPermit, setMayorsPermit] = useState('');
    const [mayorsDocument, setMayorsDocument] = useState<File | null>(null);

    // Step 5 — Credentials
    const [email, setEmail] = useState('');

    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneChecking, setPhoneChecking] = useState(false);
    const [emailChecking, setEmailChecking] = useState(false);

    // Debounced Personal Phone Validation
    useEffect(() => {
        if (!ownerPhone) {
            setPhoneError(null);
            return;
        }
        if (ownerPhone.length === 10 && !ownerPhone.startsWith('9')) {
            setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            return;
        }
        if (ownerPhone.length < 10) {
            setPhoneError(null);
            return;
        }
        if (ownerPhone.length === 10 && ownerPhone.startsWith('9')) {
            const timer = setTimeout(async () => {
                setPhoneChecking(true);
                const res = await checkContactAvailability('phone', ownerPhone);
                setPhoneChecking(false);
                setPhoneError(res.error);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [ownerPhone]);

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
        if (!ownerPhone) return;
        if (!isValidPhMobile(ownerPhone)) {
            setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            return;
        }
        setPhoneChecking(true);
        const res = await checkContactAvailability('phone', ownerPhone);
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


    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    // ─── OTP Handlers ───────────────────────────────────────────────────────────
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    };
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
    };
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) {
            const newOtp = [...otp];
            for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
            setOtp(newOtp);
            document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
        }
    };

    // ─── Navigation ────────────────────────────────────────────────────────────
    const nextStep = async () => {
        setError('');
        if (step === 1) {
            if (!clinicName) return setError('Please enter your clinic name.');
            if (phone.length !== 10 || !phone.startsWith('9')) {
                return setError('Please enter a valid 10-digit mobile number starting with 9.');
            }
            setStep(2);
        } else if (step === 2) {
            if (!ownerFirstName || !ownerLastName || !ownerBirthday || !ownerGender) return setError('Please enter your name, birthdate, and sex.');
            const bVal = validateBirthday(ownerBirthday, 'person birthday');
            if (!bVal.isValid) return setError(bVal.error || 'Please choose a valid birthdate.');
            if (!ownerHomeAddress) return setError('Please enter your home address.');
            if (phoneError) {
                return setError(phoneError);
            }
            if (!isValidPhMobile(ownerPhone)) {
                setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
                return setError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            }
            setPhoneChecking(true);
            const pCheck = await checkContactAvailability('phone', ownerPhone);
            setPhoneChecking(false);
            if (!pCheck.available) {
                setPhoneError(pCheck.error);
                return setError(pCheck.error || CONTACT_VALIDATION_MESSAGES.numberUsed);
            }
            setStep(3);
        } else if (step === 3) {
            // Remove strict city/province check. Allow progression if some location data is present.
            const hasLocation = clinicLat || clinicCity || clinicProvince || clinicBarangay || clinicStreet;
            if (!hasLocation) return setError('Please choose your clinic address on the map or type it in.');
            setStep(4);
        } else if (step === 4) {
            if (!baiNumber || !baiDocument) return setError('Please provide your BAI Registration number and document.');
            if (!mayorsPermit || !mayorsDocument) return setError("Please provide your Mayor's Permit number and document.");
            setStep(5);
        } else if (step === 5) {
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
            if (!email) return setError('Please enter your email address.');
            if (password !== confirmPassword) return setError('Passwords do not match.');
            if (password.length < 8) return setError('Password must be at least 8 characters.');
            await handleSendOtp();
        }
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 6) {
            handleRegister();
        } else {
            nextStep();
        }
    };

    const prevStep = () => setStep(s => Math.max(1, s - 1));

    // ─── OTP Send ───────────────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone: ownerPhone || phone, role: 'business' })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(6);
                setCountdown(60);
            } else {
                setError(data.detail || 'Failed to send verification email.');
            }
        } catch {
            setError('Could not connect to the server. Please check your internet and try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Final Register ─────────────────────────────────────────────────────────
    const handleRegister = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return setError('Please enter the full 6-digit code.');
        setLoading(true);
        setError('');

        try {
            // Upload documents first
            const uploadDoc = async (file: File, docType: string) => {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('doc_type', docType);
                const r = await fetch(`${API}/api/business/upload-document`, { method: 'POST', body: fd });
                const d = await r.json();
                return d.url as string;
            };

            const baiUrl = baiDocument ? await uploadDoc(baiDocument, 'bai') : '';
            const mayorsUrl = mayorsDocument ? await uploadDoc(mayorsDocument, 'mayors_permit') : '';
            const govIdUrl = ownerIdDocument ? await uploadDoc(ownerIdDocument, 'gov_id') : '';

            const res = await fetch(`${API}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email, password, otp: otpCode,
                    first_name: ownerFirstName,
                    middle_name: ownerMiddleName,
                    last_name: ownerLastName,
                    suffix: ownerSuffix,
                    phone: ownerPhone,
                    birthday: ownerBirthday,
                    gender: ownerGender,
                    role: 'business',
                    // Clinic Info
                    clinic_name: clinicName,
                    clinic_phone: phone,
                    // Owner Profile
                    owner_home_address: ownerHomeAddress,
                    owner_id_document_url: govIdUrl,
                    // Clinic Location
                    clinic_house_number: clinicHouseNumber,
                    clinic_block_number: clinicBlockNumber,
                    clinic_street: clinicStreet,
                    clinic_subdivision: clinicSubdivision,
                    clinic_sitio: clinicSitio,
                    clinic_barangay: clinicBarangay,
                    clinic_city: clinicCity,
                    clinic_district: clinicDistrict,
                    clinic_province: clinicProvince,
                    clinic_zip: clinicZip,
                    clinic_region: clinicRegion,
                    clinic_lat: clinicLat,
                    clinic_lng: clinicLng,
                    // Regulatory Compliance
                    bai_number: baiNumber,
                    bai_document_url: baiUrl,
                    mayors_permit: mayorsPermit,
                    mayors_permit_url: mayorsUrl,
                })
            });

            const data = await res.json();
            if (res.ok && data.status === 'pending_approval') {
                setRegisteredEmail(email);
                setPendingApproval(true);
            } else if (res.ok && data.token) {
                loginWithToken(data.token);
                navigate('/dashboard/business');
            } else {
                setError(data.detail || 'Could not create account. Please try again.');
            }
        } catch {
            setError('Could not create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Step Metadata ──────────────────────────────────────────────────────────
    const stepLabels = [
        'Clinic Information',
        'Owner Profile',
        'Clinic Location',
        'Regulatory Compliance',
        'Account Credentials',
        'Email Verification',
    ];

    const handleAddressComponents = (_full: string, components: any[], geometry?: { lat: number, lng: number }, granular?: any) => {
        if (granular) {
            setClinicHouseNumber(granular.houseNumber);
            setClinicBlockNumber(granular.blockNumber);
            setClinicStreet(granular.street);
            setClinicSubdivision(granular.subdivision);
            setClinicSitio(granular.sitio);
            setClinicBarangay(granular.barangay);
            setClinicCity(granular.city);
            setClinicDistrict(granular.district);
            setClinicProvince(granular.province);
            setClinicZip(granular.zip);
            setClinicRegion(granular.region);
            if (geometry) {
                setClinicLat(geometry.lat);
                setClinicLng(geometry.lng);
            }
            return;
        }

        let houseNum = '';
        let street = '';
        let barangay = '';
        let city = '';
        let province = '';
        let zip = '';
        let region = 'Philippines';
        let district = '';
        let subdivision = '';

        components.forEach(c => {
            const types = c.types;
            if (types.includes('street_number')) houseNum = c.long_name;
            if (types.includes('premise') || types.includes('subpremise')) {
                if (!houseNum) houseNum = c.long_name;
            }
            if (types.includes('route')) street = c.long_name;
            if (types.includes('sublocality_level_1') || types.includes('barangay')) barangay = c.long_name;
            if (types.includes('locality')) city = c.long_name;
            if (types.includes('administrative_area_level_1')) province = c.long_name;
            if (types.includes('postal_code')) zip = c.long_name;
            if (types.includes('administrative_area_level_2')) {
                district = c.long_name;
                if (!province || province.toLowerCase().includes('region') || province === 'Metro Manila' || province === 'National Capital Region') {
                    if (!province) province = c.long_name;
                }
            }
            if (types.includes('neighborhood') || types.includes('subdivision')) subdivision = c.long_name;
            
            // Fallbacks
            if (!city && types.includes('administrative_area_level_3')) city = c.long_name;
            if (!city && types.includes('administrative_area_level_2') && province !== c.long_name) city = c.long_name;
        });

        if (houseNum) setClinicHouseNumber(houseNum);
        if (street) setClinicStreet(street);
        if (barangay) setClinicBarangay(barangay);
        if (city) setClinicCity(city);
        if (province) setClinicProvince(province);
        if (zip) setClinicZip(zip);
        if (district) setClinicDistrict(district);
        if (subdivision) setClinicSubdivision(subdivision);
        setClinicRegion(region);
        if (geometry) {
            setClinicLat(geometry.lat);
            setClinicLng(geometry.lng);
        }
    };

    // ─── Render Step ────────────────────────────────────────────────────────────
    const renderStep = () => {
        switch (step) {
            // ── Step 1: Clinic Info ────────────────────────────────────────────
            case 1:
                return (
                    <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Clinic Information</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">Tell us about your clinic.</p>
                        </div>
                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="space-y-5">
                            {/* Clinic Name */}
                            <div className="group space-y-1.5">
                                <label htmlFor="biz-clinic-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Clinic Name <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <Building2 className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input 
                                        id="biz-clinic-name"
                                        type="text" 
                                        value={clinicName} 
                                        onChange={e => setClinicName(e.target.value)} 
                                        placeholder="Hi-Vet Veterinary Clinic" 
                                        autoComplete="organization"
                                        className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal" 
                                    />
                                </div>
                            </div>
                            {/* Clinic Phone */}
                            <div className="group space-y-1.5">
                                <label htmlFor="biz-clinic-phone" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Clinic Phone <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div 
                                    onClick={() => document.getElementById('biz-clinic-phone')?.focus()}
                                    className="relative flex items-center min-h-[52px] sm:min-h-[56px] bg-[#F7F6F2] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl overflow-hidden transition-all cursor-text"
                                >
                                    <div className="px-4 py-3.5 text-slate-700 font-bold border-r border-accent-brown/15 select-none shrink-0 text-base">+63</div>
                                    <input 
                                        id="biz-clinic-phone"
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
                                        }} 
                                        placeholder="9XX XXX XXXX" 
                                        className="flex-1 bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal" 
                                    />
                                </div>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={nextStep} 
                            className="bg-brand-dark hover:bg-brand text-white w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal mt-6"
                        >
                            <span>Continue</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>
                    </motion.div>
                );

            // ── Step 2: Owner Profile ──────────────────────────────────────────
            case 2:
                return (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Owner Information</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">Enter the clinic owner's details.</p>
                        </div>
                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="space-y-4">
                            {/* Full Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group space-y-1.5">
                                    <label htmlFor="biz-owner-first-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        First Name <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <User className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                        <input id="biz-owner-first-name" type="text" value={ownerFirstName} onChange={e => setOwnerFirstName(e.target.value)} placeholder="Juan" className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    </div>
                                </div>
                                <div className="group space-y-1.5">
                                    <label htmlFor="biz-owner-last-name" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        Last Name <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input id="biz-owner-last-name" type="text" value={ownerLastName} onChange={e => setOwnerLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group space-y-1.5">
                                    <label htmlFor="biz-owner-middle-name" className="text-sm font-bold text-accent-brown flex items-center justify-between">
                                        <span>Middle Name</span>
                                        <span className="text-xs font-normal text-slate-500">Optional</span>
                                    </label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input id="biz-owner-middle-name" type="text" value={ownerMiddleName} onChange={e => setOwnerMiddleName(e.target.value)} placeholder="Optional" className="w-full bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    </div>
                                </div>
                                <CustomDropdown
                                    label="Suffix"
                                    isOptional={true}
                                    value={ownerSuffix}
                                    onChange={setOwnerSuffix}
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group space-y-1.5">
                                    <label htmlFor="biz-owner-phone" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        Personal Phone <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <div 
                                        onClick={() => document.getElementById('biz-owner-phone')?.focus()}
                                        className={`relative flex items-center min-h-[52px] sm:min-h-[56px] bg-[#F7F6F2] border ${phoneError ? 'border-red-400' : 'border-accent-brown/15'} focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl overflow-hidden transition-all cursor-text`}
                                    >
                                        <div className="px-4 py-3.5 text-slate-700 font-bold border-r border-accent-brown/15 select-none shrink-0 text-base">+63</div>
                                        <input 
                                            id="biz-owner-phone"
                                            type="tel" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            autoComplete="tel-national"
                                            value={ownerPhone} 
                                            maxLength={10}
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.startsWith('0')) val = val.substring(1);
                                                if (val.length > 0 && !val.startsWith('9')) val = '';
                                                setOwnerPhone(val.slice(0, 10));
                                                if (phoneError) setPhoneError(null);
                                            }} 
                                            onBlur={handlePhoneBlur}
                                            aria-invalid={!!phoneError}
                                            aria-describedby={phoneError ? "biz-owner-phone-error" : undefined}
                                            placeholder="9XX XXX XXXX" 
                                            className="flex-1 bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal" 
                                        />
                                    </div>
                                    {phoneError && (
                                        <p id="biz-owner-phone-error" role="alert" aria-live="polite" className="text-xs font-bold text-red-500 flex items-center gap-1.5 mt-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            {phoneError}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <CustomDropdown
                                        label="Sex / Gender"
                                        isRequired={true}
                                        value={ownerGender}
                                        onChange={setOwnerGender}
                                        options={[
                                            { label: 'Male', value: 'Male' },
                                            { label: 'Female', value: 'Female' },
                                            { label: 'Other', value: 'Other' },
                                            { label: 'Rather not say', value: 'Rather not say' }
                                        ]}
                                        placeholder="Select"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <CustomDatePicker
                                    mode="person birthday"
                                    label="Birthdate"
                                    isRequired={true}
                                    value={ownerBirthday}
                                    onChange={setOwnerBirthday}
                                />
                                <div className="group space-y-1.5">
                                    <label className="text-sm font-bold text-accent-brown block">Age</label>
                                    <div className="w-full min-h-[52px] sm:min-h-[56px] bg-[#F7F6F2] flex items-center px-4 rounded-2xl text-accent-brown font-bold text-base border border-accent-brown/15 select-none">
                                        {calculateAge(ownerBirthday) || '--'}
                                    </div>
                                </div>
                            </div>

                            {/* Home Address */}
                            <div className="group space-y-1.5">
                                <label className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Home Address <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <MapPin className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark shrink-0 ml-4 mr-3 z-10 transition-colors" />
                                    <AddressAutocomplete
                                        onAddressSelect={(_addr, _components, geometry, granular) => {
                                            if (granular) {
                                                setOwnerHouseNumber(granular.houseNumber);
                                                setOwnerStreet(granular.street);
                                                setOwnerSubdivision(granular.subdivision);
                                                setOwnerBarangay(granular.barangay);
                                                setOwnerCity(granular.city);
                                                setOwnerProvince(granular.province);
                                                setOwnerZip(granular.zip);
                                                const composed = [granular.houseNumber, granular.street, granular.subdivision, granular.barangay, granular.city, granular.province, granular.zip].filter(Boolean).join(', ');
                                                setOwnerHomeAddress(composed);
                                            } else {
                                                setOwnerHomeAddress(_addr);
                                            }
                                            setOwnerLandmark(_addr);
                                            if (geometry) {
                                                setOwnerLat(geometry.lat);
                                                setOwnerLng(geometry.lng);
                                            }
                                        }}
                                        defaultValue={[ownerHouseNumber, ownerStreet, ownerSubdivision, ownerBarangay, ownerCity, ownerProvince, ownerZip].filter(Boolean).join(', ')}
                                        initialGranular={{
                                            houseNumber: ownerHouseNumber,
                                            blockNumber: '',
                                            street: ownerStreet,
                                            subdivision: ownerSubdivision,
                                            sitio: '',
                                            barangay: ownerBarangay,
                                            city: ownerCity,
                                            district: '',
                                            province: ownerProvince,
                                            zip: ownerZip,
                                            region: 'Philippines'
                                        }}
                                        initialLocation={ownerLat && ownerLng ? { lat: ownerLat, lng: ownerLng } : undefined}
                                        placeholder="123 Rizal St., Quezon City"
                                        className="!pl-0 !bg-transparent !border-0 !shadow-none !rounded-2xl !py-3.5 text-base font-bold text-accent-brown pr-4 placeholder:text-slate-500"
                                    />
                                </div>
                            </div>
                            
                            {/* Government ID Upload */}
                            <FileUploadField
                                label="Valid Government ID"
                                required
                                hint="Upload a clear photo or copy of your valid government ID."
                                value={ownerIdDocument}
                                onChange={setOwnerIdDocument}
                            />
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 pt-4">
                            <button type="button" onClick={prevStep} className="flex-1 min-h-[52px] sm:min-h-[56px] px-4 rounded-2xl border border-accent-brown/20 text-slate-700 hover:bg-accent-peach/20 hover:text-accent-brown font-bold text-base transition-colors flex items-center justify-center gap-2 not-italic tracking-normal cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button type="button" onClick={nextStep} className="flex-[2] min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl bg-brand-dark hover:bg-brand text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal">
                                <span>Continue</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 3: Clinic Location ────────────────────────────────────────
            case 3:
                return (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Clinic Address</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">Where is your clinic located?</p>
                        </div>
                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="group space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                        Clinic Address <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                    </label>
                                    <span className="text-xs font-bold text-brand-dark flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-brand-dark animate-pulse" />
                                        Pin on Map
                                    </span>
                                </div>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all shadow-inner bg-[#F7F6F2] overflow-hidden">
                                    <MapPin className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark shrink-0 ml-4 mr-3 z-10 transition-colors" />
                                    <AddressAutocomplete 
                                        onAddressSelect={(full, components, geometry, granular) => {
                                            handleAddressComponents(full, components, geometry, granular);
                                        }}
                                        defaultValue={[clinicHouseNumber, clinicBlockNumber, clinicStreet, clinicSubdivision].filter(Boolean).join(' ')}
                                        initialLocation={clinicLat && clinicLng ? { lat: clinicLat, lng: clinicLng } : undefined}
                                        initialGranular={{
                                            houseNumber: clinicHouseNumber,
                                            blockNumber: clinicBlockNumber,
                                            street: clinicStreet,
                                            subdivision: clinicSubdivision,
                                            sitio: clinicSitio,
                                            barangay: clinicBarangay,
                                            city: clinicCity,
                                            district: clinicDistrict,
                                            province: clinicProvince,
                                            zip: clinicZip,
                                            region: clinicRegion
                                        }}
                                        placeholder="Search for your clinic address..."
                                        className="!py-3.5 !bg-transparent !border-0 !shadow-none !rounded-2xl !pl-0 text-base font-bold text-accent-brown pr-4 placeholder:text-slate-500"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Choose your clinic location on the map, or tap the pin to type your address.</p>
                            </div>

                            {/* Precise Address Confirmation */}
                            <div className="p-5 sm:p-6 bg-accent-peach/10 rounded-2xl border border-accent-brown/10 space-y-2 relative overflow-hidden">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Clinic Address</p>
                                <div className="space-y-1 relative z-10">
                                    <p className="text-base sm:text-lg font-bold text-accent-brown leading-snug">
                                        {[clinicHouseNumber, clinicBlockNumber, clinicStreet, clinicSubdivision, clinicSitio, clinicBarangay, clinicCity, clinicProvince, clinicZip].filter(Boolean).join(' ') || 'No address selected yet'}
                                    </p>
                                    {!clinicCity && <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 mt-1">Please select an address</div>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 pt-4">
                            <button type="button" onClick={prevStep} className="flex-1 min-h-[52px] sm:min-h-[56px] px-4 rounded-2xl border border-accent-brown/20 text-slate-700 hover:bg-accent-peach/20 hover:text-accent-brown font-bold text-base transition-colors flex items-center justify-center gap-2 not-italic tracking-normal cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button type="button" onClick={nextStep} className="flex-[2] min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl bg-brand-dark hover:bg-brand text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal">
                                <span>Continue</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 4: Regulatory Compliance ─────────────────────────────────
            case 4:
                return (
                    <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Clinic Permits</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">Upload your business permits to verify your clinic.</p>
                        </div>
                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* BAI Section */}
                            <div className="space-y-3.5 p-4 sm:p-5 bg-accent-peach/10 rounded-2xl border border-accent-brown/10">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-brand-dark/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                        <FileCheck className="w-5 h-5 text-brand-dark" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-accent-brown">BAI Registration <span className="text-brand-dark">*</span></p>
                                        <p className="text-xs text-slate-500 leading-normal mt-0.5">Your clinic registration with the Bureau of Animal Industry.</p>
                                    </div>
                                </div>
                                <div className="group space-y-1.5">
                                    <label htmlFor="biz-bai-number" className="text-sm font-bold text-accent-brown">Registration Number <span className="text-brand-dark">*</span></label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input id="biz-bai-number" type="text" value={baiNumber} onChange={e => setBaiNumber(e.target.value)} placeholder="BAI-REG-2024-XXXXX" className="w-full bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    </div>
                                </div>
                                <FileUploadField label="BAI Registration Document" required value={baiDocument} onChange={setBaiDocument} hint="Upload your official BAI registration certificate." />
                            </div>

                            {/* Mayor's Permit Section */}
                            <div className="space-y-3.5 p-4 sm:p-5 bg-accent-peach/10 rounded-2xl border border-accent-brown/10">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-brand-dark/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                        <Landmark className="w-5 h-5 text-brand-dark" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-accent-brown">Mayor's Permit <span className="text-brand-dark">*</span></p>
                                        <p className="text-xs text-slate-500 leading-normal mt-0.5">Your business permit from your city or town.</p>
                                    </div>
                                </div>
                                <div className="group space-y-1.5">
                                    <label htmlFor="biz-mayors-permit" className="text-sm font-bold text-accent-brown">Permit Number <span className="text-brand-dark">*</span></label>
                                    <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                        <input id="biz-mayors-permit" type="text" value={mayorsPermit} onChange={e => setMayorsPermit(e.target.value)} placeholder="Permit No. 2024-XXXXXX" className="w-full bg-transparent py-3.5 px-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    </div>
                                </div>
                                <FileUploadField label="Mayor's Permit Document" required value={mayorsDocument} onChange={setMayorsDocument} hint="Upload a copy of your current Mayor's Business Permit." />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 pt-4">
                            <button type="button" onClick={prevStep} className="flex-1 min-h-[52px] sm:min-h-[56px] px-4 rounded-2xl border border-accent-brown/20 text-slate-700 hover:bg-accent-peach/20 hover:text-accent-brown font-bold text-base transition-colors flex items-center justify-center gap-2 not-italic tracking-normal cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button type="button" onClick={nextStep} className="flex-[2] min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl bg-brand-dark hover:bg-brand text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal">
                                <span>Continue</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 5: Account Credentials ───────────────────────────────────
            case 5:
                return (
                    <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Account Password</h1>
                            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">Set a secure password for your clinic account.</p>
                        </div>
                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="group space-y-1.5">
                                <label htmlFor="biz-email" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Email Address <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className={`relative flex items-center min-h-[52px] sm:min-h-[56px] border ${emailError ? 'border-red-400' : 'border-accent-brown/15'} focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden`}>
                                    <Mail className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input 
                                        id="biz-email"
                                        type="email" 
                                        value={email} 
                                        onChange={e => {
                                            setEmail(e.target.value);
                                            if (emailError) setEmailError(null);
                                        }} 
                                        onBlur={handleEmailBlur}
                                        aria-invalid={!!emailError}
                                        aria-describedby={emailError ? "biz-email-error" : undefined}
                                        placeholder="admin@happy-paws.com" 
                                        className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" 
                                    />
                                </div>
                                {emailError && (
                                    <p id="biz-email-error" role="alert" aria-live="polite" className="text-xs font-bold text-red-500 flex items-center gap-1.5 mt-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        {emailError}
                                    </p>
                                )}
                            </div>
                            <div className="group space-y-1.5">
                                <label htmlFor="biz-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Password <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input id="biz-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-3.5 pl-0 pr-12 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-dark transition-colors cursor-pointer">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && <div className="pt-1"><PasswordStrength password={password} /></div>}
                            </div>
                            <div className="group space-y-1.5">
                                <label htmlFor="biz-confirm-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    Confirm Password <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                    <ShieldCheck className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                    <input id="biz-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-3.5 pl-0 pr-12 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-dark transition-colors cursor-pointer">
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p role="alert" className="text-xs font-bold text-red-500 flex items-center gap-1.5 mt-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        Passwords do not match
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 pt-4">
                            <button type="button" onClick={prevStep} className="flex-1 min-h-[52px] sm:min-h-[56px] px-4 rounded-2xl border border-accent-brown/20 text-slate-700 hover:bg-accent-peach/20 hover:text-accent-brown font-bold text-base transition-colors flex items-center justify-center gap-2 not-italic tracking-normal cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button type="submit" disabled={loading} className="flex-[2] min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl bg-brand-dark hover:bg-brand text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none group cursor-pointer not-italic tracking-normal">
                                <span>{loading ? 'Sending Code...' : 'Continue'}</span>
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 6: OTP ───────────────────────────────────────────────────
            case 6:
                return (
                    <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-3">
                            <div className="w-14 h-14 bg-brand/10 text-brand-dark rounded-2xl flex items-center justify-center shadow-xs">
                                <MailCheck className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Verify Email</h1>
                                <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                                    We sent a 6-digit code to <span className="text-accent-brown font-bold">{email}</span>
                                </p>
                            </div>
                        </div>
                        {error && (
                            <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}
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
                                    onChange={(e) => handleOtpChange(idx, e.target.value)} 
                                    onKeyDown={(e) => handleKeyDown(idx, e)} 
                                    onPaste={handlePaste} 
                                    className="w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-accent-brown bg-[#F7F6F2] rounded-2xl outline-none transition-all border border-accent-brown/15 focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20 shadow-xs" 
                                />
                            ))}
                        </div>
                        <p className="text-sm text-slate-600 flex items-center gap-2">
                            <span>Didn't get a code?</span>
                            <button type="button" onClick={handleSendOtp} disabled={countdown > 0} className="text-brand-dark font-bold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer">
                                {countdown > 0 ? `Wait ${countdown}s` : 'Resend Code'}
                            </button>
                        </p>
                        <div className="flex items-center gap-3 sm:gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 min-h-[52px] sm:min-h-[56px] px-4 rounded-2xl border border-accent-brown/20 text-slate-700 hover:bg-accent-peach/20 hover:text-accent-brown font-bold text-base transition-colors flex items-center justify-center gap-2 not-italic tracking-normal cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button type="button" onClick={handleRegister} disabled={loading} className="flex-[2] min-h-[52px] sm:min-h-[56px] px-6 rounded-2xl bg-brand-dark hover:bg-brand text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none group cursor-pointer not-italic tracking-normal">
                                <span>{loading ? 'Checking Code...' : 'Create Account'}</span>
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
                            </button>
                        </div>
                    </motion.div>
                );

            default: return null;
        }
    };

    // ─── Pending Approval Screen ─────────────────────────────────────────────────
    if (pendingApproval) {
        return (
            <div className="min-h-[100dvh] w-full bg-white flex font-brand overflow-x-hidden">
                <div className="hidden lg:block w-1/2 min-h-[100dvh] relative overflow-hidden group shrink-0">
                    <div className="absolute inset-0 z-0">
                        <img src={loginHero} alt="Veterinary clinic" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                        <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                        <div className="space-y-12">
                            <Link to="/" className="inline-flex items-center gap-4 group/back">
                                <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet for Clinics</span>
                            </Link>
                            <div className="space-y-8 max-w-lg">
                                <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Clinic Hub</div>
                                <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">Run Your Clinic <br /><span className="text-brand-dark italic font-outfit">Easily.</span></h1>
                                <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Sign up to manage bookings, track stock, and see your clinic reports.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-y-auto">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-8 my-auto py-8">
                        <div className="w-20 h-20 bg-brand/10 text-brand-dark rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-brand/5">
                            <Clock className="w-10 h-10 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">Application Under Review</h2>
                            <p className="text-sm text-slate-600 font-normal">Application submitted for <span className="text-accent-brown font-bold not-italic">{registeredEmail}</span></p>
                        </div>
                        <div className="bg-accent-peach/10 p-6 sm:p-8 rounded-2xl border border-accent-brown/10 text-left space-y-5">
                            <div className="flex gap-3.5">
                                <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                                <p className="text-sm text-slate-700 leading-relaxed">We will check your <span className="font-bold text-accent-brown">BAI Registration</span> and <span className="font-bold text-accent-brown">Mayor's Permit</span> within 1 to 2 business days.</p>
                            </div>
                            <div className="flex gap-3.5 opacity-60">
                                <div className="w-6 h-6 rounded-full bg-brand-dark/20 text-accent-brown/60 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                                <p className="text-sm text-slate-600 leading-relaxed">Once approved, we will send an email so you can log in to your clinic account.</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/for-clinics')} className="bg-brand-dark hover:bg-brand text-white w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base shadow-md shadow-brand-dark/20 transition-all cursor-pointer">Back to Clinic Page</button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] w-full bg-white flex font-brand overflow-x-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 min-h-[100dvh] relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt="Veterinary clinic" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                    <div className="space-y-12">
                        <Link to="/for-clinics" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet for Clinics</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Clinic Hub</div>
                            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">Run Your Clinic <br /><span className="text-brand-dark italic font-outfit">Easily.</span></h1>
                            <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Sign up to manage bookings, track stock, and see your clinic reports.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 w-fit">
                        <p className="text-xs font-black text-white uppercase tracking-widest italic">Step {step} of 6</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Shared Page Shell (Phone, Tablet, Desktop) */}
            <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col justify-between py-6 sm:py-10 px-5 xs:px-6 sm:px-10 lg:px-12 bg-white overflow-y-auto">
                <div className="w-full max-w-[540px] mx-auto flex-1 flex flex-col justify-center my-auto py-2">
                    {/* Top Row: Icon Tile on Left, Login Link on Right */}
                    <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
                        <Link 
                            to="/for-clinics" 
                            title="Back to Hi-Vet for Clinics" 
                            aria-label="Back to Hi-Vet for Clinics" 
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-dark/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <Building2 className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                        </Link>
                        <Link 
                            to="/login/business" 
                            className="min-h-[44px] inline-flex items-center text-sm sm:text-base font-bold text-brand-dark hover:text-accent-brown transition-colors underline underline-offset-4 tracking-normal not-italic"
                        >
                            Clinic Log In Instead
                        </Link>
                    </div>

                    {/* Progress Bar (6 Equal Steps) */}
                    <div 
                        role="progressbar" 
                        aria-valuenow={step} 
                        aria-valuemin={1} 
                        aria-valuemax={6} 
                        aria-label={`Step ${step} of 6`}
                        className="w-full flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8"
                    >
                        {[1, 2, 3, 4, 5, 6].map(i => (
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
                            to="/for-clinics" 
                            className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-slate-600 hover:text-brand-dark transition-colors tracking-normal not-italic"
                        >
                            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Back to Clinic Page</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessRegister;
