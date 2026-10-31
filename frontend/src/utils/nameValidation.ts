export const NAME_ERROR = 'Names may contain letters and spaces only.';
export function nameInputAllowed(value: string): boolean {
    return /^[\p{L}\p{M} ]*$/u.test(value);
}
export function validName(value: string, required = true): boolean {
    const name = value.trim();
    return name === '' ? !required : /\p{L}/u.test(name) && nameInputAllowed(name);
}

export function registrationNameError(first: string, middle: string, last: string): string | null {
    if (!first.trim() || !last.trim()) return 'Enter your first and last name.';
    return validName(first) && validName(middle, false) && validName(last) ? null : NAME_ERROR;
}
