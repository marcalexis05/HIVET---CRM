import { CONTACT_VALIDATION_MESSAGES } from '../constants/contactValidationWording';

export function normalizePhMobile(phone: string): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('639') && digits.length === 12) {
        return '+63' + digits.slice(2);
    } else if (digits.startsWith('09') && digits.length === 11) {
        return '+63' + digits.slice(1);
    } else if (digits.startsWith('9') && digits.length === 10) {
        return '+63' + digits;
    } else if (digits.startsWith('63') && digits.length === 12 && digits[2] === '9') {
        return '+' + digits;
    }
    return null;
}

export function isValidPhMobile(phone: string): boolean {
    return normalizePhMobile(phone) !== null;
}

export function normalizeEmail(email: string): string | null {
    if (!email) return null;
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(trimmed)) return null;

    const parts = trimmed.split('@');
    if (parts.length !== 2) return null;
    let [local, domain] = parts;

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        domain = 'gmail.com';
        local = local.split('+')[0];
        local = local.replace(/\./g, '');
    }

    return `${local}@${domain}`;
}

export function isValidEmail(email: string): boolean {
    return normalizeEmail(email) !== null;
}

export async function checkContactAvailability(
    type: 'email' | 'phone',
    value: string,
    ignoreAccountId?: number | string,
    ignoreRole?: string
): Promise<{ available: boolean; error: string | null }> {
    if (!value || !value.trim()) {
        return { available: true, error: null };
    }

    if (type === 'phone') {
        if (!isValidPhMobile(value)) {
            return { available: false, error: CONTACT_VALIDATION_MESSAGES.invalidNumber };
        }
    } else if (type === 'email') {
        if (!isValidEmail(value)) {
            return { available: false, error: CONTACT_VALIDATION_MESSAGES.invalidEmail };
        }
    }

    try {
        const params = new URLSearchParams({
            type,
            value: value.trim(),
        });
        if (ignoreAccountId) {
            params.append('ignore_account_id', String(ignoreAccountId));
        }
        if (ignoreRole) {
            params.append('ignore_role', ignoreRole);
        }

        const res = await fetch(`http://localhost:8000/api/auth/check-contact-availability?${params.toString()}`);
        if (!res.ok) {
            // If rate limited or network failure, do not block typing (per Problem 3 rules)
            return { available: true, error: null };
        }
        const data = await res.json();
        return {
            available: !!data.available,
            error: data.available ? null : (data.error || (type === 'phone' ? CONTACT_VALIDATION_MESSAGES.numberUsed : CONTACT_VALIDATION_MESSAGES.emailUsed)),
        };
    } catch {
        // Network/offline failure: allow user to continue; server validates on submit
        return { available: true, error: null };
    }
}
