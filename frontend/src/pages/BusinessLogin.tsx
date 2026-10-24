import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Building2, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { CLINIC_LANDING_TEXT } from '../constants/clinicLandingWording';
import loginHero from '../assets/login_hero_landscape.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const BusinessLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        document.title = 'Hi-Vet';
    }, []);

    useEffect(() => {
        if (searchParams.get('error') === 'google_auth_failed') {
            setError('Google sign-in failed. Please try again.');
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
                setError(data.detail || CLINIC_LANDING_TEXT.auth.login.errorInvalid);
            }
        } catch (err) {
            console.error(err);
            setError(CLINIC_LANDING_TEXT.auth.login.errorConnection);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img 
                        src={loginHero} 
                        alt={CLINIC_LANDING_TEXT.auth.hero.imageAlt} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-24">
                    <div className="space-y-12">
                        <Link to="/for-clinics" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">{CLINIC_LANDING_TEXT.auth.hero.brandName}</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black">
                                <div className="w-10 h-[2px] bg-brand-dark" />
                                {CLINIC_LANDING_TEXT.auth.hero.badge}
                            </div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">
                                {CLINIC_LANDING_TEXT.auth.hero.titleLine1} <br />
                                <span className="text-brand-dark italic font-outfit">{CLINIC_LANDING_TEXT.auth.hero.titleLine2}</span>
                            </h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">
                                {CLINIC_LANDING_TEXT.auth.hero.description}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">{CLINIC_LANDING_TEXT.auth.hero.brandName}</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Full Screen Form */}
            <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-hidden">
                <div className="lg:hidden absolute top-[max(1.5rem,calc(env(safe-area-inset-top,0px)+0.75rem))] left-8 sm:left-12"><Logo className="w-12 h-12" /></div>
                <div className="w-full max-w-lg flex flex-col justify-center pt-16 sm:pt-0">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex gap-4">
                            <div className="h-1.5 w-16 bg-brand-dark rounded-full shadow-[0_0_20px_rgba(242,107,33,0.4)]" />
                            <div className="h-1.5 w-4 bg-accent-brown/10 rounded-full" />
                        </div>
                        <Link to="/register/business" className="text-sm font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">
                            {CLINIC_LANDING_TEXT.auth.login.registerPromptLink}
                        </Link>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-5xl font-black text-accent-brown tracking-tighter uppercase leading-none">{CLINIC_LANDING_TEXT.auth.login.title}</h3>
                                <p className="text-xs text-accent-brown/40 font-medium italic">{CLINIC_LANDING_TEXT.auth.login.subtitle}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic transition-colors group-focus-within:text-brand-dark">
                                        {CLINIC_LANDING_TEXT.auth.login.emailLabel} <span className="text-brand-dark">*</span>
                                    </label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder={CLINIC_LANDING_TEXT.auth.login.emailPlaceholder}
                                            className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <div className="flex justify-between items-center pr-6">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic transition-colors group-focus-within:text-brand-dark">
                                            {CLINIC_LANDING_TEXT.auth.login.passwordLabel} <span className="text-brand-dark">*</span>
                                        </label>
                                        <Link to="/forgot-password?role=business" className="text-[10px] font-black text-brand-dark/40 hover:text-brand-dark uppercase tracking-widest transition-colors italic">
                                            {CLINIC_LANDING_TEXT.auth.login.forgotPasswordLink}
                                        </Link>
                                    </div>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-transparent py-5 pl-16 pr-14 text-accent-brown font-bold text-base outline-none"
                                            required
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20 hover:text-brand-dark transition-colors">
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}

                            <button type="submit" disabled={loading} className="bg-brand-dark text-white w-full py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:shadow-2xl transition-all group shadow-xl">
                                {loading ? CLINIC_LANDING_TEXT.auth.login.submittingBtn : CLINIC_LANDING_TEXT.auth.login.submitBtn}
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                            </button>
                        </motion.div>
                    </form>

                    <div className="mt-10 space-y-8">
                        <div className="text-center pt-10 border-t border-accent-brown/5">
                            <Link to="/for-clinics" className="inline-flex items-center gap-4 text-sm font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                {CLINIC_LANDING_TEXT.auth.login.backToLanding}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessLogin;
