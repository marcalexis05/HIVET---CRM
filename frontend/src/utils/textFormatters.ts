/**
 * Hi-Vet Standard Capitalization & Typography Utility
 * Standardizes UI text presentation without altering underlying stored data.
 */

// Preserved words with specific required capitalization
const EXACT_PRESERVED_WORDS: Record<string, string> = {
    'hivet': 'Hi-Vet',
    'hi-vet': 'Hi-Vet',
    'gcash': 'GCash',
    'paymongo': 'PayMongo',
    'paypal': 'PayPal',
    'id': 'ID',
    'ph': 'PH',
    'qr': 'QR',
    'sms': 'SMS',
    'pdf': 'PDF',
    'am': 'AM',
    'pm': 'PM',
    'api': 'API',
    'crm': 'CRM',
    'url': 'URL',
    'sn': 'SN',
    'pts': 'pts',
    'km': 'km',
};

// Minor words that remain lowercase in Title Case (unless first or last word)
const MINOR_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'at', 'by', 'with', 'from', 'as'
]);

/**
 * Check if a word is an ID, code, or technical tracking number
 * e.g., "HV-2026-000180", "#RV-2026-000044-3724", "SN:1234"
 */
function isCodeOrId(word: string): boolean {
    if (!word) return false;
    // Starts with #, or has hyphens with numbers/letters like HV-2026-001
    if (word.startsWith('#')) return true;
    if (/[0-9]/.test(word) && /[-_:]/.test(word)) return true;
    if (/^[A-Z0-9_-]{4,}$/.test(word) && /[0-9]/.test(word)) return true;
    return false;
}

/**
 * Format a single word for Title Case
 */
function formatTitleWord(word: string, isFirstWord: boolean): string {
    if (!word) return '';

    // Check code/ID
    if (isCodeOrId(word)) return word;

    // Check punctuation at end (e.g. "evangelista." -> "Evangelista.")
    const matchPunctuation = word.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
    if (!matchPunctuation) return word;

    const [, leading, core, trailing] = matchPunctuation;
    if (!core) return word;

    const lowerCore = core.toLowerCase();

    // Check exact dictionary preservation
    if (EXACT_PRESERVED_WORDS[lowerCore]) {
        return leading + EXACT_PRESERVED_WORDS[lowerCore] + trailing;
    }

    // Preserve special mixed-case casing (e.g. McDonald, MacIntosh, DeLaCruz)
    const isMixedCase = /[a-z]/.test(core) && /[A-Z]/.test(core) && !/^[A-Z][a-z]+$/.test(core);
    if (isMixedCase) {
        return leading + core + trailing;
    }

    // Minor word in title case
    if (!isFirstWord && MINOR_WORDS.has(lowerCore)) {
        return leading + lowerCore + trailing;
    }

    // Standard Capitalization (First letter capitalized, rest lowercase)
    const capitalized = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
    return leading + capitalized + trailing;
}

/**
 * Convert text to Title Case
 * Used for: Page titles, card titles, popup titles, buttons, menu items, tabs, badges
 */
export function toTitleCase(text: string | null | undefined): string {
    if (!text && text !== '') return '';
    const str = String(text).trim();
    if (!str) return '';

    // If it's a code or ID directly, preserve it
    if (isCodeOrId(str)) return str;

    const words = str.split(/\s+/);
    return words.map((w, idx) => formatTitleWord(w, idx === 0)).join(' ');
}

/**
 * Convert text to Sentence case
 * Used for: Small labels, field names, helper text, empty states, descriptions
 */
export function toSentenceCase(text: string | null | undefined): string {
    if (!text && text !== '') return '';
    const str = String(text).trim();
    if (!str) return '';

    if (isCodeOrId(str)) return str;

    // If entire string was stored in ALL CAPS or contains words to format
    const words = str.split(/\s+/);
    return words.map((word, idx) => {
        if (isCodeOrId(word)) return word;

        const match = word.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
        if (!match) return word;

        const [, leading, core, trailing] = match;
        if (!core) return word;

        const lowerCore = core.toLowerCase();
        if (EXACT_PRESERVED_WORDS[lowerCore]) {
            return leading + EXACT_PRESERVED_WORDS[lowerCore] + trailing;
        }

        // Preserve special mixed casing
        const isMixedCase = /[a-z]/.test(core) && /[A-Z]/.test(core) && !/^[A-Z][a-z]+$/.test(core);
        if (isMixedCase) {
            return leading + core + trailing;
        }

        if (idx === 0) {
            return leading + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + trailing;
        }

        return leading + lowerCore + trailing;
    }).join(' ');
}

/**
 * Format names (people, pets, clinics, products, services)
 * If stored in ALL CAPS (e.g. "MARC ALEXIS EVANGELISTA."), converts to "Marc Alexis Evangelista."
 * If stored with specific casing, preserves it.
 */
export function formatName(name: string | null | undefined): string {
    if (!name && name !== '') return '';
    const str = String(name).trim();
    if (!str) return '';

    // If all letters are uppercase, convert to Title Case
    const hasLetters = /[a-zA-Z]/.test(str);
    const isAllUpper = hasLetters && str === str.toUpperCase();
    if (isAllUpper) {
        return toTitleCase(str);
    }

    return str;
}

/**
 * Format units (pts, km, etc.) next to numbers in lowercase
 * e.g., formatUnit(745, 'pts') -> "745 pts"
 */
export function formatUnit(value: string | number | undefined | null, unit: string): string {
    if (value === undefined || value === null) return '';
    const u = unit.toLowerCase();
    return `${value} ${u}`;
}
