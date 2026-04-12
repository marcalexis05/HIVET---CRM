import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck, MailCheck, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PasswordStrength } from '../components/PasswordStrength';
import loginHero from '../assets/login_hero_landscape.png';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const navigate = useNavigate();

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            const nextIndex = Math.min(pastedData.length, 5);
            const nextInput = document.getElementById(`otp-${nextIndex}`);
            nextInput?.focus();
        }
    };

    const handleSendOtp = async () => {
        if (!email) return setError('Please enter your recovery email');
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:8000/api/auth/forgot-password/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(2);
                setCountdown(60);
            } else {
                setError(data.detail || 'Failed to send recovery code');
            }
        } catch (err) {
            setError('Global network failure. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return setError('Code is incomplete');
        setError('');
        setStep(3);
    };

    const handleResetPassword = async () => {
        if (!password || password !== confirmPassword) return setError('Credentials do not match');
        if (password.length < 8) return setError('Security requires 8+ characters');

        const otpCode = otp.join('');
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:8000/api/auth/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode, new_password: password })
            });
            if (res.ok) {
                const searchParams = new URLSearchParams(window.location.search);
                const role = searchParams.get('role');
                const redirectPath = role === 'rider' ? '/login/rider' : role === 'business' ? '/login/business' : '/login';
                navigate(`${redirectPath}?msg=password_reset`);
            } else {
                const data = await res.json();
                setError(data.detail || 'Reset failed');
            }
        } catch (err) {
            setError('System failure during update.');
        } finally {
            setLoading(false);
        }
    };

    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) handleSendOtp();
        else if (step === 2) handleVerifyOtp();
        else if (step === 3) handleResetPassword();
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-1">
                            <h3 className="text-5xl font-black text-accent-brown tracking-tighter uppercase leading-none">Recovery</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Enter your account email to proceed.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Recovery Identity <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-transparent py-5 pl-16 pr-8 text-accent-brown font-bold text-base outline-none" required />
                                </div>
                            </div>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <button type="submit" disabled={loading} className="bg-brand-dark text-white w-full py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:shadow-2xl transition-all group shadow-xl">
                            {loading ? 'Initializing...' : 'Send Recovery Code'} 
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                        </button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                        <div className="space-y-4">
                            <div className="w-20 h-20 bg-brand/10 text-brand-dark rounded-3xl flex items-center justify-center"><MailCheck className="w-10 h-10" /></div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">Verification</h3>
                                <p className="text-sm text-accent-brown/40 font-medium italic">Sent code to <span className="text-accent-brown font-bold not-italic">{email}</span></p>
                            </div>
                        </div>
                        <div className="flex justify-between gap-3">
                            {otp.map((digit, idx) => (
                                <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} onPaste={handlePaste} className="w-12 h-16 sm:w-16 sm:h-20 text-center text-3xl font-black text-brand-dark bg-[#F7F6F2] rounded-3xl outline-none transition-all ring-1 ring-brand-dark/5 focus:ring-brand-dark/30 shadow-inner" />
                            ))}
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <div className="space-y-6">
                            <p className="text-xs font-black text-accent-brown/30 uppercase tracking-[0.2em] ml-6 italic">No code? <button type="button" onClick={handleSendOtp} disabled={countdown > 0} className="text-brand-dark font-black">{countdown > 0 ? `Wait ${countdown}s` : 'Resend'}</button></p>
                            <div className="flex gap-4">
                                <button type="button" onClick={prevStep} className="flex-1 px-8 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] text-accent-brown/30 italic">Back</button>
                                <button type="submit" className="bg-brand-dark text-white flex-[2] py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all italic">Verify Code</button>
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-accent-brown tracking-tighter uppercase leading-none">New Credentials</h3>
                            <p className="text-xs text-accent-brown/40 font-medium italic">Update your security secret.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">New Secret <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-14 text-accent-brown font-bold text-base outline-none" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                </div>
                                {password && <div className="px-6"><PasswordStrength password={password} /></div>}
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[11px] font-black text-accent-brown/30 uppercase tracking-[0.2em] pl-6 italic">Confirm Secret <span className="text-brand-dark">*</span></label>
                                <div className="relative ring-1 ring-brand-dark/5 focus-within:ring-brand-dark/30 rounded-3xl transition-all shadow-inner bg-[#F7F6F2]">
                                    <ShieldCheck className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark" />
                                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-5 pl-16 pr-14 text-accent-brown font-bold text-base outline-none" required />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-7 top-1/2 -translate-y-1/2 text-accent-brown/20">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                </div>
                            </div>
                        </div>
                        {error && <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 py-3 px-6 rounded-2xl border border-red-100 italic text-center">{error}</div>}
                        <button type="submit" disabled={loading} className="bg-brand-dark text-white w-full py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:shadow-2xl shadow-xl italic">{loading ? 'Updating...' : 'Update Secret'}</button>
                    </motion.div>
                );
            default: return null;
        }
    };

    const loginPath = new URLSearchParams(window.location.search).get('role') === 'rider' ? '/login/rider' : 
                      new URLSearchParams(window.location.search).get('role') === 'business' ? '/login/business' : '/login';

    return (
        <div className="h-screen bg-white flex font-brand select-none overflow-hidden">
            {/* Left Column: Full Screen Hero */}
            <div className="hidden lg:block w-1/2 h-full relative overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img src={loginHero} alt="Recovery" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-brown via-accent-brown/40 to-transparent opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between p-24">
                    <div className="space-y-12">
                        <Link to={loginPath} className="inline-flex items-center gap-4 group/back">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover/back:bg-brand-dark transition-all text-white">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase italic">Hi-Vet</span>
                        </Link>
                        <div className="space-y-8 max-w-lg">
                            <div className="inline-flex items-center gap-3 text-white/60 uppercase tracking-[0.6em] text-[10px] font-black"><div className="w-10 h-[2px] bg-brand-dark" />Account Security</div>
                            <h1 className="text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase">Account <br /><span className="text-brand-dark italic font-outfit">Recovery.</span></h1>
                            <p className="text-xl text-white/70 font-medium leading-relaxed italic max-w-sm">Let's get you back into your Hi-Vet account securely and efficiently.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 w-fit">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.5em] italic">Security Stage {step} / 3</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Full Screen Flow */}
            <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center bg-white p-6 sm:p-10 relative overflow-hidden">
                <div className="lg:hidden absolute top-8 left-12"><Logo className="w-12 h-12" /></div>
                <div className="w-full max-w-lg flex flex-col justify-center">
                    <div className="mb-10 flex items-center justify-between">
                        <div className="flex gap-4">
                            {[1, 2, 3].map(i => <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'w-16 bg-brand-dark shadow-[0_0_20px_rgba(242,107,33,0.4)]' : 'w-4 bg-accent-brown/10'}`} />)}
                        </div>
                        <Link to={loginPath} className="text-sm font-black text-brand-dark uppercase tracking-[0.3em] border-b-4 border-brand-dark/10 pb-1 italic hover:text-accent-brown transition-all">Recall Credentials?</Link>
                    </div>

                    <form onSubmit={handleSubmit} className="overflow-y-visible"><AnimatePresence mode="wait">{renderStep()}</AnimatePresence></form>

                    <div className="mt-12 text-center pt-8 border-t border-accent-brown/5">
                        <Link to={loginPath} className="inline-flex items-center gap-4 text-sm font-black uppercase tracking-[0.4em] text-accent-brown/30 hover:text-brand-dark transition-all group italic">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                            Cancel Recovery
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default ForgotPassword;
