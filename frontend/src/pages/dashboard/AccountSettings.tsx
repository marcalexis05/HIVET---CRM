import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Bell, Trash2, Check, Loader2, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PasswordStrength } from '../../components/PasswordStrength';

type Section = 'profile' | 'password' | 'notifications' | 'danger';

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
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
    const [savingProfile, setSavingProfile] = useState(false);
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [hasPassword, setHasPassword] = useState(true);

    // Fetch fresh data from DB on mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.token || user.role !== 'user') return;
            try {
                const res = await fetch('http://localhost:8000/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFirstName(data.first_name || '');
                    setMiddleName(data.middle_name || '');
                    setLastName(data.last_name || '');
                    setSuffix(data.suffix || '');
                    setEmail(data.email || '');
                    setPhone(data.phone || '');
                    setIsGoogleUser(!!data.google_id);
                    setHasPassword(!!data.has_password);
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        fetchProfile();
    }, [user?.token, user?.role]);

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
                body: JSON.stringify({
                    first_name: firstName || null,
                    middle_name: middleName || null,
                    last_name: lastName || null,
                    suffix: suffix || null,
                    email: email || null,
                    phone: phone || null,
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    loginWithToken(data.token);
                }
                showToast('Profile updated successfully!');
            } else {
                showToast('Failed to update profile.', 'error');
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

    const initials = (user?.name ?? user?.email ?? 'U').slice(0, 2).toUpperCase();

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
                    {user?.avatar ? (
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
                        <span className="mt-2 inline-block text-[9px] font-black uppercase tracking-widest bg-white/10 text-brand px-3 py-1 rounded-full">
                            {user?.role === 'admin' ? 'Administrator' : user?.role === 'business' ? 'Business Partner' : 'Pet Owner'}
                        </span>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-[60px]" />
                </motion.div>

                {/* Tab nav + Content */}
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Sidebar nav */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white rounded-[2rem] p-4 shadow-xl shadow-accent-brown/5 border border-white h-fit">
                        {NAV.map(n => (
                            <button key={n.id} onClick={() => {
                                setSection(n.id);
                                if (n.id === 'password' && isGoogleUser && !hasPassword) {
                                    setShowGooglePwModal(true);
                                }
                            }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all mb-1 ${section === n.id ? 'bg-brand-dark text-white' : 'text-accent-brown/50 hover:bg-accent-peach/30 hover:text-accent-brown'} ${n.id === 'danger' ? 'text-red-400 hover:bg-red-50 hover:text-red-500 mt-4 border-t border-accent-brown/5 pt-4' : ''}`}>
                                <n.icon className="w-4 h-4 shrink-0" /> {n.label}
                            </button>
                        ))}
                    </motion.div>

                    {/* Panel */}
                    <motion.div key={section} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-3 bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-accent-brown/5 border border-white">

                        {section === 'profile' && (
                            <div>
                                <h3 className="text-xl font-black text-accent-brown tracking-tight mb-6">Profile Information</h3>
                                <div className="space-y-5">
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
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Middle Name <span className="normal-case font-normal opacity-60">(optional)</span></label>
                                            <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Santos"
                                                className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all placeholder:font-normal placeholder:text-accent-brown/30" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Suffix <span className="normal-case font-normal opacity-60">(optional)</span></label>
                                            <select value={suffix} onChange={e => setSuffix(e.target.value)}
                                                className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold text-accent-brown outline-none transition-all appearance-none cursor-pointer">
                                                <option value="">None</option>
                                                <option value="Jr.">Jr.</option>
                                                <option value="Sr.">Sr.</option>
                                                <option value="II">II</option>
                                                <option value="III">III</option>
                                                <option value="IV">IV</option>
                                            </select>
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
                                    {/* Role (read-only) */}
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">Role</label>
                                        <div className="bg-accent-peach/10 rounded-2xl py-4 px-5 text-sm font-bold text-accent-brown/50 capitalize">{user?.role ?? '—'}</div>
                                    </div>
                                    <button onClick={handleSaveProfile} disabled={savingProfile}
                                        className="mt-2 flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50">
                                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                                    </button>
                                </div>
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

            </div>
        </DashboardLayout>
    );
};

export default AccountSettings;
