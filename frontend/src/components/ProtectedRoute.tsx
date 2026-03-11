import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRole?: 'admin' | 'user' | 'business';
}

function getTokenPayload(): { role?: string } | null {
    try {
        const token = localStorage.getItem('hivet_token');
        if (!token) return null;
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        // Check expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('hivet_token');
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
    const { user } = useAuth();
    const location = useLocation();

    // If React state isn't hydrated yet, fall back to reading localStorage directly
    const effectiveRole = user?.role ?? (getTokenPayload()?.role as string | undefined);

    if (!effectiveRole) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRole && effectiveRole !== allowedRole) {
        return <Navigate to={`/dashboard/${effectiveRole}`} replace />;
    }

    return <>{children}</>;
};
