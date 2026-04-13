import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import React from 'react';

interface CustomDatePickerProps {
    value: string;
    onChange: (val: string) => void;
    label: string;
    minDate?: string;
    isRequired?: boolean;
    onModalOpenChange?: (open: boolean) => void;
}

export const CustomDatePicker = ({ value, onChange, label, minDate, isRequired, onModalOpenChange }: CustomDatePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const setOpenState = (open: boolean) => {
        setIsOpen(open);
        onModalOpenChange?.(open);
    };

    // Robust base date
    const baseDate = useMemo(() => {
        if (!value) return new Date();
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date() : d;
    }, [value]);

    const [viewDate, setViewDate] = useState(baseDate);
    const [selectedDay, setSelectedDay] = useState<number | null>(value ? new Date(value).getDate() : null);

    const isValid = viewDate instanceof Date && !isNaN(viewDate.getTime());
    const currentYear = isValid ? viewDate.getFullYear() : new Date().getFullYear();
    const currentMonth = isValid ? viewDate.getMonth() : new Date().getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const handleDateSelect = (day: number) => {
        const date = new Date(currentYear, currentMonth, day);
        onChange(date.toLocaleDateString('en-CA'));
        setOpenState(false);
    };

    const handleConfirm = () => {
        if (selectedDay !== null) {
            const date = new Date(currentYear, currentMonth, selectedDay);
            onChange(date.toLocaleDateString('en-CA'));
            setOpenState(false);
        }
    };

    const changeMonth = (val: string) => {
        const idx = monthNames.indexOf(val);
        if (idx !== -1) setViewDate(new Date(currentYear, idx, 1));
    };

    const changeYear = (val: number) => {
        setViewDate(new Date(val, currentMonth, 1));
    };

    const years = useMemo(() => {
        const yFull = [];
        const thisY = new Date().getFullYear();
        for (let y = thisY + 10; y >= thisY - 100; y--) yFull.push(y);
        return yFull;
    }, []);

    const previewDay = selectedDay?.toString().padStart(2, '0') || (isValid ? viewDate.getDate().toString().padStart(2, '0') : '01');

    return (
        <div className="relative w-full">
            {label && (
                <label className="text-[12px] font-black uppercase tracking-[0.3em] text-accent-brown/70 block mb-5 ml-2 italic">
                    {label} {isRequired && <span className="text-brand ml-1">*</span>}
                </label>
            )}
            <button
                type="button"
                onClick={() => setOpenState(true)}
                className={`w-full bg-[#FAFAFA] border-2 transition-all rounded-[2.5rem] py-5 px-8 text-base font-bold flex items-center justify-between text-left ${isOpen ? 'border-brand/40 bg-white ring-4 ring-brand/5 shadow-2xl' : 'border-brand/5 text-accent-brown hover:border-brand/20 shadow-sm italic'}`}
            >
                <span className={!value ? 'text-accent-brown/20' : ''}>
                    {value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `Select ${label || 'Date'}`}
                </span>
                <Calendar className={`w-5 h-5 transition-colors ${isOpen ? 'text-brand' : 'text-accent-brown/20'}`} />
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[2000000] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setOpenState(false)}
                        />
                        <div
                            className="relative w-full max-w-[900px] bg-white rounded-[4rem] shadow-[0_32px_120px_-16px_rgba(0,0,0,0.5)] border border-white/40 flex flex-col md:flex-row overflow-hidden"
                            style={{ zIndex: 10 }}
                        >
                            {/* Left Side: Summary & Action */}
                            <div className="md:w-1/3 bg-[#F7F6F2] p-10 sm:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-accent-brown/5">
                                <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                                    <h4 className="text-4xl font-black text-accent-brown tracking-tighter leading-none italic uppercase text-center">Select Date</h4>
                                    
                                    <div className="relative w-40 h-40 bg-brand rounded-[3.5rem] flex items-center justify-center shadow-2xl shadow-brand/30">
                                        <div className="absolute -top-4 left-10 w-5 h-10 bg-brand-dark rounded-full" />
                                        <div className="absolute -top-4 right-10 w-5 h-10 bg-brand-dark rounded-full" />
                                        <span className="text-6xl font-black text-white mt-2 uppercase italic tracking-tighter">{previewDay}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={selectedDay === null}
                                    className="w-full bg-brand text-white py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-brand/20 hover:brightness-110 transition-all italic mt-12 disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    Finalize Selection
                                </button>
                            </div>

                            {/* Right Side: Calendar Registry */}
                            <div className="flex-1 p-10 sm:p-14 bg-white">
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
                                        <span key={d} className="text-[10px] font-black text-accent-brown/20 tracking-widest italic">{d}</span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-2 text-center">
                                    {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) || 0 }).map((_, i) => (
                                        <div key={`empty-${i}`} className="aspect-square" />
                                    ))}
                                    
                                    {Array.from({ length: daysInMonth(currentMonth, currentYear) || 0 }).map((_, i) => {
                                        const d = i + 1;
                                        const isSelected = selectedDay === d;
                                        const dateObj = new Date(currentYear, currentMonth, d);
                                        const isPast = minDate ? dateObj < new Date(minDate) : false;

                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                disabled={isPast}
                                                onClick={() => handleDateSelect(d)}
                                                className={`aspect-square rounded-2xl flex items-center justify-center text-[15px] font-black transition-all ${isSelected ? 'bg-brand text-white shadow-xl shadow-brand/30 scale-110' : isPast ? 'text-accent-brown/10' : 'text-accent-brown hover:bg-brand/10 hover:text-brand'}`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
};
