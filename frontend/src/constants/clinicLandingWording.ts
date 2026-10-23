/**
 * Centralized Plain-Language Dictionary for Hi-Vet Clinic Landing Pages.
 * All wording follows the Hi-Vet Plain Language Guidelines:
 * - Grade 6 reading level, short and friendly.
 * - Single name for each action everywhere: "Join as a Clinic", "Clinic Log In", etc.
 * - Banned jargon eliminated: no "CRM", "real-time", "inventory sync", "logistical", "onboard", "ecosystem", etc.
 */

export const CLINIC_LANDING_TEXT = {
    // ── Meta / Page Title ──
    meta: {
        pageTitle: 'Hi-Vet for Clinics - Run Your Clinic Easily',
        metaDescription: 'Manage your clinic bookings, track stock, and organize patient records with Hi-Vet.',
    },

    // ── Header & Navigation ──
    nav: {
        brand: 'Hi-Vet for Clinics',
        features: 'What You Get',
        clinicTools: 'Manage Your Clinic',
        safety: 'Safe and Secure',
        loginBtn: 'Clinic Log In',
        registerBtn: 'Join as a Clinic',
        howItHelpsBtn: 'How It Helps',
        openMenuAria: 'Open menu',
        closeMenuAria: 'Close menu',
        homeLinkAria: 'Go to Hi-Vet home',
    },

    // ── Hero Slideshow (/for-clinics) ──
    slides: [
        {
            tag: 'Run Your Clinic',
            title: 'Run Your Clinic Easily',
            witty: 'Bookings and Orders in One Place.',
            subtitle: 'Manage bookings, orders, and deliveries from your phone or computer.',
            imageAlt: 'A vet in a white coat caring for a cat',
            primaryBtn: 'Join as a Clinic',
            secondaryBtn: 'How It Helps',
        },
        {
            tag: 'Clear Reports',
            title: 'See How Your Clinic Grows',
            witty: 'Simple Numbers You Can Understand.',
            subtitle: 'Track daily sales, popular products, and visits with clear reports.',
            imageAlt: 'A vet looking at clinic reports on a screen',
            primaryBtn: 'Join as a Clinic',
            secondaryBtn: 'How It Helps',
        },
        {
            tag: 'Stock and Orders',
            title: 'Never Run Out of Supplies',
            witty: 'Keep Track of Every Item.',
            subtitle: 'Keep track of your stock and your orders in one place.',
            imageAlt: 'A friendly dog next to clinic pet supplies',
            primaryBtn: 'Join as a Clinic',
            secondaryBtn: 'How It Helps',
        },
    ],

    // ── Slideshow Accessibility & Controls ──
    controls: {
        prevSlideAria: 'Previous slide',
        nextSlideAria: 'Next slide',
        slideIndicatorAria: (index: number, total: number) => `Slide ${index + 1} of ${total} (for clinics)`,
    },

    // ── Core Capabilities ("What You Get" / #capabilities) ──
    capabilities: {
        tag: 'What You Get',
        headingPrefix: 'Built for',
        headingHighlight: 'Busy Clinics.',
        description: 'Simple tools to help your clinic stay organized and serve more pets every day.',
        cards: [
            {
                badge: 'Pet Records',
                title: 'Pet Records',
                desc: 'Keep pet health histories, owner contacts, and visit notes safe and organized.',
            },
            {
                badge: 'Clinic Stock',
                title: 'Track Stock',
                desc: 'Track medications, food, and items so you always know when to restock.',
            },
            {
                badge: 'Clear Reports',
                title: 'Clinic Reports',
                desc: 'View clear daily and monthly reports to see how your clinic is doing.',
            },
        ],
    },

    // ── Safe and Secure (#security) ──
    security: {
        headingPrefix: 'Safe and',
        headingHighlight: 'Secure.',
        quote: '"Your clinic and patient records are kept safe with modern encryption."',
        cards: [
            {
                title: 'Safe Data',
                desc: 'Your records are encrypted and protected at all times.',
            },
            {
                title: 'Live Updates',
                desc: 'Check upcoming bookings and order updates right away.',
            },
            {
                title: 'Staff Access',
                desc: 'Choose what each vet or staff member can see and edit.',
            },
            {
                title: 'Quick Reports',
                desc: 'Download clear summaries of clinic sales and visits anytime.',
            },
        ],
        ctaTag: 'Ready to Grow Your Clinic?',
        ctaHeading: 'Join Hi-Vet for Clinics',
        ctaButton: 'Join as a Clinic',
    },

    // ── Auth Pages (Login & Registration) ──
    auth: {
        hero: {
            brandName: 'Hi-Vet for Clinics',
            badge: 'Clinic Hub',
            titleLine1: 'Run Your Clinic',
            titleLine2: 'Easily.',
            description: 'Log in to manage bookings, check stock, and see your clinic reports.',
            imageAlt: 'Veterinary clinic',
            stepBadge: (step: number, total: number) => `Step ${step} of ${total}`,
        },
        login: {
            title: 'Clinic Log In',
            subtitle: 'Welcome back. Log in to manage your clinic.',
            emailLabel: 'Clinic Email',
            emailPlaceholder: 'clinic@example.com',
            passwordLabel: 'Password',
            forgotPasswordLink: 'Forgot Password?',
            submitBtn: 'Clinic Log In',
            submittingBtn: 'Logging In...',
            registerPromptLink: 'Join as a Clinic',
            backToLanding: 'Back to Clinic Page',
            errorInvalid: 'Incorrect email or password. Please try again.',
            errorConnection: 'Could not connect. Please check your internet and try again.',
        },
        register: {
            title: 'Join as a Clinic',
            loginPromptLink: 'Clinic Log In Instead',
            backToLanding: 'Back to Clinic Page',
            step1Title: 'Clinic Information',
            step1Subtitle: 'Tell us about your clinic.',
            clinicNameLabel: 'Clinic Name',
            clinicPhoneLabel: 'Clinic Phone',
            step2Title: 'Owner Information',
            step2Subtitle: "Enter the clinic owner's details.",
            ownerFirstNameLabel: 'First Name',
            ownerLastNameLabel: 'Last Name',
            ownerMiddleNameLabel: 'Middle Name',
            ownerPhoneLabel: 'Personal Phone',
            birthdateLabel: 'Birthdate',
            ageLabel: 'Age',
            homeAddressLabel: 'Home Address',
            step3Title: 'Clinic Address',
            step3Subtitle: 'Where is your clinic located?',
            clinicAddressLabel: 'Clinic Address',
            searchPlaceholder: 'Search for your clinic address...',
            typeAddressBtn: 'Type Address',
            addressHint: 'Choose your clinic location on the map, or tap Type Address to enter it manually.',
            step4Title: 'Clinic Permits',
            step4Subtitle: 'Upload your business permits to verify your clinic.',
            baiTitle: 'BAI Registration',
            baiSubtitle: 'Your clinic registration with the Bureau of Animal Industry.',
            baiNumberLabel: 'Registration Number',
            mayorTitle: "Mayor's Permit",
            mayorSubtitle: 'Your business permit from your city or town.',
            mayorNumberLabel: 'Permit Number',
            uploadBtn: 'Upload Document',
            uploadHint: 'PDF, JPG, or PNG · Up to 5MB',
            step5Title: 'Account Password',
            step5Subtitle: 'Set a secure password for your clinic account.',
            emailLabel: 'Email Address',
            passwordLabel: 'Password',
            confirmPasswordLabel: 'Confirm Password',
            passwordsMismatch: 'Passwords do not match',
            step6Title: 'Verify Your Email',
            step6Subtitle: 'We sent a 6-digit code to ',
            resendPrompt: "Didn't get a code?",
            resendBtn: 'Resend',
            continueBtn: 'Continue',
            backBtn: 'Back',
            submitBtn: 'Create Account',
            submittingBtn: 'Creating Account...',
            underReviewTitle: 'Application Under Review',
            underReviewSub: 'Application submitted for',
            underReviewStep1: "We will check your BAI Registration and Mayor's Permit within 1 to 2 business days.",
            underReviewStep2: 'Once approved, we will send an email so you can log in to your clinic account.',
        },
    },
};
