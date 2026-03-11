import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, UserPlus, Bike, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const RiderLogin = () => {
    const [email, setEmail] = useState('rider@hivet.com');
    const [password, setPassword] = useState('rider123');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();
    const { login, loginWithToken } = useAuth();

    useEffect(() => {
        if (searchParams.get('error') === 'google_auth_failed') {
            setError('Google sign-in failed. Please try again.');
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (email === 'rider@hivet.com' && password === 'rider123') {
            login(email, 'rider', 'Delivery Courier');
            navigate('/dashboard/rider');
        } else {
            // Attempt rider login via backend
            try {
                const res = await fetch('http://localhost:8000/api/auth/login', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                if (res.ok) {
                    const data = await res.json();
                    loginWithToken(data.token);
                    navigate('/dashboard/rider'); // Rider users go to rider dashboard
                } else {
                    setError('Invalid courier email or password.');
                }
            } catch (err) {
                console.error(err);
                setError('Login failed. Please try again.');
            }
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
                        <Link to="/for-riders" className="flex items-center gap-3 mb-12 hover:scale-105 transition-transform w-fit">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full text-brand-dark" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-accent-brown">Hi-Vet Riders</span>
                        </Link>
                        <div className="space-y-4 max-w-sm">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Deliver care,<br />
                                earn <span className="text-brand-dark">flexibly</span>.
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed">
                                Access your delivery dashboard, track your earnings, and view your schedule.
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
                            alt="Courier Login Illustration"
                            className="w-full max-w-[450px] mx-auto drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="p-6 xs:p-10 md:p-20 flex flex-col justify-center">
                    <div className="mb-8 xs:mb-12 space-y-3 xs:space-y-4">
                        <h2 className="text-3xl xs:text-4xl font-black text-accent-brown tracking-tighter">Courier Login</h2>
                        <p className="text-xs xs:text-sm text-accent-brown/50 font-medium">Welcome back to the road. Ready to deliver?</p>

                        {searchParams.get('msg') === 'check_email' && (
                            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-bold border border-green-200 mt-4 flex flex-col gap-2">
                                <span className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-green-600 shrink-0" />
                                    Check your inbox!
                                </span>
                                <span className="font-medium text-green-600/80 leading-relaxed">
                                    We've sent a secure verification link to your Google email address. Please click the link to complete your driver sign-up and log into your dashboard.
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
                                    Your courier password has been securely updated. You can now log in using your new credentials.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Google OAuth Button */}
                    <button
                        type="button"
                        onClick={() => window.location.href = 'http://localhost:8000/auth/google'}
                        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-accent-brown/10 hover:border-brand/30 hover:bg-accent-peach/20 text-accent-brown font-bold rounded-[2rem] py-5 px-6 transition-all group shadow-sm"
                    >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Courier Sign In with Google</span>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 py-6">
                        <div className="flex-1 h-px bg-accent-brown/10" />
                        <span className="text-xs font-bold text-accent-brown/30 uppercase tracking-widest">or email</span>
                        <div className="flex-1 h-px bg-accent-brown/10" />
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 mb-6">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-xs font-black text-accent-brown/40 uppercase tracking-widest pl-4">Account Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="courier@example.com"
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
                            Ready to join the fleet? {' '}
                            <Link to="/register/rider" className="text-brand-dark font-black hover:text-brand transition-colors inline-flex items-center gap-2">
                                <UserPlus className="w-4 h-4 ml-1" />
                                Apply to Drive
                            </Link>
                        </p>

                        <Link to="/for-riders" className="mt-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Bike className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
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

export default RiderLogin;
