import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Lock, Bell, Trash2, Check, Loader2, Eye, EyeOff, 
    AlertTriangle, CheckCircle, MapPin, Plus, Edit2, Trash 
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../../components/PasswordStrength';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomDropdown } from '../../components/CustomDropdown';
import AddressAutocomplete from '../../components/AddressAutocomplete';

type Section = 'profile' | 'addresses' | 'password' | 'notifications' | 'danger';

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'My Addresses', icon: MapPin },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

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
    const [gender, setGender] = useState(user?.gender ?? '');
    const [birthday, setBirthday] = useState(user?.birthday ?? '');
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
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [showAddrModal, setShowAddrModal] = useState(false);
    const [editingAddr, setEditingAddr] = useState<Address | null>(null);
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
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [hasPassword, setHasPassword] = useState(true);

    const handleAddressComponents = (_full: string, components: any[], geometry?: { lat: number, lng: number }, granular?: any) => {
        if (granular) {
            setAddrForm(prev => ({
                ...prev,
                address_line1: _full,
                house_number: granular.houseNumber,
                block_number: granular.blockNumber,
                street: granular.street,
                subdivision: granular.subdivision,
                sitio: granular.sitio,
                barangay: granular.barangay,
                city: granular.city,
                district: granular.district,
                province: granular.province,
                zip_code: granular.zip,
                region: granular.region,
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

    const handleClinicAddressComponents = (_full: string, components: any[], geometry?: { lat: number, lng: number }, granular?: any) => {
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
            if (types.includes('administrative_area_level_2')) district = c.long_name;
            if (types.includes('neighborhood') || types.includes('subdivision')) subdivision = c.long_name;
        });

        setClinicHouseNumber(houseNum);
        setClinicStreet(street);
        setClinicBarangay(barangay);
        setClinicCity(city);
        setClinicProvince(province);
        setClinicZip(zip);
        setClinicDistrict(district);
        setClinicSubdivision(subdivision);
        setClinicRegion(region);
        if (geometry) {
            setClinicLat(geometry.lat);
            setClinicLng(geometry.lng);
        }
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ open: true, title, message, onConfirm });
    };

    // Fetch fresh data from DB on mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.token) return;
            if (user.role !== 'user' && user.role !== 'business' && user.role !== 'rider') return;
            
            try {
                const res = await fetch('http://localhost:8000/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (user.role === 'business') {
                        setClinicName(data.clinic_name || '');
                        setClinicPhone(data.clinic_phone || '');
                        setOwnerFullName(data.owner_full_name || '');
                        setEmail(data.email || '');
                        setLoyaltyPointsPerPeso(data.loyalty_points_per_peso ?? 10.0);
                        setLoyaltyPointsPerReservation(data.loyalty_points_per_reservation ?? 50);
                        
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
                    } else if (user.role === 'rider') {
                        setFirstName(data.first_name || '');
                        setLastName(data.last_name || '');
                        setSuffix(data.suffix || '');
                        setEmail(data.email || '');
                        setPhone(data.phone || '');
                    } else {
                        setFirstName(data.first_name || '');
                        setMiddleName(data.middle_name || '');
                        setLastName(data.last_name || '');
                        setSuffix(data.suffix || '');
                        setEmail(data.email || '');
                        setPhone(data.phone || '');
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
                // Normalize data structure
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
                    setAddresses(normalized);
                }
            }
        } catch (err) {
            console.error('Failed to fetch addresses', err);
        } finally {
            setLoadingAddresses(false);
        }
    };

    useEffect(() => {
        if (section === 'addresses') fetchAddresses();
    }, [section, user?.token]);

    // Password
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw] = useState(false);
    const [savingPw, setSavingPw] = useState(false);
    const [pwError, setPwError] = useState('');

    // Notifications
    const [notifs, setNotifs] = useState({ orderUpdates: true, loyaltyAlerts: true, newsletter: false, gmailNotifications: false });

    // Toast & Modals
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showGooglePwModal, setShowGooglePwModal] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const handleSaveProfile = async () => {
        if (!user?.token) return;
        setSavingProfile(true);
        try {
            const res = await fetch('http://localhost:8000/api/customer/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(user?.role === 'business' ? {
                    clinic_name: clinicName || null,
                    clinic_phone: clinicPhone || null,
                    first_name: ownerFullName || null, // Map to first_name for owner
                    email: email || null,
                    loyalty_points_per_peso: parseFloat(loyaltyPointsPerPeso.toString()),
                    loyalty_points_per_reservation: parseInt(loyaltyPointsPerReservation.toString()),
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
                } : user?.role === 'rider' ? {
                    first_name: firstName || null,
                    last_name: lastName || null,
                    suffix: suffix || null,
                    email: email || null,
                    phone: phone || null,
                } : {
                    first_name: firstName || null,
                    middle_name: middleName || null,
                    last_name: lastName || null,
                    suffix: suffix || null,
                    email: email || null,
                    phone: phone || null,
                    gender: gender || null,
                    birthday: birthday || null,
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    loginWithToken(data.token);
                }
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

    const handleDelete = () => {
        if (deleteConfirm !== 'DELETE') return;
        logout();
        navigate('/');
    };

    const initials = (isBusiness ? (clinicName || user?.name || 'C') : (user?.name || user?.email || 'U')).slice(0, 2).toUpperCase();

    return (
        <DashboardLayout title="Account Settings">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-bold text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Profile Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-dark rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden text-center sm:text-left">
                    {user?.avatar && !isBusiness ? (
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-20 h-20 rounded-full object-cover ring-4 ring-white/20 shrink-0 z-10"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-brand text-brand-dark flex items-center justify-center font-black text-2xl shrink-0 z-10">
                            {initials}
                        </div>
                    )}
                    <div className="z-10">
                        <h2 className="text-2xl font-black tracking-tight">{user?.name ?? 'User'}</h2>
                        <p className="text-white/50 font-medium text-sm">{user?.email}</p>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-[60px]" />
                </motion.div>

                {/* Tab nav + Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar nav / Tab Bar */}
                    <div className="lg:w-64 shrink-0">
                        <div className="bg-white rounded-[2rem] p-2 sm:p-4 shadow-xl shadow-accent-brown/5 border border-white flex lg:flex-col overflow-x-auto no-scrollbar lg:overflow-visible gap-1 sm:gap-2">
                                    {NAV.map(n => {
                                        let label = n.label;
                                        if (isBusiness) {
                                            if (n.id === 'profile') label = 'Clinic Profile';
                                            if (n.id === 'addresses') label = 'Clinic Locations';
                                        }
                                        return (
                                            <button key={n.id} onClick={() => {
                                                setSection(n.id);
                                                if (n.id === 'password' && isGoogleUser && !hasPassword) {
                                                    setShowGooglePwModal(true);
                                                }
                                            }}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all whitespace-nowrap lg:whitespace-normal group ${section === n.id ? 'bg-brand-dark text-white' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'} ${n.id === 'danger' ? 'lg:mt-4 lg:border-t lg:border-accent-brown/5 lg:pt-4 text-red-400 hover:bg-red-50 hover:text-red-500' : ''}`}>
                                                <n.icon className={`w-4 h-4 shrink-0 transition-transform ${section === n.id ? 'scale-110' : 'group-hover:scale-110'}`} /> 
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                        </div>
                    </div>

                    {/* Panel */}
                    <motion.div key={section} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex-1 bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-accent-brown/5 border border-white">

                        {section === 'profile' && (
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">{isBusiness ? 'Clinic Information' : 'Profile Information'}</h3>
                                <div className="space-y-5">
                                    {isBusiness ? (
                                        <>
                                            {/* Clinic Name & Phone */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Clinic Name</label>
                                                    <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="My Veterinary Clinic"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Clinic Phone</label>
                                                    <input type="tel" value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} placeholder="09XX XXX XXXX"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                </div>
                                            </div>
                                            {/* Owner Name */}
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Owner Full Name</label>
                                                <input type="text" value={ownerFullName} onChange={e => setOwnerFullName(e.target.value)} placeholder="Juan Dela Cruz"
                                                    className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                            </div>

                                            {/* Clinic Location Section */}
                                            <div className="mt-6 p-8 bg-accent-peach/5 rounded-[2.5rem] border border-accent-peach/10 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/40 flex items-center gap-2">
                                                        <MapPin className="w-3 h-3" /> Main Clinic Location
                                                    </label>
                                                    <span className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest italic flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-brand-dark animate-pulse" />
                                                        Mark Landmark on Map
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Address Search & Manual Landmark</label>
                                                    <AddressAutocomplete 
                                                        onAddressSelect={(full, components, geometry, granular) => {
                                                            handleClinicAddressComponents(full, components, geometry, granular);
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
                                                        className="!py-4 !rounded-2xl shadow-xl border-2 border-white focus:border-brand/30 bg-white"
                                                    />
                                                    <p className="text-[9px] font-bold text-accent-brown/20 uppercase tracking-widest pl-1">Click the pin icon to open the detailed landscape map editor.</p>
                                                </div>

                                                {/* Hidden display of current address for confirmation */}
                                                <div className="p-5 bg-white rounded-2xl border border-accent-peach/10 shadow-sm">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-2">Current Precise Address</p>
                                                    <p className="text-xs font-bold text-accent-brown leading-relaxed capitalize">
                                                        {[clinicHouseNumber, clinicBlockNumber, clinicStreet, clinicSubdivision, clinicSitio, clinicBarangay, clinicCity, clinicProvince, clinicZip].filter(Boolean).join(' ')}
                                                    </p>
                                                    {!clinicCity && <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-2">Address not yet set</p>}
                                                </div>
                                            </div>

                                            {/* Loyalty Settings */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-accent-brown/5">

                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Registered Email</label>
                                                    <input type="email" value={email} readOnly
                                                        className="w-full bg-accent-peach/10 border-2 border-transparent rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown/50 outline-none cursor-not-allowed" />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* First & Last Name */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">First Name</label>
                                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Last Name</label>
                                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                </div>
                                            </div>
                                            {/* Middle Name & Suffix */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {user?.role !== 'rider' && (
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Middle Name <span className="normal-case font-normal opacity-60">(optional)</span></label>
                                                        <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Santos"
                                                            className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                    </div>
                                                )}
                                                <div>
                                                    <CustomDropdown
                                                        label="Suffix (optional)"
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
                                            </div>
                                            {/* Email & Phone */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Email Address</label>
                                                    <input type="email" value={email} readOnly
                                                        className="w-full bg-accent-peach/10 border-2 border-transparent rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown/50 outline-none cursor-not-allowed" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Contact Number</label>
                                                    <div className="relative">
                                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-accent-brown/50">+63</span>
                                                        <input type="tel" value={phone.replace(/^\+63/, '')} onChange={e => {
                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                            setPhone(val ? `+63${val}` : '');
                                                        }} placeholder="912 345 6789"
                                                            className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 pl-14 pr-4 sm:pr-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Gender & Birthday */}
                                            {user?.role !== 'rider' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <CustomDropdown
                                                            label="Gender"
                                                            value={gender}
                                                            onChange={setGender}
                                                            options={[
                                                                { label: 'Male', value: 'Male' },
                                                                { label: 'Female', value: 'Female' },
                                                                { label: 'Other', value: 'Other' },
                                                                { label: 'Rather not say', value: 'Rather not say' },
                                                            ]}
                                                            placeholder="Select Gender"
                                                        />
                                                    </div>
                                                    <div>
                                                        <CustomDatePicker
                                                            label="Birthday"
                                                            value={birthday}
                                                            onChange={setBirthday}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <button onClick={handleSaveProfile} disabled={savingProfile}
                                        className="mt-2 flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50">
                                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {section === 'addresses' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-accent-brown tracking-tighter">{isBusiness ? 'Clinic Locations' : 'My Addresses'}</h3>
                                        <p className="text-[10px] font-bold text-accent-brown/30 uppercase tracking-[0.2em] mt-1">{isBusiness ? 'Manage your veterinary branches' : 'Manage your delivery locations'}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingAddr(null);
                                            setAddrForm({
                                                full_name: user?.name || '',
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
                                                label: 'Home',
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
                                        <div className="w-20 h-20 bg-accent-peach/10 rounded-[1.5rem] flex items-center justify-center mb-6 text-accent-brown/20">
                                            <MapPin className="w-10 h-10" />
                                        </div>
                                        <h4 className="font-black text-accent-brown/40 tracking-tight text-lg">{isBusiness ? 'No Branch Locations' : 'No Addresses Saved'}</h4>
                                        <p className="text-xs font-bold text-accent-brown/30 mt-2 max-w-[240px] leading-relaxed uppercase tracking-wider">{isBusiness ? 'Add your clinic branches to let customers find you.' : 'Add an address to start shopping with premium delivery service.'}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {(isBusiness && !showAllBranches ? addresses.slice(0, 1) : addresses).map(addr => (
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
                                                        className="w-10 h-10 bg-accent-peach/5 rounded-xl flex items-center justify-center text-accent-brown/40 hover:bg-brand/10 hover:text-brand-dark transition-all"
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
                                                                    if (res.ok) { fetchAddresses(); setConfirmModal(null); }
                                                                }
                                                            );
                                                        }}
                                                        className="w-10 h-10 bg-accent-peach/5 rounded-xl flex items-center justify-center text-accent-brown/40 hover:bg-red-50 hover:text-red-500 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {isBusiness && (
                                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-accent-brown/25 pb-1 border-b border-accent-brown/5">
                                                            {clinicName || 'Clinic'}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl font-black text-accent-brown tracking-tighter">{addr.full_name}</span>
                                                            <div className="w-px h-4 bg-accent-brown/10 hidden sm:block" />
                                                            <span className="font-bold text-accent-brown/40 tabular-nums">{addr.phone}</span>
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
                                                        <p className="text-sm font-bold text-accent-brown/50 leading-relaxed uppercase tracking-tight">
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
                                                            className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30 hover:text-brand-dark transition-colors flex items-center gap-2 group/btn"
                                                        >
                                                            <div className="w-4 h-4 rounded-full border-2 border-accent-brown/10 group-hover/btn:border-brand/50 transition-colors" />
                                                            Set as Default
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {isBusiness && addresses.length > 1 && (
                                            <button 
                                                onClick={() => setShowAllBranches(!showAllBranches)}
                                                className="w-full py-4 mt-2 border-2 border-dashed border-accent-peach/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-accent-brown/30 hover:text-brand hover:border-brand/30 transition-all flex items-center justify-center gap-2"
                                            >
                                                {showAllBranches ? 'Hide other branches' : 'See more branches'}
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
                                <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Change Password</h3>
                                {pwError && (
                                    <div className="bg-red-50 border border-red-100 text-red-500 rounded-xl px-4 py-3 text-sm font-bold mb-5 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" /> {pwError}
                                    </div>
                                )}
                                <div className="space-y-5">
                                    {[
                                        { label: 'Current Password', key: 'current' as const },
                                        { label: 'New Password', key: 'next' as const },
                                        { label: 'Confirm New Password', key: 'confirm' as const },
                                    ]
                                        .filter(f => !(!hasPassword && f.key === 'current'))
                                        .map(f => (
                                            <div key={f.key}>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">{f.label}</label>
                                                <div className="relative">
                                                    <input type={showPw ? 'text' : 'password'} value={pw[f.key]} onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                                                        placeholder="••••••••"
                                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-4 pl-5 pr-12 text-sm font-bold text-accent-brown outline-none transition-all placeholder:text-accent-brown/20" />
                                                    {f.key === 'next' && (
                                                        <button type="button" onClick={() => setShowPw(!showPw)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors">
                                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                                {f.key === 'next' && pw.next && (
                                                    <div className="mt-2">
                                                        <PasswordStrength password={pw.next} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    <button onClick={handleSavePassword} disabled={savingPw}
                                        className="flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50">
                                        {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Update Password
                                    </button>
                                </div>
                            </div>
                        )}

                        {section === 'notifications' && (
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Notification Preferences</h3>
                                <div className="space-y-2">
                                    {([
                                        { key: 'orderUpdates', label: 'Order Updates', sub: 'Status changes for your orders and reservations' },
                                        { key: 'loyaltyAlerts', label: 'Loyalty Alerts', sub: 'Points earned, tier upgrades, and reward availability' },
                                        { key: 'newsletter', label: 'Promotions', sub: 'Special offers, seasonal deals, and new product launches' },
                                        { key: 'gmailNotifications', label: 'Gmail Notifications', sub: 'Email notifications for time-sensitive updates' },
                                    ] as const).map(n => (
                                        <div key={n.key} className="flex items-center justify-between py-4 border-b border-accent-brown/5 last:border-0">
                                            <div>
                                                <p className="font-black text-accent-brown text-sm">{n.label}</p>
                                                <p className="text-xs text-accent-brown/40 font-medium mt-0.5">{n.sub}</p>
                                            </div>
                                            <Toggle checked={notifs[n.key]} onChange={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => showToast('Notification preferences saved!')}
                                    className="mt-6 flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors">
                                    <Check className="w-4 h-4" /> Save Preferences
                                </button>
                            </div>
                        )}

                        {section === 'danger' && (
                            <div>
                                <h3 className="text-xl font-black text-red-500 tracking-tight mb-2">Danger Zone</h3>
                                <p className="text-sm text-accent-brown/50 font-medium mb-8">These actions are irreversible. Proceed with caution.</p>
                                <div className="border-2 border-red-100 rounded-2xl p-6">
                                    <div className="flex items-start gap-3 mb-6">
                                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>
                                        <div>
                                            <p className="font-black text-accent-brown">Delete Account</p>
                                            <p className="text-xs text-accent-brown/40 font-medium mt-1">All data — orders, loyalty points, and reservations — will be permanently deleted.</p>
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

                {/* Google Password Modal */}
                <AnimatePresence>
                    {showGooglePwModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowGooglePwModal(false)}
                                className="absolute inset-0 bg-accent-brown/40 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-2 bg-brand-dark" />
                                <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand-dark mb-6">
                                    <Lock className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black text-accent-brown tracking-tighter mb-2">Google Login User</h3>
                                <p className="text-sm font-medium text-accent-brown/60 mb-8 leading-relaxed">
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

                {/* Address Modal */}
                <AnimatePresence>
                    {showAddrModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowAddrModal(false)} className="absolute inset-0 bg-accent-brown/60 backdrop-blur-md" />
                            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                className="relative bg-[#FAFAFA] rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white">
                                <div className="p-8 sm:p-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter">{editingAddr ? (isBusiness ? 'Edit Location' : 'Edit Address') : (isBusiness ? 'New Branch' : 'New Address')}</h3>
                                            <p className="text-xs font-bold text-accent-brown/30 uppercase tracking-widest mt-1">{isBusiness ? 'Branch Details' : 'Delivery Details'}</p>
                                        </div>
                                        <button onClick={() => setShowAddrModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent-brown/30 hover:text-brand-dark transition-all shadow-sm">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">{isBusiness ? 'Clinic Name' : 'Contact Name'}</label>
                                                {isBusiness ? (
                                                    <div className="w-full bg-accent-peach/5 border-2 border-dashed border-accent-brown/10 rounded-2xl py-4 px-5 flex items-center gap-2 cursor-not-allowed">
                                                        <span className="text-sm font-bold text-accent-brown/60">{clinicName || 'Clinic'}</span>
                                                        <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-accent-brown/20">read only</span>
                                                    </div>
                                                ) : (
                                                    <input type="text" value={addrForm.full_name} onChange={e => setAddrForm({ ...addrForm, full_name: e.target.value })} placeholder="Full Name"
                                                        className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Phone Number</label>
                                                <input type="tel" value={addrForm.phone} onChange={e => setAddrForm({ ...addrForm, phone: e.target.value })} placeholder="09XX XXX XXXX"
                                                    className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 pl-1 flex items-center gap-2">
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
                                            <p className="text-[9px] font-bold text-accent-brown/30 uppercase tracking-widest pl-1 italic">Note: Searching will auto-fill basic location. Click the pin to edit granular details manually.</p>
                                        </div>

                                        {/* Display of current address (Confirming what was entered in map) */}
                                        <div className="p-6 bg-accent-peach/5 rounded-[2rem] border border-accent-peach/10 space-y-4">
                                             <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">Precise Address Confirmation</p>
                                                <p className="text-xs font-bold text-accent-brown leading-relaxed capitalize">
                                                    {[addrForm.house_number, addrForm.block_number, addrForm.street, addrForm.subdivision, addrForm.sitio, addrForm.barangay, addrForm.city, addrForm.province, addrForm.zip_code].filter(Boolean).join(' ')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Delivery Notes / Landmark Instructions */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 pl-1">Delivery Notes / Landmark Instructions</label>
                                            <textarea 
                                                value={addrForm.delivery_notes}
                                                onChange={e => setAddrForm({ ...addrForm, delivery_notes: e.target.value })}
                                                placeholder="e.g. Near the blue gate, or across the red store..."
                                                className="w-full bg-white border-2 border-transparent focus:border-brand/30 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown outline-none transition-all shadow-sm min-h-[100px] resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            {(isBusiness ? ['Main', 'Branch'] : ['Home', 'Work']).map(l => (
                                                <button key={l} onClick={() => setAddrForm({ ...addrForm, label: l })}
                                                    className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${addrForm.label === l ? 'border-brand bg-brand/5 text-brand-dark shadow-lg shadow-brand/5' : 'border-transparent bg-white text-accent-brown/30 hover:bg-accent-peach/10'}`}>
                                                    {l}
                                                </button>
                                            ))}
                                        </div>

                                        <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-accent-peach/10 cursor-pointer group">
                                            <input type="checkbox" checked={addrForm.is_default} onChange={e => setAddrForm({ ...addrForm, is_default: e.target.checked })} className="hidden" />
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${addrForm.is_default ? 'bg-brand border-brand text-brand-dark' : 'border-accent-brown/10 group-hover:border-brand/30'}`}>
                                                {addrForm.is_default && <Check className="w-4 h-4" />}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown">{isBusiness ? 'Set as Main Branch' : 'Set as Default Address'}</span>
                                        </label>

                                        <button
                                            onClick={async () => {
                                                if (!addrForm.full_name || !addrForm.phone || !addrForm.barangay || !addrForm.city) {
                                                    showToast('Contact and basic location details (Barangay, City) are required.', 'error');
                                                    return;
                                                }
                                                
                                                // Construct readable address lines for legacy fields
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

            </div>

            {/* ── Custom Confirm Modal ── */}
            <AnimatePresence>
                {confirmModal?.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setConfirmModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-[2rem] shadow-2xl shadow-black/20 p-8 max-w-sm w-full flex flex-col items-center gap-6"
                        >
                            <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-black text-accent-brown text-lg tracking-tight">{confirmModal.title}</h3>
                                <p className="text-sm font-medium text-accent-brown/50 leading-relaxed">{confirmModal.message}</p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-4 bg-accent-peach/10 text-accent-brown font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-accent-peach/20 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 py-4 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </DashboardLayout>
    );
};

export default AccountSettings;
