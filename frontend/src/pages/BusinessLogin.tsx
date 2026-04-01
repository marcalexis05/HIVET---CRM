import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, UserPlus, Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const BusinessLogin = () => {
    const [email, setEmail] = useState('business@hivet.com');
    const [password, setPassword] = useState('business123');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        if (searchParams.get('error') === 'google_auth_failed') {
            setError('Google sign-in failed. Please try again.');
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Always attempt login via backend
        try {
                const res = await fetch('http://localhost:8000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok && data.token) {
                    loginWithToken(data.token);
                    // Decode role from the JWT payload (base64 middle section)
                    try {
                        const payload = JSON.parse(atob(data.token.split('.')[1]));
                        const role = payload.role || 'business';
                        if (role === 'admin') {
                            navigate('/dashboard/admin/compliance');
                        } else {
                            navigate('/dashboard/business');
                        }
                    } catch {
                        navigate('/dashboard/business');
                    }
                } else {
                    setError(data.detail || 'Invalid partner email or password.');
                }
            } catch (err) {
                console.error(err);
                setError('Login failed. Please check your connection.');
            }
    };

    return (
        <div className="min-h-screen bg-accent-cream flex items-center justify-center p-4 xs:p-6 sm:p-8 select-none relative py-12 xs:py-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-6xl w-full grid md:grid-cols-2 bg-white rounded-[2.5rem] xs:rounded-[3.5rem] shadow-2xl shadow-brand/10 border border-brand/5 overflow-hidden relative z-10"
            >
                {/* Left Side: Illustration Hero */}
                <div className="hidden md:flex flex-col justify-between p-16 bg-accent-peach/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors duration-500" />
                    <div className="relative z-10">
                        <Link to="/for-clinics" className="flex items-center gap-3 mb-12 hover:scale-105 transition-transform w-fit">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-accent-brown">Hi-Vet Partners</span>
                        </Link>
                        <div className="space-y-4 max-w-sm">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Streamline your <br />
                                clinic <span className="text-brand-dark">operations</span> today.
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed">
                                Access your patient CRM, real-time inventory, and business intelligence dashboard.
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10">
                        {/* Reusing login hero but could be customized later */}
                        <motion.img
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            src="/images/login_hero.png"
                            alt="Partner Login Illustration"
                            className="w-full max-w-[450px] mx-auto drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="p-6 xs:p-10 md:p-20 flex flex-col justify-center">
                    <div className="mb-8 xs:mb-12 space-y-3 xs:space-y-4">
                        <h2 className="text-3xl xs:text-4xl font-black text-accent-brown tracking-tighter">Partner Login</h2>
                        <p className="text-xs xs:text-sm text-accent-brown/50 font-medium">Welcome back, Clinic Owner. Access your command center.</p>

                        {searchParams.get('msg') === 'check_email' && (
                            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-bold border border-green-200 mt-4 flex flex-col gap-2">
                                <span className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-green-600 shrink-0" />
                                    Check your inbox!
                                </span>
                                <span className="font-medium text-green-600/80 leading-relaxed">
                                    We've sent a secure verification link to your Google email address. Please click the link to complete your partner sign-up and log into your dashboard.
                                </span>
                            </div>
                        )}

                        {searchParams.get('msg') === 'password_reset' && (
                            <div className="bg-brand/10 text-brand-dark p-4 rounded-xl text-sm font-bold border border-brand/20 mt-4 flex flex-col gap-2">
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-brand shrink-0" />
                                    Password Reset Successful
                                </span>
                                <span className="font-medium text-brand-dark/80 leading-relaxed">
                                    Your partner password has been securely updated. You can now log in using your new credentials.
                                </span>
                            </div>
                        )}
                    </div>


                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 mb-6">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-xs font-black text-accent-brown/40 uppercase tracking-widest pl-4">Business Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="clinic@example.com"
                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all placeholder:text-accent-brown/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-xs font-black text-accent-brown/40 uppercase tracking-widest pl-4">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-12 text-accent-brown font-semibold outline-none transition-all placeholder:text-accent-brown/20"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded-[10px] border-2 border-brand/20 accent-brand-dark outline-none transition-all ring-offset-4" />
                                <span className="text-xs font-bold text-accent-brown/60 group-hover:text-accent-brown transition-colors">Keep me signed in</span>
                            </label>
                            <Link to="/forgot-password" className="text-xs font-black text-brand-dark hover:text-brand transition-colors uppercase tracking-widest">Forgot?</Link>
                        </div>

                        <button type="submit" className="btn-primary w-full group flex items-center justify-center gap-3 mt-4 h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6">
                            Login Securely
                            <ArrowRight className="w-4 h-4 xs:w-5 xs:h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-sm font-semibold text-accent-brown/50">
                            Don't have a partner account? {' '}
                            <Link to="/register/business" className="text-brand-dark font-black hover:text-brand transition-colors inline-flex items-center gap-2">
                                <UserPlus className="w-4 h-4 ml-1" />
                                Register Clinic
                            </Link>
                        </p>

                        <Link to="/for-clinics" className="mt-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Building2 className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                            Back to Landing
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Floating UI Elements Overlay */}
            <div className="absolute top-[20%] right-[15%] w-24 h-24 bg-brand/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-[20%] left-[15%] w-32 h-32 bg-brand-dark/10 rounded-full blur-[100px]" />
        </div>
    );
};

export default BusinessLogin;
