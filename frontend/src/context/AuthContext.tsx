import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { checkSavedSession } from '../utils/sessionCheck';

type Role = 'super_admin' | 'system_admin' | 'customer' | 'business' | 'rider' | null;

interface AuthUser {
    id?: number;
    email: string;
    role: Role;
    name: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    phone?: string;
    gender?: string;
    birthday?: string;
    avatar?: string;
    token?: string;
    vehicle_type?: string;
    clinic_name?: string;
    clinic_phone?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    login: (email: string, role: Role, name: string) => void;
    loginWithToken: (token: string) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        try {
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch {
            return JSON.parse(atob(base64));
        }
    } catch {
        return null;
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Rehydrate session from localStorage on first load
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        setIsLoading(true);
        const restoreSession = async () => {
        const stored = localStorage.getItem('hivet_token');
        if (stored) {
            const payload = parseJwt(stored);
            if (payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) {
                const status = await checkSavedSession(stored, controller.signal);
                if (cancelled || localStorage.getItem('hivet_token') !== stored) return;
                if (status === 'invalid') {
                    localStorage.removeItem('hivet_token');
                    setUser(null); setIsLoading(false);
                    return;
                }
                // Retain the existing saved offline view when the network is unavailable.
                if (cancelled) return;
                let role = payload.role as Role;
                if ((payload.role as string) === 'user') role = 'customer';
                if ((payload.role as string) === 'admin') role = 'super_admin';
                setUser({
                    id: payload.id as number | undefined,
                    email: payload.email as string,
                    role: role,
                    name: payload.name as string,
                    first_name: payload.first_name as string | undefined,
                    middle_name: payload.middle_name as string | undefined,
                    last_name: payload.last_name as string | undefined,
                    suffix: payload.suffix as string | undefined,
                    phone: payload.phone as string | undefined,
                    gender: payload.gender as string | undefined,
                    birthday: payload.birthday as string | undefined,
                    avatar: payload.avatar as string | undefined,
                    vehicle_type: payload.vehicle_type as string | undefined,
                    clinic_name: payload.clinic_name as string | undefined,
                    clinic_phone: payload.clinic_phone as string | undefined,
                    token: stored,
                });
            } else {
                localStorage.removeItem('hivet_token');
            }
        }
        if (!cancelled) setIsLoading(false);
        };
        void restoreSession();
        return () => { cancelled = true; controller.abort(); };
    }, []);

    useEffect(() => {
        const syncLogout = (event: StorageEvent) => {
            if (event.key === 'hivet_token' && !event.newValue) setUser(null);
        };
        window.addEventListener('storage', syncLogout);
        return () => window.removeEventListener('storage', syncLogout);
    }, []);

    const login = (email: string, role: Role, name: string) => {
        setUser({ email, role, name });
    };

    const loginWithToken = (token: string) => {
        setIsLoading(false);
        const payload = parseJwt(token);
        if (!payload) return;
        localStorage.setItem('hivet_token', token);
        let role = (payload.role as Role) ?? 'customer';
        if ((payload.role as string) === 'user') role = 'customer';
        if ((payload.role as string) === 'admin') role = 'super_admin';
        setUser({
            id: payload.id as number | undefined,
            email: payload.email as string,
            role: role,
            name: payload.name as string,
            first_name: payload.first_name as string | undefined,
            middle_name: payload.middle_name as string | undefined,
            last_name: payload.last_name as string | undefined,
            suffix: payload.suffix as string | undefined,
            phone: payload.phone as string | undefined,
            gender: payload.gender as string | undefined,
            birthday: payload.birthday as string | undefined,
            avatar: payload.avatar as string | undefined,
            vehicle_type: payload.vehicle_type as string | undefined,
            clinic_name: payload.clinic_name as string | undefined,
            clinic_phone: payload.clinic_phone as string | undefined,
            token,
        });
    };

    const logout = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            if (token) await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/logout`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }
            });
        } catch {
            // Always clear local access when the network is unavailable.
        } finally {
            localStorage.removeItem('hivet_token');
            setUser(null);
            // Complete navigation before a protected-route redirect can win the logout race.
            window.location.replace('/');
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, loginWithToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
