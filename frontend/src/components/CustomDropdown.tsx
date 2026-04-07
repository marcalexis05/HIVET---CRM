import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    label: string | number;
    value: any;
    disabled?: boolean;
    badge?: string;
    icon?: React.ReactNode;
}

interface CustomDropdownProps {
    value: any;
    options: (string | number | Option)[];
    onChange: (val: any) => void;
    className?: string;
    label?: string;
    placeholder?: string;
    icon?: React.ReactNode;
    isRequired?: boolean;
    isOptional?: boolean;
}

export const CustomDropdown = ({ 
    value, 
    options, 
    onChange, 
    className = "", 
    label, 
    placeholder = "Select...",
    icon,
    isRequired = false,
    isOptional = false
}: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const getLabel = (val: any) => {
        if (val === "" || val === null || val === undefined) return placeholder;
        const opt = options.find(o => typeof o === 'object' ? o.value === val : o === val);
        return typeof opt === 'object' ? opt.label : (opt || placeholder);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative w-full ${className}`} ref={ref}>
            {label && (
                <label className="text-[10px] font-black text-accent-brown/40 uppercase tracking-[0.2em] pl-3 mb-2 block">
                    {label} 
                    {isRequired && <span className="text-brand-dark ml-1">*</span>}
                    {isOptional && (
                        <span className="text-accent-brown/30 text-[9px] normal-case tracking-normal font-bold italic ml-1">Optional</span>
                    )}
                </label>
            ) }
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-accent-peach/20 border-2 transition-all rounded-[2rem] py-4 px-5 text-sm font-semibold text-accent-brown flex items-center justify-between outline-none group ${
                    isOpen 
                        ? 'border-brand/30 bg-white shadow-lg shadow-brand/5 ring-4 ring-brand/5' 
                        : 'border-transparent hover:bg-accent-peach/30'
                }`}
            >
                <div className="flex items-center gap-3">
                    {icon && <span className="text-accent-brown/30 group-focus-within:text-brand-dark transition-colors">{icon}</span>}
                    <span className={!value ? 'text-accent-brown/40' : ''}>{getLabel(value)}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-accent-brown/30 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-dark' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full mt-2 left-0 w-full bg-white rounded-3xl shadow-2xl border border-accent-peach/10 overflow-hidden z-[110] py-2 max-h-[300px] overflow-y-auto no-scrollbar ring-1 ring-black/5"
                    >
                        {options.map((opt, index) => {
                            const optLabel = typeof opt === 'object' ? opt.label : opt;
                            const val = typeof opt === 'object' ? opt.value : opt;
                            const isDisabled = typeof opt === 'object' && opt.disabled;
                            const badge = typeof opt === 'object' ? opt.badge : null;
                            const optIcon = typeof opt === 'object' ? opt.icon : null;
                            const isSelected = value === val;
                            
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => { if (!isDisabled) { onChange(val); setIsOpen(false); } }}
                                    className={`w-full px-5 py-3.5 text-left text-sm font-bold transition-all relative flex items-center justify-between group/item ${
                                        isDisabled 
                                            ? 'text-accent-brown/20 bg-accent-peach/5 cursor-not-allowed italic' 
                                            : isSelected 
                                                ? 'bg-brand/10 text-brand-dark' 
                                                : 'text-accent-brown hover:bg-accent-peach/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {optIcon && <span className={`transition-colors ${isSelected ? 'text-brand-dark' : 'text-accent-brown/30'}`}>{optIcon}</span>}
                                        <span>{optLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {badge && (
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isDisabled ? 'bg-accent-brown/5 text-accent-brown/30' : 'bg-brand/10 text-brand-dark'}`}>
                                                {badge}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-5 h-5 bg-brand-dark rounded-full flex items-center justify-center"
                                            >
                                                <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                            </motion.div>
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

