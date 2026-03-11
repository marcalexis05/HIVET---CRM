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
            navigate('/login?error=google_auth_failed');
            return;
        }

        // Store in localStorage first (synchronous) so ProtectedRoute sees it immediately
        localStorage.setItem('hivet_token', token);
        // Then update React state
        loginWithToken(token);
        // Navigate — ProtectedRoute will read localStorage as fallback
        navigate('/dashboard/user', { replace: true });
    }, []); // run once on mount only

    return (
        <div className="min-h-screen bg-accent-cream flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 animate-pulse">
                <Logo className="w-full h-full" />
            </div>
            <p className="text-accent-brown/60 font-semibold text-sm animate-pulse">
                Signing you in with Google…
            </p>
        </div>
    );
};

export default GoogleCallback;
