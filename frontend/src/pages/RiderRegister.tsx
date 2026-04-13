import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, ArrowLeft, ChevronLeft, ShieldCheck, MailCheck, Bike, Eye, EyeOff, User,
    FileText, CheckCircle, Lock, Phone as PhoneIcon, Mail as MailIcon, MapPin, Upload, X, Clock, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../components/PasswordStrength';
import { CustomDropdown } from '../components/CustomDropdown';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useAuth } from '../context/AuthContext';
import { CustomDatePicker } from '../components/CustomDatePicker';
import loginHero from '../assets/login_hero_landscape.png';

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
            const res = await fetch('http://localhost:8000/api/business/upload-document', {
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
                        <p className="text-xs font-black text-green-700 truncate italic">Document Verified</p>
                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest leading-none">Security Gate Passed</p>
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
                        <span className="block text-[10px] font-black text-accent-brown uppercase tracking-[0.3em] group-hover:text-brand-dark transition-colors italic">{uploading ? 'Processing Data' : 'Initialize Upload'}</span>
                        <span className="block text-[9px] text-accent-brown/30 font-bold uppercase tracking-widest mt-1 italic">PDF, JPG, or PNG · Max 5MB</span>
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
                <img src={loginHero} alt="Rider Operations" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
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
                        <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Fleet Command</div>
                        <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Rider <br /><span className="text-brand-dark italic font-outfit">Operations.</span></h1>
                        <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Access your delivery logistics, real-time earnings, and route optimization dashboard.</p>
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
                    <p className="text-sm text-accent-brown/50 font-medium italic">Application submitted for <span className="text-accent-brown font-bold not-italic font-outfit">{email}</span></p>
                </div>
                <div className="bg-accent-peach/10 p-8 rounded-[2.5rem] border border-accent-brown/5 text-left space-y-6">
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                        <p className="text-xs text-accent-brown/70 italic leading-relaxed">Our compliance team will verify your <span className="font-bold text-accent-brown">NBI Clearance</span> and <span className="font-bold text-accent-brown">Driver License</span> within 24-48 business hours.</p>
                    </div>
                    <div className="flex gap-4 opacity-50">
                        <div className="w-6 h-6 rounded-full bg-brand-dark/20 text-accent-brown/40 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                        <p className="text-xs text-accent-brown/40 italic leading-relaxed">Once approved, you will receive an activation email with your rider portal access link.</p>
                    </div>
                </div>
                <button onClick={() => window.location.href = '/for-riders'} className="bg-brand-dark text-white w-full py-5 rounded-full font-black text-[10px] uppercase tracking-[0.5em] shadow-xl shadow-brand-dark/20 hover:shadow-brand-dark/40 transition-all italic">Return to Landing</button>
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
        const birthDate = new Date(bday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
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
                setStep(4);
                setCountdown(60);
            } else {
                setError(data.detail || 'Failed to send verification email');
            }
        } catch (err) {
            setError('An error occurred while sending the email.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 4) {
            handleRegister();
        } else {
            nextStep();
        }
    };

    const nextStep = () => {
        setError('');
        if (step === 1) {
            if (!firstName || !lastName || !phone || !homeCity || !birthday || !gender) {
                return setError('First & Last Name, Phone, Birthdate, Sex, and Verified Address are required');
            }
            if (phone.length !== 10 || !phone.startsWith('9')) {
                return setError('Please enter a valid 10-digit PH mobile number starting with 9.');
            }
            const age = calculateAge(birthday);
            if (age < 18) {
                return setError('Rider eligibility requires a minimum age of 18.');
            }
            if (age > 100) {
                return setError('Invalid age detected. Please verify your birthdate.');
            }
            setStep(2);
        } else if (step === 2) {
            if (vehicleType !== 'Bicycle') {
                if (!driverLicense) {
                    return setError('Driver\'s License number is required');
                }
                if (!licenseUrl || !vehicleCrUrl || !vehicleOrUrl) {
                    return setError('All vehicle documents are required');
                }
            }
            setStep(3);
        } else if (step === 3) {
            if (!nbiClearanceUrl) {
                return setError('Clearance document is required');
            }
            if (!is18Above || !hasAndroid6) {
                return setError('You must meet all requirements to proceed');
            }
            if (!email || password !== confirmPassword || password.length < 8) {
                return setError('Please check your account details');
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
        const isBicycle = vehicleType === 'Bicycle';
        try {
            const res = await fetch('http://localhost:8000/api/auth/register', { 
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
                setError(data.detail || 'Courier registration failed');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred during rider registration.');
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
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Rider Identity</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Identify yourself to join the fleet.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center text-sm">{error}</div>}
                        
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">First Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <User className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Last Name <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Middle Name <span className="text-[11px] lowercase opacity-50 font-bold italic not-uppercase tracking-normal">(Optional)</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" className="w-full bg-transparent py-5 px-8 text-accent-brown font-bold text-base outline-none" />
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

                            <div className="grid grid-cols-2 gap-4">
                                <CustomDatePicker
                                    label="Birthdate *"
                                    value={birthday}
                                    onChange={setBirthday}
                                />
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-accent-brown/40 block ml-1 italic">Age</label>
                                    <div className="w-full bg-[#F7F6F2] py-5 px-8 rounded-3xl text-accent-brown font-black text-xl italic opacity-50 ring-1 ring-brand-dark/5">{birthday ? `${calculateAge(birthday)}` : '--'}</div>
                                </div>
                            </div>

                             <div>
                                <CustomDropdown
                                    label="Sex / Gender *"
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
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Mobile Phone <span className="text-brand-dark">*</span></label>
                                <div className="relative flex items-center bg-[#F7F6F2] ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl overflow-hidden transition-all shadow-inner">
                                    <div className="pl-6 pr-4 py-5 text-accent-brown font-black border-r border-accent-brown/10 text-sm opacity-20 transition-opacity group-focus-within:opacity-100">+63</div>
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
                                        className="flex-1 bg-transparent py-5 px-6 text-accent-brown font-bold text-base outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Residential Address <span className="text-brand-dark">*</span></label>
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
                                        placeholder="123 Rizal St., Quezon City"
                                        className="!pl-16 !bg-transparent !border-0 !shadow-none !rounded-3xl !py-5 text-base font-bold text-accent-brown"
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-accent-peach/5 rounded-[2.5rem] border border-accent-peach/10 space-y-3 relative overflow-hidden group/addr">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/addr:opacity-20 transition-opacity"><User className="w-16 h-16" /></div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Validated Residence</p>
                                <div className="space-y-2 relative z-10">
                                    <p className="text-lg font-black text-accent-brown leading-tight capitalize">
                                        {[homeHouseNumber, homeBlockNumber, homeStreet, homeSubdivision, homeSitio, homeBarangay, homeCity, homeProvince, homeZip].filter(Boolean).join(' ')}
                                    </p>
                                    {!homeCity && <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest italic border border-red-100">Location Incomplete</div>}
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="bg-brand-dark text-white w-full py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">
                            Initialize Application <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Vehicle</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Requirement vary based on vehicle type.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center text-sm">{error}</div>}
                        
                        <div className="space-y-6 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                             <CustomDropdown
                                label="Fleet Category"
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
                                        <p className="text-sm font-black text-green-700 uppercase tracking-tighter">Bicycle Rider Protocol</p>
                                        <p className="text-[11px] text-green-600/80 font-bold uppercase tracking-widest leading-relaxed mt-2 italic">No Driver's License or CR/OR required for cycling partners. Skip to professional clearance.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="group space-y-2">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">License Number <span className="text-brand-dark">*</span></label>
                                        <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                            <ShieldCheck className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                            <input type="text" value={driverLicense} onChange={e => setDriverLicense(e.target.value)} placeholder="AXX-XX-XXXXXX" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                        </div>
                                    </div>
                                    <FileUploadField label="Driver's License (Class A)" icon={ShieldCheck} docType="driver_license" value={licenseUrl} onUpload={setLicenseUrl} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FileUploadField label="Certificate of Reg. (CR)" icon={FileText} docType="vehicle_cr" value={vehicleCrUrl} onUpload={setVehicleCrUrl} />
                                        <FileUploadField label="Official Receipt (OR)" icon={FileText} docType="vehicle_or" value={vehicleOrUrl} onUpload={setVehicleOrUrl} />
                                    </div>
                                </div>
                            )}
                        </div>

                         <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="flex-1 px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic flex items-center justify-center gap-3">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Back
                            </button>
                            <button type="submit" className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic flex items-center justify-center gap-4">Next Stage <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none">Gatekeeping</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Compliance and account initialization.</p>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center text-sm">{error}</div>}
                        
                        <div className="space-y-6 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar pb-2">
                             <FileUploadField label="NBI / Police Clearance" icon={ShieldCheck} docType="nbi_clearance" value={nbiClearanceUrl} onUpload={setNbiClearanceUrl} />
                             
                             <div className="space-y-4">
                                <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-green-50/50 border border-green-100">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Maturity Verified</p>
                                        <p className="text-[11px] font-bold text-green-600/70 italic uppercase tracking-widest">18+ Age Requirement Passed</p>
                                    </div>
                                </div>
                                <RequirementCheckbox label="Hardware: Android 6.0+ Host" checked={hasAndroid6} onChange={setHasAndroid6} />
                             </div>

                             <div className="space-y-6 border-t border-accent-brown/5 pt-6">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Account Identity <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <MailIcon className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rider@hi-vet.com" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group space-y-2">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Secret <span className="text-brand-dark">*</span></label>
                                        <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                            <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-12 text-accent-brown font-bold text-base outline-none" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark">
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="group space-y-2">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Confirm <span className="text-brand-dark">*</span></label>
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
                                {loading ? 'Analyzing Data...' : 'Verify Email'} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
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
                                <h3 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">Verification</h3>
                                <p className="text-sm text-accent-brown/40 font-medium italic leading-relaxed">Sent 6-digit gate code to <span className="text-accent-brown font-bold not-italic">{email}</span></p>
                            </div>
                        </div>

                        <div className="flex justify-between gap-3">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} onPaste={handlePaste} className="w-14 h-20 text-center text-3xl font-black text-brand-dark bg-[#F7F6F2] rounded-3xl outline-none transition-all ring-1 ring-brand-dark/5 focus:ring-brand-dark/30 shadow-inner" />
                            ))}
                        </div>

                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center mb-4">{error}</div>}

                        <div className="space-y-8">
                             <p className="text-xs font-black text-accent-brown/30 uppercase tracking-[0.2em] ml-6 italic">No code? <button type="button" onClick={handleSendOtp} disabled={countdown > 0} className="text-brand-dark font-black hover:text-accent-brown">{countdown > 0 ? `Wait ${countdown}s` : 'Resend'}</button></p>
                             <div className="flex gap-4">
                                <button type="button" onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 italic">Review</button>
                                <button type="button" onClick={handleRegister} disabled={loading} className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all italic flex items-center justify-center gap-4 group">
                                    {loading ? 'Finalizing...' : 'Join Fleet'}
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
        'Personal Identity',
        'Vehicle Assets',
        'Compliance Gate',
        'Authorization',
    ];

    if (isPending) return <PendingApproval email={email} vehicleType={vehicleType} />;

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt="Rider Operations" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
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
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Fleet Command</div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Rider <br /><span className="text-brand-dark italic font-outfit">Operations.</span></h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Join the elite courier network delivering professional veterinary care across the region.</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">Rider Registration Stage {step} / 4</p>
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
                            <Link to="/login/rider" className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">Rider Login Instead</Link>
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
                        Back to Landing
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RiderRegister;
