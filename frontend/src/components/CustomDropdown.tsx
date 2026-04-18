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
    placeholder = "Select Option...",
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
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-accent-brown/40 block mb-3 ml-1">
                    {label} 
                    {isRequired && <span className="text-brand ml-1">*</span>}
                    {isOptional && (
                        <span className="text-accent-brown/20 text-[9px] normal-case tracking-normal font-bold italic ml-2 opacity-60">(Optional)</span>
                    )}
                </label>
            ) }
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-accent-peach/20 border-2 transition-all duration-300 rounded-2xl py-4 px-6 text-sm font-black text-accent-brown flex items-center justify-between outline-none group ${
                    isOpen 
                        ? 'border-brand bg-white shadow-2xl shadow-brand/5 ring-4 ring-brand/5' 
                        : 'border-transparent hover:border-accent-peach/50 hover:bg-white'
                }`}
            >
                <div className="flex items-center gap-4 min-w-0">
                    {icon && <span className={`transition-colors shrink-0 ${isOpen ? 'text-brand' : 'text-accent-brown/20'}`}>{icon}</span>}
                    <span className={`truncate tracking-tight ${!value ? 'text-accent-brown/20 font-medium' : ''}`}>{getLabel(value)}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-accent-brown/20 transition-transform duration-500 shrink-0 ml-3 ${isOpen ? 'rotate-180 text-accent-brown' : 'group-hover:text-accent-brown/40'}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full mt-2 left-0 w-full bg-white rounded-[1.5rem] shadow-2xl border border-accent-peach/10 overflow-hidden z-[99999] py-2 max-h-[300px] overflow-y-auto no-scrollbar ring-1 ring-black/5"
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
                                    className={`w-full px-5 py-3 text-left text-xs font-black uppercase tracking-widest transition-all relative flex items-center justify-between group/item ${
                                        isDisabled 
                                            ? 'text-accent-brown/20 bg-accent-peach/5 cursor-not-allowed italic font-medium' 
                                            : isSelected 
                                                ? 'bg-brand/10 text-brand-dark' 
                                                : 'text-accent-brown/50 hover:bg-accent-peach/10 hover:text-accent-brown'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {optIcon && <span className={`transition-colors shrink-0 ${isSelected ? 'text-brand' : 'text-accent-brown/20 group-hover/item:text-accent-brown/40'}`}>{optIcon}</span>}
                                        <span className="truncate">{optLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {badge && (
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isDisabled ? 'bg-accent-brown/5 text-accent-brown/20' : isSelected ? 'bg-brand/10 text-brand-dark' : 'bg-accent-peach/30 text-accent-brown/40'}`}>
                                                {badge}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className={`w-4 h-4 rounded-full flex items-center justify-center ${isSelected ? 'bg-brand' : 'bg-accent-brown'}`}
                                            >
                                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />
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
