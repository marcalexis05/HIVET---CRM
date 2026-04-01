import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';

interface CustomDatePickerProps {
    value: string;
    onChange: (val: string) => void;
    label: string;
    minDate?: string;
}

export const CustomDatePicker = ({ value, onChange, label, minDate }: CustomDatePickerProps) => {
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
            <label className="text-[9px] font-black uppercase tracking-widest text-accent-brown/40 block mb-2 pl-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`w-full bg-accent-peach/20 border-2 transition-all rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm font-bold flex items-center justify-between text-left ${isOpen ? 'border-brand/30 bg-white ring-4 ring-brand/5' : 'border-transparent text-accent-brown'}`}
            >
                <span className={!value ? 'text-accent-brown/30 font-normal' : ''}>
                    {value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `Select ${label}`}
                </span>
                <Calendar className="w-4 h-4 text-accent-brown/30" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-accent-brown/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: 10 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9, rotateX: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-[400px] bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-white/40 overflow-hidden p-8 sm:p-10"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <h4 className="text-3xl font-black text-accent-brown tracking-tighter leading-none">Select {label}</h4>
                                <div className="relative w-16 h-16 bg-brand rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-brand/20">
                                    <div className="absolute -top-1.5 left-4 w-2.5 h-4 bg-brand-dark rounded-full" />
                                    <div className="absolute -top-1.5 right-4 w-2.5 h-4 bg-brand-dark rounded-full" />
                                    <span className="text-2xl font-black text-white mt-1">{previewDay}</span>
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

                            <div className="grid grid-cols-7 gap-2 text-center mb-6">
                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                    <span key={d} className="text-[10px] font-black text-brand tracking-widest opacity-40">{d}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2 text-center mb-10">
                                {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) }).map((_, i) => {
                                    const prevMonthDays = daysInMonth(currentMonth - 1, currentYear);
                                    const day = prevMonthDays - firstDayOfMonth(currentMonth, currentYear) + i + 1;
                                    return <span key={`empty-${i}`} className="aspect-square flex items-center justify-center text-xs font-bold text-accent-brown/5">{day}</span>;
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
                                            disabled={isPast}
                                            onClick={() => handleDateSelect(d)}
                                            className={`relative aspect-square flex items-center justify-center rounded-2xl text-[13px] font-black transition-all ${isSelected ? 'text-brand' : isToday ? 'text-brand-dark' : isPast ? 'text-accent-brown/10 cursor-not-allowed' : 'text-accent-brown hover:bg-accent-peach/10'}`}
                                        >
                                            {d}
                                            {isSelected && (
                                                <motion.div layoutId="activeDay" className="absolute bottom-1 w-1.5 h-1.5 bg-brand rounded-full pointer-events-none" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleConfirm}
                                className="w-full bg-brand text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-brand/20 hover:bg-brand-dark hover:-translate-y-1 active:scale-95 transition-all"
                            >
                                Confirm
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
