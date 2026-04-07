import { useMemo } from 'react';

interface PasswordStrengthProps {
    password: string;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
    const strength = useMemo(() => {
        if (!password) return 0;
        let score = 0;
        if (password.length > 7) score += 1; // Length > 7
        if (/[A-Z]/.test(password)) score += 1; // Has uppercase
        if (/[0-9]/.test(password)) score += 1; // Has number
        if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special char
        return score;
    }, [password]);

    const getStrengthLabel = () => {
        if (!password) return '';
        if (strength < 2) return 'Weak';
        if (strength === 2 || strength === 3) return 'Medium';
        return 'Strong';
    };

    const getStrengthColor = () => {
        if (strength < 2) return 'bg-red-400'; // Weak
        if (strength === 2 || strength === 3) return 'bg-orange-400'; // Medium
        return 'bg-green-500'; // Strong
    };

    const width = !password ? '0%' : `${Math.max((strength / 4) * 100, 15)}%`;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-full bg-accent-peach/30 rounded-full overflow-hidden flex">
                <div
                    className={`h-full transition-all duration-500 rounded-full ${password ? getStrengthColor() : 'bg-transparent'}`}
                    style={{ width }}
                />
            </div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-accent-brown/40">
                <span>Password Strength</span>
                {password && (
                    <span className={strength < 2 ? 'text-red-500' : strength < 4 ? 'text-orange-500' : 'text-green-600'}>
                        {getStrengthLabel()}
                    </span>
                )}
            </div>
        </div>
    );
};
