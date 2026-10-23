// Single Source of Truth for Birthday and Date Validation Rules across Hi-Vet

export type DatePickerMode = 'appointment' | 'pet birthday' | 'person birthday';

export interface BirthdayRuleSettings {
    minAgeYears?: number;
    maxAgeYears: number;
    speciesMaxAgeYears?: Record<string, number>;
    messages: {
        invalidRealDate: string;
        futureDate: string;
        tooOld: string;
        underMinAge?: string;
    };
}

export const BIRTHDAY_SETTINGS: Record<'pet birthday' | 'person birthday', BirthdayRuleSettings> = {
    'pet birthday': {
        maxAgeYears: 30,
        speciesMaxAgeYears: {
            dog: 30,
            cat: 30,
            bird: 80,
            parrot: 80,
            turtle: 100,
            tortoise: 120,
            reptile: 50,
            rabbit: 20
        },
        messages: {
            invalidRealDate: 'Please choose a real date.',
            futureDate: 'Birthday cannot be in the future.',
            tooOld: 'Please check the year. This pet looks too old.'
        }
    },
    'person birthday': {
        minAgeYears: 18,
        maxAgeYears: 120,
        messages: {
            invalidRealDate: 'Please choose a real date.',
            futureDate: 'Birthday cannot be in the future.',
            tooOld: 'Please check the year of birth.',
            underMinAge: 'You must be at least 18 years old.'
        }
    }
};

/**
 * Returns current calendar day in Philippines timezone ('en-CA' -> YYYY-MM-DD).
 */
export const getTodayPH = (): string => {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    } catch {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
};

export const parseDateParts = (dateStr: string): { year: number; month: number; day: number } | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return { year, month, day };
};

export const formatDateString = (year: number, monthIndex: number, day: number): string => {
    const y = year.toString().padStart(4, '0');
    const m = (monthIndex + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Checks whether the given year, month (1-based), and day form a legitimate calendar date
 * taking leap years and exact month lengths into account.
 */
export const isValidRealDate = (year: number, month: number, day: number): boolean => {
    if (year < 1800 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInMonths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= daysInMonths[month - 1];
};

/**
 * Calculates completed full years of age as of today (in PH calendar time),
 * properly considering whether the birthday has already occurred in the current year.
 */
export const calculateAgeFullYears = (birthdateStr: string): number | null => {
    const bParts = parseDateParts(birthdateStr);
    if (!bParts || !isValidRealDate(bParts.year, bParts.month, bParts.day)) {
        return null;
    }

    const todayParts = parseDateParts(getTodayPH());
    if (!todayParts) return null;

    let age = todayParts.year - bParts.year;
    const hasHadBirthdayThisYear = 
        todayParts.month > bParts.month ||
        (todayParts.month === bParts.month && todayParts.day >= bParts.day);

    if (!hasHadBirthdayThisYear) {
        age -= 1;
    }
    return age;
};

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validates a birthday string against the selected mode rules.
 * Returns isValid: true if valid (or empty if optional).
 */
export const validateBirthday = (
    dateStr: string,
    mode: 'pet birthday' | 'person birthday',
    species?: string
): ValidationResult => {
    if (!dateStr || !dateStr.trim()) {
        return { isValid: true };
    }

    const parts = parseDateParts(dateStr);
    if (!parts || !isValidRealDate(parts.year, parts.month, parts.day)) {
        return { isValid: false, error: 'Please choose a real date.' };
    }

    const todayStr = getTodayPH();
    if (dateStr > todayStr) {
        return { isValid: false, error: 'Birthday cannot be in the future.' };
    }

    const config = BIRTHDAY_SETTINGS[mode];
    const age = calculateAgeFullYears(dateStr);
    if (age === null || age < 0) {
        return { isValid: false, error: 'Birthday cannot be in the future.' };
    }

    // Minimum age check (for person birthdays)
    if (config.minAgeYears !== undefined && age < config.minAgeYears) {
        return {
            isValid: false,
            error: config.messages.underMinAge || 'You must be at least 18 years old.'
        };
    }

    // Maximum age check
    let maxAge = config.maxAgeYears;
    if (mode === 'pet birthday' && species && config.speciesMaxAgeYears) {
        const spKey = species.trim().toLowerCase();
        if (config.speciesMaxAgeYears[spKey]) {
            maxAge = config.speciesMaxAgeYears[spKey];
        }
    }

    if (age > maxAge) {
        return {
            isValid: false,
            error: config.messages.tooOld
        };
    }

    return { isValid: true };
};

/**
 * Calculates the earliest and latest allowed ISO date strings for a given mode.
 */
export const getModeDateRange = (
    mode: DatePickerMode,
    species?: string
): { minDate: string; maxDate: string; defaultStartYear: number; defaultStartMonth: number } => {
    const todayStr = getTodayPH();
    const tParts = parseDateParts(todayStr)!;

    if (mode === 'appointment') {
        return {
            minDate: todayStr,
            maxDate: formatDateString(tParts.year + 1, tParts.month - 1, tParts.day),
            defaultStartYear: tParts.year,
            defaultStartMonth: tParts.month - 1
        };
    }

    if (mode === 'pet birthday') {
        const config = BIRTHDAY_SETTINGS['pet birthday'];
        let maxAge = config.maxAgeYears;
        if (species && config.speciesMaxAgeYears) {
            const spKey = species.trim().toLowerCase();
            if (config.speciesMaxAgeYears[spKey]) {
                maxAge = config.speciesMaxAgeYears[spKey];
            }
        }
        const minYear = tParts.year - maxAge;
        const minDay = Math.min(tParts.day, isValidRealDate(minYear, tParts.month, tParts.day) ? tParts.day : 28);
        return {
            minDate: formatDateString(minYear, tParts.month - 1, minDay),
            maxDate: todayStr,
            defaultStartYear: tParts.year,
            defaultStartMonth: tParts.month - 1
        };
    }

    // mode === 'person birthday'
    const config = BIRTHDAY_SETTINGS['person birthday'];
    const minAge = config.minAgeYears || 18;
    const maxAge = config.maxAgeYears || 120;

    // Person must be at least 18 years old today: max date is (today.year - 18, today.month, today.day)
    const maxAllowedYear = tParts.year - minAge;
    const maxAllowedDay = Math.min(tParts.day, isValidRealDate(maxAllowedYear, tParts.month, tParts.day) ? tParts.day : 28);
    const maxDate = formatDateString(maxAllowedYear, tParts.month - 1, maxAllowedDay);

    // Oldest allowed date (120 years before today)
    const minAllowedYear = tParts.year - maxAge;
    const minAllowedDay = Math.min(tParts.day, isValidRealDate(minAllowedYear, tParts.month, tParts.day) ? tParts.day : 28);
    const minDate = formatDateString(minAllowedYear, tParts.month - 1, minAllowedDay);

    return {
        minDate,
        maxDate,
        defaultStartYear: maxAllowedYear, // 18 years ago, so user doesn't have to scroll 18 years back!
        defaultStartMonth: tParts.month - 1
    };
};
