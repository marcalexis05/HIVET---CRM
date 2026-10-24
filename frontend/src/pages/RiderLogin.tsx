import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Bike, Eye, EyeOff, ChevronLeft, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RIDER_LANDING_TEXT } from '../constants/riderLandingWording';
import loginHero from '../assets/login_hero_landscape.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const RiderLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        document.title = 'Hi-Vet | Rider Log In';
    }, []);

    useEffect(() => {
        if (searchParams.get('error') === 'google_auth_failed') {
            setError(RIDER_LANDING_TEXT.loginPage.errors.googleFailed);
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                loginWithToken(data.token);
                navigate('/dashboard/rider');
            } else {
                setError(data.detail || RIDER_LANDING_TEXT.loginPage.errors.invalidCredentials);
            }
        } catch (err) {
            console.error(err);
            setError(RIDER_LANDING_TEXT.loginPage.errors.networkError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-white flex font-brand overflow-x-hidden">
            {/* Left Column: Full Screen Hero (Desktop Only) */}
            <div className="hidden lg:block w-1/2 min-h-[100dvh] relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 z-0">
                    <img 
                        src={loginHero} 
                        alt={RIDER_LANDING_TEXT.loginPage.heroImageAlt} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                    <div className="space-y-12">
                        <Link to="/for-riders" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Bike className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet Riders</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black">
                                <div className="w-10 h-[2px] bg-brand-dark" />
                                {RIDER_LANDING_TEXT.loginPage.heroTag}
                            </div>
                            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">
                                {RIDER_LANDING_TEXT.loginPage.heroTitlePrefix} <br />
                                <span className="text-brand-dark italic font-outfit">{RIDER_LANDING_TEXT.loginPage.heroTitleHighlight}</span>
                            </h1>
                            <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">
                                {RIDER_LANDING_TEXT.loginPage.heroSubtitle}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 w-fit">
                        <p className="text-xs font-black text-white uppercase tracking-widest italic">{RIDER_LANDING_TEXT.loginPage.heroBadge}</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Shared Page Shell (Phone, Tablet, Desktop) */}
            <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col justify-between py-6 sm:py-10 px-5 xs:px-6 sm:px-10 lg:px-12 bg-white overflow-y-auto">
                <div className="w-full max-w-[540px] mx-auto flex-1 flex flex-col justify-center my-auto py-2">
                    {/* Top Row: Icon Tile on Left, Register Link on Right */}
                    <div className="flex items-center justify-between gap-4 mb-8 sm:mb-10 flex-wrap">
                        <Link 
                            to="/for-riders" 
                            title="Back to Hi-Vet for Riders" 
                            aria-label="Back to Hi-Vet for Riders" 
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-dark/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <Bike className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                        </Link>
                        <Link 
                            to="/register/rider" 
                            className="min-h-[44px] inline-flex items-center text-sm sm:text-base font-bold text-brand-dark hover:text-accent-brown transition-colors underline underline-offset-4 tracking-normal not-italic"
                        >
                            {RIDER_LANDING_TEXT.loginPage.signUpInstead}
                        </Link>
                    </div>

                    {/* Header Title & Subtitle */}
                    <div className="space-y-1 mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">
                            {RIDER_LANDING_TEXT.loginPage.title}
                        </h1>
                        <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                            {RIDER_LANDING_TEXT.loginPage.subtitle}
                        </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div role="alert" className="text-sm font-semibold text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2 mb-6">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div className="group space-y-1.5">
                            <label htmlFor="rider-email" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                {RIDER_LANDING_TEXT.loginPage.emailLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                            </label>
                            <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                <Mail className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                <input 
                                    id="rider-email"
                                    type="email" 
                                    autoComplete="email"
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder={RIDER_LANDING_TEXT.loginPage.emailPlaceholder} 
                                    className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal" 
                                    required 
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="group space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="rider-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    {RIDER_LANDING_TEXT.loginPage.passwordLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <Link 
                                    to="/forgot-password?role=rider" 
                                    className="text-xs font-bold text-brand-dark hover:text-accent-brown hover:underline transition-colors"
                                >
                                    {RIDER_LANDING_TEXT.loginPage.forgotPasswordLink}
                                </Link>
                            </div>
                            <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                <input 
                                    id="rider-password"
                                    type={showPassword ? "text" : "password"} 
                                    autoComplete="current-password"
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    placeholder="••••••••" 
                                    className="w-full bg-transparent py-3.5 pr-12 text-accent-brown font-semibold text-base placeholder:text-slate-500 outline-none leading-normal" 
                                    required 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-brown/40 hover:text-brand-dark transition-colors p-1 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="bg-brand-dark hover:bg-brand text-white w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-dark/20 transition-all active:scale-[0.99] group cursor-pointer not-italic tracking-normal mt-6 disabled:opacity-50"
                        >
                            <span>{loading ? RIDER_LANDING_TEXT.loginPage.loggingInBtn : RIDER_LANDING_TEXT.loginPage.loginBtn}</span>
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
                        </button>
                    </form>

                    {/* Back Link Row */}
                    <div className="mt-8 text-center pt-5 border-t border-accent-brown/10">
                        <Link 
                            to="/for-riders" 
                            className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-slate-600 hover:text-brand-dark transition-colors tracking-normal not-italic"
                        >
                            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{RIDER_LANDING_TEXT.loginPage.backToLanding}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderLogin;
