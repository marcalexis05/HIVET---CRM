import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X, ChevronDown, Check, ChevronLeft, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import {
    type DatePickerMode,
    getModeDateRange,
    getTodayPH,
    parseDateParts,
    formatDateString,
    isValidRealDate,
    validateBirthday
} from '../utils/dateValidation';

export interface CustomDatePickerProps {
    value: string;
    onChange: (val: string) => void;
    label?: string;
    mode?: DatePickerMode;
    species?: string;
    minDate?: string;
    maxDate?: string;
    disableFuture?: boolean;
    isRequired?: boolean;
    onModalOpenChange?: (open: boolean) => void;
    buttonClassName?: string;
    labelClassName?: string;
    isDateAvailable?: (dateStr: string, dateObj: Date) => boolean;
    maxBookingMonthsAhead?: number;
    showYearDropdown?: boolean;
    error?: string;
    disabled?: boolean;
}

const DEFAULT_MAX_BOOKING_MONTHS_AHEAD = 6;

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const getTodayPHParts = () => {
    const todayStr = getTodayPH();
    const parts = todayStr.split('-').map(Number);
    return {
        year: parts[0] || new Date().getFullYear(),
        month: (parts[1] || 1) - 1, // 0-based
        day: parts[2] || new Date().getDate(),
        dateStr: todayStr
    };
};

interface MonthOption {
    label: string;
    monthIndex: number;
    year: number;
    key: string;
}

export const CustomDatePicker = ({ 
    value, 
    onChange, 
    label, 
    mode = 'appointment',
    species,
    minDate, 
    maxDate,
    disableFuture = false,
    isRequired, 
    onModalOpenChange,
    buttonClassName,
    labelClassName,
    isDateAvailable,
    maxBookingMonthsAhead = DEFAULT_MAX_BOOKING_MONTHS_AHEAD,
    showYearDropdown,
    error: externalError,
    disabled = false
}: CustomDatePickerProps) => {
    const isBirthdayMode = mode === 'pet birthday' || mode === 'person birthday';

    const [isOpen, setIsOpen] = useState(false);
    const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
    const [focusedMonthIndex, setFocusedMonthIndex] = useState<number>(-1);
    const [isTouched, setIsTouched] = useState(false);

    // View mode for Birthday calendar: 'days' or 'years'
    const [viewMode, setViewMode] = useState<'days' | 'years'>('days');

    const todayParts = useMemo(() => getTodayPHParts(), []);
    const todayStr = todayParts.dateStr;

    // Birthday bounds calculation
    const modeRange = useMemo(() => {
        return getModeDateRange(mode, species);
    }, [mode, species]);

    const effectiveMinDate = useMemo(() => {
        if (isBirthdayMode) {
            return minDate || modeRange.minDate;
        }
        return minDate || todayStr;
    }, [isBirthdayMode, minDate, modeRange.minDate, todayStr]);

    const effectiveMaxDate = useMemo(() => {
        if (isBirthdayMode) {
            return maxDate || modeRange.maxDate;
        }
        return maxDate || '';
    }, [isBirthdayMode, maxDate, modeRange.maxDate]);

    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const monthButtonRef = useRef<HTMLButtonElement>(null);
    const monthContainerRef = useRef<HTMLDivElement>(null);
    const monthListRef = useRef<HTMLDivElement>(null);
    const selectedYearRef = useRef<HTMLButtonElement | null>(null);

    // If explicit year dropdown isn't set, default to plain text year pill (remove dropdown)
    // for booking/appointment mode, while preserving year dropdown only if explicitly requested
    const hasYearDropdown = useMemo(() => {
        if (isBirthdayMode) return false; // Birthday mode uses the integrated 4-col year grid
        if (typeof showYearDropdown === 'boolean') return showYearDropdown;
        return Boolean(label?.toLowerCase().includes('birth'));
    }, [isBirthdayMode, showYearDropdown, label]);

    const setOpenState = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setIsMonthMenuOpen(false);
            setViewMode('days');
        }
        onModalOpenChange?.(open);
    };

    // Shared availability check function
    const checkIsAvailable = useCallback((dateStr: string, dateObj: Date) => {
        if (isBirthdayMode) {
            const parts = parseDateParts(dateStr);
            if (!parts || !isValidRealDate(parts.year, parts.month, parts.day)) {
                return false;
            }
            if (dateStr < effectiveMinDate || dateStr > effectiveMaxDate) {
                return false;
            }
            return true;
        }

        // 1. Appointment mode: Must be >= minDate (or >= todayStr)
        const effectiveMin = minDate || todayStr;
        if (dateStr < effectiveMin) return false;

        // 2. Must be <= maxDate if provided
        if (maxDate && dateStr > maxDate) return false;

        // 3. Must satisfy disableFuture
        if (disableFuture && dateStr > todayStr) return false;

        // 4. In booking mode (no year dropdown), cannot exceed allowed booking months range
        if (!hasYearDropdown) {
            const [y, m] = dateStr.split('-').map(Number);
            const monthOffset = (y - todayParts.year) * 12 + (m - 1 - todayParts.month);
            if (monthOffset < 0 || monthOffset > maxBookingMonthsAhead) {
                return false;
            }
        }

        // 5. Clinic operational schedule check
        if (isDateAvailable) {
            return isDateAvailable(dateStr, dateObj);
        }

        return true;
    }, [isBirthdayMode, effectiveMinDate, effectiveMaxDate, minDate, todayStr, maxDate, disableFuture, hasYearDropdown, todayParts.year, todayParts.month, maxBookingMonthsAhead, isDateAvailable]);

    // Active selection & view date state
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const [viewYear, setViewYear] = useState<number>(modeRange.defaultStartYear);
    const [viewMonth, setViewMonth] = useState<number>(modeRange.defaultStartMonth);

    // Synchronize and validate initial or changed date when opening
    useEffect(() => {
        if (!isOpen) {
            setIsMonthMenuOpen(false);
            setViewMode('days');
            return;
        }

        if (value) {
            const parts = parseDateParts(value);
            if (parts && isValidRealDate(parts.year, parts.month, parts.day)) {
                const y = parts.year;
                const m = parts.month - 1;
                const d = parts.day;
                const dateObj = new Date(y, m, d, 12, 0, 0);

                if (checkIsAvailable(value, dateObj)) {
                    setSelectedDateStr(value);
                    setViewYear(y);
                    setViewMonth(m);
                    return;
                } else if (isBirthdayMode) {
                    // For existing birthdays that may break rules, show them as they are and open on that month/year
                    setSelectedDateStr(value);
                    setViewYear(y);
                    setViewMonth(m);
                    return;
                }
            }
        }

        // If saved value is invalid or absent, clear selection and open on sensible starting month/year
        setSelectedDateStr(null);
        setViewYear(modeRange.defaultStartYear);
        setViewMonth(modeRange.defaultStartMonth);
    }, [isOpen, value, checkIsAvailable, modeRange.defaultStartYear, modeRange.defaultStartMonth, isBirthdayMode]);

    // Lock body scrolling when modal is open
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Keyboard support: Escape closes year view, month dropdown, or modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewMode === 'years') {
                    e.stopPropagation();
                    setViewMode('days');
                } else if (isMonthMenuOpen) {
                    e.stopPropagation();
                    setIsMonthMenuOpen(false);
                    monthButtonRef.current?.focus();
                } else {
                    setOpenState(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isMonthMenuOpen, viewMode]);

    // Scroll selected year into view when year grid opens
    useEffect(() => {
        if (viewMode === 'years') {
            const timer = setTimeout(() => {
                selectedYearRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [viewMode]);

    // Close month dropdown when tapping/clicking outside (Appointment mode)
    useEffect(() => {
        if (!isMonthMenuOpen) return;
        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (monthContainerRef.current && !monthContainerRef.current.contains(target)) {
                setIsMonthMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [isMonthMenuOpen]);

    // Appointment mode allowed months options
    const monthOptions = useMemo<MonthOption[]>(() => {
        if (isBirthdayMode) return [];
        if (hasYearDropdown) {
            return monthNames.map((name, idx) => ({
                label: name,
                monthIndex: idx,
                year: viewYear,
                key: `${viewYear}-${idx}`
            }));
        }

        const options: MonthOption[] = [];
        let spansMultipleYears = false;
        for (let offset = 0; offset <= maxBookingMonthsAhead; offset++) {
            const totalMonth = todayParts.month + offset;
            const y = todayParts.year + Math.floor(totalMonth / 12);
            if (y > todayParts.year) {
                spansMultipleYears = true;
                break;
            }
        }

        for (let offset = 0; offset <= maxBookingMonthsAhead; offset++) {
            const totalMonth = todayParts.month + offset;
            const year = todayParts.year + Math.floor(totalMonth / 12);
            const monthIndex = totalMonth % 12;

            let label = monthNames[monthIndex];
            if (spansMultipleYears && year > todayParts.year) {
                label = `${monthNames[monthIndex]} ${year}`;
            }

            options.push({
                label,
                monthIndex,
                year,
                key: `${year}-${monthIndex}`
            });
        }
        return options;
    }, [isBirthdayMode, hasYearDropdown, maxBookingMonthsAhead, todayParts.month, todayParts.year, viewYear]);

    // Handle month option selection (Appointment mode)
    const handleSelectMonth = (opt: MonthOption) => {
        setViewYear(opt.year);
        setViewMonth(opt.monthIndex);
        setIsMonthMenuOpen(false);
        monthButtonRef.current?.focus();
    };

    // Calculate days and weekday offsets
    const daysInCurrentMonth = useMemo(() => {
        return new Date(viewYear, viewMonth + 1, 0, 12, 0, 0).getDate();
    }, [viewYear, viewMonth]);

    const firstDayOfCurrentMonth = useMemo(() => {
        return new Date(viewYear, viewMonth, 1, 12, 0, 0).getDay();
    }, [viewYear, viewMonth]);

    // Birthday mode allowed years (4 columns, newest first down to oldest allowed)
    const birthdayYears = useMemo<number[]>(() => {
        if (!isBirthdayMode) return [];
        const minP = parseDateParts(effectiveMinDate);
        const maxP = parseDateParts(effectiveMaxDate);
        if (!minP || !maxP) return [];

        const list: number[] = [];
        for (let y = maxP.year; y >= minP.year; y--) {
            list.push(y);
        }
        return list;
    }, [isBirthdayMode, effectiveMinDate, effectiveMaxDate]);

    // Month arrow navigation enablement in Birthday mode
    const canGoPrevMonth = useMemo(() => {
        if (!isBirthdayMode) return true;
        const minP = parseDateParts(effectiveMinDate);
        if (!minP) return true;
        if (viewYear < minP.year) return false;
        if (viewYear === minP.year && viewMonth <= minP.month - 1) return false;
        return true;
    }, [isBirthdayMode, effectiveMinDate, viewYear, viewMonth]);

    const canGoNextMonth = useMemo(() => {
        if (!isBirthdayMode) return true;
        const maxP = parseDateParts(effectiveMaxDate);
        if (!maxP) return true;
        if (viewYear > maxP.year) return false;
        if (viewYear === maxP.year && viewMonth >= maxP.month - 1) return false;
        return true;
    }, [isBirthdayMode, effectiveMaxDate, viewYear, viewMonth]);

    const handlePrevMonth = () => {
        if (!canGoPrevMonth) return;
        let newYear = viewYear;
        let newMonth = viewMonth - 1;
        if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
        }
        setViewYear(newYear);
        setViewMonth(newMonth);

        // Clear selection if current selection is invalid in the new month
        if (selectedDateStr) {
            const parts = parseDateParts(selectedDateStr);
            if (parts) {
                const testStr = formatDateString(newYear, newMonth, parts.day);
                if (!checkIsAvailable(testStr, new Date(newYear, newMonth, parts.day, 12, 0, 0))) {
                    setSelectedDateStr(null);
                }
            }
        }
    };

    const handleNextMonth = () => {
        if (!canGoNextMonth) return;
        let newYear = viewYear;
        let newMonth = viewMonth + 1;
        if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
        }
        setViewYear(newYear);
        setViewMonth(newMonth);

        // Clear selection if current selection is invalid in the new month
        if (selectedDateStr) {
            const parts = parseDateParts(selectedDateStr);
            if (parts) {
                const testStr = formatDateString(newYear, newMonth, parts.day);
                if (!checkIsAvailable(testStr, new Date(newYear, newMonth, parts.day, 12, 0, 0))) {
                    setSelectedDateStr(null);
                }
            }
        }
    };

    // Selecting a year in Birthday mode returns to days and clears invalid selection
    const handleSelectYear = (chosenYear: number) => {
        setViewYear(chosenYear);
        setViewMode('days');

        if (selectedDateStr) {
            const parts = parseDateParts(selectedDateStr);
            if (parts) {
                const testStr = formatDateString(chosenYear, viewMonth, parts.day);
                if (!checkIsAvailable(testStr, new Date(chosenYear, viewMonth, parts.day, 12, 0, 0))) {
                    setSelectedDateStr(null);
                }
            }
        }
    };

    // Year options for backward-compatible appointment dropdown if enabled
    const legacyYears = useMemo(() => {
        if (!hasYearDropdown || isBirthdayMode) return [];
        const thisY = new Date().getFullYear();
        const startY = minDate ? parseInt(minDate.split('-')[0], 10) : thisY - 100;
        const endY = thisY + 10;
        const yFull: number[] = [];

        if (startY >= thisY - 5) {
            for (let y = startY; y <= endY; y++) yFull.push(y);
        } else {
            for (let y = thisY; y >= startY; y--) yFull.push(y);
        }
        return yFull;
    }, [hasYearDropdown, isBirthdayMode, minDate]);

    // Handle day selection
    const handleSelectDay = (dateStr: string) => {
        setSelectedDateStr(dateStr);
    };

    // Finalize button confirmation
    const isConfirmEnabled = useMemo(() => {
        if (!selectedDateStr) return false;
        const parts = parseDateParts(selectedDateStr);
        if (!parts || !isValidRealDate(parts.year, parts.month, parts.day)) return false;
        const dateObj = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
        return checkIsAvailable(selectedDateStr, dateObj);
    }, [selectedDateStr, checkIsAvailable]);

    const handleConfirm = () => {
        if (!isConfirmEnabled || !selectedDateStr) return;
        const parts = parseDateParts(selectedDateStr);
        if (!parts || !isValidRealDate(parts.year, parts.month, parts.day)) return;
        const dateObj = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);

        if (!checkIsAvailable(selectedDateStr, dateObj)) {
            setSelectedDateStr(null);
            return;
        }

        setIsTouched(true);
        onChange(selectedDateStr);
        setOpenState(false);
    };

    // Keyboard navigation across calendar days grid
    const handleDayKeyDown = (e: React.KeyboardEvent, dayNum: number) => {
        let nextDay = dayNum;
        if (e.key === 'ArrowLeft') {
            nextDay = Math.max(1, dayNum - 1);
        } else if (e.key === 'ArrowRight') {
            nextDay = Math.min(daysInCurrentMonth, dayNum + 1);
        } else if (e.key === 'ArrowUp') {
            nextDay = Math.max(1, dayNum - 7);
        } else if (e.key === 'ArrowDown') {
            nextDay = Math.min(daysInCurrentMonth, dayNum + 7);
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            handlePrevMonth();
            return;
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            handleNextMonth();
            return;
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const dateStr = formatDateString(viewYear, viewMonth, dayNum);
            const dateObj = new Date(viewYear, viewMonth, dayNum, 12, 0, 0);
            if (checkIsAvailable(dateStr, dateObj)) {
                handleSelectDay(dateStr);
            }
            return;
        } else {
            return;
        }

        e.preventDefault();
        const btn = document.getElementById(`cal-day-${nextDay}`);
        btn?.focus();
    };

    // Keyboard navigation inside Year Grid
    const handleYearKeyDown = (e: React.KeyboardEvent, yr: number) => {
        const idx = birthdayYears.indexOf(yr);
        if (idx === -1) return;

        let nextIdx = idx;
        if (e.key === 'ArrowLeft') {
            nextIdx = Math.max(0, idx - 1);
        } else if (e.key === 'ArrowRight') {
            nextIdx = Math.min(birthdayYears.length - 1, idx + 1);
        } else if (e.key === 'ArrowUp') {
            nextIdx = Math.max(0, idx - 4);
        } else if (e.key === 'ArrowDown') {
            nextIdx = Math.min(birthdayYears.length - 1, idx + 4);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectYear(yr);
            return;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setViewMode('days');
            return;
        } else {
            return;
        }

        e.preventDefault();
        const nextYr = birthdayYears[nextIdx];
        const btn = document.getElementById(`cal-year-${nextYr}`);
        btn?.focus();
    };

    // Preview badge displayed on the left/top calendar card
    const previewDay = useMemo(() => {
        if (selectedDateStr) {
            const parts = parseDateParts(selectedDateStr);
            if (parts) return parts.day.toString().padStart(2, '0');
        }
        return todayParts.day.toString().padStart(2, '0');
    }, [selectedDateStr, todayParts.day]);

    const previewFormattedDate = useMemo(() => {
        const targetStr = selectedDateStr || (isBirthdayMode ? '' : todayStr);
        if (!targetStr) return 'No Date Selected';
        const parts = parseDateParts(targetStr);
        if (parts && isValidRealDate(parts.year, parts.month, parts.day)) {
            const d = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
        return '';
    }, [selectedDateStr, isBirthdayMode, todayStr]);

    // Formatted trigger display value
    const displayValue = useMemo(() => {
        if (!value) return '';
        const parts = parseDateParts(value);
        if (parts && isValidRealDate(parts.year, parts.month, parts.day)) {
            const d = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
        return value;
    }, [value]);

    // Validation error under form field
    const fieldValidation = useMemo(() => {
        if (!isBirthdayMode || !value) return { isValid: true };
        return validateBirthday(value, mode as 'pet birthday' | 'person birthday', species);
    }, [isBirthdayMode, value, mode, species]);

    const activeError = externalError || (isTouched && !fieldValidation.isValid ? fieldValidation.error : null);

    return (
        <div className="relative w-full">
            {label && (
                <label className={labelClassName || "text-xs font-semibold text-slate-700 block mb-2 ml-1"}>
                    {label} {isRequired && <span className="text-brand ml-1">*</span>}
                </label>
            )}
            <button
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                onClick={() => !disabled && setOpenState(true)}
                aria-invalid={!fieldValidation.isValid}
                aria-label={label ? `${label}, ${displayValue ? `${displayValue}, ` : ''}opens calendar` : undefined}
                className={
                    buttonClassName 
                        ? `${buttonClassName} ${isOpen ? 'border-brand bg-white ring-2 ring-brand/20 shadow-md' : ''} ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}` 
                        : `w-full bg-[#FAFAFA] border border-amber-900/15 transition-all rounded-2xl min-h-[52px] h-[52px] sm:h-14 py-3.5 px-4 text-base font-bold flex items-center justify-between text-left ${
                            activeError ? 'border-red-400 bg-red-50/20' : ''
                        } ${
                            isOpen 
                                ? 'border-brand bg-white ring-2 ring-brand/20 shadow-md' 
                                : 'text-accent-brown hover:border-brand/30 shadow-sm'
                        } ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`
                }
            >
                <span className={`truncate mr-2 ${!value ? 'text-accent-brown/40 font-normal' : 'text-accent-brown font-bold'}`}>
                    {value ? displayValue : `Select ${label || 'Date'}`}
                </span>
                <Calendar className={`w-5 h-5 shrink-0 transition-colors ${isOpen ? 'text-brand' : 'text-accent-brown/40'}`} />
            </button>

            {/* Error Message Directly Under Field */}
            {activeError && (
                <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 mt-2 pl-1 leading-tight break-words" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.2]" />
                    <span>{activeError}</span>
                </p>
            )}

            {isOpen && createPortal(
                <div 
                    role="dialog"
                    aria-modal="true"
                    aria-label="Select Date"
                    className={`fixed inset-0 z-[2000000] overflow-hidden ${
                        isBirthdayMode 
                            ? 'flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4' 
                            : 'flex items-center justify-center p-3 sm:p-4'
                    }`}
                >
                    {/* Plain light dim backdrop, at most 40% dark with NO blur */}
                    <div
                        className="absolute inset-0 bg-black/40 transition-opacity"
                        style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
                        onClick={() => setOpenState(false)}
                    />

                    {/* Modal Card: Mobile full-width bottom sheet on phones (<= 640px) when in birthday mode */}
                    <div
                        className={`relative w-full bg-white shadow-2xl border border-accent-brown/10 flex flex-col md:flex-row overflow-hidden z-10 transition-all ${
                            isBirthdayMode
                                ? 'max-w-full sm:max-w-[480px] md:max-w-[840px] rounded-t-[24px] sm:rounded-[2.5rem] max-h-[92dvh] sm:max-h-[88dvh]'
                                : 'max-w-[840px] rounded-[2rem] sm:rounded-[3rem] max-h-[92dvh] sm:max-h-[88dvh]'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative Mobile Drag Handle for bottom sheet in birthday mode */}
                        {isBirthdayMode && (
                            <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" aria-hidden="true" />
                        )}

                        {/* Summary & Badge Column (Left on Desktop, Top on Mobile) */}
                        <div className={`bg-[#F7F6F2] flex flex-col justify-between border-b md:border-b-0 md:border-r border-accent-brown/10 shrink-0 ${
                            isBirthdayMode
                                ? 'p-3.5 sm:p-6 md:p-9 md:w-[36%]'
                                : 'p-5 sm:p-7 md:p-9 md:w-[36%]'
                        }`}>
                            <div className="flex items-center justify-between md:justify-center relative">
                                <h4 className="text-lg sm:text-2xl font-black text-accent-brown tracking-tight leading-none text-center">
                                    Select Date
                                </h4>
                                <button
                                    ref={closeBtnRef}
                                    type="button"
                                    onClick={() => setOpenState(false)}
                                    aria-label="Close date picker"
                                    className="md:hidden w-9 h-9 rounded-xl bg-accent-peach/20 hover:bg-accent-peach/40 text-accent-brown flex items-center justify-center transition-all cursor-pointer shrink-0"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* Big Orange Calendar Icon Badge */}
                            <div className="my-2 sm:my-6 md:my-auto flex flex-col items-center justify-center text-center">
                                <div className="relative w-20 h-20 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-brand rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center shadow-lg sm:shadow-xl shadow-brand/25 transition-transform hover:scale-102">
                                    <div className="absolute -top-2 sm:-top-3.5 left-5 sm:left-8 md:left-9 w-3 sm:w-4.5 h-5 sm:h-8 bg-brand-dark rounded-full" />
                                    <div className="absolute -top-2 sm:-top-3.5 right-5 sm:right-8 md:right-9 w-3 sm:w-4.5 h-5 sm:h-8 bg-brand-dark rounded-full" />
                                    <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white mt-1 sm:mt-1.5 tracking-tight tabular-nums">
                                        {previewDay}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-accent-brown/70 mt-2 sm:mt-4 leading-none">
                                    {previewFormattedDate}
                                </p>
                            </div>

                            {/* Finalise Selection Button (Desktop view) */}
                            <div className="hidden md:block pt-4">
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!isConfirmEnabled}
                                    aria-disabled={!isConfirmEnabled}
                                    className={`w-full min-h-[48px] h-12 sm:h-13 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center ${
                                        isConfirmEnabled
                                            ? 'bg-brand text-white shadow-md shadow-brand/20 hover:brightness-105 active:scale-[0.98] cursor-pointer'
                                            : 'bg-brand/35 text-white/90 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    Confirm Date
                                </button>
                            </div>
                        </div>

                        {/* Calendar Registry Column (Right on Desktop, Bottom on Mobile) */}
                        <div className="flex-1 p-5 sm:p-7 md:p-9 bg-white flex flex-col overflow-y-auto no-scrollbar">
                            
                            {/* Birthday Mode Calendar View */}
                            {isBirthdayMode ? (
                                <>
                                    {viewMode === 'years' ? (
                                        /* 4-Column Year Selection Grid inside popup */
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-4 w-full">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewMode('days')}
                                                    aria-label="Back to days"
                                                    className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-accent-peach/20 hover:bg-brand/10 text-accent-brown hover:text-brand-dark font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                                >
                                                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                                                    <span>Back to days</span>
                                                </button>
                                                <span className="text-sm font-black text-accent-brown tracking-tight">
                                                    Select Year
                                                </span>
                                            </div>

                                            <div
                                                role="group"
                                                aria-label="Select year"
                                                tabIndex={-1}
                                                className="grid grid-cols-4 gap-2 sm:gap-2.5 max-h-[300px] sm:max-h-[340px] overflow-y-auto overscroll-contain p-1 pr-1.5 no-scrollbar focus:outline-none"
                                            >
                                                {birthdayYears.map((yr) => {
                                                    const isSelected = yr === viewYear;
                                                    return (
                                                        <button
                                                            key={yr}
                                                            id={`cal-year-${yr}`}
                                                            ref={isSelected ? selectedYearRef : undefined}
                                                            type="button"
                                                            onClick={() => handleSelectYear(yr)}
                                                            onKeyDown={(e) => handleYearKeyDown(e, yr)}
                                                            aria-pressed={isSelected}
                                                            className={`min-h-[44px] h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center select-none cursor-pointer outline-none ${
                                                                isSelected
                                                                    ? 'bg-brand text-white font-black shadow-md shadow-brand/20 scale-102 ring-2 ring-brand/30'
                                                                    : 'bg-[#FAF9F6] text-accent-brown hover:bg-brand/10 hover:text-brand-dark active:scale-95'
                                                            }`}
                                                        >
                                                            {yr}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Normal Days View in Birthday Mode */
                                        <>
                                            {/* Month & Year Navigation Row */}
                                            <div className="flex items-center justify-between mb-4 sm:mb-6 w-full gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handlePrevMonth}
                                                    disabled={!canGoPrevMonth}
                                                    aria-label="Previous month"
                                                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border transition-all ${
                                                        canGoPrevMonth
                                                            ? 'bg-white border-accent-brown/20 text-accent-brown hover:border-brand/40 hover:bg-brand/5 active:scale-95 cursor-pointer'
                                                            : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setViewMode('years')}
                                                    aria-label={`Choose year, ${viewYear}`}
                                                    className="flex-1 min-h-[44px] h-11 bg-white border border-accent-brown/20 hover:border-brand/40 rounded-xl px-4 text-sm font-black text-accent-brown flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-brand/30"
                                                >
                                                    <span>{monthNames[viewMonth]} {viewYear}</span>
                                                    <ChevronDown className="w-4 h-4 text-accent-brown/50" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleNextMonth}
                                                    disabled={!canGoNextMonth}
                                                    aria-label="Next month"
                                                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border transition-all ${
                                                        canGoNextMonth
                                                            ? 'bg-white border-accent-brown/20 text-accent-brown hover:border-brand/40 hover:bg-brand/5 active:scale-95 cursor-pointer'
                                                            : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                                                </button>
                                            </div>

                                            {/* Weekday Labels */}
                                            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2 sm:mb-3">
                                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                                    <span 
                                                        key={d} 
                                                        className="text-xs font-bold text-accent-brown/70 tracking-wide select-none py-1"
                                                    >
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Calendar Days Grid */}
                                            <div role="grid" aria-label="Month Days" className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">
                                                {Array.from({ length: firstDayOfCurrentMonth }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="w-10 h-10 sm:w-11 sm:h-11 mx-auto" />
                                                ))}
                                                
                                                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                                                    const d = i + 1;
                                                    const dateStr = formatDateString(viewYear, viewMonth, d);
                                                    const dateObj = new Date(viewYear, viewMonth, d, 12, 0, 0);
                                                    
                                                    const isSelected = selectedDateStr === dateStr;
                                                    const isToday = dateStr === todayStr;
                                                    const isAvailable = checkIsAvailable(dateStr, dateObj);
                                                    const isDisabled = !isAvailable;

                                                    const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                                                    const ariaLabel = `${weekdayName}, ${monthNames[viewMonth]} ${d}, ${viewYear}${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}${isDisabled ? ', unavailable' : ''}`;

                                                    return (
                                                        <div key={d} className="flex items-center justify-center p-0.5">
                                                            <button
                                                                id={`cal-day-${d}`}
                                                                type="button"
                                                                role="gridcell"
                                                                disabled={isDisabled}
                                                                aria-disabled={isDisabled}
                                                                aria-label={ariaLabel}
                                                                aria-selected={isSelected}
                                                                tabIndex={isDisabled ? -1 : (isSelected || (isToday && !selectedDateStr) ? 0 : -1)}
                                                                onClick={() => isAvailable && handleSelectDay(dateStr)}
                                                                onKeyDown={(e) => handleDayKeyDown(e, d)}
                                                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all tabular-nums select-none outline-none ${
                                                                    isSelected
                                                                        ? 'bg-brand text-white font-black shadow-md shadow-brand/30 scale-105'
                                                                        : isToday
                                                                            ? isDisabled
                                                                                ? 'border-2 border-slate-300 text-slate-300 font-bold cursor-not-allowed'
                                                                                : 'border-2 border-brand text-accent-brown font-black hover:bg-brand/10 cursor-pointer active:scale-95'
                                                                            : isDisabled
                                                                                ? 'text-slate-300 font-medium cursor-not-allowed line-through decoration-slate-200'
                                                                                : 'text-accent-brown font-bold hover:bg-accent-peach/25 hover:text-brand-dark cursor-pointer active:scale-95'
                                                                }`}
                                                            >
                                                                {d}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                /* Appointment Booking Mode (Preserved exactly as before) */
                                <>
                                    {/* Month & Year Row */}
                                    <div className="flex items-center gap-3 mb-4 sm:mb-6 w-full flex-nowrap">
                                        <div className="relative flex-[3] basis-0 min-w-0" ref={monthContainerRef}>
                                            <button
                                                ref={monthButtonRef}
                                                type="button"
                                                aria-haspopup="listbox"
                                                aria-expanded={isMonthMenuOpen}
                                                aria-label="Month"
                                                onClick={() => setIsMonthMenuOpen(prev => !prev)}
                                                className={`w-full min-h-[44px] h-11 bg-white border border-accent-brown/20 rounded-xl px-3.5 sm:px-4 text-sm font-bold text-accent-brown flex items-center justify-between shadow-xs transition-colors cursor-pointer outline-none ${
                                                    isMonthMenuOpen ? 'border-brand ring-2 ring-brand/20' : 'hover:border-brand/40'
                                                }`}
                                            >
                                                <span className="truncate tracking-tight font-bold">
                                                    {monthNames[viewMonth]}
                                                </span>
                                                <ChevronDown 
                                                    className={`w-4 h-4 text-accent-brown/50 transition-transform duration-200 shrink-0 ml-1.5 ${
                                                        isMonthMenuOpen ? 'rotate-180 text-brand' : ''
                                                    }`} 
                                                />
                                            </button>

                                            {isMonthMenuOpen && (
                                                <div
                                                    ref={monthListRef}
                                                    role="listbox"
                                                    aria-label="Month options"
                                                    tabIndex={-1}
                                                    className="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl border border-accent-brown/15 shadow-xl shadow-accent-brown/10 p-1.5 z-40 max-h-[260px] overflow-y-auto overscroll-contain flex flex-col space-y-0.5 outline-none"
                                                >
                                                    {monthOptions.map((opt, idx) => {
                                                        const isSelected = opt.year === viewYear && opt.monthIndex === viewMonth;
                                                        const isFocused = idx === focusedMonthIndex;
                                                        return (
                                                            <button
                                                                key={opt.key}
                                                                type="button"
                                                                role="option"
                                                                aria-selected={isSelected}
                                                                onClick={() => handleSelectMonth(opt)}
                                                                className={`w-full min-h-[44px] px-3.5 py-2.5 text-left text-sm font-bold transition-all flex items-center justify-between rounded-xl select-none cursor-pointer outline-none ${
                                                                    isSelected
                                                                        ? 'bg-brand/10 text-brand-dark font-black'
                                                                        : isFocused
                                                                            ? 'bg-accent-peach/25 text-accent-brown'
                                                                            : 'text-accent-brown hover:bg-accent-peach/15 active:bg-accent-peach/25'
                                                                }`}
                                                            >
                                                                <span className="truncate">{opt.label}</span>
                                                                {isSelected && (
                                                                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-brand text-white shadow-xs shrink-0 ml-2">
                                                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {hasYearDropdown ? (
                                            <CustomDropdown 
                                                className="flex-[2] basis-0 min-w-0"
                                                buttonClassName="w-full min-h-[44px] h-11 bg-white border border-accent-brown/20 rounded-xl px-4 text-sm font-bold text-accent-brown flex items-center justify-between shadow-xs hover:border-brand/40 transition-colors"
                                                value={viewYear} 
                                                options={legacyYears}
                                                onChange={(y) => setViewYear(Number(y))}
                                            />
                                        ) : (
                                            <div 
                                                className="flex-[2] basis-0 min-w-0 min-h-[44px] h-11 bg-accent-peach/20 text-accent-brown rounded-xl px-3 sm:px-4 text-sm font-bold flex items-center justify-center select-none"
                                                aria-label={`Year ${viewYear}`}
                                                role="text"
                                            >
                                                <span className="tabular-nums tracking-tight font-bold">{viewYear}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Weekday Labels */}
                                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2 sm:mb-3">
                                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                            <span 
                                                key={d} 
                                                className="text-xs font-bold text-accent-brown/70 tracking-wide select-none py-1"
                                            >
                                                {d}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Calendar Days Grid */}
                                    <div role="grid" aria-label="Month Days" className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">
                                        {Array.from({ length: firstDayOfCurrentMonth }).map((_, i) => (
                                            <div key={`empty-${i}`} className="w-10 h-10 sm:w-11 sm:h-11 mx-auto" />
                                        ))}
                                        
                                        {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                                            const d = i + 1;
                                            const dateStr = formatDateString(viewYear, viewMonth, d);
                                            const dateObj = new Date(viewYear, viewMonth, d, 12, 0, 0);
                                            
                                            const isSelected = selectedDateStr === dateStr;
                                            const isToday = dateStr === todayStr;
                                            const isAvailable = checkIsAvailable(dateStr, dateObj);
                                            const isDisabled = !isAvailable;

                                            const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                                            const ariaLabel = `${weekdayName}, ${monthNames[viewMonth]} ${d}, ${viewYear}${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}${isDisabled ? ', unavailable' : ''}`;

                                            return (
                                                <div key={d} className="flex items-center justify-center p-0.5">
                                                    <button
                                                        id={`cal-day-${d}`}
                                                        type="button"
                                                        role="gridcell"
                                                        disabled={isDisabled}
                                                        aria-disabled={isDisabled}
                                                        aria-label={ariaLabel}
                                                        aria-selected={isSelected}
                                                        tabIndex={isDisabled ? -1 : (isSelected || (isToday && !selectedDateStr) ? 0 : -1)}
                                                        onClick={() => isAvailable && handleSelectDay(dateStr)}
                                                        onKeyDown={(e) => handleDayKeyDown(e, d)}
                                                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all tabular-nums select-none outline-none ${
                                                            isSelected
                                                                ? 'bg-brand text-white font-black shadow-md shadow-brand/30 scale-105'
                                                                : isToday
                                                                    ? isDisabled
                                                                        ? 'border-2 border-slate-300 text-slate-300 font-bold cursor-not-allowed'
                                                                        : 'border-2 border-brand text-accent-brown font-black hover:bg-brand/10 cursor-pointer active:scale-95'
                                                                    : isDisabled
                                                                        ? 'text-slate-300 font-medium cursor-not-allowed line-through decoration-slate-200'
                                                                        : 'text-accent-brown font-bold hover:bg-accent-peach/25 hover:text-brand-dark cursor-pointer active:scale-95'
                                                        }`}
                                                    >
                                                        {d}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Finalise Selection Button (Mobile view: fixed at bottom of content) */}
                            <div className="md:hidden mt-auto pt-3 border-t border-accent-brown/10 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!isConfirmEnabled}
                                    aria-disabled={!isConfirmEnabled}
                                    className={`w-full min-h-[48px] h-12 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center ${
                                        isConfirmEnabled
                                            ? 'bg-brand text-white shadow-md shadow-brand/20 hover:brightness-105 active:scale-[0.98] cursor-pointer'
                                            : 'bg-brand/35 text-white/90 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    Confirm Date
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
