import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Role = 'admin' | 'user' | null;

interface AuthContextType {
    user: { email: string; role: Role } | null;
    login: (email: string, role: Role) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<{ email: string; role: Role } | null>(null);

    const login = (email: string, role: Role) => {
        setUser({ email, role });
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
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
