import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

const GoogleCallback = () => {
    const [searchParams] = useSearchParams();
    const { loginWithToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error || !token) {
            navigate('/login?error=google_auth_failed', { replace: true });
            return;
        }

        try {
            // Store in localStorage first (synchronous) so ProtectedRoute sees it immediately
            localStorage.setItem('hivet_token', token);
            // Then update React state
            loginWithToken(token);
            // Clean browser redirect directly to dashboard — clears token from URL address bar
            window.location.replace('/dashboard/customer');
        } catch (err) {
            console.error('Error completing Google login:', err);
            window.location.replace('/dashboard/customer');
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 animate-pulse">
                <Logo className="w-full h-full" />
            </div>
            <p className="text-accent-brown/80 font-bold text-sm tracking-wide animate-pulse">
                Signing you in to Hi-Vet…
            </p>
        </div>
    );
};

export default GoogleCallback;
