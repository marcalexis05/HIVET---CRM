import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ChevronLeft, User } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import loginHero from '../assets/login_hero_landscape.png';

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
        if (searchParams.get('error') === 'google_auth_failed') {
            setError('Google sign-in failed. Please try again.');
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/api/auth/login', {
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
                setError('Authentication failed. Check your credentials.');
            }
        } catch (err) {
            console.error(err);
            setError('Global network error. Please verify connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt="Lifestyle" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-24">
                    <div className="space-y-12">
                        <Link to="/" className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <User className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Secure Access</div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Continue your <br /><span className="text-brand-dark italic font-outfit">Mission.</span></h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Securely access your Hi-Vet portal to manage your pet's health and wellness.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">Authentication Portal</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Full Screen Form */}
            <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-hidden">
                <div className="lg:hidden absolute top-8 left-12">
                    <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <User className="w-7 h-7" />
                    </div>
                </div>
                <div className="w-full max-w-lg flex flex-col justify-center">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex gap-4">
                            <div className="h-1.5 w-16 bg-brand-dark rounded-full shadow-[0_0_20px_rgba(242,107,33,0.4)]" />
                            <div className="h-1.5 w-4 bg-accent-brown/10 rounded-full" />
                        </div>
                        <Link to="/register" className="text-sm font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">Register Instead</Link>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-5xl font-black text-accent-brown tracking-tighter uppercase leading-none">Login</h3>
                                <p className="text-xs text-accent-brown/40 font-medium italic">Enter your credentials to proceed.</p>
                            </div>

                            {searchParams.get('msg') === 'check_email' && (
                                <div className="bg-[#F7F6F2] text-brand-dark p-6 rounded-[2rem] text-xs font-black border border-brand/10 uppercase tracking-widest italic flex flex-col gap-3 shadow-inner">
                                    <span className="flex items-center gap-3"><Mail className="w-5 h-5" />Check Inbox</span>
                                    <span className="opacity-50 font-medium normal-case leading-relaxed">Verification link sent. Please verify to access your portal.</span>
                                </div>
                            )}

                            {searchParams.get('msg') === 'reg_success' && (
                                <div className="bg-brand-dark/5 text-brand-dark p-6 rounded-[2rem] text-xs font-black border border-brand/20 uppercase tracking-widest italic flex flex-col gap-3 shadow-[0_0_30px_rgba(242,107,33,0.05)] ring-1 ring-brand-dark/5">
                                    <span className="flex items-center gap-3 text-brand-dark">
                                        <div className="w-8 h-8 bg-brand-dark text-white rounded-xl flex items-center justify-center shadow-lg"><User className="w-4 h-4" /></div>
                                        Registration Complete
                                    </span>
                                    <span className="text-[10px] opacity-70 font-bold normal-case leading-relaxed">Mission initialized successfully. Please enter your credentials to access the ecosystem.</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="group space-y-2">
                                    <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic transition-colors group-focus-within:text-brand-dark">Email Address <span className="text-brand-dark">*</span></label>
                                    <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                        <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            placeholder="user@gmail.com" 
                                            className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <div className="flex justify-between items-center pr-6">
                                        <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic transition-colors group-focus-within:text-brand-dark">Password <span className="text-brand-dark">*</span></label>
                                        <Link to={`/forgot-password${searchParams.get('role') ? `?role=${searchParams.get('role')}` : ''}`} className="text-[10px] font-black text-brand-dark/40 hover:text-brand-dark uppercase tracking-widest transition-colors italic">Reset Password?</Link>
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
                                {loading ? 'Authorizing...' : 'Enter Portal'} 
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                            </button>
                        </motion.div>
                    </form>

                    <div className="mt-10 space-y-8">
                        <div className="flex items-center gap-8">
                            <div className="flex-1 h-[1px] bg-accent-brown/10" />
                            <span className="text-[10px] font-black text-accent-brown/20 uppercase tracking-[0.6em]">Quick Link</span>
                            <div className="flex-1 h-[1px] bg-accent-brown/10" />
                        </div>
                        
                        <button type="button" onClick={() => window.location.href = 'http://localhost:8000/auth/google'} className="w-full flex items-center justify-center gap-4 bg-[#F7F6F2] hover:bg-white border border-transparent hover:border-brand-dark/20 py-5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-sm italic">
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign In with Google
                        </button>

                        <div className="text-center pt-4 border-t border-accent-brown/5">
                            <Link to="/" className="inline-flex items-center gap-4 text-sm font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                                Return
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Login;
