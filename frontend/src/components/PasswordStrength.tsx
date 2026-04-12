import { useMemo } from 'react';
import { motion } from 'framer-motion';

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

    const getStrengthLevel = () => {
        if (!password) return 0;
        if (strength < 2) return 1; // Weak
        if (strength < 4) return 2; // Medium
        return 3; // Strong
    };

    const level = getStrengthLevel();

    const getStrengthLabel = () => {
        if (level === 1) return 'Weak';
        if (level === 2) return 'Medium';
        if (level === 3) return 'Strong';
        return '';
    };


    return (
        <div className="mt-3 space-y-2">
            <div className="flex gap-1.5 h-1.5">
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex-1 rounded-full bg-accent-peach/20 overflow-hidden">
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: level >= step ? '0%' : '-100%' }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            className={`h-full ${
                                level === 1 ? 'bg-red-400' : 
                                level === 2 ? 'bg-orange-400' : 
                                'bg-green-500'
                            }`}
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30">
                    Security Level
                </span>
                <motion.span 
                    key={getStrengthLabel()}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-[9px] font-black uppercase tracking-widest ${
                        level === 1 ? 'text-red-500' : 
                        level === 2 ? 'text-orange-500' : 
                        level === 3 ? 'text-green-600' : 
                        'text-accent-brown/20'
                    }`}
                >
                    {getStrengthLabel() || 'Unset'}
                </motion.span>
            </div>
        </div>
    );
};
