/**
 * scheduleValidation.ts
 * Shared weekly clinic operating hours and break interval validation logic for Hi-Vet.
 */

export interface OperatingHourDay {
    id?: number;
    day_of_week: number;
    day_name?: string;
    is_open: boolean;
    open_time: string | null;
    break_start: string | null;
    break_end: string | null;
    close_time: string | null;
}

export interface DayValidationErrors {
    open_time?: string;
    break_start?: string;
    break_end?: string;
    close_time?: string;
}

export interface DayValidationResult {
    isValid: boolean;
    errors: DayValidationErrors;
}

/**
 * Core validation settings constants (minutes)
 */
export const SCHEDULE_RULES = {
    MIN_OPEN_MINUTES: 240,       // 4 hours minimum open time per day
    MIN_BREAK_MINUTES: 15,       // 15 minutes minimum break length
    MAX_BREAK_MINUTES: 180,      // 3 hours maximum break length
    MIN_PRE_BREAK_MINUTES: 60,   // At least 1 hour open time before break
    MIN_POST_BREAK_MINUTES: 60,  // At least 1 hour open time after break
} as const;

/**
 * Standard 30-minute intervals used across Hi-Vet dropdowns
 */
export const DEFAULT_TIME_OPTIONS = [
    '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
    '07:00 PM', '07:30 PM', '08:00 PM', '09:00 PM'
];

/**
 * Converts a 12-hour formatted time string into minutes since midnight (0 to 1439).
 * E.g., "12:00 AM" -> 0, "07:00 AM" -> 420, "12:00 PM" -> 720, "09:00 PM" -> 1260.
 * Returns null for empty, "No break", or "—".
 */
export function timeToMinutes(timeStr?: string | null): number | null {
    if (!timeStr) return null;
    const clean = timeStr.trim();
    if (clean === 'No break' || clean === '—' || clean === '-' || clean === '') return null;
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

/**
 * Validates a single clinic schedule day according to Hi-Vet operating rules.
 * Closed days are never validated and return { isValid: true, errors: {} }.
 */
export function validateDay(day: OperatingHourDay): DayValidationResult {
    // Closed days are never validated, never show errors and never block saving.
    if (!day.is_open) {
        return { isValid: true, errors: {} };
    }

    const errors: DayValidationErrors = {};
    const openMins = timeToMinutes(day.open_time);
    const closeMins = timeToMinutes(day.close_time);
    const breakStartMins = timeToMinutes(day.break_start);
    const breakEndMins = timeToMinutes(day.break_end);

    // 1. Opening & Closing Presence
    if (openMins === null) {
        errors.open_time = "Opening time is required.";
    }
    if (closeMins === null) {
        errors.close_time = "Closing time is required.";
    }

    // 2. Opening vs Closing Relations & Minimum Open Length
    if (openMins !== null && closeMins !== null) {
        if (closeMins === openMins) {
            errors.close_time = "Choose two different times.";
        } else if (closeMins < openMins) {
            errors.close_time = "Closing time must be later than opening time.";
        } else if (closeMins - openMins < SCHEDULE_RULES.MIN_OPEN_MINUTES) {
            errors.close_time = "The clinic must be open at least 4 hours.";
        }
    }

    // 3. Break Validation
    const hasBreakStart = breakStartMins !== null;
    const hasBreakEnd = breakEndMins !== null;

    if (hasBreakStart !== hasBreakEnd) {
        // One break time only
        const errorMsg = "Set both break times or leave both empty.";
        if (hasBreakStart) {
            errors.break_end = errorMsg;
        } else {
            errors.break_start = errorMsg;
        }
    } else if (hasBreakStart && hasBreakEnd && breakStartMins !== null && breakEndMins !== null) {
        // Both break times are set

        // Break Starts vs Opening Time
        if (openMins !== null) {
            if (breakStartMins === openMins) {
                errors.break_start = "Choose two different times.";
            } else if (breakStartMins < openMins) {
                errors.break_start = "Break must start after the clinic opens.";
            } else if (breakStartMins - openMins < SCHEDULE_RULES.MIN_PRE_BREAK_MINUTES) {
                errors.break_start = "The clinic must be open at least 1 hour before the break.";
            }
        }

        // Break Ends vs Break Starts
        if (breakEndMins === breakStartMins) {
            errors.break_end = "Choose two different times.";
        } else if (breakEndMins < breakStartMins) {
            errors.break_end = "Break must end after it starts.";
        } else {
            const breakDuration = breakEndMins - breakStartMins;
            if (breakDuration < SCHEDULE_RULES.MIN_BREAK_MINUTES || breakDuration > SCHEDULE_RULES.MAX_BREAK_MINUTES) {
                errors.break_end = "Break must be between 15 minutes and 3 hours.";
            }
        }

        // Break Ends vs Closing Time
        if (closeMins !== null) {
            if (breakEndMins === closeMins) {
                errors.break_end = "Choose two different times.";
            } else if (breakEndMins > closeMins) {
                errors.break_end = "Break must end before the clinic closes.";
            } else if (closeMins - breakEndMins < SCHEDULE_RULES.MIN_POST_BREAK_MINUTES && !errors.break_end) {
                errors.break_end = "The clinic must be open at least 1 hour after the break.";
            }
        }

        // Extra equality checks across all times
        if (closeMins !== null && breakStartMins === closeMins && !errors.break_start) {
            errors.break_start = "Choose two different times.";
        }
        if (openMins !== null && breakEndMins === openMins && !errors.break_end) {
            errors.break_end = "Choose two different times.";
        }
    }

    const isValid = Object.keys(errors).length === 0;
    return { isValid, errors };
}

/**
 * Validates the full weekly schedule of 7 days.
 */
export function validateWeeklySchedule(schedule: OperatingHourDay[]): {
    isValid: boolean;
    dayResults: Record<number, DayValidationResult>;
    invalidDays: OperatingHourDay[];
    allDaysClosed: boolean;
} {
    const dayResults: Record<number, DayValidationResult> = {};
    const invalidDays: OperatingHourDay[] = [];
    let openDaysCount = 0;

    schedule.forEach(day => {
        if (day.is_open) openDaysCount++;
        const res = validateDay(day);
        dayResults[day.day_of_week] = res;
        if (!res.isValid) {
            invalidDays.push(day);
        }
    });

    return {
        isValid: invalidDays.length === 0,
        dayResults,
        invalidDays,
        allDaysClosed: openDaysCount === 0
    };
}

export interface DropdownOptionItem {
    label: string;
    value: string;
    disabled?: boolean;
}

/**
 * Generates options with disabled states for a specific time selector,
 * preventing users from selecting times that violate sequence rules.
 */
export function getScheduleDropdownOptions(
    field: 'open_time' | 'break_start' | 'break_end' | 'close_time',
    day: OperatingHourDay,
    timeOptions: string[] = DEFAULT_TIME_OPTIONS
): DropdownOptionItem[] {
    const openMins = timeToMinutes(day.open_time);
    const closeMins = timeToMinutes(day.close_time);
    const breakStartMins = timeToMinutes(day.break_start);
    const breakEndMins = timeToMinutes(day.break_end);

    switch (field) {
        case 'open_time':
            return timeOptions.map(timeStr => {
                const mins = timeToMinutes(timeStr)!;
                // Cannot open at or after closing time
                const disabled = closeMins !== null && mins >= closeMins;
                return { label: timeStr, value: timeStr, disabled };
            });

        case 'break_start': {
            const items: DropdownOptionItem[] = [
                { label: 'No break', value: 'No break', disabled: false }
            ];
            timeOptions.forEach(timeStr => {
                const mins = timeToMinutes(timeStr)!;
                // Cannot start break at or before clinic opens, or at or after clinic closes
                const disabled = (openMins !== null && mins <= openMins) || (closeMins !== null && mins >= closeMins);
                items.push({ label: timeStr, value: timeStr, disabled });
            });
            return items;
        }

        case 'break_end': {
            const items: DropdownOptionItem[] = [
                { label: '—', value: '—', disabled: false }
            ];
            timeOptions.forEach(timeStr => {
                const mins = timeToMinutes(timeStr)!;
                // Cannot end break at or before break starts, or at or after clinic closes
                const disabled = (breakStartMins !== null && mins <= breakStartMins) || (closeMins !== null && mins >= closeMins);
                items.push({ label: timeStr, value: timeStr, disabled });
            });
            return items;
        }

        case 'close_time':
            return timeOptions.map(timeStr => {
                const mins = timeToMinutes(timeStr)!;
                // Cannot close at or before opening time, or at or before break ends
                const disabled = (openMins !== null && mins <= openMins) || (breakEndMins !== null && mins <= breakEndMins);
                return { label: timeStr, value: timeStr, disabled };
            });

        default:
            return timeOptions.map(t => ({ label: t, value: t }));
    }
}
