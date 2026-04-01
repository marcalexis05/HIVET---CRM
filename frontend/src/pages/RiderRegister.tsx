import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, ArrowLeft, ShieldCheck, MailCheck, Bike, Eye, EyeOff, User,
    FileText, CheckCircle, Lock, Phone as PhoneIcon, Mail as MailIcon, MapPin
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PasswordStrength } from '../components/PasswordStrength';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useAuth } from '../context/AuthContext';

const FileUploadField = ({ label, icon: Icon, onUpload, value, docType }: any) => {
    const [uploading, setUploading] = useState(false);
    
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
        <div className="group space-y-2">
            <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">{label}</label>
            <div className={`relative flex items-center bg-accent-peach/10 border-2 border-dashed ${value ? 'border-brand/40 bg-brand/5' : 'border-accent-brown/10'} hover:border-brand/30 rounded-2xl transition-all h-32 overflow-hidden`}>
                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".pdf,.jpg,.jpeg,.png" />
                <div className="flex flex-col items-center justify-center w-full gap-2 p-4 text-center">
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-4 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                            <span className="text-[10px] font-bold text-accent-brown/40">Uploading...</span>
                        </div>
                    ) : value ? (
                        <>
                            <div className="w-10 h-10 bg-brand/10 text-brand-dark rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest truncate max-w-[150px]">Document Uploaded</span>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 bg-accent-brown/5 text-accent-brown/40 rounded-full flex items-center justify-center">
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-accent-brown/60 uppercase tracking-widest block">Click to Upload</span>
                                <span className="text-[8px] font-bold text-accent-brown/30 uppercase block">PDF, JPG or PNG</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const RequirementCheckbox = ({ label, checked, onChange }: any) => (
    <label className="flex items-center gap-4 p-4 rounded-2xl bg-accent-peach/10 border-2 border-transparent hover:border-brand/20 transition-all cursor-pointer group">
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-brand-dark border-brand-dark shadow-lg shadow-brand/20' : 'border-accent-brown/20 bg-white group-hover:border-brand/40'}`}>
            {checked && <CheckCircle className="w-4 h-4 text-white" />}
        </div>
        <span className={`text-xs font-bold transition-colors ${checked ? 'text-accent-brown' : 'text-accent-brown/50'}`}>{label}</span>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="hidden" />
    </label>
);

const PendingApproval = ({ email, vehicleType }: { email: string; vehicleType: string }) => (
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
                    <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em] mb-1">Hi-Vet Riders</p>
                    <h1 className="text-2xl font-black text-accent-brown tracking-tight">Application Under Review</h1>
                    <p className="text-xs text-accent-brown/50 font-medium mt-1">Your rider registration has been submitted successfully.</p>
                </div>
            </div>
            <div className="px-10 py-8 space-y-6">
                <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-orange-700">Pending Compliance Verification</p>
                        <p className="text-xs text-orange-600/70 font-medium mt-0.5">Our team is reviewing your requirements. This typically takes <strong>24–48 hours</strong>.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-accent-peach/20 rounded-2xl">
                    <MailIcon className="w-4 h-4 text-brand-dark shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-accent-brown/40 uppercase tracking-widest">Confirmation Sent To</p>
                        <p className="text-sm font-black text-accent-brown">{email}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <p className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">What Happens Next</p>
                    {[
                        { icon: <ShieldCheck className="w-4 h-4" />, label: 'Document Review', desc: vehicleType === 'Bicycle' ? "Admin reviews your NBI/Police Clearance" : "Admin reviews your License, CR/OR & Clearance", done: true },
                        { icon: <MailCheck className="w-4 h-4" />, label: 'Approval Status', desc: "You'll receive an email once your account is verified", done: false },
                        { icon: <Bike className="w-4 h-4" />, label: 'Start Delivering', desc: 'Log in and start delivering care as a Hi-Vet Rider', done: false },
                    ].map((item, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.done ? 'bg-green-50 border border-green-100' : 'bg-accent-peach/10 border border-accent-brown/5'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.done ? 'bg-green-100 text-green-600' : 'bg-accent-peach/30 text-accent-brown/40'}`}>{item.icon}</div>
                            <div className="flex-1">
                                <p className={`text-xs font-black ${item.done ? 'text-green-700' : 'text-accent-brown/60'}`}>{item.label}</p>
                                <p className="text-[10px] text-accent-brown/40 font-medium">{item.desc}</p>
                            </div>
                            {item.done && <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-1" />}
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-3 pt-2">
                    <Link to="/login/rider" className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest">
                        <ArrowRight className="w-4 h-4" /> Go to Rider Login
                    </Link>
                    <Link to="/" className="text-center text-[10px] text-accent-brown/40 font-black uppercase tracking-widest hover:text-accent-brown transition-colors py-2">
                        Return to Homepage
                    </Link>
                </div>
            </div>
        </motion.div>
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
    
    // Compliance state
    const [licenseUrl, setLicenseUrl] = useState('');
    const [vehicleCrUrl, setVehicleCrUrl] = useState('');
    const [vehicleOrUrl, setVehicleOrUrl] = useState('');
    const [nbiClearanceUrl, setNbiClearanceUrl] = useState('');
    const [is18Above, setIs18Above] = useState(false);
    const [hasAndroid6, setHasAndroid6] = useState(false);

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
        setError('');
        if (step === 1) {
            if (!firstName || !lastName || !phone || !homeCity) {
                return setError('Full Name, Phone, and a verified Home Address are required');
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
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Driver Application</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">Tell us about yourself to get started.</p>
                        </div>
                        
                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-11 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-11 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                    </div>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Suffix (Jr/Sr)</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input type="text" value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="Jr" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-11 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Phone Number</label>
                                <div className="relative flex items-center bg-accent-peach/10 border-2 border-transparent focus-within:border-brand/30 focus-within:bg-white rounded-2xl transition-all overflow-hidden">
                                    <div className="flex items-center gap-2 pl-5 pr-3 shrink-0 text-accent-brown font-black text-sm border-r border-accent-brown/10">
                                        <PhoneIcon className="w-4 h-4 text-accent-brown/30" />
                                        <span>+63</span>
                                    </div>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9XX XXX XXXX" className="flex-1 bg-transparent py-4 pl-4 pr-6 text-accent-brown font-semibold outline-none text-sm" />
                                </div>
                            </div>

                            <div className="group space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Home Address <span className="text-brand-dark">*</span></label>
                                    <span className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest italic flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-brand-dark animate-pulse" />
                                        Pin on Map
                                    </span>
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark z-10 transition-colors" />
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
                                        placeholder="Search or pick on map..."
                                        className="!py-4 !rounded-2xl shadow-xl border-2 border-transparent focus:border-brand/30 bg-accent-peach/5 pl-11"
                                    />
                                </div>
                                {homeLandmark && (
                                    <p className="text-[9px] font-bold text-accent-brown/40 uppercase tracking-widest pl-4 italic">
                                        📍 {homeLandmark}
                                    </p>
                                )}
                            </div>

                            {/* Home Address Confirmation */}
                            <div className="p-5 bg-accent-peach/5 rounded-2xl border border-accent-peach/10 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Verified Residence</p>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-accent-brown leading-relaxed capitalize">
                                        {[homeHouseNumber, homeBlockNumber, homeStreet, homeSubdivision, homeSitio, homeBarangay, homeCity, homeProvince, homeZip].filter(Boolean).join(' ')}
                                    </p>
                                    {!homeCity && <p className="text-[9px] font-black text-red-400 uppercase tracking-widest italic">Please select your location on map</p>}
                                </div>
                            </div>
                        </div>

                        <button onClick={nextStep} className="btn-primary w-full group flex items-center justify-center gap-3 h-14 md:h-16 text-xs md:text-sm whitespace-nowrap px-6">
                            Next: Vehicle Details
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Vehicle Details</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">
                                {vehicleType === 'Bicycle' ? 'No vehicle documents required for bicycle riders.' : 'Original or Notarized CR and Official Receipt.'}
                            </p>
                        </div>

                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}

                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Vehicle Type</label>
                                <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 px-6 text-accent-brown font-semibold outline-none transition-all text-sm appearance-none">
                                    <option value="Motorcycle">Motorcycle</option>
                                    <option value="Car">Car</option>
                                    <option value="Bicycle">Bicycle</option>
                                </select>
                            </div>

                            {vehicleType === 'Bicycle' ? (
                                <div className="flex items-start gap-4 p-5 bg-green-50 border-2 border-green-100 rounded-2xl">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                        <Bike className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-green-700">No License or CR/OR Required</p>
                                        <p className="text-xs text-green-600/80 font-medium mt-1 leading-relaxed">
                                            Great news! Bicycle riders are not required to submit a Driver's License, Certificate of Registration, or Official Receipt. Just proceed to the next step.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="group space-y-2">
                                        <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3">Driver's License Number</label>
                                        <div className="relative">
                                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                            <input type="text" value={driverLicense} onChange={e => setDriverLicense(e.target.value)} placeholder="AXX-XX-XXXXXX" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-11 pr-3 text-accent-brown font-semibold outline-none transition-all text-sm" />
                                        </div>
                                    </div>

                                    <FileUploadField label="Driver's License (Class A)" icon={ShieldCheck} docType="driver_license" value={licenseUrl} onUpload={setLicenseUrl} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <FileUploadField label="Certificate of Reg. (CR)" icon={FileText} docType="vehicle_cr" value={vehicleCrUrl} onUpload={setVehicleCrUrl} />
                                        <FileUploadField label="Official Receipt (OR)" icon={FileText} docType="vehicle_or" value={vehicleOrUrl} onUpload={setVehicleOrUrl} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 px-6 rounded-full font-black text-accent-brown/40 hover:text-accent-brown transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-3 h-14 md:h-16 text-xs md:text-sm whitespace-nowrap px-6">
                                Next: Clearances
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Clearance & Requirements</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">Updated NBI or Police Clearance.</p>
                        </div>

                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{error}</div>}

                        <div className="space-y-4">
                            <FileUploadField label="NBI / Police Clearance" icon={ShieldCheck} docType="nbi_clearance" value={nbiClearanceUrl} onUpload={setNbiClearanceUrl} />
                            
                            <div className="space-y-3">
                                <RequirementCheckbox label="I am 18 years old or above." checked={is18Above} onChange={setIs18Above} />
                                <RequirementCheckbox label="I have a smartphone (Android 6.0+)." checked={hasAndroid6} onChange={setHasAndroid6} />
                            </div>

                            <div className="space-y-4 border-t border-accent-brown/5 pt-4 mt-6">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Account Email</label>
                                    <div className="relative">
                                        <MailIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rider@example.com" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="group space-y-2">
                                        <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20" />
                                            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-10 pr-10 text-accent-brown font-semibold outline-none transition-all" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="group space-y-2">
                                        <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Confirm</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/20" />
                                            <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-accent-peach/10 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-10 pr-10 text-accent-brown font-semibold outline-none transition-all" />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark">
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {password && <PasswordStrength password={password} />}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 px-6 rounded-full font-black text-accent-brown/40 hover:text-accent-brown transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={nextStep} className="btn-primary flex-[2] group flex items-center justify-center gap-3 h-14 md:h-16 text-xs md:text-sm whitespace-nowrap px-6">
                                Verify & Apply
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-brand/10 text-brand-dark rounded-full flex items-center justify-center mx-auto">
                                <MailCheck className="w-8 h-8" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-black text-accent-brown tracking-tighter">Email Verification</h3>
                                <p className="text-xs text-accent-brown/50 font-medium italic">We sent a code to <span className="text-accent-brown font-bold not-italic">{email}</span></p>
                            </div>
                        </div>

                        {error && <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl text-center">{error}</div>}

                        <div className="flex justify-between gap-3">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} onPaste={handlePaste} className="w-12 md:w-14 h-16 md:h-18 text-center text-3xl font-black text-brand-dark bg-accent-peach/10 border-2 border-brand-dark/20 focus:border-brand-dark focus:bg-white rounded-2xl outline-none transition-all" />
                            ))}
                        </div>

                        <div className="space-y-6">
                            <button onClick={handleRegister} disabled={loading} className="btn-primary w-full h-14 md:h-16 text-xs md:text-sm whitespace-nowrap px-6">
                                {loading ? 'Processing Application...' : 'Finish Application'}
                            </button>
                            <button onClick={prevStep} className="w-full text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors">Go Back</button>
                        </div>
                    </motion.div>
                );
            default: return null;
        }
    };

    const stepLabels = [
        'Personal Information',
        'Vehicle Documents',
        'Clearances & Requirements',
        'Email Verification',
    ];

    if (isPending) return <PendingApproval email={email} vehicleType={vehicleType} />;

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
                        <Link to="/for-riders" className="flex items-center gap-3 mb-10 hover:scale-105 transition-transform w-fit">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-accent-brown">Hi-Vet Riders</span>
                        </Link>
                        <div className="space-y-4 max-w-xs">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Professional <br /><span className="text-brand-dark">Rider Registration</span>
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed text-sm">
                                Join our fleet of professional delivery riders. Complete your requirements to start delivering care to pet parents.
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

                <div className="p-6 xs:p-10 md:p-14 flex flex-col justify-center overflow-y-auto max-h-screen">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step > i - 1 ? 'bg-brand-dark' : 'bg-accent-brown/10'} ${step === i ? 'w-8' : 'w-3'}`} />
                            ))}
                        </div>
                        <Link to="/login/rider" className="text-[10px] font-black text-brand-dark hover:text-brand transition-colors uppercase tracking-[0.2em] border-b-2 border-brand/20 pb-0.5">Rider Login</Link>
                    </div>

                    <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

                    <div className="mt-12 text-center">
                        <Link to="/for-riders" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Bike className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                            Back to Landing
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RiderRegister;
