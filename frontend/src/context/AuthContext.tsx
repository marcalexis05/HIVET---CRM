import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Role = 'admin' | 'user' | 'business' | 'rider' | null;

interface AuthUser {
    email: string;
    role: Role;
    name: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    phone?: string;
    avatar?: string;
    token?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (email: string, role: Role, name: string) => void;
    loginWithToken: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): Record<string, unknown> | null {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);

    // Rehydrate session from localStorage on first load
    useEffect(() => {
        const stored = localStorage.getItem('hivet_token');
        if (stored) {
            const payload = parseJwt(stored);
            if (payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) {
                setUser({
                    email: payload.email as string,
                    role: payload.role as Role,
                    name: payload.name as string,
                    first_name: payload.first_name as string | undefined,
                    middle_name: payload.middle_name as string | undefined,
                    last_name: payload.last_name as string | undefined,
                    suffix: payload.suffix as string | undefined,
                    phone: payload.phone as string | undefined,
                    avatar: payload.avatar as string | undefined,
                    token: stored,
                });
            } else {
                localStorage.removeItem('hivet_token');
            }
        }
    }, []);

    const login = (email: string, role: Role, name: string) => {
        setUser({ email, role, name });
    };

    const loginWithToken = (token: string) => {
        const payload = parseJwt(token);
        if (!payload) return;
        localStorage.setItem('hivet_token', token);
        setUser({
            email: payload.email as string,
            role: (payload.role as Role) ?? 'user',
            name: payload.name as string,
            first_name: payload.first_name as string | undefined,
            middle_name: payload.middle_name as string | undefined,
            last_name: payload.last_name as string | undefined,
            suffix: payload.suffix as string | undefined,
            phone: payload.phone as string | undefined,
            avatar: payload.avatar as string | undefined,
            token,
        });
    };

    const logout = () => {
        localStorage.removeItem('hivet_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, loginWithToken, logout }}>
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
