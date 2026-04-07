import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: ('super_admin' | 'system_admin' | 'customer' | 'business' | 'rider')[];
}

function getTokenPayload(): { role?: string } | null {
    try {
        const token = localStorage.getItem('hivet_token');
        if (!token) return null;
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('hivet_token');
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    // While AuthContext is hydrating, show a loading state instead of redirecting
    if (isLoading) {
        return (
            <div className="min-h-screen bg-accent-peach flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">Restoring secure session...</p>
            </div>
        );
    }

    let effectiveRole = user?.role ?? (getTokenPayload()?.role as string | undefined);
    if (effectiveRole === 'user') effectiveRole = 'customer';

    if (!effectiveRole) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(effectiveRole as any)) {
        // Fallback for unauthorized role access
        let fallbackPath = effectiveRole;
        if (['super_admin', 'system_admin'].includes(effectiveRole)) {
            fallbackPath = 'admin';
        } else if (effectiveRole === 'user') {
            fallbackPath = 'customer';
        }
        return <Navigate to={`/dashboard/${fallbackPath}`} replace />;
    }

    return <>{children}</>;
};
