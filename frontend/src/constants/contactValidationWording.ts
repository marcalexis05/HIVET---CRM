/**
 * Shared plain-words messages for contact validation (email & mobile phone).
 * Used across Customer, Rider, and Clinic account forms.
 */
export const CONTACT_VALIDATION_MESSAGES = {
    numberUsed: "This mobile number is already used by another account.",
    emailUsed: "This email is already used by another account.",
    invalidNumber: "Please enter a valid mobile number.",
    invalidEmail: "Please enter a valid email.",
} as const;
