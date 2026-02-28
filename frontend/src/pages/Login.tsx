import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, UserPlus, Home, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('admin@hivet.com'); // Autofill for testing
    const [password, setPassword] = useState('admin123');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (email === 'admin@hivet.com' && password === 'admin123') {
            login(email, 'admin');
            navigate('/dashboard/admin');
        } else if (email === 'user@hivet.com' && password === 'user123') {
            login(email, 'user');
            navigate('/dashboard/user');
        } else {
            setError('Invalid credentials. Use admin@hivet.com/admin123 or user@hivet.com/user123');
        }
    };

    return (
        <div className="min-h-screen bg-accent-cream flex items-center justify-center p-4 md:p-8 select-none overflow-hidden relative">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-6xl w-full grid md:grid-cols-2 bg-white rounded-[3.5rem] shadow-2xl shadow-brand/10 border border-brand/5 overflow-hidden relative z-10"
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
                                Manage your pets <br />
                                with <span className="text-brand-dark">professional</span> ease.
                            </h1>
                            <p className="text-accent-brown/60 font-medium leading-relaxed">
                                Join our community of dedicated pet parents and veterinarians today.
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <motion.img
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            src="/images/login_hero.png"
                            alt="Login Illustration"
                            className="w-full max-w-[450px] mx-auto drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="p-10 md:p-20 flex flex-col justify-center">
                    <div className="mb-12 space-y-4">
                        <h2 className="text-4xl font-black text-accent-brown tracking-tighter">Login</h2>
                        <p className="text-accent-brown/50 font-medium">Welcome back! Please enter your details.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 mb-6">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="group space-y-2">
                                <label className="text-xs font-black text-accent-brown/40 uppercase tracking-widest pl-4">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-brown/20 group-focus-within:text-brand-dark transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
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
                            <button type="button" className="text-xs font-black text-brand-dark hover:text-brand transition-colors uppercase tracking-widest">Forgot?</button>
                        </div>

                        <button type="submit" className="btn-primary w-full group flex items-center justify-center gap-3 mt-4 h-16 text-base">
                            Login Securely
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-sm font-semibold text-accent-brown/50">
                            Don't have an account? {' '}
                            <Link to="/register" className="text-brand-dark font-black hover:text-brand transition-colors inline-flex items-center gap-2">
                                <UserPlus className="w-4 h-4 ml-1" />
                                Sign Up Free
                            </Link>
                        </p>

                        <Link to="/" className="mt-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/30 hover:text-accent-brown transition-colors group">
                            <Home className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                            Back to Landing
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Floating UI Elements Overlay (Subtle) */}
            <div className="absolute top-[20%] right-[15%] w-24 h-24 bg-brand/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-[20%] left-[15%] w-32 h-32 bg-brand-dark/10 rounded-full blur-[100px]" />
        </div>
    );
};

export default Login;
