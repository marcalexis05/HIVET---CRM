import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Lock, AlertCircle, Bell, Trash2, Loader2, Eye, EyeOff,
    AlertTriangle, CheckCircle, MapPin, Plus, Edit2, Trash,
    Store, ShieldCheck, X, Truck, Bike, ChevronRight, ChevronLeft,
    HelpCircle, LogOut, ArrowLeft, Check
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../../components/PasswordStrength';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { calculateAgeFullYears, validateBirthday } from '../../utils/dateValidation';
import { checkContactAvailability, isValidPhMobile, isValidEmail } from '../../utils/contactValidation';
import { CONTACT_VALIDATION_MESSAGES } from '../../constants/contactValidationWording';
import { CustomDropdown } from '../../components/CustomDropdown';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import MapPickerModal from '../../components/MapPickerModal';
import ModernModal from '../../components/ModernModal';
import ConfirmLogoutModal from '../../components/ConfirmLogoutModal';
import RiderBottomNav from '../../components/RiderBottomNav';
import { RIDER_TEXT } from '../../constants/riderWording';

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
    const age = calculateAgeFullYears(birthday);
    return age !== null && age >= 0 ? age.toString() : '';
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
    const isBusiness = user?.role === 'business';
    const isRider = user?.role === 'rider';
    const [section, setSection] = useState<Section>('profile');
    const [mobileView, setMobileView] = useState<'menu' | 'form'>('menu');

    // Profile – separate name fields from DB
    const [firstName, setFirstName] = useState(user?.first_name ?? '');
    const [middleName, setMiddleName] = useState(user?.middle_name ?? '');
    const [lastName, setLastName] = useState(user?.last_name ?? '');
    const [suffix, setSuffix] = useState(user?.suffix ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [vehicleType, setVehicleType] = useState(user?.vehicle_type ?? '');
    const [gender, setGender] = useState(user?.gender ?? '');
    const [birthday, setBirthday] = useState(user?.birthday ?? '');
    const [ownerBirthday, setOwnerBirthday] = useState('');
    const [ownerGender, setOwnerGender] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [phoneChecking, setPhoneChecking] = useState(false);
    const [modalEmailError, setModalEmailError] = useState<string | null>(null);
    const [modalEmailChecking, setModalEmailChecking] = useState(false);

    // Profile Save & Unsaved Changes Tracking
    type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
    const [initialProfile, setInitialProfile] = useState<{
        firstName: string;
        middleName: string;
        lastName: string;
        suffix: string;
        phone: string;
        gender: string;
        birthday: string;
        vehicleType?: string;
    } | null>(null);

    // Initialize initialProfile fallback if not yet loaded from API
    useEffect(() => {
        if (!initialProfile && user) {
            setInitialProfile({
                firstName: user.first_name ?? '',
                middleName: user.middle_name ?? '',
                lastName: user.last_name ?? '',
                suffix: user.suffix ?? '',
                phone: user.phone ?? '',
                gender: user.gender ?? '',
                birthday: user.birthday ?? '',
                vehicleType: user.vehicle_type ?? ''
            });
        }
    }, [user, initialProfile]);

    const isProfileChanged = useMemo(() => {
        if (!initialProfile) return false;
        return (
            firstName.trim() !== (initialProfile.firstName || '').trim() ||
            middleName.trim() !== (initialProfile.middleName || '').trim() ||
            lastName.trim() !== (initialProfile.lastName || '').trim() ||
            suffix.trim() !== (initialProfile.suffix || '').trim() ||
            phone.trim() !== (initialProfile.phone || '').trim() ||
            gender !== (initialProfile.gender || '') ||
            birthday !== (initialProfile.birthday || '') ||
            (isRider && vehicleType !== (initialProfile.vehicleType || ''))
        );
    }, [initialProfile, firstName, middleName, lastName, suffix, phone, gender, birthday, vehicleType, isRider]);

    // Clear error message when user makes edits
    useEffect(() => {
        if (saveStatus === 'error') {
            setSaveStatus('idle');
            setSaveErrorMessage(null);
        }
    }, [firstName, middleName, lastName, suffix, phone, gender, birthday, vehicleType]);

    // Debounced Phone validation (ignores current user's own number)
    useEffect(() => {
        if (!phone) {
            setPhoneError(null);
            return;
        }
        const cleanCurrent = (user?.phone || '').replace(/\D/g, '');
        const cleanEntered = phone.replace(/\D/g, '');
        if (cleanCurrent && cleanCurrent === cleanEntered) {
            setPhoneError(null);
            return;
        }
        if (cleanEntered.length === 10 && !cleanEntered.startsWith('9')) {
            setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            return;
        }
        if (cleanEntered.length < 10) {
            setPhoneError(null);
            return;
        }
        if (cleanEntered.length === 10 && cleanEntered.startsWith('9')) {
            const timer = setTimeout(async () => {
                setPhoneChecking(true);
                const res = await checkContactAvailability('phone', phone, user?.id, user?.role || undefined);
                setPhoneChecking(false);
                setPhoneError(res.error);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [phone, user?.phone, user?.id, user?.role]);

    // Debounced Modal Email validation (ignores current user's own email)
    useEffect(() => {
        if (!newEmail) {
            setModalEmailError(null);
            return;
        }
        if (user?.email && user.email.toLowerCase().trim() === newEmail.toLowerCase().trim()) {
            setModalEmailError(null);
            return;
        }
        if (!isValidEmail(newEmail)) {
            setModalEmailError(null);
            return;
        }
        const timer = setTimeout(async () => {
            setModalEmailChecking(true);
            const res = await checkContactAvailability('email', newEmail, user?.id, user?.role || undefined);
            setModalEmailChecking(false);
            setModalEmailError(res.error);
        }, 500);
        return () => clearTimeout(timer);
    }, [newEmail, user?.email, user?.id, user?.role]);

    const handlePhoneBlur = async () => {
        if (!phone) return;
        const cleanCurrent = (user?.phone || '').replace(/\D/g, '');
        const cleanEntered = phone.replace(/\D/g, '');
        if (cleanCurrent && cleanCurrent === cleanEntered) {
            setPhoneError(null);
            return;
        }
        if (!isValidPhMobile(phone)) {
            setPhoneError(CONTACT_VALIDATION_MESSAGES.invalidNumber);
            return;
        }
        setPhoneChecking(true);
        const res = await checkContactAvailability('phone', phone, user?.id, user?.role || undefined);
        setPhoneChecking(false);
        setPhoneError(res.error);
    };

    const handleModalEmailBlur = async () => {
        if (!newEmail) return;
        if (user?.email && user.email.toLowerCase().trim() === newEmail.toLowerCase().trim()) {
            setModalEmailError(null);
            return;
        }
        if (!isValidEmail(newEmail)) {
            setModalEmailError(CONTACT_VALIDATION_MESSAGES.invalidEmail);
            return;
        }
        setModalEmailChecking(true);
        const res = await checkContactAvailability('email', newEmail, user?.id, user?.role || undefined);
        setModalEmailChecking(false);
        setModalEmailError(res.error);
    };

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
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
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

                        const f = data.first_name || '';
                        const m = data.middle_name || '';
                        const l = data.last_name || '';
                        let initFirst = f, initMiddle = m, initLast = l;
                        if (!f && !l && (data.name || data.full_name)) {
                            const parts = (data.name || data.full_name).trim().split(/\s+/);
                            if (parts.length === 1) initFirst = parts[0];
                            else if (parts.length === 2) { initFirst = parts[0]; initLast = parts[1]; }
                            else if (parts.length >= 3) { initFirst = parts[0]; initMiddle = parts[1]; initLast = parts.slice(2).join(' '); }
                        }
                        setInitialProfile({
                            firstName: initFirst,
                            middleName: initMiddle,
                            lastName: initLast,
                            suffix: data.suffix || '',
                            phone: data.phone || '',
                            gender: data.gender || '',
                            birthday: data.birthday || '',
                            vehicleType: data.vehicle_type || ''
                        });
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

    const [emailOtp, setEmailOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);

    const handleRequestEmailChange = async () => {
        if (modalEmailError) {
            showToast(modalEmailError, 'error');
            return;
        }
        if (!newEmail || !isValidEmail(newEmail)) {
            showToast(CONTACT_VALIDATION_MESSAGES.invalidEmail, 'error');
            return;
        }
        setModalEmailChecking(true);
        const check = await checkContactAvailability('email', newEmail, user?.id, user?.role || undefined);
        setModalEmailChecking(false);
        if (!check.available) {
            setModalEmailError(check.error);
            showToast(check.error || CONTACT_VALIDATION_MESSAGES.emailUsed, 'error');
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
        setSaveErrorMessage(null);

        // AGE & BIRTHDAY VALIDATION (18+)
        const checkBirthday = isBusiness ? ownerBirthday : birthday;
        if (!checkBirthday) {
            const err = 'Birthdate is required.';
            setSaveErrorMessage(err);
            setSaveStatus('error');
            showToast(err, 'error');
            return;
        }
        const validation = validateBirthday(checkBirthday, 'person birthday');
        if (!validation.isValid) {
            const err = validation.error || 'You must be at least 18 years old.';
            setSaveErrorMessage(err);
            setSaveStatus('error');
            showToast(err, 'error');
            return;
        }
        if (phoneError) {
            setSaveErrorMessage(phoneError);
            setSaveStatus('error');
            showToast(phoneError, 'error');
            return;
        }

        setSavingProfile(true);
        setSaveStatus('saving');
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
                setInitialProfile({
                    firstName,
                    middleName,
                    lastName,
                    suffix,
                    phone,
                    gender,
                    birthday,
                    vehicleType
                });
                setSaveStatus('saved');
                showToast('Profile updated successfully!');
                setTimeout(() => {
                    setSaveStatus('idle');
                }, 2000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                const err = errorData.detail || 'We could not save your changes. Please try again.';
                setSaveErrorMessage(err);
                setSaveStatus('error');
                showToast(err, 'error');
            }
        } catch (err) {
            console.error('Save profile error:', err);
            setSaveErrorMessage('We could not save your changes. Please try again.');
            setSaveStatus('error');
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

    const isAnyModalOpen = showAddrModal || !!editingAddr || showMapPicker || isDatePickerOpen || showEmailModal || showGooglePwModal || modal.isOpen || isLogoutModalOpen;

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


    const navItems = [
        {
            id: 'profile' as Section,
            label: isBusiness ? 'Clinic Profile' : isRider ? 'Rider Profile' : 'Edit Profile',
            sub: 'Personal & contact details',
            icon: User,
            color: 'text-brand-dark bg-brand/10',
        },
        {
            id: 'addresses' as Section,
            label: isBusiness ? 'Clinic Locations' : 'My Addresses',
            sub: isBusiness ? 'Manage clinic branches' : 'Manage delivery addresses',
            icon: MapPin,
            color: 'text-brand-dark bg-brand/10',
        },
        {
            id: 'password' as Section,
            label: 'Password & Security',
            sub: 'Credentials & authentication',
            icon: Lock,
            color: 'text-brand-dark bg-brand/10',
        },
        {
            id: 'notifications' as Section,
            label: 'Notifications',
            sub: 'Alerts, updates & preferences',
            icon: Bell,
            color: 'text-brand-dark bg-brand/10',
        },
        {
            id: 'danger' as Section,
            label: 'Danger Zone',
            sub: 'Irreversible account termination',
            icon: Trash2,
            color: 'text-red-500 bg-red-50',
        },
    ];

    const secondaryNavItems = [
        {
            label: 'Help & Support',
            sub: 'Hi-Vet Assistant & guide',
            icon: HelpCircle,
            onClick: () => {
                window.dispatchEvent(new CustomEvent('open-support-bot'));
            },
        },
        {
            label: 'Log out',
            sub: 'Sign out of your account',
            icon: LogOut,
            onClick: () => {
                setIsLogoutModalOpen(true);
            },
        },
    ];

    const handleSelectSection = (id: Section) => {
        if (id === 'password' && isGoogleUser && !hasPassword && !isRider) {
            setShowGooglePwModal(true);
            return;
        }
        setSection(id);
        setMobileView('form');
    };

    const renderHeaderCard = () => (
        <div className="relative bg-white rounded-[1.5rem] p-4 sm:p-5 shadow-sm border border-slate-100 text-slate-800">
            {/* Top Bar with Back Arrow and Centered Label */}
            <div className="relative z-10 flex items-center justify-between mb-3 sm:mb-4">
                <button
                    onClick={() => {
                        if (mobileView === 'form') {
                            setMobileView('menu');
                        } else {
                            navigate(-1);
                        }
                    }}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-slate-600 tracking-normal">
                    {isBusiness ? 'Clinic Hub' : isRider ? RIDER_TEXT.profile.pageTitle : 'My Account'}
                </span>
                <div className="w-11 min-w-[44px]" aria-hidden="true" />
            </div>

            {/* Avatar and User Info: Stacked on phones, Horizontal on Tablets & Desktops */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 sm:gap-5 mt-1 sm:mt-0">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full border-3 sm:border-4 border-slate-100 shadow-md overflow-hidden bg-brand/10 flex items-center justify-center text-brand text-2xl sm:text-3xl font-black">
                        {user?.avatar ? (
                            <img src={user?.avatar} alt={user?.name || (isBusiness ? clinicName : 'User Profile')} className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                    {/* 44px hit-target wrapper for the 32px visible edit pencil */}
                    <div className="absolute -bottom-1 -right-1 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                setSection('profile');
                                setMobileView('form');
                            }}
                            aria-label={isBusiness ? "Change clinic photo" : isRider ? "Change rider photo" : "Change profile photo"}
                            title={isBusiness ? "Change clinic photo" : "Change profile photo"}
                            className="w-8 h-8 rounded-full bg-white text-brand shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border border-slate-200 cursor-pointer"
                        >
                            <Edit2 className="w-4 h-4 text-brand" />
                        </button>
                    </div>
                </div>

                <div className="min-w-0 flex-1 max-w-full">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-snug line-clamp-2">
                        {user?.name || clinicName || 'Hi-Vet User'}
                    </h2>
                    <p className="text-sm font-bold text-brand tracking-wide mt-0.5 line-clamp-2">
                        {isBusiness ? (clinicName || 'Partner Business') : isRider ? (vehicleType ? `${vehicleType} • ${RIDER_TEXT.profile.portalBadge}` : RIDER_TEXT.profile.portalBadge) : 'Bronze Elite Member'}
                    </p>
                    <p className="text-sm font-medium text-slate-600 mt-0.5 break-words max-w-full leading-normal">
                        {user?.email}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderNavList = () => (
        <div className="bg-white rounded-[1.5rem] p-3 sm:p-4 mt-4 relative z-20 shadow-sm border border-slate-100 space-y-1">
            {navItems.map((item) => {
                const isActive = section === item.id;
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => handleSelectSection(item.id)}
                        className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all group ${
                            isActive
                                ? 'bg-brand/10 text-brand-dark shadow-sm'
                                : 'text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-3.5 text-left">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-brand-dark transition-colors">
                                    {item.label}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {item.sub}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isActive && <div className="w-2 h-2 rounded-full bg-brand-dark" />}
                            <ChevronRight className="w-4 h-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                        </div>
                    </button>
                );
            })}

            <div className="my-3 border-t border-slate-100" />

            {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.label}
                        onClick={item.onClick}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all group text-slate-800 hover:bg-slate-50"
                    >
                        <div className="flex items-center gap-3.5 text-left">
                            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-brand-dark transition-colors">
                                    {item.label}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {item.sub}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </button>
                );
            })}
        </div>
    );

    const renderSectionContent = () => (
        <motion.div
            key={section}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
                        {section === 'profile' && (
                            <div>
                                <h3 className="text-[22px] sm:text-2xl lg:text-[26px] font-black text-accent-brown tracking-tight my-4 sm:my-6 leading-snug">
                                    {isBusiness ? 'Clinic Information' : isRider ? 'Rider Information' : 'Profile Information'}
                                </h3>
                                <div className="space-y-4 sm:space-y-5">
                                    {isBusiness ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                                {/* Clinic Name */}
                                                <div>
                                                    <label htmlFor="clinic-name" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Clinic Name
                                                    </label>
                                                    <input
                                                        id="clinic-name"
                                                        type="text"
                                                        value={clinicName}
                                                        onChange={e => setClinicName(e.target.value)}
                                                        placeholder="My Veterinary Clinic"
                                                        className="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-black/40"
                                                    />
                                                </div>

                                                {/* Clinic Phone */}
                                                <div>
                                                    <label htmlFor="clinic-phone" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Clinic Phone <span className="text-brand">*</span>
                                                        <span className="sr-only"> (required)</span>
                                                    </label>
                                                    <div className="w-full min-h-[52px] h-[52px] sm:h-14 px-4 rounded-2xl bg-accent-peach/20 border border-amber-900/15 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 focus-within:bg-white flex items-center transition-all">
                                                        <div className="flex items-center gap-1.5 border-r border-accent-brown/20 pr-3 mr-3 text-base font-black text-slate-900 shrink-0 select-none">
                                                            +63
                                                        </div>
                                                        <input
                                                            id="clinic-phone"
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
                                                            className="w-full bg-transparent text-base font-bold text-accent-brown outline-none tabular-nums placeholder:font-normal placeholder:text-black/40"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Owner Full Name */}
                                                <div>
                                                    <label htmlFor="owner-full-name" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Owner Full Name
                                                    </label>
                                                    <input
                                                        id="owner-full-name"
                                                        type="text"
                                                        value={ownerFullName}
                                                        onChange={e => setOwnerFullName(e.target.value)}
                                                        placeholder="Juan Dela Cruz"
                                                        className="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30"
                                                    />
                                                </div>

                                                {/* Sex */}
                                                <div>
                                                    <CustomDropdown
                                                        label="Sex"
                                                        value={ownerGender}
                                                        onChange={setOwnerGender}
                                                        labelClassName="text-sm font-bold text-slate-800 mb-2 block"
                                                        buttonClassName="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown flex items-center justify-between text-left transition-all hover:bg-accent-peach/30"
                                                        options={[
                                                            { label: 'Male', value: 'Male' },
                                                            { label: 'Female', value: 'Female' },
                                                            { label: 'Other', value: 'Other' },
                                                            { label: 'Rather not say', value: 'Rather not say' },
                                                        ]}
                                                    />
                                                </div>

                                                {/* Birthdate & Age Auto-fill: across both columns */}
                                                <div className="md:col-span-2">
                                                    <div className="grid grid-cols-1 min-[360px]:grid-cols-[1.6fr_1fr] sm:grid-cols-[1.6fr_1fr] md:grid-cols-[1.6fr_1fr] gap-3 sm:gap-4 items-start">
                                                        <div>
                                                            <CustomDatePicker
                                                                mode="person birthday"
                                                                label="Birthdate"
                                                                value={ownerBirthday}
                                                                onChange={setOwnerBirthday}
                                                                onModalOpenChange={setIsDatePickerOpen}
                                                                labelClassName="text-sm font-bold text-slate-800 mb-2 block"
                                                                buttonClassName="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown flex items-center justify-between text-left transition-all hover:bg-accent-peach/30"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="age-autofill" className="text-sm font-bold text-slate-800 mb-2 block">
                                                                Age <span className="text-brand text-xs font-semibold">Auto-fill</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    id="age-autofill"
                                                                    type="text"
                                                                    value={calculateAge(ownerBirthday)}
                                                                    readOnly
                                                                    aria-readonly="true"
                                                                    tabIndex={-1}
                                                                    aria-label="Age Auto-fill, read-only"
                                                                    placeholder="—"
                                                                    className="w-full bg-accent-peach/10 border border-slate-200/90 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-black text-slate-700 outline-none cursor-default select-none pointer-events-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Registered Email: across both columns */}
                                                <div className="md:col-span-2 pt-2 border-t border-accent-brown/10">
                                                    <label htmlFor="registered-email" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Registered Email
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            id="registered-email"
                                                            type="email"
                                                            value={email}
                                                            readOnly
                                                            aria-readonly="true"
                                                            className="w-full bg-accent-peach/20 border border-amber-900/15 rounded-2xl min-h-[52px] h-[52px] sm:h-14 pl-4 sm:pl-5 pr-28 text-base font-bold text-slate-800 outline-none cursor-default"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => { setShowEmailModal(true); setNewEmail(email); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold text-brand-dark bg-brand/10 hover:bg-brand/20 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                                                        >
                                                            Verify
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons for Business: Cancel & Save Changes */}
                                            <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-3 pt-6 mt-6 border-t border-accent-brown/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileView('menu')}
                                                    className="w-full sm:w-auto min-h-[48px] h-12 sm:h-14 px-6 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveProfile}
                                                    disabled={savingProfile}
                                                    aria-disabled={savingProfile}
                                                    className="w-full sm:w-auto min-h-[48px] h-12 sm:h-14 px-8 rounded-2xl font-bold text-sm sm:text-base text-white bg-brand-dark hover:bg-black transition-all shadow-lg shadow-brand-dark/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                                    <span>Save Changes</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Name fields: 1 per row on phones (< 640px), 3 equal columns from sm (>= 640px) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                                                <div>
                                                    <label htmlFor="profile-first-name" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        First Name <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                                                        <span className="sr-only"> (required)</span>
                                                    </label>
                                                    <input
                                                        id="profile-first-name"
                                                        type="text"
                                                        disabled={savingProfile || saveStatus === "saving"}
                                                        value={firstName}
                                                        onChange={e => setFirstName(e.target.value)}
                                                        placeholder="Enter First Name"
                                                        className="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown outline-none transition-all placeholder:text-stone-500 placeholder:font-normal placeholder:text-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="profile-middle-name" className="text-sm font-bold text-slate-800 mb-2 flex items-center flex-wrap">
                                                        <span>Middle Name</span>
                                                        <span className="text-slate-600 text-xs font-normal ml-1.5">Optional</span>
                                                    </label>
                                                    <input
                                                        id="profile-middle-name"
                                                        type="text"
                                                        disabled={savingProfile || saveStatus === "saving"}
                                                        value={middleName}
                                                        onChange={e => setMiddleName(e.target.value)}
                                                        placeholder="Enter Middle Name"
                                                        className="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown outline-none transition-all placeholder:text-stone-500 placeholder:font-normal placeholder:text-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="profile-surname" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Surname <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                                                        <span className="sr-only"> (required)</span>
                                                    </label>
                                                    <input
                                                        id="profile-surname"
                                                        type="text"
                                                        disabled={savingProfile || saveStatus === "saving"}
                                                        value={lastName}
                                                        onChange={e => setLastName(e.target.value)}
                                                        placeholder="Enter Surname"
                                                        className="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown outline-none transition-all placeholder:text-stone-500 placeholder:font-normal placeholder:text-base"
                                                    />
                                                </div>
                                            </div>

                                            {/* Suffix and Sex: 2 columns on tablet/desktop */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                                <div>
                                                    <CustomDropdown
                                                        label="Suffix"
                                                        isOptional={true}
                                                        disabled={savingProfile || saveStatus === "saving"}
                                                        value={suffix}
                                                        onChange={setSuffix}
                                                        labelClassName="text-sm font-bold text-slate-800 mb-2 block"
                                                        buttonClassName="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown flex items-center justify-between text-left transition-all hover:bg-accent-peach/30"
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
                                                <div>
                                                    <CustomDropdown
                                                        label="Sex"
                                                        disabled={savingProfile || saveStatus === "saving"}
                                                        value={gender}
                                                        onChange={setGender}
                                                        labelClassName="text-sm font-bold text-slate-800 mb-2 block"
                                                        buttonClassName="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown flex items-center justify-between text-left transition-all hover:bg-accent-peach/30"
                                                        options={[
                                                            { label: 'Male', value: 'Male' },
                                                            { label: 'Female', value: 'Female' },
                                                            { label: 'Other', value: 'Other' },
                                                            { label: 'Prefer not to say', value: 'Prefer not to say' },
                                                        ]}
                                                    />
                                                </div>
                                            </div>

                                            {/* Date of Birth & Age Auto-fill: 62% / 38% split from 360px */}
                                            <div>
                                                <div className="grid grid-cols-1 min-[360px]:grid-cols-[1.6fr_1fr] sm:grid-cols-[1.6fr_1fr] md:grid-cols-[1.6fr_1fr] gap-3 sm:gap-4 items-start">
                                                    <div>
                                                        <CustomDatePicker
                                                            mode="person birthday"
                                                            label="Date of Birth"
                                                            isRequired={true}
                                                            disabled={savingProfile || saveStatus === "saving"}
                                                            value={birthday}
                                                            onChange={setBirthday}
                                                            onModalOpenChange={setIsDatePickerOpen}
                                                            labelClassName="text-sm font-bold text-slate-800 mb-2 block"
                                                            buttonClassName="w-full bg-accent-peach/20 border border-amber-900/15 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-bold text-accent-brown flex items-center justify-between text-left transition-all hover:bg-accent-peach/30"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="profile-age-autofill" className="text-sm font-bold text-slate-800 mb-2 block">
                                                            Age <span className="text-brand text-xs font-semibold">Auto-fill</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                id="profile-age-autofill"
                                                                type="text"
                                                                value={calculateAge(birthday)}
                                                                readOnly
                                                                aria-readonly="true"
                                                                tabIndex={-1}
                                                                aria-label="Age Auto-fill, read-only"
                                                                placeholder="—"
                                                                className="w-full bg-accent-peach/10 border border-slate-200/90 rounded-2xl min-h-[52px] h-[52px] sm:h-14 px-4 text-base font-black text-slate-700 outline-none cursor-default select-none pointer-events-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Number & Email Address: 2 columns on tablet/desktop */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-4 border-t border-accent-brown/10">
                                                <div>
                                                    <label htmlFor="profile-phone" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Contact Number <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                                                        <span className="sr-only"> (required)</span>
                                                    </label>
                                                    <div className="w-full min-h-[52px] h-[52px] sm:h-14 px-4 rounded-2xl bg-accent-peach/20 border border-amber-900/15 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 focus-within:bg-white flex items-center transition-all">
                                                        <div className="flex items-center gap-1.5 border-r border-accent-brown/20 pr-3 mr-3 text-base font-black text-slate-900 shrink-0 select-none">
                                                            +63
                                                        </div>
                                                        <input
                                                            id="profile-phone"
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
                                                            className="w-full bg-transparent text-base font-bold text-accent-brown outline-none tabular-nums placeholder:text-stone-500 placeholder:font-normal placeholder:text-base"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label htmlFor="profile-email" className="text-sm font-bold text-slate-800 mb-2 block">
                                                        Email Address
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            id="profile-email"
                                                            type="email"
                                                            value={email}
                                                            readOnly
                                                            aria-readonly="true"
                                                            className="w-full bg-accent-peach/20 border border-amber-900/15 rounded-2xl min-h-[52px] h-[52px] sm:h-14 pl-4 sm:pl-5 pr-28 text-base font-bold text-slate-800 outline-none cursor-default"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => { setShowEmailModal(true); setNewEmail(email); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold text-brand-dark bg-brand/10 hover:bg-brand/20 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                                                        >
                                                            Update
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rider Specific: Vehicle Type & Registered Address */}
                                            {isRider && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-4 border-t border-accent-brown/10">
                                                    <div>
                                                        <label className="text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                                                            <span>{RIDER_TEXT.profile.vehicleLabel}</span>
                                                            <span className="text-brand-dark text-xs font-bold">{RIDER_TEXT.profile.vehicleVerified}</span>
                                                        </label>
                                                        <div className="relative w-full min-h-[52px] h-[52px] sm:h-14 px-4 rounded-2xl bg-accent-peach/20 border border-amber-900/15 flex items-center">
                                                            <span className="text-brand-dark mr-3 shrink-0">
                                                                <Bike className="w-5 h-5" />
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={vehicleType}
                                                                readOnly
                                                                aria-readonly="true"
                                                                tabIndex={-1}
                                                                className="w-full bg-transparent text-base font-bold text-accent-brown outline-none cursor-default"
                                                            />
                                                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                                                <span className="text-xs font-bold text-green-600">{RIDER_TEXT.profile.vehicleActive}</span>
                                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                                                            <span>{RIDER_TEXT.profile.addressLabel}</span>
                                                            <span className="text-slate-600 text-xs font-normal">{RIDER_TEXT.profile.addressSub}</span>
                                                        </label>
                                                        <div className="relative w-full min-h-[52px] sm:min-h-[56px] py-2 px-4 rounded-2xl bg-accent-peach/20 border border-amber-900/15 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <span className="text-brand-dark shrink-0">
                                                                    <MapPin className="w-5 h-5" />
                                                                </span>
                                                                <span className="text-base font-bold text-accent-brown truncate">
                                                                    {addresses.find(a => a.is_default)?.address_line1 || addresses[0]?.address_line1 || 'No address registered'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSection('addresses')}
                                                                className="min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold text-brand-dark bg-brand/10 hover:bg-brand/20 transition-all active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
                                                            >
                                                                Change
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Redesigned Verification Card */}
                                            <section
                                                aria-label="Profile verification"
                                                className="bg-white sm:bg-[#FAF9F5]/70 rounded-[1.25rem] p-4 sm:p-5 border border-emerald-900/10 shadow-sm transition-all"
                                            >
                                                {/* Header row: soft green tile (44px) + title + green status chip */}
                                                <div className="flex items-start sm:items-center gap-3.5">
                                                    <div
                                                        aria-hidden="true"
                                                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-sm"
                                                    >
                                                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-base sm:text-[17px] font-bold text-slate-900 tracking-tight leading-snug">
                                                                Profile Verified
                                                            </h4>
                                                            <span
                                                                role="status"
                                                                aria-label="Verified"
                                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/50"
                                                            >
                                                                Verified
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 font-medium leading-relaxed mt-1">
                                                            Your identity has been verified.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Thin divider */}
                                                <div className="my-3.5 sm:my-4 border-t border-accent-brown/10" />

                                                {/* Information row: tidy label and value pair */}
                                                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-4">
                                                    <div className="bg-white/80 rounded-xl p-2.5 sm:p-3 border border-accent-brown/5">
                                                        <span className="text-xs sm:text-[13px] font-medium text-slate-500 block">
                                                            Age verified
                                                        </span>
                                                        <span
                                                            className="text-sm sm:text-base font-bold text-slate-800 mt-0.5 block tabular-nums"
                                                            aria-label={`Age verified: ${calculateAge(birthday) || 'Not provided'}`}
                                                        >
                                                            {calculateAge(birthday) || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>
                                        </>
                                    )}

                                    {!isBusiness && (
                                        <>
                                            {/* Screen Reader Live Announcement */}
                                            <div className="sr-only" aria-live="polite" aria-atomic="true">
                                                {saveStatus === 'saved' && 'Profile saved'}
                                                {saveStatus === 'saving' && 'Saving profile changes'}
                                                {saveStatus === 'error' && (saveErrorMessage || 'Could not save profile changes')}
                                            </div>

                                            {/* Save Changes Action Footer (Sticky on Mobile, Aligned Right on Tablets/Desktops) */}
                                            <div className="sticky bottom-16 sm:bottom-0 sm:static z-30 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none p-3 sm:p-0 -mx-4 sm:mx-0 border-t border-accent-brown/10 sm:border-0 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] sm:shadow-none transition-all mt-6 sm:mt-8">
                                                <div className="flex flex-col gap-2.5 sm:gap-3 max-w-full">
                                                    {/* Error State Message */}
                                                    {saveStatus === 'error' && saveErrorMessage && (
                                                        <div role="alert" className="w-full flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200/80 px-3.5 py-2.5 rounded-xl">
                                                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" aria-hidden="true" />
                                                            <span>{saveErrorMessage}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
                                                        {/* Unsaved Changes Indicator */}
                                                        {isProfileChanged && saveStatus !== 'saving' && saveStatus !== 'saved' && (
                                                            <div className="flex items-center justify-center sm:justify-end">
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                                                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                                                                    Unsaved changes
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Save Changes Button (5 States) */}
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveProfile}
                                                            disabled={!isProfileChanged || savingProfile || saveStatus === 'saving' || !!phoneError || phoneChecking}
                                                            aria-disabled={!isProfileChanged || savingProfile || saveStatus === 'saving' || !!phoneError || phoneChecking}
                                                            className={`w-full sm:w-auto sm:min-w-[200px] sm:max-w-[240px] h-[52px] min-h-[52px] px-6 rounded-[1.25rem] font-bold text-base transition-all flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark select-none ${
                                                                saveStatus === 'saved'
                                                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                                                    : isProfileChanged && !phoneError && !phoneChecking
                                                                        ? 'bg-brand-dark hover:bg-black text-white shadow-lg shadow-brand-dark/20 active:scale-95 cursor-pointer'
                                                                        : 'bg-brand/15 text-brand-dark/70 border border-brand/20 cursor-not-allowed shadow-none'
                                                            }`}
                                                        >
                                                            {saveStatus === 'saving' ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                                    <span>Saving...</span>
                                                                </>
                                                            ) : saveStatus === 'saved' ? (
                                                                <>
                                                                    <Check className="w-4 h-4 text-white" aria-hidden="true" />
                                                                    <span>Saved</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Check className={`w-4 h-4 ${isProfileChanged ? 'text-white' : 'text-brand-dark/50'}`} aria-hidden="true" />
                                                                    <span>Save Changes</span>
                                                                    {!isProfileChanged && <span className="sr-only"> (No changes to save)</span>}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {section === 'addresses' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-accent-brown tracking-tighter">{isBusiness ? 'Clinic Locations' : 'My Addresses'}</h3>
                                        <p className="text-xs font-medium text-slate-500 mt-1">{isBusiness ? 'Manage your veterinary branches' : 'Manage your delivery locations'}</p>
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
                                        className="flex items-center justify-center gap-2 bg-brand-dark text-white px-5 py-3 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md group"
                                    >
                                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> {isBusiness ? 'Add Branch Location' : 'Add New Address'}
                                    </button>
                                </div>

                                {loadingAddresses ? (
                                    <div className="flex flex-col items-center justify-center py-24 opacity-20">
                                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                        <p className="font-bold text-xs text-slate-500">Synchronizing...</p>
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-accent-peach/20">
                                        <div className="w-20 h-20 bg-accent-peach/10 rounded-[1.5rem] flex items-center justify-center mb-6 text-black">
                                            <MapPin className="w-10 h-10" />
                                        </div>
                                        <h4 className="font-black text-black tracking-tight text-lg">{isBusiness ? 'No Branch Locations' : 'No Addresses Saved'}</h4>
                                        <p className="text-xs text-slate-500 mt-2 max-w-[240px] leading-relaxed">{isBusiness ? 'Add your clinic branches to let customers find you.' : 'Add an address to start shopping with premium delivery service.'}</p>
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
                                                        <p className="text-xs font-bold text-slate-500 pb-1 border-b border-accent-brown/5">
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
                                                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${addr.label === 'Home' ? 'bg-blue-50 text-blue-500 border border-blue-100' : 'bg-green-50 text-green-500 border border-green-100'}`}>
                                                                {addr.label}
                                                            </span>
                                                            {addr.is_default && (
                                                                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-brand text-white border border-brand/20 shadow-sm">
                                                                    {isBusiness ? 'Main' : 'Default'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-slate-800 leading-relaxed">
                                                            {addr.address_line1}
                                                        </p>
                                                        <p className="text-sm font-semibold text-brand">
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
                                                            className="text-xs font-bold text-slate-700 hover:text-accent-brown transition-colors flex items-center gap-2 group/btn"
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
                                                className="w-full py-3.5 mt-2 border-2 border-dashed border-accent-peach/20 rounded-2xl text-xs font-bold text-slate-700 hover:text-brand hover:border-brand/30 transition-all flex items-center justify-center gap-2"
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
                                                <label className="text-xs font-semibold text-slate-700 block mb-3 pl-1">{f.label}</label>
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
                                        className="mt-4 flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-accent-brown transition-all disabled:opacity-50 shadow-xl shadow-brand-dark/10 active:scale-95">
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
                                        { key: 'orderUpdates', label: RIDER_TEXT.profile.notifRequests, sub: RIDER_TEXT.profile.notifRequestsSub },
                                        { key: 'loyaltyAlerts', label: RIDER_TEXT.profile.notifEarnings, sub: RIDER_TEXT.profile.notifEarningsSub },
                                        { key: 'newsletter', label: RIDER_TEXT.profile.notifUpdates, sub: RIDER_TEXT.profile.notifUpdatesSub },
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
                                    className="mt-6 flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-black transition-colors">
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
                                    <label className="text-xs font-semibold text-red-500 block mb-2 pl-1">Type <span className="text-red-600 font-bold">DELETE</span> to confirm</label>
                                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE"
                                        className="w-full bg-red-50 border-2 border-red-100 focus:border-red-300 rounded-xl py-3 px-4 text-sm font-bold text-red-500 outline-none transition-all placeholder:text-red-200 mb-4" />
                                    <button onClick={handleDelete} disabled={deleteConfirm !== 'DELETE'}
                                        className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Trash2 className="w-4 h-4" /> Delete My Account
                                    </button>
                                </div>
                            </div>
                        )}
        </motion.div>
    );


    return (
        <DashboardLayout title="" hideHeader={true}>
            <div className={`w-full max-w-[1440px] mx-auto space-y-6 sm:space-y-8 pb-28 sm:pb-32 lg:pb-12 px-4 sm:px-6 lg:px-8 ${isAnyModalOpen ? 'opacity-30 blur-2xl pointer-events-none' : 'opacity-100'}`}>

                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Visually hidden heading for Rider a11y */}
                {isRider && <h1 className="sr-only">{RIDER_TEXT.profile.pageTitle}</h1>}

                {/* Mobile & Tablet View (< 1024px) */}
                <div className="lg:hidden w-full sm:max-w-[760px] md:max-w-[840px] mx-auto space-y-4">
                    {renderHeaderCard()}
                    {mobileView === 'menu' ? (
                        renderNavList()
                    ) : (
                        <div className="bg-white rounded-[1.5rem] p-4 sm:p-6 lg:p-8 mt-4 relative z-20 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between min-h-[44px] pb-4 mb-4 sm:pb-5 sm:mb-6 border-b border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setMobileView('menu')}
                                    className="min-h-[44px] px-3 -ml-3 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-dark hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back to Menu
                                </button>
                                <span className="text-sm font-bold text-brand-dark min-h-[44px] flex items-center">
                                    {navItems.find(i => i.id === section)?.label}
                                </span>
                            </div>
                            {renderSectionContent()}
                        </div>
                    )}
                </div>

                {/* Desktop View: Side-by-Side (Navigation Card Left, Active Section Form Right) */}
                <div className={`hidden lg:grid lg:grid-cols-12 gap-8 items-start mx-auto ${isBusiness ? 'lg:max-w-5xl xl:max-w-6xl' : 'lg:max-w-4xl xl:max-w-[960px]'}`}>
                    <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                        {renderHeaderCard()}
                        {renderNavList()}
                    </div>
                    <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-[1.5rem] p-6 lg:p-8 xl:p-10 shadow-sm border border-slate-100">
                        {renderSectionContent()}
                    </div>
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
                                className="w-full bg-brand-dark text-white px-6 py-3.5 rounded-xl font-bold text-xs hover:bg-black transition-colors"
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
                                        <p className="text-xs font-medium text-slate-500 mt-1">{isBusiness ? 'Branch details' : 'Delivery details'}</p>
                                    </div>
                                    <button onClick={() => setShowAddrModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black hover:text-accent-brown transition-all shadow-sm">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-700 pl-1">{isBusiness ? 'Branch/Clinic Name' : 'Contact Name'}</label>
                                            <input type="text" value={addrForm.full_name} onChange={e => setAddrForm({ ...addrForm, full_name: e.target.value })} placeholder={isBusiness ? "e.g. Main Branch" : "Full Name"}
                                                className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 pl-1">Phone Number</label>
                                            <input type="tel" value={addrForm.phone} onChange={e => setAddrForm({ ...addrForm, phone: e.target.value })} placeholder="09XX XXX XXXX"
                                                className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700 pl-1 flex items-center gap-2">
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
                                        <p className="text-[11px] text-slate-500 pl-1 italic">Note: Searching will auto-fill basic location. Click the pin to edit granular details manually.</p>
                                    </div>

                                    <div className="p-6 bg-accent-peach/5 rounded-[2rem] border border-accent-peach/10 space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-700">Precise address confirmation</p>
                                            <p className="text-xs font-bold text-accent-brown leading-relaxed capitalize">
                                                {[addrForm.house_number, addrForm.block_number, addrForm.street, addrForm.subdivision, addrForm.sitio, addrForm.barangay, addrForm.city, addrForm.province, addrForm.zip_code].filter(Boolean).join(' ')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700 pl-1">Delivery notes / landmark instructions</label>
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
                                                className={`py-3 rounded-2xl text-xs font-bold border-2 transition-all ${addrForm.label === l ? 'border-brand bg-brand/5 text-accent-brown shadow-md shadow-brand/5' : 'border-transparent bg-white text-slate-700 hover:bg-slate-50'}`}>
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
                                        className="w-full bg-brand-dark text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-brand-dark/10"
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
                            <p className="text-xs text-slate-500 mb-8 relative">Verify your new email address</p>

                            <div className="space-y-6 relative">
                                {!otpSent ? (
                                    <>
                                        <div>
                                            <label htmlFor="modal-new-email" className="text-xs font-semibold text-slate-700 block mb-2 pl-1">New Email Address</label>
                                            <input 
                                                id="modal-new-email"
                                                type="email" 
                                                value={newEmail} 
                                                onChange={e => {
                                                    setNewEmail(e.target.value);
                                                    if (modalEmailError) setModalEmailError(null);
                                                }} 
                                                onBlur={handleModalEmailBlur}
                                                aria-invalid={!!modalEmailError}
                                                aria-describedby={modalEmailError ? "modal-new-email-error" : undefined}
                                                placeholder="new-email@example.com"
                                                className={`w-full bg-accent-peach/20 border-2 ${modalEmailError ? 'border-red-400' : 'border-transparent focus:border-brand/30'} focus:bg-white rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all`} 
                                            />
                                            {modalEmailError && (
                                                <p id="modal-new-email-error" role="alert" aria-live="polite" className="text-xs font-bold text-red-500 flex items-center gap-1.5 mt-1.5 pl-1">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                    {modalEmailError}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={handleRequestEmailChange} disabled={sendingOtp || !!modalEmailError || modalEmailChecking}
                                            className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-brand/10">
                                            {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Send Verification Code
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 block mb-2 pl-1">New Email</label>
                                            <div className="bg-accent-peach/10 py-3 px-5 rounded-2xl text-xs font-bold text-accent-brown/50 border-2 border-dashed border-accent-peach/30">{newEmail}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 block mb-2 pl-1">Verification Code</label>
                                            <input type="text" maxLength={6} value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                                                className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 px-5 text-center text-2xl font-black tracking-[1em] text-accent-brown outline-none transition-all" />
                                        </div>
                                        <button onClick={handleVerifyEmailChange} disabled={verifyingEmail}
                                            className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-brand/10">
                                            {verifyingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Verify & Update Email
                                        </button>
                                        <button onClick={() => setOtpSent(false)} className="w-full text-xs font-bold text-slate-700 hover:text-accent-brown transition-colors">
                                            Use a different email
                                        </button>
                                    </>
                                )}

                                <button onClick={() => { setShowEmailModal(false); setOtpSent(false); setNewEmail(''); setEmailOtp(''); }}
                                    className="w-full py-3.5 rounded-2xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition-all border-2 border-slate-200 hover:border-transparent">
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

            <ConfirmLogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={() => {
                    logout();
                    navigate('/');
                }}
            />

            {isRider && <RiderBottomNav />}
        </DashboardLayout>
    );
};

export default AccountSettings;
