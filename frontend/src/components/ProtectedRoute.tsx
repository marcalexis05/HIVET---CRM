import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRole?: 'admin' | 'user' | 'business';
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRole && user.role !== allowedRole) {
        return <Navigate to={`/dashboard/${user.role}`} replace />;
    }

    return <>{children}</>;
};
