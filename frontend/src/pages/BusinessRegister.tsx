import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, ArrowRight, ChevronLeft,
    ShieldCheck, MailCheck, Building2, Eye, EyeOff,
    FileCheck, Landmark, User, MapPin, Upload, X, CheckCircle2, Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useAuth } from '../context/AuthContext';
import loginHero from '../assets/login_hero_landscape.png';

const calculateAge = (birthday: string) => {
    if (!birthday) return '';
    try {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age.toString() : '0';
    } catch (e) { return ''; }
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
        <div className="space-y-2">
            <div className="flex items-center justify-between pl-6">
                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] italic">
                    {label} {required && <span className="text-brand-dark">*</span>}
                </label>
                {!required && <span className="text-[9px] font-black text-accent-brown/20 italic uppercase tracking-widest">Optional</span>}
            </div>
            {value ? (
                <div className="flex items-center gap-4 bg-green-50 border border-green-100 rounded-[2rem] px-6 py-4 shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-green-700 truncate italic">{value.name}</p>
                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">{(value.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => onChange(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors shrink-0">
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
                        <Upload className="w-6 h-6 text-accent-brown/20 group-hover:text-brand-dark transition-colors" />
                    </div>
                    <div className="text-center">
                        <span className="block text-[10px] font-black text-accent-brown uppercase tracking-[0.3em] group-hover:text-brand-dark transition-colors italic">Initialize Upload</span>
                        <span className="block text-[9px] text-accent-brown/30 font-bold uppercase tracking-widest mt-1 italic">PDF, JPG, or PNG · Max 5MB</span>
                    </div>
                </button>
            )}
            <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
            {hint && <p className="text-[9px] font-black text-accent-brown/20 uppercase tracking-widest pl-8 italic leading-relaxed">{hint}</p>}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const BusinessRegister = () => {
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 6;
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
            if (!clinicName) return setError('Clinic Name is required.');
            if (phone.length !== 10 || !phone.startsWith('9')) {
                return setError('Please enter a valid 10-digit PH mobile number starting with 9.');
            }
            setStep(2);
        } else if (step === 2) {
            if (!ownerFirstName || !ownerLastName || !ownerBirthday || !ownerGender) return setError('Owner full name, birthdate, and sex are required.');
            if (!ownerHomeAddress) return setError('Owner home address is required.');
            if (ownerPhone.length !== 10 || !ownerPhone.startsWith('9')) {
                return setError('Please enter a valid 10-digit personal contact number starting with 9.');
            }
            setStep(3);
        } else if (step === 3) {
            // Remove strict city/province check. Allow progression if some location data is present.
            const hasLocation = clinicLat || clinicCity || clinicProvince || clinicBarangay || clinicStreet;
            if (!hasLocation) return setError('Please select a clinic location from the map or search bar.');
            setStep(4);
        } else if (step === 4) {
            if (!baiNumber || !baiDocument) return setError('BAI Animal Welfare Registration number and document are required.');
            if (!mayorsPermit || !mayorsDocument) return setError("Mayor's Business Permit number and document are required.");
            setStep(5);
        } else if (step === 5) {
            if (!email) return setError('Email is required.');
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
            const res = await fetch('http://localhost:8000/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(6);
                setCountdown(60);
            } else {
                setError(data.detail || 'Failed to send verification email.');
            }
        } catch {
            setError('Cannot reach the server. Please make sure the backend is running (python main.py).');
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
                const r = await fetch('http://localhost:8000/api/business/upload-document', { method: 'POST', body: fd });
                const d = await r.json();
                return d.url as string;
            };

            const baiUrl = baiDocument ? await uploadDoc(baiDocument, 'bai') : '';
            const mayorsUrl = mayorsDocument ? await uploadDoc(mayorsDocument, 'mayors_permit') : '';
            const govIdUrl = ownerIdDocument ? await uploadDoc(ownerIdDocument, 'gov_id') : '';

            const res = await fetch('http://localhost:8000/api/auth/register', {
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
                setError(data.detail || 'Registration failed. Please try again.');
            }
        } catch {
            setError('An error occurred during registration.');
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
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Clinic Information</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Tell us about your veterinary practice.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <div className="space-y-4">
                            {/* Clinic Name */}
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Clinic Name <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <Building2 className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Hi-Vet Veterinary Clinic" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                </div>
                            </div>
                            {/* Phone */}
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Clinic Phone / Contact <span className="text-brand-dark">*</span></label>
                                <div className="relative flex items-center bg-[#F7F6F2] ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl overflow-hidden transition-all shadow-inner">
                                    <div className="pl-8 pr-5 py-5 text-accent-brown font-black border-r border-accent-brown/10 text-base opacity-20 transition-opacity group-focus-within:opacity-100">+63</div>
                                    <input 
                                        type="tel" 
                                        value={phone} 
                                        maxLength={10}
                                        onChange={e => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val.startsWith('0')) val = val.substring(1);
                                            if (val.length > 0 && !val.startsWith('9')) val = '';
                                            setPhone(val.slice(0, 10));
                                        }} 
                                        placeholder="9XX XXX XXXX" 
                                        className="flex-1 bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={nextStep} className="bg-brand-dark text-white w-full py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:shadow-2xl transition-all group shadow-xl italic">
                            Validate Clinic Identity <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                );

            // ── Step 2: Owner Profile ──────────────────────────────────────────
            case 2:
                return (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Owner Identity</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Identify the primary clinic representative.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <div className="space-y-4 max-h-[55vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                            {/* Full Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">First Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <User className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={ownerFirstName} onChange={e => setOwnerFirstName(e.target.value)} placeholder="Juan" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Last Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={ownerLastName} onChange={e => setOwnerLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Middle Name <span className="text-[11px] lowercase opacity-50 font-bold italic not-uppercase tracking-normal">(Optional)</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={ownerMiddleName} onChange={e => setOwnerMiddleName(e.target.value)} placeholder="Optional" className="w-full bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" />
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Personal Phone <span className="text-brand-dark">*</span></label>
                                    <div className="relative flex items-center bg-[#F7F6F2] ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl overflow-hidden transition-all shadow-inner">
                                        <div className="pl-6 pr-4 py-5 text-accent-brown font-black border-r border-accent-brown/10 text-sm opacity-20 transition-opacity group-focus-within:opacity-100">+63</div>
                                        <input 
                                            type="tel" 
                                            value={ownerPhone} 
                                            maxLength={10}
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.startsWith('0')) val = val.substring(1);
                                                if (val.length > 0 && !val.startsWith('9')) val = '';
                                                setOwnerPhone(val.slice(0, 10));
                                            }} 
                                            placeholder="9XX XXX XXXX" 
                                            className="flex-1 bg-transparent py-5 px-6 text-accent-brown font-bold text-base outline-none" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <CustomDropdown
                                        label="Sex / Gender"
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

                            <div className="grid grid-cols-2 gap-4">
                                <CustomDatePicker
                                    label="Birthdate"
                                    value={ownerBirthday}
                                    onChange={setOwnerBirthday}
                                />
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-accent-brown/40 block ml-1 italic">Calculated Age</label>
                                    <div className="w-full bg-[#F7F6F2] py-5 px-8 rounded-3xl text-accent-brown font-black text-xl italic opacity-50 ring-1 ring-brand-dark/5">{calculateAge(ownerBirthday) || '--'}</div>
                                </div>
                            </div>

                            {/* Home Address */}
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Residential Address <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <MapPin className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark z-10 transition-colors" />
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
                                        className="!pl-16 !bg-transparent !border-0 !shadow-none !rounded-3xl !py-5 text-base font-bold text-accent-brown"
                                    />
                                </div>
                            </div>
                            
                            {/* Government ID Upload */}
                            <FileUploadField
                                label="Official Government ID"
                                required
                                hint="Upload a clear scan of a valid government ID (Passport, License, etc.)"
                                value={ownerIdDocument}
                                onChange={setOwnerIdDocument}
                            />
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="button" onClick={nextStep} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">Next Stage <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></button>
                        </div>
                    </motion.div>
                );

            // ── Step 3: Clinic Location ────────────────────────────────────────
            case 3:
                return (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Clinic Location</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Physical address of your veterinary practice.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pr-4">
                            <div className="group space-y-3">
                                <div className="flex items-center justify-between pl-6">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] italic">Precise Hub Location <span className="text-brand-dark">*</span></label>
                                    <span className="text-[9px] font-black text-brand-dark/40 uppercase tracking-widest italic flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-dark animate-pulse" />
                                        Pinpoint on Map
                                    </span>
                                </div>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-[2.5rem] transition-all shadow-inner bg-[#F7F6F2] overflow-hidden">
                                    <MapPin className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark z-10 transition-colors" />
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
                                        placeholder="Search or designate waypoint..."
                                        className="!py-6 !bg-transparent !border-0 !shadow-none !rounded-[2.5rem] !pl-16 text-base font-bold text-accent-brown pr-4"
                                    />
                                </div>
                                <p className="text-[9px] font-black text-accent-brown/20 uppercase tracking-widest pl-8 italic leading-relaxed">Designate exact clinic entrance. Use the PIN icon to manually override details if necessary.</p>
                            </div>

                            {/* Precise Address Confirmation */}
                            <div className="p-8 bg-accent-peach/5 rounded-[2.5rem] border border-accent-peach/10 space-y-3 relative overflow-hidden group/addr">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/addr:opacity-20 transition-opacity"><Building2 className="w-16 h-16" /></div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Validated Hub Address</p>
                                <div className="space-y-2 relative z-10">
                                    <p className="text-lg font-black text-accent-brown leading-tight capitalize">
                                        {[clinicHouseNumber, clinicBlockNumber, clinicStreet, clinicSubdivision, clinicSitio, clinicBarangay, clinicCity, clinicProvince, clinicZip].filter(Boolean).join(' ')}
                                    </p>
                                    {!clinicCity && <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest italic border border-red-100">Location Incomplete</div>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-2">
                             <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="button" onClick={nextStep} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">Next Stage <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></button>
                        </div>
                    </motion.div>
                );

            // ── Step 4: Regulatory Compliance ─────────────────────────────────
            case 4:
                return (
                    <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Compliance</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Required documentation for professional clinical operation.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}

                        <div className="space-y-6 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pr-4 pb-2">
                            {/* BAI Section */}
                            <div className="space-y-4 p-6 bg-accent-peach/5 rounded-[2.5rem] border border-accent-brown/5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-brand-dark/10 rounded-2xl flex items-center justify-center shrink-0">
                                        <FileCheck className="w-5 h-5 text-brand-dark" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-accent-brown uppercase tracking-tighter">BAI Welfare Registry <span className="text-brand-dark">*</span></p>
                                        <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-widest leading-relaxed mt-1 italic">Mandatory registration with the Bureau of Animal Industry.</p>
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Registration Number <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={baiNumber} onChange={e => setBaiNumber(e.target.value)} placeholder="BAI-REG-2024-XXXXX" className="w-full bg-transparent py-4 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <FileUploadField label="BAI Registration Document" required value={baiDocument} onChange={setBaiDocument} hint="Upload official BAI registration certificate." />
                            </div>

                            {/* Mayor's Permit Section */}
                            <div className="space-y-4 p-6 bg-accent-peach/5 rounded-[2.5rem] border border-accent-brown/5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-brand-dark/10 rounded-2xl flex items-center justify-center shrink-0">
                                        <Landmark className="w-5 h-5 text-brand-dark" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-accent-brown uppercase tracking-tighter">Mayor's Operations Permit <span className="text-brand-dark">*</span></p>
                                        <p className="text-[9px] text-accent-brown/40 font-bold uppercase tracking-widest leading-relaxed mt-1 italic">Validated permit to legally operate business within municipality.</p>
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Permit Number <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={mayorsPermit} onChange={e => setMayorsPermit(e.target.value)} placeholder="Permit No. 2024-XXXXXX" className="w-full bg-transparent py-4 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <FileUploadField label="Mayor's Permit Document" required value={mayorsDocument} onChange={setMayorsDocument} hint="Upload scanned copy of current Mayor's Business Permit." />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="button" onClick={nextStep} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">Next Stage <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></button>
                        </div>
                    </motion.div>
                );

            // ── Step 5: Account Credentials ───────────────────────────────────
            case 5:
                return (
                    <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">Security</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Secure access for your partner portal.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Partner Identity <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@happy-paws.com" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Security Secret <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-14 text-accent-brown font-bold text-base outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark transition-colors">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && <div className="px-6"><PasswordStrength password={password} /></div>}
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Confirm Secret <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <ShieldCheck className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-14 text-accent-brown font-bold text-base outline-none" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark transition-colors">
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-6 mt-1 italic leading-none">Credentials do not match</p>}
                            </div>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="submit" disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic disabled:opacity-50 flex items-center justify-center gap-4">
                                {loading ? 'Authorizing...' : 'Initialize Portal'} 
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 6: OTP ───────────────────────────────────────────────────
            case 6:
                return (
                    <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
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
                                <button type="button" onClick={handleRegister} disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all italic flex items-center justify-center gap-4 group">
                                    {loading ? 'Finalizing...' : 'Initialize Portal'}
                                    {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );

            default: return null;
        }
    };

    // ─── Pending Approval Screen ─────────────────────────────────────────────────
    if (pendingApproval) {
        return (
            <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
                <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                    <div className="absolute inset-0 z-0">
                        <img src={loginHero} alt="Clinic Operations" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                        <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between p-24">
                        <div className="space-y-12">
                            <Link to="/" className="inline-flex items-center gap-4 group/back">
                                <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Partners</span>
                            </Link>
                            <div className="space-y-8 max-w-lg">
                                <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Clinic Command</div>
                                <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Partner <br /><span className="text-brand-dark italic font-outfit">Operations.</span></h1>
                                <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Access your patient CRM, real-time inventory, and business intelligence dashboard.</p>
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
                            <h2 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Under Review</h2>
                            <p className="text-sm text-accent-brown/50 font-medium italic">Application submitted for <span className="text-accent-brown font-bold not-italic font-outfit">{registeredEmail}</span></p>
                        </div>
                        <div className="bg-accent-peach/10 p-8 rounded-[2.5rem] border border-accent-brown/5 text-left space-y-6">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                                <p className="text-xs text-accent-brown/70 italic leading-relaxed">Our compliance team will verify your <span className="font-bold text-accent-brown">BAI Registration</span> and <span className="font-bold text-accent-brown">Mayor's Permit</span> within 24-48 business hours.</p>
                            </div>
                            <div className="flex gap-4 opacity-50">
                                <div className="w-6 h-6 rounded-full bg-brand-dark/20 text-accent-brown/40 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                                <p className="text-xs text-accent-brown/40 italic leading-relaxed">Once approved, you will receive an activation email with your clinic portal access link.</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/for-clinics')} className="bg-brand-dark text-white w-full py-5 rounded-full font-black text-[10px] uppercase tracking-[0.5em] shadow-xl shadow-brand-dark/20 hover:shadow-brand-dark/40 transition-all italic">Return to Landing</button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt="Clinic Operations" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-24">
                    <div className="space-y-12">
                        <Link to="/for-clinics" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Partners</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Clinic Command</div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Partner <br /><span className="text-brand-dark italic font-outfit">Operations.</span></h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Access your patient CRM, real-time inventory, and business intelligence dashboard.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">Clinic Registration Stage {step} / {TOTAL_STEPS}</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Full Screen Form */}
            <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-hidden">
                <div className="lg:hidden absolute top-8 left-12">
                    <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Building2 className="w-7 h-7" />
                    </div>
                </div>
                <div className="w-full max-w-lg flex flex-col justify-center">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'w-10 bg-brand-dark shadow-[0_0_20px_rgba(242,107,33,0.4)]' : 'w-3 bg-accent-brown/10'}`} />)}
                        </div>
                        <Link to="/login/business" className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">Partner Login Instead</Link>
                    </div>

                    <form onSubmit={handleSubmit} className="overflow-y-visible">
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-accent-brown/5">
                        <Link to="/for-clinics" className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
                            Return
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessRegister;
