import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, Mail, Lock, ArrowRight, ArrowLeft,
    ShieldCheck, MailCheck, Building2, Eye, EyeOff,
    FileCheck, Landmark, User, MapPin, Upload, X, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useAuth } from '../context/AuthContext';

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
            <div className="flex items-center justify-between pl-3">
                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em]">
                    {label} {required && <span className="text-brand-dark">*</span>}
                </label>
                {!required && <span className="text-[9px] font-bold text-accent-brown/30 italic">Optional</span>}
            </div>
            {value ? (
                <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-[1.5rem] px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-green-700 truncate">{value.name}</p>
                        <p className="text-[9px] text-green-500 font-bold">{(value.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => onChange(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors shrink-0">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-accent-brown/20 hover:border-brand/40 hover:bg-accent-peach/10 rounded-[1.5rem] py-5 px-4 transition-all group"
                >
                    <Upload className="w-5 h-5 text-accent-brown/30 group-hover:text-brand-dark transition-colors" />
                    <span className="text-[10px] font-black text-accent-brown/40 group-hover:text-accent-brown transition-colors uppercase tracking-widest">Click to Upload</span>
                    <span className="text-[9px] text-accent-brown/30 font-medium">PDF, JPG, or PNG · Max 5MB</span>
                </button>
            )}
            <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
            {hint && <p className="text-[9px] text-accent-brown/40 font-medium pl-3">{hint}</p>}
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
            if (!ownerFirstName || !ownerLastName) return setError('Owner full name is required.');
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
                            <h3 className="text-xl font-black text-accent-brown tracking-tighter">Clinic Information</h3>
                            <p className="text-xs text-accent-brown/50 font-medium italic">Tell us about your veterinary practice.</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
                        <div className="space-y-4">
                            {/* Clinic Name */}
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Clinic Name <span className="text-brand-dark">*</span></label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Hi-Vet Veterinary Clinic" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-4 pl-11 pr-4 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                </div>
                            </div>
                            {/* Phone */}
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Phone / Contact Number <span className="text-brand-dark">*</span></label>
                                <div className="relative flex items-center bg-accent-peach/20 border-2 border-transparent focus-within:border-brand/30 focus-within:bg-white rounded-[2rem] transition-all overflow-hidden">
                                    <div className="flex items-center gap-2 pl-5 pr-3 shrink-0 text-accent-brown font-black text-sm border-r border-accent-brown/10">
                                        <Phone className="w-4 h-4 text-accent-brown/30" />
                                        <span>+63</span>
                                    </div>
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
                                        className="flex-1 bg-transparent py-4 pl-4 pr-6 text-accent-brown font-semibold outline-none text-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={nextStep} className="btn-primary w-full group flex items-center justify-center gap-3 h-14 text-xs">
                            Continue to Address Validation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                );

            // ── Step 2: Owner Profile ──────────────────────────────────────────
            case 2:
                return (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-accent-brown tracking-tighter">Clinic Owner Profile</h3>
                            <p className="text-xs text-accent-brown/50 font-medium italic">Personal information of the clinic owner.</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
                        <div className="space-y-4">
                            {/* Full Name */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">First Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={ownerFirstName} onChange={e => setOwnerFirstName(e.target.value)} placeholder="Maria" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[1.5rem] py-3 pl-9 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Last Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative">
                                        <input type="text" value={ownerLastName} onChange={e => setOwnerLastName(e.target.value)} placeholder="Santos" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[1.5rem] py-3 pl-4 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                    </div>
                                </div>
                            </div>
                            {/* Middle Name & Suffix */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Middle Name <span className="text-accent-brown/30 text-[9px] normal-case tracking-normal font-bold italic">Optional</span></label>
                                    <input type="text" value={ownerMiddleName} onChange={e => setOwnerMiddleName(e.target.value)} placeholder="Reyes" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[1.5rem] py-3 px-4 text-accent-brown font-semibold outline-none transition-all text-sm" />
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
                                        { label: 'III', value: 'III' },
                                        { label: 'IV', value: 'IV' }
                                    ]}
                                    placeholder="None"
                                />
                            </div>
                            {/* Home Address */}
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Home Address <span className="text-brand-dark">*</span></label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark z-10 transition-colors" />
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
                                        className="pl-11"
                                    />
                                </div>
                                {ownerHomeAddress && (
                                    <p className="text-[10px] font-semibold text-accent-brown/50 pl-3 leading-relaxed">
                                        📍 {ownerLandmark || ownerHomeAddress}
                                    </p>
                                )}
                            </div>
                            {/* Government ID Upload */}
                            <FileUploadField
                                label="Government-Issued ID"
                                required
                                hint="Upload a clear photo or scan of any valid government ID (PhilSys, Passport, Driver's License, etc.)."
                                value={ownerIdDocument}
                                onChange={setOwnerIdDocument}
                            />
                            {/* Personal Contact */}
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Personal Contact Number <span className="text-brand-dark">*</span></label>
                                <div className="relative flex items-center bg-accent-peach/20 border-2 border-transparent focus-within:border-brand/30 focus-within:bg-white rounded-[2rem] transition-all overflow-hidden">
                                    <div className="flex items-center gap-2 pl-5 pr-3 shrink-0 text-accent-brown font-black text-sm border-r border-accent-brown/10">
                                        <Phone className="w-4 h-4 text-accent-brown/30" /><span>+63</span>
                                    </div>
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
                                        className="flex-1 bg-transparent py-4 pl-4 pr-6 text-accent-brown font-semibold outline-none text-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={prevStep} className="flex-1 py-4 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <button type="button" onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-2 h-14 text-xs">Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
                        </div>
                    </motion.div>
                );

            // ── Step 3: Clinic Location ────────────────────────────────────────
            case 3:
                return (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-accent-brown tracking-tighter">Clinic Location</h3>
                            <p className="text-xs text-accent-brown/50 font-medium italic">Physical address of your veterinary clinic.</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                            <div className="group space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Precise Clinic Location <span className="text-brand-dark">*</span></label>
                                    <span className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest italic flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-brand-dark animate-pulse" />
                                        Mark Landmark on Map
                                    </span>
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark z-10 transition-colors" />
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
                                        placeholder="Search or pick on map..."
                                        className="!py-4 !rounded-2xl shadow-xl border-2 border-transparent focus:border-brand/30 bg-accent-peach/5 pl-11"
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-accent-brown/30 uppercase tracking-widest pl-3 italic">Click the PIN icon to manually enter details like House No., Barangay, etc.</p>
                            </div>

                            {/* Precise Address Confirmation */}
                            <div className="p-6 bg-accent-peach/5 rounded-[2rem] border border-accent-peach/10 space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Current Clinic Address</p>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-accent-brown leading-relaxed capitalize">
                                        {[clinicHouseNumber, clinicBlockNumber, clinicStreet, clinicSubdivision, clinicSitio, clinicBarangay, clinicCity, clinicProvince, clinicZip].filter(Boolean).join(' ')}
                                    </p>
                                    {!clinicCity && <p className="text-[9px] font-black text-red-400 uppercase tracking-widest italic">Location not yet finalized</p>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={prevStep} className="flex-1 py-4 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <button type="button" onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-2 h-14 text-xs">Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
                        </div>
                    </motion.div>
                );

            // ── Step 4: Regulatory Compliance ─────────────────────────────────
            case 4:
                return (
                    <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-accent-brown tracking-tighter">Regulatory Compliance</h3>
                            <p className="text-xs text-accent-brown/50 font-medium italic">Required documents for professional clinical operation in the Philippines.</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}

                        {/* BAI Section */}
                        <div className="space-y-3 p-4 bg-accent-peach/10 rounded-2xl border border-accent-brown/5">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-brand/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                    <FileCheck className="w-4 h-4 text-brand-dark" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-accent-brown">BAI Animal Welfare Registration <span className="text-brand-dark">*</span></p>
                                    <p className="text-[9px] text-accent-brown/50 font-medium mt-0.5">Mandatory registration with the Bureau of Animal Industry for all veterinary clinics.</p>
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-1">Registration Number <span className="text-brand-dark">*</span></label>
                                <input type="text" value={baiNumber} onChange={e => setBaiNumber(e.target.value)} placeholder="BAI-REG-2024-XXXXX" className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-[1.5rem] py-3 px-4 text-accent-brown font-semibold outline-none transition-all text-sm" />
                            </div>
                            <FileUploadField label="BAI Registration Document" required value={baiDocument} onChange={setBaiDocument} hint="Upload your official BAI registration certificate." />
                        </div>

                        {/* Mayor's Permit Section */}
                        <div className="space-y-3 p-4 bg-accent-peach/10 rounded-2xl border border-accent-brown/5">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-brand/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                    <Landmark className="w-4 h-4 text-brand-dark" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-accent-brown">Mayor's Business Permit <span className="text-brand-dark">*</span></p>
                                    <p className="text-[9px] text-accent-brown/50 font-medium mt-0.5">Validated permit to legally operate a business within the city or municipality.</p>
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-1">Permit Number <span className="text-brand-dark">*</span></label>
                                <input type="text" value={mayorsPermit} onChange={e => setMayorsPermit(e.target.value)} placeholder="Permit No. 2024-XXXXXX" className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-[1.5rem] py-3 px-4 text-accent-brown font-semibold outline-none transition-all text-sm" />
                            </div>
                            <FileUploadField label="Mayor's Permit Document" required value={mayorsDocument} onChange={setMayorsDocument} hint="Upload a scanned copy of your current Mayor's Business Permit." />
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={prevStep} className="flex-1 py-4 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <button type="button" onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-2 h-14 text-xs">Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
                        </div>
                    </motion.div>
                );

            // ── Step 5: Account Credentials ───────────────────────────────────
            case 5:
                return (
                    <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-accent-brown tracking-tighter">Account Credentials</h3>
                            <p className="text-xs text-accent-brown/50 font-medium italic">Secure access for your business portal.</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Business Email Address <span className="text-brand-dark">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@happy-paws.com" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-14 pr-6 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Password <span className="text-brand-dark">*</span></label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-14 pr-14 text-accent-brown font-semibold outline-none transition-all" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && <div className="px-4"><PasswordStrength password={password} /></div>}
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Confirm Password <span className="text-brand-dark">*</span></label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-14 pr-14 text-accent-brown font-semibold outline-none transition-all" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors">
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && <p className="text-red-500 text-xs font-bold pl-4">Passwords do not match</p>}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={prevStep} className="flex-1 py-4 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <button type="submit" disabled={loading} className="btn-primary flex-[2] group flex items-center justify-center gap-2 h-14 text-xs disabled:opacity-50">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Sending Code...</span>
                                    </>
                                ) : (
                                    <>
                                        Verify Email <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                );

            // ── Step 6: OTP ───────────────────────────────────────────────────
            case 6:
                return (
                    <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-4">
                            <div className="w-14 h-14 bg-brand/10 text-brand-dark rounded-full flex items-center justify-center">
                                <MailCheck className="w-7 h-7" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-accent-brown tracking-tighter">Email Verification</h3>
                                <p className="text-xs text-accent-brown/50 font-medium italic">
                                    We've sent a 6-digit code to <br />
                                    <span className="text-accent-brown font-bold not-italic">{email}</span>
                                </p>
                            </div>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl text-center">{error}</div>}
                        <div className="flex justify-between gap-2">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit}
                                    onChange={e => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={e => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    className="w-10 xs:w-12 md:w-14 h-14 xs:h-16 text-center text-2xl font-black text-brand-dark bg-accent-peach/20 border-2 border-brand-dark focus:border-brand-dark focus:bg-white rounded-2xl outline-none transition-all"
                                />
                            ))}
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-accent-brown/40 ml-1">
                                No code yet?{' '}
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading || countdown > 0}
                                    className="text-brand-dark hover:underline underline-offset-4 disabled:opacity-50"
                                >
                                    {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                                </button>
                            </p>
                            <div className="flex gap-3">
                                <button onClick={prevStep} disabled={loading} className="flex-1 py-4 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50">Review</button>
                                <button onClick={handleRegister} disabled={loading} className="btn-primary flex-[2] h-14 text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {loading ? 'Submitting...' : 'Complete Registration'}
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
            <div className="min-h-screen bg-accent-cream flex items-center justify-center p-6 select-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl shadow-brand/10 border border-brand/5 overflow-hidden"
                >
                    <div className="bg-gradient-to-br from-accent-peach to-brand/10 px-10 py-10 text-center flex flex-col items-center gap-4 border-b border-brand/5">
                        <div className="w-20 h-20 bg-white rounded-[1.5rem] shadow-lg shadow-brand/20 flex items-center justify-center">
                            <Logo className="w-10 h-10" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em] mb-1">Hi-Vet Partners</p>
                            <h1 className="text-2xl font-black text-accent-brown tracking-tight">Application Under Review</h1>
                            <p className="text-xs text-accent-brown/50 font-medium mt-1">Your clinic registration has been submitted successfully.</p>
                        </div>
                    </div>
                    <div className="px-10 py-8 space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-orange-700">Pending Compliance Verification</p>
                                <p className="text-xs text-orange-600/70 font-medium mt-0.5">Our team is reviewing your submitted documents. This typically takes <strong>1–3 business days</strong>.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-accent-peach/20 rounded-2xl">
                            <Mail className="w-4 h-4 text-brand-dark shrink-0" />
                            <div>
                                <p className="text-[9px] font-black text-accent-brown/40 uppercase tracking-widest">Confirmation Sent To</p>
                                <p className="text-sm font-black text-accent-brown">{registeredEmail}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">What Happens Next</p>
                            {[
                                { icon: <ShieldCheck className="w-4 h-4" />, label: 'Document Verification', desc: "Admin reviews your BAI, Mayor's Permit & Government ID", done: true },
                                { icon: <MailCheck className="w-4 h-4" />, label: 'Approval Notification', desc: "You'll receive an email once your account is approved", done: false },
                                { icon: <Building2 className="w-4 h-4" />, label: 'Platform Access Granted', desc: 'Log in and start managing your clinic on Hi-Vet', done: false },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.done ? 'bg-green-50 border border-green-100' : 'bg-accent-peach/10 border border-accent-brown/5'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.done ? 'bg-green-100 text-green-600' : 'bg-accent-peach/30 text-accent-brown/40'}`}>{item.icon}</div>
                                    <div className="flex-1">
                                        <p className={`text-xs font-black ${item.done ? 'text-green-700' : 'text-accent-brown/60'}`}>{item.label}</p>
                                        <p className="text-[10px] text-accent-brown/40 font-medium">{item.desc}</p>
                                    </div>
                                    {item.done && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Link to="/login/business" className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest">
                                <ArrowRight className="w-4 h-4" /> Go to Partner Login
                            </Link>
                            <Link to="/" className="text-center text-[10px] text-accent-brown/40 font-black uppercase tracking-widest hover:text-accent-brown transition-colors py-2">
                                Return to Homepage
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-accent-cream flex items-center justify-center p-4 xs:p-6 select-none relative py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-6xl w-full grid md:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl shadow-brand/10 border border-brand/5 overflow-hidden relative z-10"
            >
                {/* Left Hero */}
                <div className="hidden md:flex flex-col justify-between p-14 bg-accent-peach/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand/5" />
                    <div className="relative z-10">
                        <Link to="/for-clinics" className="flex items-center gap-3 mb-10 hover:scale-105 transition-transform w-fit">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-accent-brown">Hi-Vet Partners</span>
                        </Link>
                        <div className="space-y-4 max-w-xs">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Professional <br /><span className="text-brand-dark">Clinic Registration</span>
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed text-sm">
                                Join our network of verified veterinary clinics. Complete your regulatory compliance to get full platform access.
                            </p>
                        </div>
                    </div>

                    {/* Step List */}
                    <div className="relative z-10 space-y-2">
                        {stepLabels.map((label, i) => (
                            <div key={i} className={`flex items-center gap-3 transition-all ${step === i + 1 ? 'opacity-100' : step > i + 1 ? 'opacity-50' : 'opacity-30'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${step === i + 1 ? 'bg-brand-dark text-white shadow-md' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-accent-brown/10 text-accent-brown/40'}`}>
                                    {step > i + 1 ? '✓' : i + 1}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${step === i + 1 ? 'text-accent-brown' : 'text-accent-brown/40'}`}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Form */}
                <div className="p-6 xs:p-10 md:p-14 flex flex-col justify-center overflow-y-auto max-h-screen">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step > i ? 'bg-brand-dark' : 'bg-accent-brown/10'} ${step === i + 1 ? 'w-8' : 'w-3'}`} />
                            ))}
                        </div>
                        <Link to="/login/business" className="text-[10px] font-black text-brand-dark hover:text-brand transition-colors uppercase tracking-[0.2em] border-b-2 border-brand/20 pb-0.5">
                            Partner Login
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </form>

                    <div className="mt-10 text-center">
                        <Link to="/for-clinics" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Building2 className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" /> Back to Landing
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default BusinessRegister;
