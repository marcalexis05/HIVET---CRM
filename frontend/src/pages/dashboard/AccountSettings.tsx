import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Lock, Bell, Trash2, Loader2, Eye, EyeOff,
    AlertTriangle, CheckCircle, MapPin, Plus, Edit2, Trash,
    Store, ShieldCheck, X, Truck, Bike
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../../components/PasswordStrength';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import MapPickerModal from '../../components/MapPickerModal';
import ModernModal from '../../components/ModernModal';

type Section = 'profile' | 'addresses' | 'password' | 'notifications' | 'danger';

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'My Addresses', icon: MapPin },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

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

const getNavLinks = (role: string) => {
    return NAV.filter(n => {
        return true;
    });
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-brand-dark' : 'bg-accent-peach/60'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-6' : ''}`} />
    </button>
);

const AccountSettings = () => {
    const { user, logout, loginWithToken } = useAuth();
    const navigate = useNavigate();
    const [section, setSection] = useState<Section>('profile');

    // Profile – separate name fields from DB
    const [firstName, setFirstName] = useState(user?.first_name ?? '');
    const [middleName, setMiddleName] = useState(user?.middle_name ?? '');
    const [lastName, setLastName] = useState(user?.last_name ?? '');
    const [suffix, setSuffix] = useState(user?.suffix ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [vehicleType, setVehicleType] = useState(user?.vehicle_type ?? '');
    const [gender, setGender] = useState(user?.gender ?? '');
    const [birthday, setBirthday] = useState(user?.birthday ?? '');
    const [ownerBirthday, setOwnerBirthday] = useState('');
    const [ownerGender, setOwnerGender] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Business specific
    const [clinicName, setClinicName] = useState('');
    const [clinicPhone, setClinicPhone] = useState('');
    const [ownerFullName, setOwnerFullName] = useState('');
    const [loyaltyPointsPerPeso, setLoyaltyPointsPerPeso] = useState(10.0);
    const [loyaltyPointsPerReservation, setLoyaltyPointsPerReservation] = useState(50);

    // Primary Clinic Address (Granular)
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
    const [clinicRegion, setClinicRegion] = useState('');
    const [clinicLat, setClinicLat] = useState<number | null>(null);
    const [clinicLng, setClinicLng] = useState<number | null>(null);

    // Addresses
    interface Address {
        id: number;
        user_id?: number;
        customer_id?: number;
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2: string;

        house_number: string;
        block_number: string;
        street: string;
        subdivision: string;
        sitio: string;
        barangay: string;
        city: string;
        district: string;
        province: string;
        zip_code: string;
        region: string;

        lat: number | null;
        lng: number | null;
        label: string;
        is_default: boolean;
        delivery_notes: string;
    }
    const [addresses, setAddresses] = useState<Address[]>([]);
    const isBusiness = user?.role === 'business';
    const isRider = user?.role === 'rider';
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [showAddrModal, setShowAddrModal] = useState(false);
    const [editingAddr, setEditingAddr] = useState<Address | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [addrForm, setAddrForm] = useState({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',

        house_number: '',
        block_number: '',
        street: '',
        subdivision: '',
        sitio: '',
        barangay: '',
        city: '',
        district: '',
        province: '',
        zip_code: '',
        region: '',

        lat: null as number | null,
        lng: null as number | null,
        label: 'Home',
        is_default: false,
        delivery_notes: ''
    });
    const [showAllBranches, setShowAllBranches] = useState(false);
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [hasPassword, setHasPassword] = useState(true);

    const handleAddressComponents = (_full: string, components: any[], geometry?: { lat: number, lng: number }, granular?: any) => {
        if (granular) {
            setAddrForm(prev => ({
                ...prev,
                address_line1: _full,
                house_number: granular.houseNumber || '',
                block_number: granular.blockNumber || '',
                street: granular.street || '',
                subdivision: granular.subdivision || '',
                sitio: granular.sitio || '',
                barangay: granular.barangay || '',
                city: granular.city || '',
                district: granular.district || '',
                province: granular.province || '',
                zip_code: granular.zip || '',
                region: granular.region || '',
                lat: geometry?.lat ?? prev.lat,
                lng: geometry?.lng ?? prev.lng
            }));
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
            if (types.includes('administrative_area_level_2')) district = c.long_name;
            if (types.includes('neighborhood') || types.includes('subdivision')) subdivision = c.long_name;
        });

        setAddrForm(prev => ({
            ...prev,
            address_line1: _full,
            house_number: houseNum,
            street: street,
            barangay: barangay,
            city: city,
            province: province,
            zip_code: zip,
            district: district,
            subdivision: subdivision,
            region: region,
            lat: geometry?.lat ?? prev.lat,
            lng: geometry?.lng ?? prev.lng
        }));
    };


    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setModal({ isOpen: true, title, message, type: 'confirm', onConfirm });
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.token) return;
            if (user.role !== 'customer' && user.role !== 'business' && user.role !== 'rider') return;

            try {
                const res = await fetch('http://localhost:8000/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const data = await res.json();

                    // Helper to split name if individual parts are missing
                    const populateNames = (f: string, m: string, l: string, fullName: string) => {
                        if (f) setFirstName(f);
                        if (m) setMiddleName(m);
                        if (l) setLastName(l);

                        if (!f && !l && fullName) {
                            const parts = fullName.trim().split(/\s+/);
                            if (parts.length === 1) setFirstName(parts[0]);
                            else if (parts.length === 2) {
                                setFirstName(parts[0]);
                                setLastName(parts[1]);
                            } else if (parts.length >= 3) {
                                setFirstName(parts[0]);
                                setMiddleName(parts[1]);
                                setLastName(parts.slice(2).join(' '));
                            }
                        }
                    };

                    if (user.role === 'business') {
                        setClinicName(data.clinic_name || '');
                        setClinicPhone(data.clinic_phone || '');
                        setOwnerFullName(data.owner_full_name || data.name || '');
                        setEmail(data.email || '');
                        setLoyaltyPointsPerPeso(data.loyalty_points_per_peso ?? 10.0);
                        setLoyaltyPointsPerReservation(data.loyalty_points_per_reservation ?? 50);
                        setOwnerBirthday(data.owner_birthday || '');
                        setOwnerGender(data.owner_gender || '');

                        setClinicHouseNumber(data.clinic_house_number || '');
                        setClinicBlockNumber(data.clinic_block_number || '');
                        setClinicStreet(data.clinic_street || '');
                        setClinicSubdivision(data.clinic_subdivision || '');
                        setClinicSitio(data.clinic_sitio || '');
                        setClinicBarangay(data.clinic_barangay || '');
                        setClinicCity(data.clinic_city || '');
                        setClinicDistrict(data.clinic_district || '');
                        setClinicProvince(data.clinic_province || '');
                        setClinicZip(data.clinic_zip || '');
                        setClinicRegion(data.clinic_region || '');
                        setClinicLat(data.clinic_lat || null);
                        setClinicLng(data.clinic_lng || null);

                    } else {
                        populateNames(data.first_name, data.middle_name, data.last_name, data.name || data.full_name);
                        setSuffix(data.suffix || '');
                        setEmail(data.email || '');
                        setPhone(data.phone || '');
                        setVehicleType(data.vehicle_type || '');
                        setGender(data.gender || '');
                        setBirthday(data.birthday || '');
                    }
                    setIsGoogleUser(!!data.google_id);
                    setHasPassword(!!data.has_password);
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        fetchProfile();
    }, [user?.token, user?.role]);

    const fetchAddresses = async () => {
        if (!user?.token) return;
        setLoadingAddresses(true);
        try {
            const endpoint = isBusiness ? 'http://localhost:8000/api/business/branches' : 'http://localhost:8000/api/customer/addresses';
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (isBusiness) {
                    const normalized = data.map((b: any) => ({
                        id: b.id,
                        full_name: b.name,
                        phone: b.phone,
                        address_line1: b.address_line1 || '',
                        address_line2: b.address_line2 || '',
                        house_number: b.house_number || '',
                        block_number: b.block_number || '',
                        street: b.street || '',
                        subdivision: b.subdivision || '',
                        sitio: b.sitio || '',
                        barangay: b.barangay || '',
                        city: b.city || '',
                        district: b.district || '',
                        province: b.province || '',
                        zip_code: b.zip_code || '',
                        region: b.region || '',
                        lat: b.lat,
                        lng: b.lng,
                        label: 'BRANCH',
                        is_default: b.is_main,
                        delivery_notes: b.delivery_notes || ''
                    }));
                    setAddresses(normalized.sort((a: any, b: any) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)));
                } else {
                    const normalized = data.addresses.map((a: any) => ({
                        ...a,
                        address_line1: a.address_line1 || '',
                        address_line2: a.address_line2 || '',
                        house_number: a.house_number || '',
                        block_number: a.block_number || '',
                        street: a.street || '',
                        subdivision: a.subdivision || '',
                        sitio: a.sitio || '',
                        barangay: a.barangay || '',
                        city: a.city || '',
                        district: a.district || '',
                        province: a.province || '',
                        zip_code: a.zip_code || '',
                        region: a.region || '',
                        label: a.label || 'Home',
                        delivery_notes: a.delivery_notes || ''
                    }));
                    setAddresses(normalized.sort((a: any, b: any) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)));
                }
            }
        } catch (err) {
            console.error('Failed to fetch addresses', err);
        } finally {
            setLoadingAddresses(false);
        }
    };

    useEffect(() => {
        if (section === 'addresses' || (section === 'profile' && isRider)) fetchAddresses();
    }, [section, isRider]);

    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw] = useState<{ [key: string]: boolean }>({});
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [savingPw, setSavingPw] = useState(false);
    const [pwError, setPwError] = useState('');

    const [notifs, setNotifs] = useState({ orderUpdates: true, loyaltyAlerts: true, newsletter: false, gmailNotifications: false });
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showGooglePwModal, setShowGooglePwModal] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);

    const handleRequestEmailChange = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }
        setSendingOtp(true);
        try {
            const res = await fetch('http://localhost:8000/api/auth/request-email-change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ new_email: newEmail })
            });
            const data = await res.json();
            if (res.ok) {
                setOtpSent(true);
                showToast('Verification code sent to your new email.');
            } else {
                showToast(data.detail || 'Failed to send verification code.', 'error');
            }
        } catch (err) {
            showToast('Error requesting email change.', 'error');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyEmailChange = async () => {
        if (emailOtp.length !== 6) {
            showToast('Please enter the 6-digit verification code.', 'error');
            return;
        }
        setVerifyingEmail(true);
        try {
            const res = await fetch('http://localhost:8000/api/auth/verify-email-change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ new_email: newEmail, otp: emailOtp })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.token) loginWithToken(data.token);
                setEmail(newEmail);
                setShowEmailModal(false);
                setNewEmail('');
                setEmailOtp('');
                setOtpSent(false);
                showToast('Email updated successfully!');
            } else {
                showToast(data.detail || 'Invalid verification code.', 'error');
            }
        } catch (err) {
            showToast('Error verifying email change.', 'error');
        } finally {
            setVerifyingEmail(false);
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState('');

    const handleSaveProfile = async () => {
        if (!user?.token) return;
        // AGE VALIDATION (18+)
        const checkBirthday = isBusiness ? ownerBirthday : birthday;
        if (!checkBirthday) {
            showToast('Birthdate is required.', 'error');
            return;
        }
        const age = parseInt(calculateAge(checkBirthday));
        if (isNaN(age) || age < 18) {
            showToast('You must be at least 18 years old to use this platform.', 'error');
            return;
        }

        setSavingProfile(true);
        try {
            const res = await fetch('http://localhost:8000/api/customer/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(isBusiness ? {
                    clinic_name: clinicName || null,
                    clinic_phone: clinicPhone || null,
                    first_name: ownerFullName || null,
                    loyalty_points_per_peso: parseFloat(loyaltyPointsPerPeso.toString()),
                    loyalty_points_per_reservation: parseInt(loyaltyPointsPerReservation.toString()),
                    owner_birthday: ownerBirthday || null,
                    owner_gender: ownerGender || null,
                    clinic_house_number: clinicHouseNumber || null,
                    clinic_block_number: clinicBlockNumber || null,
                    clinic_street: clinicStreet || null,
                    clinic_subdivision: clinicSubdivision || null,
                    clinic_sitio: clinicSitio || null,
                    clinic_barangay: clinicBarangay || null,
                    clinic_city: clinicCity || null,
                    clinic_district: clinicDistrict || null,
                    clinic_province: clinicProvince || null,
                    clinic_zip: clinicZip || null,
                    clinic_region: clinicRegion || null,
                    clinic_lat: clinicLat,
                    clinic_lng: clinicLng,
                    phone: phone || null
                } : isRider ? {
                    first_name: firstName || null,
                    middle_name: middleName || null,
                    last_name: lastName || null,
                    suffix: suffix || null,
                    phone: phone || null,
                    vehicle_type: vehicleType || null,
                    birthday: birthday || null,
                    gender: gender || null,
                } : {
                    first_name: firstName || null,
                    middle_name: middleName || null,
                    last_name: lastName || null,
                    suffix: suffix || null,
                    phone: phone || null,
                    gender: gender || null,
                    birthday: birthday || null,
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.token) loginWithToken(data.token);
                showToast('Profile updated successfully!');
            } else {
                const errorData = await res.json().catch(() => ({}));
                showToast(errorData.detail || 'Failed to update profile.', 'error');
            }
        } catch (err) {
            console.error('Save profile error:', err);
            showToast('Error updating profile.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async () => {
        if (!user?.token) return;
        setPwError('');
        if (hasPassword && !pw.current) return setPwError('Enter your current password.');
        if (pw.next.length < 8) return setPwError('New password must be at least 8 characters.');
        if (pw.next !== pw.confirm) return setPwError('Passwords do not match.');

        setSavingPw(true);
        try {
            const res = await fetch('http://localhost:8000/api/customer/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    current_password: pw.current || null,
                    new_password: pw.next
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.token) loginWithToken(data.token);
                setPw({ current: '', next: '', confirm: '' });
                setHasPassword(true);
                showToast('Password changed successfully!');
            } else {
                setPwError(data.detail || 'Failed to update password.');
            }
        } catch (err) {
            console.error('Password update error:', err);
            setPwError('An error occurred while updating the password.');
        } finally {
            setSavingPw(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirm !== 'DELETE') return;
        setModal({
            isOpen: true,
            title: 'Deactivate Account',
            message: 'Are you sure you want to deactivate your account? This will permanently archive your products and personal data.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const res = await fetch('http://localhost:8000/api/account', {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    });
                    if (res.ok) {
                        logout();
                        navigate('/');
                    } else {
                        const err = await res.json();
                        showToast(err.detail || 'Failed to deactivate account.', 'error');
                    }
                } catch (error) {
                    showToast('Network error while deactivating account.', 'error');
                }
                setModal(m => ({ ...m, isOpen: false }));
            }
        });
    };

    const isAnyModalOpen = showAddrModal || !!editingAddr || showMapPicker || isDatePickerOpen || showEmailModal || showGooglePwModal || modal.isOpen;

    // Manage body scroll
    useEffect(() => {
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isAnyModalOpen]);

    const initials = (isBusiness ? (clinicName || user?.name || 'C') : (user?.name || user?.email || 'U')).slice(0, 2).toUpperCase();

    return (
        <DashboardLayout title="">
            <div className={`w-full max-w-[1440px] mx-auto space-y-8 pb-20 ${isAnyModalOpen ? 'opacity-30 blur-2xl pointer-events-none' : 'opacity-100'}`}>

                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative bg-brand-dark rounded-[2.5rem] p-8 lg:p-12 overflow-hidden shadow-2xl border border-white/5">
                    {/* Background Decorative Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px] -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-peach/5 rounded-full blur-[80px] -ml-20 -mb-20" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8">
                        {/* Avatar Hub */}
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-white/10 text-white flex items-center justify-center font-black text-4xl shadow-2xl relative z-10 border-4 border-white/20 backdrop-blur-xl transition-all hover:scale-105 duration-500 overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user?.avatar} alt={user?.name || 'User Profile'} className="w-full h-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-7 h-7 rounded-full border-[3px] border-brand-dark flex items-center justify-center shadow-lg shadow-black/10 transition-transform hover:scale-110 z-20">
                                <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
                            </div>
                        </div>

                        {/* User Primary Info */}
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-2">
                                {isRider && <Truck className="w-3.5 h-3.5 text-white" />}
                                {isBusiness && <Store className="w-3.5 h-3.5 text-white" />}
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                    {isRider ? 'Certified Rider' : isBusiness ? 'Partner Business' : 'Verified Member'}
                                </span>
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse ml-1" />
                            </div>

                            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight">
                                {user?.name ?? 'Account'}
                            </h2>

                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 pt-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Contact Email</p>
                                        <p className="text-sm font-bold text-white tracking-tight">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Account Status</p>
                                        <p className="text-sm font-black text-white uppercase tracking-widest">Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Hub - Streamlined */}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-[2rem] p-3 border border-accent-brown/5 shadow-xl shadow-brand-dark/5">
                            <div className="p-4 mb-2">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Management Hub</h4>
                            </div>
                            <div className="space-y-1.5">
                                {getNavLinks(user?.role || '').map(n => {
                                    let label = n.label;
                                    if (isBusiness) {
                                        if (n.id === 'profile') label = 'Clinic Profile';
                                        if (n.id === 'addresses') label = 'Clinic Locations';
                                    } else if (isRider) {
                                        if (n.id === 'profile') label = 'Rider Profile';
                                    }
                                    const isActive = section === n.id;
                                    return (
                                        <button key={n.id} onClick={() => {
                                            if (n.id === 'password' && isGoogleUser && !hasPassword && !isRider) {
                                                setShowGooglePwModal(true);
                                            } else {
                                                setSection(n.id);
                                            }
                                        }}
                                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${isActive ? 'bg-brand-dark text-white shadow-2xl shadow-brand-dark/20' : 'text-black hover:bg-brand/5 hover:text-accent-brown'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/10' : 'bg-brand/5 group-hover:bg-brand/10 group-hover:text-brand-dark'}`}>
                                                    <n.icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
                                            </div>
                                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Secure Connection Block Removed */}
                        </div>

                        {section === 'danger' ? null : (
                            <button
                                onClick={() => setSection('danger')}
                                className="w-full flex items-center gap-4 px-8 py-5 rounded-3xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 group"
                            >
                                <Trash2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Terminate Account</span>
                            </button>
                        )}
                    </div>

                    <motion.div key={section} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-9 bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-2xl shadow-brand-dark/5 border border-white">

                        {section === 'profile' && (
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">{isBusiness ? 'Clinic Information' : isRider ? 'Rider Information' : 'Profile Information'}</h3>
                                <div className="space-y-5">
                                    {isBusiness ? (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-black block mb-2 pl-1">Clinic Name</label>
                                                    <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="My Veterinary Clinic"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-black/40" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-black block mb-2 pl-1">Clinic Phone <span className="text-accent-brown">*</span></label>
                                                    <div className="relative group">
                                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-black tracking-tight transition-colors group-focus-within:text-accent-brown">+63</span>
                                                        <input
                                                            type="tel"
                                                            value={clinicPhone}
                                                            maxLength={10}
                                                            onChange={e => {
                                                                let val = e.target.value.replace(/\D/g, '');
                                                                if (val.startsWith('0')) val = val.substring(1);
                                                                if (val.length > 0 && !val.startsWith('9')) val = '';
                                                                setClinicPhone(val.slice(0, 10));
                                                            }}
                                                            placeholder="9XX XXX XXXX"
                                                            className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 pl-14 pr-4 sm:pr-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-black/40" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Owner Full Name</label>
                                                <input type="text" value={ownerFullName} onChange={e => setOwnerFullName(e.target.value)} placeholder="Juan Dela Cruz"
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <CustomDatePicker
                                                        label="Birthdate"
                                                        value={ownerBirthday}
                                                        onChange={setOwnerBirthday}
                                                        onModalOpenChange={setIsDatePickerOpen}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-black block mb-2 pl-1">Age <span className="text-accent-brown text-[8px] normal-case tracking-normal font-bold">Auto-fill</span></label>
                                                    <input type="text" value={calculateAge(ownerBirthday)} readOnly
                                                        className="w-full bg-accent-peach/5 border-2 border-transparent rounded-2xl py-3 sm:py-4 px-4 text-sm font-black text-black outline-none transition-all cursor-default" />
                                                </div>
                                            </div>

                                            <div>
                                                <CustomDropdown
                                                    label="Sex"
                                                    value={ownerGender}
                                                    onChange={setOwnerGender}
                                                    options={[
                                                        { label: 'Male', value: 'Male' },
                                                        { label: 'Female', value: 'Female' },
                                                        { label: 'Other', value: 'Other' },
                                                        { label: 'Rather not say', value: 'Rather not say' },
                                                    ]}
                                                />
                                            </div>


                                            <div className="pt-4 border-t border-accent-brown/5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-black block mb-2 pl-1">Registered Email</label>
                                                <div className="relative group">
                                                    <input type="email" value={email} readOnly
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent rounded-2xl py-3 sm:py-4 pl-4 sm:pl-5 pr-24 text-sm font-bold text-black outline-none transition-all cursor-default" />
                                                    <button onClick={() => { setShowEmailModal(true); setNewEmail(email); }}
                                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-accent-brown uppercase tracking-widest hover:text-black transition-colors">
                                                        Verify
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">First Name <span className="text-red-500">*</span></label>
                                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter First Name"
                                                        className="w-full bg-[#FAF9F6] border-2 border-transparent focus:border-brand-dark/30 focus:bg-white rounded-[1.25rem] py-4 px-6 text-sm font-black text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-black/40" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">Middle Name <span className="text-accent-brown/30 text-[8px] normal-case tracking-normal font-bold">Optional</span></label>
                                                    <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Enter Middle Name"
                                                        className="w-full bg-[#FAF9F6] border-2 border-transparent focus:border-brand-dark/30 focus:bg-white rounded-[1.25rem] py-4 px-6 text-sm font-black text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/20" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">Surname <span className="text-red-500">*</span></label>
                                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter Surname"
                                                        className="w-full bg-[#FAF9F6] border-2 border-transparent focus:border-brand-dark/30 focus:bg-white rounded-[1.25rem] py-4 px-6 text-sm font-black text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/20" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                                                <div className="md:col-span-1">
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
                                                            { label: 'III', value: 'III' },
                                                            { label: 'IV', value: 'IV' },
                                                        ]}
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <CustomDropdown
                                                        label="Sex"
                                                        value={gender}
                                                        onChange={setGender}
                                                        options={[
                                                            { label: 'Male', value: 'Male' },
                                                            { label: 'Female', value: 'Female' },
                                                            { label: 'Other', value: 'Other' },
                                                            { label: 'Prefer not to say', value: 'Prefer not to say' },
                                                        ]}
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <CustomDatePicker
                                                        label="Date of Birth"
                                                        isRequired={true}
                                                        value={birthday}
                                                        onChange={setBirthday}
                                                        onModalOpenChange={setIsDatePickerOpen}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-accent-brown/5">
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">Contact Number <span className="text-red-500">*</span></label>
                                                        <div className="relative group">
                                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-accent-brown/10 pr-3 transition-colors group-focus-within:border-brand/30">
                                                                <span className="text-xs font-black text-black group-focus-within:text-accent-brown">+63</span>
                                                            </div>
                                                            <input
                                                                type="tel"
                                                                value={phone.replace(/^\+63/, '')}
                                                                maxLength={10}
                                                                onChange={e => {
                                                                    let val = e.target.value.replace(/\D/g, '');
                                                                    if (val.startsWith('0')) val = val.substring(1);
                                                                    if (val.length > 0 && !val.startsWith('9')) val = '';
                                                                    setPhone(val ? `+63${val}` : '');
                                                                }}
                                                                placeholder="9XX XXX XXXX"
                                                                className="w-full bg-[#FAF9F6] border-2 border-transparent focus:border-brand-dark/30 focus:bg-white rounded-[1.25rem] py-4 pl-20 pr-6 text-sm font-black text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-black/40 tabular-nums" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">Email Address</label>
                                                        <div className="relative group">
                                                            <input type="email" value={email} readOnly
                                                                className="w-full bg-[#FAF9F6] border-2 border-transparent rounded-[1.25rem] py-4 pl-6 pr-24 text-sm font-black text-accent-brown/80 outline-none transition-all cursor-not-allowed tabular-nums" />
                                                            <button onClick={() => { setShowEmailModal(true); setNewEmail(email); }}
                                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-accent-brown uppercase tracking-widest hover:text-brand-dark transition-colors bg-brand-dark/10 px-3 py-1.5 rounded-lg">
                                                                Update
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {isRider && (
                                                <div className="pt-6">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">Vehicle Assignment <span className="text-brand-dark text-[8px] normal-case tracking-normal font-bold uppercase transition-all ml-2">Verified Status</span></label>
                                                    <div className="relative group">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-dark transition-colors">
                                                            <Bike className="w-5 h-5" />
                                                        </span>
                                                        <input type="text" value={vehicleType} readOnly
                                                            className="w-full bg-[#FAF9F6] border-2 border-transparent rounded-[1.25rem] py-4 pl-16 pr-6 text-sm font-black text-accent-brown/80 outline-none transition-all cursor-not-allowed uppercase tracking-widest" />
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Active</span>
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {isRider && (
                                                <div className="grid grid-cols-1 gap-6 pt-6 mb-4">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown block mb-3 pl-1">Residential Address <span className="text-black text-[8px] normal-case tracking-normal font-bold">Registration Address</span></label>
                                                        <div className="relative group">
                                                            <div className="w-full bg-[#FAF9F6] border-2 border-transparent rounded-[1.25rem] py-4 pl-16 pr-24 text-sm font-black text-accent-brown flex items-center min-h-[58px]">
                                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-dark">
                                                                    <MapPin className="w-5 h-5" />
                                                                </span>
                                                                <span className="truncate pr-4">
                                                                    {addresses.find(a => a.is_default)?.address_line1 || addresses[0]?.address_line1 || 'No address registered'}
                                                                </span>
                                                                <button
                                                                    onClick={() => setSection('addresses')}
                                                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-brand-dark/10 text-brand-dark px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all active:scale-95 shadow-sm"
                                                                >
                                                                    Change
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-8 border-t border-accent-brown/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                                                        <ShieldCheck className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Profile Verified</p>
                                                        <p className="text-[9px] font-bold text-black mt-0.5">Your identity has been successfully validated by the system.</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-black text-black tabular-nums">
                                                    Age Verified: {calculateAge(birthday)}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <button onClick={handleSaveProfile} disabled={savingProfile}
                                        className="mt-6 flex items-center gap-2 bg-brand-dark text-white px-10 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-accent-brown transition-all disabled:opacity-50 shadow-2xl shadow-brand-dark/20 active:scale-95">
                                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {section === 'addresses' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-accent-brown tracking-tighter">{isBusiness ? 'Clinic Locations' : 'My Addresses'}</h3>
                                        <p className="text-[10px] font-bold text-black uppercase tracking-[0.2em] mt-1">{isBusiness ? 'Manage your veterinary branches' : 'Manage your delivery locations'}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingAddr(null);
                                            setAddrForm({
                                                full_name: clinicName || user?.name || '',
                                                phone: user?.phone || '',
                                                address_line1: '',
                                                address_line2: '',
                                                house_number: '',
                                                block_number: '',
                                                street: '',
                                                subdivision: '',
                                                sitio: '',
                                                barangay: '',
                                                city: '',
                                                district: '',
                                                province: '',
                                                zip_code: '',
                                                region: '',
                                                lat: null,
                                                lng: null,
                                                label: isBusiness ? 'Branch' : 'Home',
                                                is_default: false,
                                                delivery_notes: ''
                                            });
                                            setShowAddrModal(true);
                                        }}
                                        className="flex items-center justify-center gap-2 bg-brand-dark text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-brand/10 group"
                                    >
                                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> {isBusiness ? 'Add Branch Location' : 'Add New Address'}
                                    </button>
                                </div>

                                {loadingAddresses ? (
                                    <div className="flex flex-col items-center justify-center py-24 opacity-20">
                                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                        <p className="font-black text-[10px] uppercase tracking-[0.2em]">Synchronizing...</p>
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-accent-peach/20">
                                        <div className="w-20 h-20 bg-accent-peach/10 rounded-[1.5rem] flex items-center justify-center mb-6 text-black">
                                            <MapPin className="w-10 h-10" />
                                        </div>
                                        <h4 className="font-black text-black tracking-tight text-lg">{isBusiness ? 'No Branch Locations' : 'No Addresses Saved'}</h4>
                                        <p className="text-xs font-bold text-black mt-2 max-w-[240px] leading-relaxed uppercase tracking-wider">{isBusiness ? 'Add your clinic branches to let customers find you.' : 'Add an address to start shopping with premium delivery service.'}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {(!showAllBranches ? addresses.slice(0, 1) : addresses).map(addr => (
                                            <div key={addr.id} className="group relative bg-white border border-accent-peach/10 rounded-3xl p-6 sm:p-8 transition-all hover:border-brand/30 hover:shadow-2xl hover:shadow-brand/5 overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingAddr(addr);
                                                            setAddrForm({
                                                                full_name: addr.full_name || '',
                                                                phone: addr.phone || '',
                                                                address_line1: addr.address_line1 || '',
                                                                address_line2: addr.address_line2 || '',
                                                                house_number: addr.house_number || '',
                                                                block_number: addr.block_number || '',
                                                                street: addr.street || '',
                                                                subdivision: addr.subdivision || '',
                                                                sitio: addr.sitio || '',
                                                                barangay: addr.barangay || '',
                                                                city: addr.city || '',
                                                                district: addr.district || '',
                                                                province: addr.province || '',
                                                                zip_code: addr.zip_code || '',
                                                                region: addr.region || '',
                                                                lat: addr.lat ?? null,
                                                                lng: addr.lng ?? null,
                                                                label: addr.label || 'Home',
                                                                is_default: addr.is_default,
                                                                delivery_notes: addr.delivery_notes || ''
                                                            });
                                                            setShowAddrModal(true);
                                                        }}
                                                        className="w-10 h-10 bg-accent-peach/5 rounded-xl flex items-center justify-center text-black hover:bg-brand/10 hover:text-accent-brown transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showConfirm(
                                                                isBusiness ? 'Remove Branch' : 'Remove Address',
                                                                isBusiness
                                                                    ? `Are you sure you want to permanently remove "${addr.full_name}"? This cannot be undone.`
                                                                    : 'Are you sure you want to permanently remove this address?',
                                                                async () => {
                                                                    const endpoint = isBusiness ? `http://localhost:8000/api/business/branches/${addr.id}` : `http://localhost:8000/api/customer/addresses/${addr.id}`;
                                                                    const res = await fetch(endpoint, {
                                                                        method: 'DELETE',
                                                                        headers: { 'Authorization': `Bearer ${user?.token}` }
                                                                    });
                                                                    if (res.ok) { fetchAddresses(); setModal(m => ({ ...m, isOpen: false })); }
                                                                }
                                                            );
                                                        }}
                                                        className="w-10 h-10 bg-accent-peach/5 rounded-xl flex items-center justify-center text-black hover:bg-red-50 hover:text-red-500 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {isBusiness && (
                                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50 pb-1 border-b border-accent-brown/5">
                                                            {clinicName || 'Clinic'}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl font-black text-accent-brown tracking-tighter">{addr.full_name}</span>
                                                            <div className="w-px h-4 bg-brand-dark/10 hidden sm:block" />
                                                            <span className="font-bold text-black tabular-nums">{addr.phone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[8px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase ${addr.label === 'Home' ? 'bg-blue-50 text-blue-500 border border-blue-100' : 'bg-green-50 text-green-500 border border-green-100'}`}>
                                                                {addr.label}
                                                            </span>
                                                            {addr.is_default && (
                                                                <span className="text-[8px] font-black px-3 py-1.5 rounded-full bg-brand text-white border border-brand/20 tracking-widest uppercase shadow-sm">
                                                                    {isBusiness ? 'MAIN' : 'DEFAULT'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-black leading-relaxed uppercase tracking-tight">
                                                            {addr.address_line1}
                                                        </p>
                                                        <p className="text-sm font-black text-brand tracking-[0.05em] uppercase">
                                                            {addr.address_line2}
                                                        </p>
                                                    </div>

                                                    {!isBusiness && !addr.is_default && (
                                                        <button
                                                            onClick={async () => {
                                                                const endpoint = `http://localhost:8000/api/customer/addresses/${addr.id}/default`;
                                                                const res = await fetch(endpoint, {
                                                                    method: 'PATCH',
                                                                    headers: { 'Authorization': `Bearer ${user?.token}` }
                                                                });
                                                                if (res.ok) fetchAddresses();
                                                            }}
                                                            className="text-[10px] font-black uppercase tracking-[0.2em] text-black hover:text-accent-brown transition-colors flex items-center gap-2 group/btn"
                                                        >
                                                            <div className="w-4 h-4 rounded-full border-2 border-accent-brown/10 group-hover/btn:border-brand/50 transition-colors" />
                                                            Set as Default
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {addresses.length > 1 && (
                                            <button
                                                onClick={() => setShowAllBranches(!showAllBranches)}
                                                className="w-full py-4 mt-2 border-2 border-dashed border-accent-peach/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand hover:border-brand/30 transition-all flex items-center justify-center gap-2"
                                            >
                                                {showAllBranches ? (isBusiness ? 'Hide other branches' : 'Hide other addresses') : (isBusiness ? 'See more branches' : 'See more addresses')}
                                                <motion.span animate={{ rotate: showAllBranches ? 180 : 0 }}>
                                                    <Plus className="w-3 h-3" />
                                                </motion.span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {section === 'password' && (
                            <div>
                                <h3 className="text-2xl font-black text-accent-brown tracking-tighter mb-8">Change Password</h3>
                                {pwError && (
                                    <div className="bg-red-50 border border-red-100 text-red-500 rounded-xl px-4 py-3 text-sm font-bold mb-5 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" /> {pwError}
                                    </div>
                                )}
                                <div className="space-y-6">
                                    {[
                                        { label: 'Current Password', key: 'current' as const },
                                        { label: 'New Password', key: 'next' as const },
                                        { label: 'Confirm New Password', key: 'confirm' as const },
                                    ]
                                        .filter(f => !(!hasPassword && f.key === 'current'))
                                        .map(f => (
                                            <div key={f.key}>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-black block mb-3 pl-1">{f.label}</label>
                                                <div className="relative">
                                                    <input type={showPw[f.key] ? 'text' : 'password'} value={pw[f.key]} onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                                                        placeholder="••••••••"
                                                        className="w-full bg-[#FAF9F6] border-2 border-transparent focus:border-brand-dark/30 focus:bg-white rounded-2xl py-4 pl-6 pr-12 text-sm font-black text-accent-brown outline-none transition-all placeholder:text-black/40" />
                                                    <button type="button" onClick={() => setShowPw(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black hover:text-accent-brown transition-colors">
                                                        {showPw[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                {f.key === 'next' && pw.next && (
                                                    <div className="mt-3">
                                                        <PasswordStrength password={pw.next} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    <button onClick={handleSavePassword} disabled={savingPw}
                                        className="mt-4 flex items-center gap-2 bg-brand-dark text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-accent-brown transition-all disabled:opacity-50 shadow-xl shadow-brand-dark/10 active:scale-95">
                                        {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Update Password
                                    </button>
                                </div>
                            </div>
                        )}

                        {section === 'notifications' && (
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Notification Preferences</h3>
                                <div className="space-y-2">
                                    {(isRider ? [
                                        { key: 'orderUpdates', label: 'Delivery Requests', sub: 'New jobs and customer location updates. Includes shipping fee info for pending orders.' },
                                        { key: 'loyaltyAlerts', label: 'Earnings & Payouts', sub: 'Weekly summaries and bonus notifications' },
                                        { key: 'newsletter', label: 'Rider Community', sub: 'Safety tips, area alerts, and platform events' },
                                        { key: 'gmailNotifications', label: 'Gmail Notifications', sub: 'Email alerts for critical account updates' },
                                    ] : isBusiness ? [
                                        { key: 'orderUpdates', label: 'Business Alerts', sub: 'New reservations and clinic inquiries' },
                                        { key: 'loyaltyAlerts', label: 'Loyalty Management', sub: 'Point redemptions and tier updates' },
                                        { key: 'newsletter', label: 'B2B News', sub: 'Market insights and business growth opportunities' },
                                        { key: 'gmailNotifications', label: 'Gmail Notifications', sub: 'Email alerts for critical business updates' },
                                    ] : [
                                        { key: 'orderUpdates', label: 'Order Updates', sub: 'Status changes for your orders and reservations' },
                                        { key: 'loyaltyAlerts', label: 'Loyalty Alerts', sub: 'Points earned, tier upgrades, and reward availability' },
                                        { key: 'newsletter', label: 'Promotions', sub: 'Special offers, seasonal deals, and new product launches' },
                                        { key: 'gmailNotifications', label: 'Gmail Notifications', sub: 'Email notifications for time-sensitive updates' },
                                    ]).map(n => (
                                        <div key={n.key} className="flex items-center justify-between py-4 border-b border-accent-brown/5 last:border-0">
                                            <div>
                                                <p className="font-black text-accent-brown text-sm">{n.label}</p>
                                                <p className="text-xs text-black font-medium mt-0.5">{n.sub}</p>
                                            </div>
                                            <Toggle checked={notifs[n.key as keyof typeof notifs]} onChange={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notifs] }))} />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => showToast('Notification preferences saved!')}
                                    className="mt-6 flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors">
                                    <CheckCircle className="w-4 h-4" /> Save Preferences
                                </button>
                            </div>
                        )}

                        {section === 'danger' && (
                            <div>
                                <h3 className="text-xl font-black text-red-500 tracking-tight mb-2">Danger Zone</h3>
                                <p className="text-sm text-black font-medium mb-8">These actions are irreversible. Proceed with caution.</p>
                                <div className="border-2 border-red-100 rounded-2xl p-6">
                                    <div className="flex items-start gap-3 mb-6">
                                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>
                                        <div>
                                            <p className="font-black text-accent-brown">Delete Account</p>
                                            <p className="text-xs text-black font-medium mt-1">All data — orders, loyalty points, and reservations — will be permanently deleted.</p>
                                        </div>
                                    </div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-red-400 block mb-2 pl-1">Type <span className="text-red-600">DELETE</span> to confirm</label>
                                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE"
                                        className="w-full bg-red-50 border-2 border-red-100 focus:border-red-300 rounded-xl py-3 px-4 text-sm font-bold text-red-500 outline-none transition-all placeholder:text-red-200 mb-4" />
                                    <button onClick={handleDelete} disabled={deleteConfirm !== 'DELETE'}
                                        className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Trash2 className="w-4 h-4" /> Delete My Account
                                    </button>
                                </div>
                            </div>
                        )}

                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {showGooglePwModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-brand-dark" />
                            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-accent-brown mb-6">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter mb-2">Google Login User</h3>
                            <p className="text-sm font-medium text-black mb-8 leading-relaxed">
                                Since you logged in using your Google account, you don't have a separate password for Hi-Vet CRM.
                                Your account security is managed directly by Google.
                            </p>
                            <button
                                onClick={() => setShowGooglePwModal(false)}
                                className="w-full bg-brand-dark text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                Understood
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAddrModal && (
                    <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-20 sm:pt-32 overflow-y-auto pb-10">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowAddrModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="relative bg-[#FAFAFA] rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white">
                            <div className="p-8 sm:p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-accent-brown tracking-tighter">{editingAddr ? (isBusiness ? 'Edit Location' : 'Edit Address') : (isBusiness ? 'New Branch' : 'New Address')}</h3>
                                        <p className="text-xs font-bold text-black uppercase tracking-widest mt-1">{isBusiness ? 'Branch Details' : 'Delivery Details'}</p>
                                    </div>
                                    <button onClick={() => setShowAddrModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black hover:text-accent-brown transition-all shadow-sm">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-black pl-1">{isBusiness ? 'Branch/Clinic Name' : 'Contact Name'}</label>
                                            <input type="text" value={addrForm.full_name} onChange={e => setAddrForm({ ...addrForm, full_name: e.target.value })} placeholder={isBusiness ? "e.g. Main Branch" : "Full Name"}
                                                className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Phone Number</label>
                                            <input type="tel" value={addrForm.phone} onChange={e => setAddrForm({ ...addrForm, phone: e.target.value })} placeholder="09XX XXX XXXX"
                                                className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black pl-1 flex items-center gap-2">
                                            <MapPin className="w-3 h-3" /> Mark Landmark & Enter Detailed Address
                                        </label>
                                        <AddressAutocomplete
                                            onAddressSelect={(full, components, geometry, granular) => {
                                                handleAddressComponents(full, components, geometry, granular);
                                            }}
                                            defaultValue={addrForm.address_line1}
                                            initialLocation={addrForm.lat && addrForm.lng ? { lat: addrForm.lat, lng: addrForm.lng } : undefined}
                                            initialGranular={{
                                                houseNumber: addrForm.house_number,
                                                blockNumber: addrForm.block_number,
                                                street: addrForm.street,
                                                subdivision: addrForm.subdivision,
                                                sitio: addrForm.sitio,
                                                barangay: addrForm.barangay,
                                                city: addrForm.city,
                                                district: addrForm.district,
                                                province: addrForm.province,
                                                zip: addrForm.zip_code,
                                                region: addrForm.region
                                            }}
                                            placeholder="Search or pick on map..."
                                            className="!py-4 !rounded-2xl shadow-xl border-2 border-transparent focus:border-brand/30"
                                        />
                                        <p className="text-[9px] font-bold text-black uppercase tracking-widest pl-1 italic">Note: Searching will auto-fill basic location. Click the pin to edit granular details manually.</p>
                                    </div>

                                    <div className="p-6 bg-accent-peach/5 rounded-[2rem] border border-accent-peach/10 space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-black">Precise Address Confirmation</p>
                                            <p className="text-xs font-bold text-accent-brown leading-relaxed capitalize">
                                                {[addrForm.house_number, addrForm.block_number, addrForm.street, addrForm.subdivision, addrForm.sitio, addrForm.barangay, addrForm.city, addrForm.province, addrForm.zip_code].filter(Boolean).join(' ')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black pl-1">Delivery Notes / Landmark Instructions</label>
                                        <textarea
                                            value={addrForm.delivery_notes}
                                            onChange={e => setAddrForm({ ...addrForm, delivery_notes: e.target.value })}
                                            placeholder="e.g. Near the blue gate, or across the red store..."
                                            className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm min-h-[100px] resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        {(isBusiness ? ['Branch'] : ['Home', 'Work']).map(l => (
                                            <button key={l} onClick={() => setAddrForm({ ...addrForm, label: l })}
                                                className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${addrForm.label === l ? 'border-brand bg-brand/5 text-accent-brown shadow-lg shadow-brand/5' : 'border-transparent bg-white text-black hover:bg-accent-peach/10'}`}>
                                                {l}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={async () => {
                                            if (!addrForm.full_name || !addrForm.phone || !addrForm.barangay || !addrForm.city) {
                                                showToast('Contact and basic location details (Barangay, City) are required.', 'error');
                                                return;
                                            }

                                            const line1 = [addrForm.house_number, addrForm.block_number, addrForm.street, addrForm.subdivision].filter(Boolean).join(' ');
                                            const line2 = [addrForm.barangay, addrForm.city, addrForm.province, addrForm.zip_code].filter(Boolean).join(', ');

                                            const body = isBusiness ? {
                                                name: addrForm.full_name,
                                                phone: addrForm.phone,
                                                address_line1: line1,
                                                address_line2: line2,
                                                house_number: addrForm.house_number,
                                                block_number: addrForm.block_number,
                                                street: addrForm.street,
                                                subdivision: addrForm.subdivision,
                                                sitio: addrForm.sitio,
                                                barangay: addrForm.barangay,
                                                city: addrForm.city,
                                                district: addrForm.district,
                                                province: addrForm.province,
                                                zip_code: addrForm.zip_code,
                                                region: addrForm.region,
                                                lat: addrForm.lat,
                                                lng: addrForm.lng,
                                                is_main: addrForm.is_default
                                            } : {
                                                ...addrForm,
                                                address_line1: line1,
                                                address_line2: line2
                                            };

                                            const baseUrl = isBusiness ? 'http://localhost:8000/api/business/branches' : 'http://localhost:8000/api/customer/addresses';
                                            const url = editingAddr ? `${baseUrl}/${editingAddr.id}` : baseUrl;

                                            try {
                                                const res = await fetch(url, {
                                                    method: editingAddr ? 'PUT' : 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                                                    body: JSON.stringify(body)
                                                });
                                                if (res.ok) {
                                                    fetchAddresses();
                                                    setShowAddrModal(false);
                                                    showToast(`${isBusiness ? 'Branch' : 'Address'} ${editingAddr ? 'updated' : 'saved'} successfully!`);
                                                } else {
                                                    const errorData = await res.json().catch(() => ({}));
                                                    showToast(errorData.detail || 'Failed to sync details.', 'error');
                                                }
                                            } catch (err) {
                                                showToast('An error occurred during synchronization.', 'error');
                                            }
                                        }}
                                        className="w-full bg-brand-dark text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-brand-dark/10"
                                    >
                                        {editingAddr ? (isBusiness ? 'Update Branch' : 'Update Address') : (isBusiness ? 'Save Branch' : 'Save Address')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            <MapPickerModal
                isOpen={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                initialLocation={addrForm.lat && addrForm.lng ? { lat: addrForm.lat, lng: addrForm.lng } : undefined}
                onSelection={(_address, lat, lng, _components, granular) => {
                    setAddrForm(prev => ({
                        ...prev,
                        lat,
                        lng,
                        address_line1: _address,
                        house_number: granular.houseNumber || '',
                        block_number: granular.blockNumber || '',
                        street: granular.street || '',
                        subdivision: granular.subdivision || '',
                        sitio: granular.sitio || '',
                        barangay: granular.barangay || '',
                        city: granular.city || '',
                        district: granular.district || '',
                        province: granular.province || '',
                        zip_code: granular.zip || '',
                        region: granular.region || ''
                    }));
                }}
            />

            <AnimatePresence>
                {showEmailModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-md p-8 sm:p-10 shadow-2xl relative overflow-hidden">

                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16" />

                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter mb-2 relative">Change Email</h3>
                            <p className="text-xs font-bold text-black uppercase tracking-widest mb-8 relative">Verify your new email address</p>

                            <div className="space-y-6 relative">
                                {!otpSent ? (
                                    <>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-black block mb-2 pl-1">New Email Address</label>
                                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new-email@example.com"
                                                className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all" />
                                        </div>
                                        <button onClick={handleRequestEmailChange} disabled={sendingOtp}
                                            className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-brand/10">
                                            {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Send Verification Code
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">New Email</label>
                                            <div className="bg-accent-peach/10 py-3 px-5 rounded-2xl text-xs font-bold text-accent-brown/50 border-2 border-dashed border-accent-peach/30">{newEmail}</div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-black block mb-2 pl-1">Verification Code</label>
                                            <input type="text" maxLength={6} value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                                                className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 px-5 text-center text-2xl font-black tracking-[1em] text-accent-brown outline-none transition-all" />
                                        </div>
                                        <button onClick={handleVerifyEmailChange} disabled={verifyingEmail}
                                            className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-brand/10">
                                            {verifyingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Verify & Update Email
                                        </button>
                                        <button onClick={() => setOtpSent(false)} className="w-full text-[10px] font-black uppercase tracking-widest text-black hover:text-accent-brown transition-colors">
                                            Use a different email
                                        </button>
                                    </>
                                )}

                                <button onClick={() => { setShowEmailModal(false); setOtpSent(false); setNewEmail(''); setEmailOtp(''); }}
                                    className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-black hover:bg-accent-peach/10 transition-all border-2 border-accent-peach/20 hover:border-transparent">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ModernModal
                isOpen={modal.isOpen}
                onClose={() => setModal(m => ({ ...m, isOpen: false }))}
                onConfirm={modal.onConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </DashboardLayout>
    );
};

export default AccountSettings;
