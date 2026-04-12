import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import React from 'react';

interface CustomDatePickerProps {
    value: string;
    onChange: (val: string) => void;
    label: string;
    minDate?: string;
    isRequired?: boolean;
}

export const CustomDatePicker = ({ value, onChange, label, minDate, isRequired }: CustomDatePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(value ? new Date(value).getDate() : null);

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleDateSelect = (day: number) => {
        setSelectedDay(day);
    };

    const handleConfirm = () => {
        if (selectedDay) {
            const date = new Date(currentYear, currentMonth, selectedDay);
            const formatted = date.toLocaleDateString('en-CA');
            onChange(formatted);
            setIsOpen(false);
        }
    };

    const changeMonth = (val: string) => {
        setViewDate(new Date(currentYear, monthNames.indexOf(val), 1));
    };

    const changeYear = (val: number) => {
        setViewDate(new Date(val, currentMonth, 1));
    };

    const years = [];
    const thisYear = new Date().getFullYear();
    for (let y = thisYear + 10; y >= thisYear - 100; y--) {
        years.push(y);
    }

    const previewDay = selectedDay ? selectedDay.toString().padStart(2, '0') : (value ? new Date(value).getDate().toString().padStart(2, '0') : '01');

    return (
        <div className="relative">
            <label className="text-[11px] font-black uppercase tracking-widest text-accent-brown/40 block mb-3 ml-2">
                {label} {isRequired && <span className="text-brand-dark">*</span>}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`w-full bg-[#F7F6F2] border-2 transition-all rounded-3xl py-4 px-8 text-base font-bold flex items-center justify-between text-left ${isOpen ? 'border-brand-dark/20 bg-white ring-1 ring-brand-dark/30 shadow-lg' : 'border-transparent text-accent-brown shadow-inner'}`}
            >
                <span className={!value ? 'text-accent-brown/30 font-normal' : ''}>
                    {value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `Select ${label}`}
                </span>
                <Calendar className="w-5 h-5 text-accent-brown/20" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-accent-brown/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-[420px] bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/40 overflow-hidden p-10 sm:p-14"
                        >
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-accent-brown tracking-tighter leading-none uppercase italic">{label}</h4>
                                    <p className="text-xs text-accent-brown/30 font-medium italic">Secure your schedule.</p>
                                </div>
                                <div className="relative w-20 h-20 bg-brand-dark rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-brand-dark/30">
                                    <div className="absolute -top-1.5 left-4 w-3 h-5 bg-accent-brown rounded-full" />
                                    <div className="absolute -top-1.5 right-4 w-3 h-5 bg-accent-brown rounded-full" />
                                    <span className="text-3xl font-black text-white mt-1 uppercase italic">{previewDay}</span>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-10">
                                <CustomDropdown 
                                    className="flex-1"
                                    value={monthNames[currentMonth]} 
                                    options={monthNames}
                                    onChange={changeMonth}
                                />
                                <CustomDropdown 
                                    className="w-32"
                                    value={currentYear} 
                                    options={years}
                                    onChange={changeYear}
                                />
                            </div>

                                <div className="grid grid-cols-7 gap-3 text-center mb-6">
                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                        <span key={d} className="text-[10px] font-black text-accent-brown/20 tracking-widest uppercase italic">{d}</span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-3 text-center mb-12">
                                    {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) }).map((_, i) => {
                                        const prevMonthDays = daysInMonth(currentMonth - 1, currentYear);
                                        const day = prevMonthDays - firstDayOfMonth(currentMonth, currentYear) + i + 1;
                                        return <span key={`empty-${i}`} className="aspect-square flex items-center justify-center text-[13px] font-black text-accent-brown/5">{day}</span>;
                                    })}
                                    
                                    {Array.from({ length: daysInMonth(currentMonth, currentYear) }).map((_, i) => {
                                        const d = i + 1;
                                        const isSelected = selectedDay === d;
                                        const isToday = new Date().toLocaleDateString('en-CA') === new Date(currentYear, currentMonth, d).toLocaleDateString('en-CA');
                                        
                                        const date = new Date(currentYear, currentMonth, d);
                                        const isPast = minDate ? date < new Date(minDate) : false;

                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                disabled={isPast}
                                                onClick={() => handleDateSelect(d)}
                                                className={`relative aspect-square flex items-center justify-center rounded-2xl text-[14px] font-black transition-all ${isSelected ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/30' : isToday ? 'text-brand-dark ring-2 ring-brand-dark/20' : isPast ? 'text-accent-brown/10 cursor-not-allowed' : 'text-accent-brown hover:bg-brand-dark hover:text-white'}`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="w-full bg-brand-dark text-white py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-brand-dark/20 hover:shadow-brand-dark/40 hover:-translate-y-1 active:translate-y-0 transition-all italic"
                            >
                                Confirm Identity
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
