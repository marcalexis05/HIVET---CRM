import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ChevronLeft, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MAIN_LANDING_TEXT } from '../constants/mainLandingWording';
import loginHero from '../assets/login_hero_landscape.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        document.title = 'Hi-Vet | Log In';
    }, []);

    useEffect(() => {
        if (searchParams.get('error') === 'google_auth_failed') {
            setError(MAIN_LANDING_TEXT.loginPage.errors.googleFailed);
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
            if (res.ok) {
                const data = await res.json();
                loginWithToken(data.token);
                
                const base64 = data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(atob(base64));
                const role = payload.role;

                if (role === 'super_admin') navigate('/dashboard/admin');
                else if (role === 'system_admin') navigate('/dashboard/admin/compliance');
                else if (role === 'business') navigate('/dashboard/business');
                else if (role === 'rider') navigate('/dashboard/rider');
                else navigate('/dashboard/customer');
            } else {
                setError(MAIN_LANDING_TEXT.loginPage.errors.authFailed);
            }
        } catch (err) {
            console.error(err);
            setError(MAIN_LANDING_TEXT.loginPage.errors.networkError);
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
                        alt="Lifestyle" 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-12 xl:p-16 2xl:p-24">
                    <div className="space-y-12">
                        <Link to="/" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <User className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black">
                                <div className="w-10 h-[2px] bg-brand-dark" />
                                {MAIN_LANDING_TEXT.loginPage.heroTag}
                            </div>
                            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">
                                {MAIN_LANDING_TEXT.loginPage.heroTitle}
                            </h1>
                            <p className="text-lg xl:text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">
                                {MAIN_LANDING_TEXT.loginPage.heroSubtitle}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 w-fit">
                        <p className="text-xs font-black text-white uppercase tracking-widest italic">{MAIN_LANDING_TEXT.loginPage.heroBadge}</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Shared Page Shell (Phone, Tablet, Desktop) */}
            <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col justify-between py-6 sm:py-10 px-5 xs:px-6 sm:px-10 lg:px-12 bg-white overflow-y-auto">
                <div className="w-full max-w-[540px] mx-auto flex-1 flex flex-col justify-center my-auto py-2">
                    {/* Top Row: Icon Tile on Left, Register Link on Right */}
                    <div className="flex items-center justify-between gap-4 mb-8 sm:mb-10 flex-wrap">
                        <Link 
                            to="/" 
                            title="Back to Hi-Vet Home" 
                            aria-label="Back to Hi-Vet Home" 
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-dark/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <User className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                        </Link>
                        <Link 
                            to="/register" 
                            className="min-h-[44px] inline-flex items-center text-sm sm:text-base font-bold text-brand-dark hover:text-accent-brown transition-colors underline underline-offset-4 tracking-normal not-italic"
                        >
                            {MAIN_LANDING_TEXT.loginPage.signUpInstead}
                        </Link>
                    </div>

                    {/* Header Title & Subtitle */}
                    <div className="space-y-1 mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-accent-brown tracking-normal leading-tight">
                            {MAIN_LANDING_TEXT.loginPage.title}
                        </h1>
                        <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                            {MAIN_LANDING_TEXT.loginPage.subtitle}
                        </p>
                    </div>

                    {/* Check Email Notice Banner */}
                    {searchParams.get('msg') === 'check_email' && (
                        <div className="bg-[#F7F6F2] text-accent-brown p-5 rounded-2xl border border-accent-brown/15 flex items-start gap-3.5 mb-6 shadow-xs">
                            <Mail className="w-5 h-5 text-brand-dark shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-brand-dark">{MAIN_LANDING_TEXT.loginPage.messages.checkEmailTitle}</p>
                                <p className="text-xs text-slate-600 leading-relaxed font-normal">{MAIN_LANDING_TEXT.loginPage.messages.checkEmailDesc}</p>
                            </div>
                        </div>
                    )}

                    {/* Registration Success Banner */}
                    {searchParams.get('msg') === 'reg_success' && (
                        <div className="bg-green-50 text-green-900 p-5 rounded-2xl border border-green-200 flex items-start gap-3.5 mb-6 shadow-xs">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-green-800">{MAIN_LANDING_TEXT.loginPage.messages.regSuccessTitle}</p>
                                <p className="text-xs text-green-700 leading-relaxed font-medium">{MAIN_LANDING_TEXT.loginPage.messages.regSuccessDesc}</p>
                            </div>
                        </div>
                    )}

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
                            <label htmlFor="customer-email" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                {MAIN_LANDING_TEXT.loginPage.emailLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                            </label>
                            <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                <Mail className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                <input 
                                    id="customer-email"
                                    type="email" 
                                    autoComplete="email"
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="user@example.com" 
                                    className="w-full bg-transparent py-3.5 pr-4 text-accent-brown font-bold text-base placeholder:text-slate-500 outline-none leading-normal" 
                                    required 
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="group space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="customer-password" className="text-sm font-bold text-accent-brown flex items-center gap-1">
                                    {MAIN_LANDING_TEXT.loginPage.passwordLabel} <span className="text-brand-dark">*<span className="sr-only"> (required)</span></span>
                                </label>
                                <Link 
                                    to={`/forgot-password${searchParams.get('role') ? `?role=${searchParams.get('role')}` : ''}`} 
                                    className="text-xs font-bold text-brand-dark hover:text-accent-brown hover:underline transition-colors"
                                >
                                    {MAIN_LANDING_TEXT.loginPage.forgotPasswordLink}
                                </Link>
                            </div>
                            <div className="relative flex items-center min-h-[52px] sm:min-h-[56px] border border-accent-brown/15 focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20 rounded-2xl transition-all bg-[#F7F6F2] overflow-hidden">
                                <Lock className="w-5 h-5 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors shrink-0 ml-4 mr-3" aria-hidden="true" />
                                <input 
                                    id="customer-password"
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
                            <span>{loading ? MAIN_LANDING_TEXT.loginPage.loggingInBtn : MAIN_LANDING_TEXT.loginPage.loginBtn}</span>
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
                        </button>
                    </form>

                    {/* Google Alternative */}
                    <div className="space-y-4 pt-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-[1px] bg-accent-brown/10" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{MAIN_LANDING_TEXT.loginPage.orDivider}</span>
                            <div className="flex-1 h-[1px] bg-accent-brown/10" />
                        </div>
                        
                        <button 
                            type="button" 
                            onClick={() => { const origin = window.location.origin; window.location.href = `${API}/auth/google?redirect_to=${encodeURIComponent(origin)}`; }} 
                            className="w-full min-h-[52px] sm:min-h-[56px] flex items-center justify-center gap-3 bg-[#F7F6F2] hover:bg-white border border-accent-brown/15 hover:border-brand-dark/40 rounded-2xl font-bold text-sm text-accent-brown transition-all shadow-xs cursor-pointer"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>{MAIN_LANDING_TEXT.loginPage.googleBtn}</span>
                        </button>
                    </div>

                    {/* Back Link Row */}
                    <div className="mt-8 text-center pt-5 border-t border-accent-brown/10">
                        <Link 
                            to="/" 
                            className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-slate-600 hover:text-brand-dark transition-colors tracking-normal not-italic"
                        >
                            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{MAIN_LANDING_TEXT.loginPage.backToHome}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
