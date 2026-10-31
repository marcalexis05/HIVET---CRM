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

/**
 * Shortens a Review / Reservation ID to standard short display format:
 * e.g., "#RV-2026-000001-9907" -> "#RV-2026-9907"
 *       "RV-2026-000001-9907"  -> "RV-2026-9907"
 *       "#RV-2026-9907"         -> "#RV-2026-9907" (already short)
 *
 * If the input is already short or doesn't match the pattern, it is returned as saved.
 * Never throws, never returns 'undefined' / 'null' / 'NaN'.
 */
export function formatReviewId(id: string | number | undefined | null): string {
    if (id === undefined || id === null || id === '') return '';
    const str = String(id).trim();
    if (!str || str === 'undefined' || str === 'null' || str === 'NaN') return '';

    // Matches (#?RV)-(\d{4})-(.*)-([A-Za-z0-9]{4})
    // E.g. #RV-2026-000001-9907 -> #RV-2026-9907
    const match = str.match(/^(#?RV)-(\d{4})-(?:[0-9a-zA-Z]+)-([A-Za-z0-9]{4})$/i);
    if (match) {
        const [, prefix, year, suffix] = match;
        return `${prefix}-${year}-${suffix}`;
    }

    return str;
}

/**
 * Replaces any long Review / Reservation IDs embedded inside text strings
 * e.g. "Reservation #RV-2026-000001-9907 for Grooming" -> "Reservation #RV-2026-9907 for Grooming"
 */
export function formatReviewIdInText(text: string | null | undefined): string {
    if (!text) return '';
    return String(text).replace(/(#?RV)-(\d{4})-(?:[0-9a-zA-Z]+)-([A-Za-z0-9]{4})/gi, '$1-$2-$3');
}

/**
 * Generates an accessible screen reader announcement for a Review / Reservation ID
 * e.g. "Review R V, 2026, 9907"
 */
export function getReviewIdAriaLabel(id: string | number | undefined | null): string {
    const formatted = formatReviewId(id);
    if (!formatted) return '';
    const clean = formatted.replace(/^#/, '');
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `Review ${parts[0].split('').join(' ')}, ${parts[1]}, ${parts[2]}`;
    }
    return `Review ${formatted}`;
}

/** Compact display label. Prefer the server label; keep numeric IDs for API calls. */
export function formatOrderReference(orderOrId?: any): string {
    if (orderOrId == null) return '';
    const order = typeof orderOrId === 'object' ? orderOrId : null;
    const value = order?.order_reference ?? order?.rider_order_id ?? order?.order_id ?? order?.id ?? orderOrId;
    const raw = String(value).trim().replace(/^#/, '').toUpperCase();
    const legacy = raw.match(/^HV-(\d{4})-\d+-([0-9]{4})$/);
    if (legacy) return `HV-${legacy[1]}-${legacy[2]}`;
    if (/^HV-\d{4}-\d{4}$/.test(raw)) return raw;
    // Older API responses can still be displayed consistently while deployments roll out.
    const dateRaw = order?.created_at;
    const date = dateRaw ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(dateRaw) ? dateRaw : `${dateRaw}Z`) : null;
    if (date && !Number.isNaN(date.getTime())) {
        const suffix = String(Math.floor(date.getTime() / 1000) % 10000).padStart(4, '0');
        return `HV-${date.getUTCFullYear()}-${suffix}`;
    }
    return raw;
}

export function formatRiderOrderId(orderOrId?: any): string {
    const reference = formatOrderReference(orderOrId);
    return reference ? `#${reference}` : '';
}

export function formatRiderOrderIdForAria(orderOrId?: any): string {
    return `Order ${formatOrderReference(orderOrId).replace(/^HV-/, 'H V, ').replaceAll('-', ', ')}`;
}

/**
 * Checks whether an order matches a search query for rider order ID:
 * Supports:
 * - Full ID: "ORD-2026-4827", "#ORD-2026-4827", "HY-186", "#HY-186"
 * - Prefixless ID: "2026-4827", "186"
 * - Last 4 digits: "4827"
 * - Raw order ID match
 */
export function matchesRiderOrderIdSearch(order: any, query: string): boolean {
    if (!query) return true;
    const q = query.trim().toLowerCase().replace(/^#/, '');
    if (!q) return true;

    const formatted = formatRiderOrderId(order).toLowerCase().replace(/^#/, '');
    if (formatted.includes(q)) return true;

    // Check last 4 digits
    const last4 = formatted.slice(-4);
    if (last4.includes(q) || q === last4) return true;

    // Check raw fields
    if (order?.rider_order_id && String(order.rider_order_id).toLowerCase().includes(q)) return true;
    if (order?.id && String(order.id).toLowerCase().includes(q)) return true;
    if (order?.order_id && String(order.order_id).toLowerCase().includes(q)) return true;

    return false;
}

/**
 * Formats a Rider Transaction ID for display.
 * Transforms IDs like "HV-TR-175" or numeric 175 into "TRX-2026-XXXX" (where XXXX is a 4-digit number).
 * Uses a deterministic pseudo-random hash seeded by the item ID so that each transaction gets a stable,
 * realistic randomized 4-digit number that remains identical across re-renders, pagination, and modals.
 */
export function formatTransactionId(transactionOrId?: any): string {
    if (!transactionOrId) return 'TRX-2026-0000';

    const raw = typeof transactionOrId === 'object'
        ? String(transactionOrId.trx_id || transactionOrId.transaction_id || transactionOrId.id || '')
        : String(transactionOrId);

    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
        return 'TRX-2026-0000';
    }

    // If it's already in the target format TRX-2026-XXXX
    if (/^TRX-2026-\d{4}$/i.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    // Extract alphanumerics to seed a deterministic pseudo-random 4-digit code
    const cleanStr = trimmed.replace(/[^0-9a-zA-Z]/g, '');
    let seed = 0;
    for (let i = 0; i < cleanStr.length; i++) {
        seed = (seed * 31 + cleanStr.charCodeAt(i)) >>> 0;
    }

    // Deterministic pseudo-random 4-digit number between 1000 and 9999
    const pseudoRandom = ((seed * 1664525 + 1013904223) >>> 0) % 9000 + 1000;
    return `TRX-2026-${pseudoRandom}`;
}

/**
 * Screen reader accessible announcement for Rider Transaction ID:
 * e.g. "TRX-2026-9754" -> "Transaction T R X, 2026, 9 7 5 4"
 */
export function formatTransactionIdForAria(transactionOrId?: any): string {
    const formatted = formatTransactionId(transactionOrId);
    const parts = formatted.split('-');
    if (parts.length === 3) {
        return `Transaction T R X, ${parts[1]}, ${parts[2]}`;
    }
    return `Transaction ${formatted}`;
}


/** Never reveal pickup-code digits on the rider's screen, including legacy responses. */
export function maskPickupSerial(value?: string | null): string {
    return (value || '').replace(/[0-9]/g, '*');
}
