import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Option {
    label: string | number;
    value: any;
    disabled?: boolean;
    badge?: string;
}

interface CustomDropdownProps {
    value: any;
    options: (string | number | Option)[];
    onChange: (val: any) => void;
    className?: string;
    label?: string;
    placeholder?: string;
}

export const CustomDropdown = ({ value, options, onChange, className = "", label, placeholder = "Select..." }: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const getLabel = (val: any) => {
        const opt = options.find(o => typeof o === 'object' ? o.value === val : o === val);
        return typeof opt === 'object' ? opt.label : opt || placeholder;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={ref}>
            {label && <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/50 mb-1.5 block pl-1">{label} *</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-accent-peach/10 border-2 transition-all rounded-[1.25rem] py-3.5 px-5 text-sm font-black text-accent-brown flex items-center justify-between hover:bg-accent-peach/20 outline-none ${isOpen ? 'border-brand/30 bg-white ring-4 ring-brand/5' : 'border-transparent'}`}
            >
                {getLabel(value)}
                <ChevronDown className={`w-4 h-4 text-accent-brown/30 transition-transform ${isOpen ? 'rotate-180 text-brand' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full mt-2 left-0 w-full bg-white rounded-2xl shadow-2xl border border-accent-peach/10 overflow-hidden z-[110] py-2 max-h-[250px] overflow-y-auto no-scrollbar"
                    >
                        {options.map(opt => {
                            const label = typeof opt === 'object' ? opt.label : opt;
                            const val = typeof opt === 'object' ? opt.value : opt;
                            const isDisabled = typeof opt === 'object' && opt.disabled;
                            const badge = typeof opt === 'object' ? opt.badge : null;
                            
                            return (
                                <button
                                    key={String(val)}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => { if (!isDisabled) { onChange(val); setIsOpen(false); } }}
                                    className={`w-full px-5 py-3 text-left text-sm font-bold transition-all ${
                                        isDisabled 
                                            ? 'text-accent-brown/20 bg-accent-peach/5 cursor-not-allowed italic line-through' 
                                            : value === val 
                                                ? 'bg-brand text-white' 
                                                : 'text-accent-brown hover:bg-accent-peach/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{label}</span>
                                        {isDisabled && (
                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                                {badge || 'Unavailable'}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
