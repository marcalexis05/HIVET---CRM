import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock, ArrowRight, ArrowLeft,
    ShieldCheck, MailCheck, Eye, EyeOff
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PasswordStrength } from '../components/PasswordStrength';

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
            // Focus the last filled input or the next empty one
            const nextIndex = Math.min(pastedData.length, 5);
            const nextInput = document.getElementById(`otp-${nextIndex}`);
            nextInput?.focus();
        }
    };

    const handleSendOtp = async () => {
        if (!email) {
            return setError('Please enter your email address');
        }

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
                setError(data.detail || 'Failed to send verification email');
            }
        } catch (err) {
            setError('An error occurred while sending the email.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            return setError('Please enter the full 6-digit code');
        }
        setError('');
        setStep(3);
    };

    const handleResetPassword = async () => {
        if (!password || password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        if (password.length < 8) {
            return setError('Password must be at least 8 characters');
        }

        const otpCode = otp.join('');
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:8000/api/auth/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    otp: otpCode,
                    new_password: password
                })
            });
            const data = await res.json();
            if (res.ok) {
                // Navigate to login with success message
                navigate('/login?msg=password_reset');
            } else {
                setError(data.detail || 'Password reset failed');
            }
        } catch (err) {
            setError('An error occurred during password reset.');
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
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2">
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Reset Password</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">Enter your account email to receive a recovery code.</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 mb-6">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-8 text-accent-brown font-semibold outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full group flex items-center justify-center gap-3 h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6 disabled:opacity-50">
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    Send Recovery Code <ArrowRight className="w-4 h-4 xs:w-5 xs:h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <div className="w-12 h-12 xs:w-16 xs:h-16 bg-brand/10 text-brand-dark rounded-full flex items-center justify-center">
                                <MailCheck className="w-6 h-6 xs:w-8 xs:h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">Verification Code</h3>
                                <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">
                                    We've sent a 6-digit code to <br />
                                    <span className="text-accent-brown font-bold not-italic">{email || 'your email'}</span>
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between gap-2 xs:gap-3">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    className="w-10 xs:w-12 md:w-14 h-14 xs:h-16 md:h-18 text-center text-xl xs:text-3xl font-black text-brand-dark bg-accent-peach/20 border-2 border-brand-dark focus:border-brand-dark focus:bg-white rounded-xl xs:rounded-2xl outline-none transition-all"
                                />
                            ))}
                        </div>

                        <div className="space-y-6">
                            <p className="text-xs font-bold text-accent-brown/40 ml-4">
                                No code yet? {' '}
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading || countdown > 0}
                                    className="text-brand-dark hover:underline underline-offset-4 disabled:opacity-50"
                                >
                                    {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                                </button>
                            </p>

                            <div className="flex gap-4">
                                <button type="button" onClick={prevStep} disabled={loading} className="flex-1 h-12 xs:h-14 md:h-16 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50">
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button type="submit" disabled={loading} className="btn-primary flex-[2] bg-brand-dark h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6 disabled:opacity-50">
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        'Verify Code'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2">
                            <h3 className="text-xl xs:text-2xl font-black text-accent-brown tracking-tighter">New Password</h3>
                            <p className="text-xs xs:text-sm text-accent-brown/50 font-medium italic">Secure your account with a strong password.</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-12 text-accent-brown font-semibold outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="px-4">
                                        <PasswordStrength password={password} />
                                    </div>
                                )}
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-4">Confirm New Password</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-accent-peach/20 border-2 border-transparent focus:border-brand/30 focus:bg-white rounded-[2rem] py-5 pl-16 pr-12 text-accent-brown font-semibold outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-accent-brown/30 hover:text-brand-dark transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-red-500 text-xs font-bold pl-4">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button type="button" onClick={prevStep} disabled={loading} className="flex-1 h-12 xs:h-14 md:h-16 rounded-full font-black text-accent-brown/40 hover:text-accent-brown hover:bg-black/5 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary flex-[2] bg-brand-dark h-12 xs:h-14 md:h-16 text-[10px] xs:text-xs md:text-sm whitespace-nowrap px-4 xs:px-6 disabled:opacity-50">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Updating...</span>
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </div>
                    </motion.div>
                );
            default: return null;
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
                        <Link to="/" className="flex items-center gap-3 mb-12 hover:scale-105 transition-transform w-fit">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-brand/20">
                                <Logo className="w-full h-full" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-accent-brown">Hi-Vet</span>
                        </Link>
                        <div className="space-y-4 max-w-sm">
                            <h1 className="text-4xl font-black text-accent-brown leading-tight">
                                Recover your <br />
                                <span className="text-brand-dark">professional</span> access.
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed">
                                Let's get you back into your Hi-Vet account securely.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <motion.img
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            src="/images/login_hero.png"
                            alt="Recovery Illustration"
                            className="w-full max-w-[450px] mx-auto drop-shadow-2xl opacity-90 mix-blend-multiply"
                        />
                    </div>
                </div>

                {/* Right Side: Flow */}
                <div className="p-6 xs:p-10 md:p-20 flex flex-col justify-center relative bg-white">
                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </form>

                    <div className="mt-12 text-center pt-8 border-t border-accent-brown/5">
                        <p className="text-sm font-semibold text-accent-brown/50">
                            Remember your password? {' '}
                            <Link to="/login" className="text-brand-dark font-black hover:text-brand transition-colors">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
