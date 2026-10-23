/**
 * Centralized Plain-Language Dictionary for Hi-Vet Rider Landing Pages.
 * All wording follows the Hi-Vet Plain Language Guidelines:
 * - Grade 6 reading level, short, clear, and friendly.
 * - Single name for each action everywhere: "Become a Rider", "Rider Log In", "Benefits", "What You Need".
 * - Banned jargon eliminated: no "courier", "logistics", "fleet", "dispatch", "payload", "onboarding", "compensation", "KYC", "gatekeeping", "credentials", etc.
 * - Matches the Rider App terminology: "rider", "delivery", "order", "pay", "earnings", "Cash Out", "pickup", "drop-off".
 */

export const RIDER_LANDING_TEXT = {
    // ── Meta / Page Title ──
    meta: {
        pageTitle: 'Hi-Vet for Riders - Deliver and Earn',
        metaDescription: 'Deliver pet food and supplies near you. Choose your own hours, pick up orders, and get paid fast.',
    },

    // ── Header & Navigation ──
    nav: {
        brand: 'Hi-Vet Riders',
        benefits: 'Benefits',
        rewards: 'Rewards',
        whatYouNeed: 'What You Need',
        loginBtn: 'Rider Log In',
        registerBtn: 'Become a Rider',
        openMenuAria: 'Open menu',
        closeMenuAria: 'Close menu',
    },

    // ── Hero Slideshow (/for-riders) ──
    slides: [
        {
            title: 'Deliver and Earn',
            witty: 'Deliver Pet Products Near You.',
            subtitle: 'Become a Hi-Vet rider. Pick up orders, deliver them and get paid.',
            imageAlt: 'A rider delivering pet supplies with a friendly cat',
            primaryBtn: 'Become a Rider',
            secondaryBtn: 'Benefits',
        },
        {
            title: 'Work When You Want',
            witty: 'Choose Your Own Hours.',
            subtitle: 'Ride a bicycle or motorcycle. Accept deliveries whenever you are ready.',
            imageAlt: 'A rider on a motorcycle with pet delivery boxes and a happy dog',
            primaryBtn: 'Become a Rider',
            secondaryBtn: 'Benefits',
        },
        {
            title: 'Easy Deliveries Every Day',
            witty: 'Clear Routes and Fast Help.',
            subtitle: 'Our rider app makes pickup and drop-off simple, with live maps and friendly support.',
            imageAlt: 'A rider checking delivery locations and order notes on a phone',
            primaryBtn: 'Become a Rider',
            secondaryBtn: 'Benefits',
        },
    ],

    // ── Slideshow Accessibility & Controls ──
    controls: {
        prevSlideAria: 'Previous slide',
        nextSlideAria: 'Next slide',
        slideIndicatorAria: (index: number, total: number) => `Slide ${index + 1} of ${total} (for riders)`,
    },

    // ── Rewards / Why Ride With Us (#perks) ──
    perks: {
        tag: 'Rider Rewards',
        headingPrefix: 'Why Ride',
        headingHighlight: 'With Us.',
        description: 'Work when you want, see your earnings clearly, and help pets every day.',
        cards: [
            {
                accent: 'Your Time',
                title: 'Work When You Want',
                desc: 'Go online when you are ready. You choose your own hours.',
            },
            {
                accent: 'Fast Pay',
                title: 'Clear Earnings',
                desc: 'See your pay before every delivery and keep 100% of your tips.',
            },
            {
                accent: 'Help Animals',
                title: 'Help Local Pets',
                desc: 'Bring pet food and medicine straight from clinics to happy pet owners.',
            },
        ],
    },

    // ── Requirements (#requirements / "What You Need") ──
    requirements: {
        headingPrefix: 'What You Need',
        headingHighlight: 'To Start.',
        quote: '"Joining is simple. Here is what you need to become a Hi-Vet rider."',
        items: [
            { title: 'Age 18+', desc: 'You must be 18 years or older.' },
            { title: 'Your Ride', desc: 'A bicycle or motorcycle in good condition.' },
            { title: 'Smartphone', desc: 'A smartphone with internet to accept deliveries.' },
            { title: 'Valid ID', desc: 'A government ID or driver\'s license.' },
        ],
        ctaTag: 'Ready to Start Delivering?',
        ctaHeading: 'Join the Hi-Vet Rider Team',
        ctaBtn: 'Become a Rider',
    },

    // ── Footer ──
    footer: {
        brandName: 'Hi-Vet Riders',
        description: 'Deliver pet food and medicine, help local pet owners, and earn on your schedule.',
    },

    // ── Rider Login Page (/login/rider) ──
    loginPage: {
        heroTag: 'Rider Account',
        heroTitlePrefix: 'Hi-Vet',
        heroTitleHighlight: 'Riders.',
        heroSubtitle: 'See your deliveries, earnings, and updates in one place.',
        heroBadge: 'Rider Portal',
        signUpInstead: 'Become a Rider',
        title: 'Rider Log In',
        subtitle: 'Enter your email and password to view your deliveries.',
        emailLabel: 'Email Address',
        emailPlaceholder: 'rider@example.com',
        passwordLabel: 'Password',
        forgotPasswordLink: 'Reset Password?',
        loginBtn: 'Rider Log In',
        loggingInBtn: 'Logging In...',
        backToLanding: 'Back to Home',
        heroImageAlt: 'A rider on a motorcycle with delivery gear',
        errors: {
            invalidCredentials: 'Incorrect email or password. Please try again.',
            networkError: 'Could not connect. Please check your internet connection.',
            googleFailed: 'Google sign-in failed. Please try again.',
        },
    },

    // ── Rider Register Page (/register/rider) ──
    registerPage: {
        heroTag: 'Become a Rider',
        heroTitlePrefix: 'Rider',
        heroTitleHighlight: 'Sign Up.',
        heroSubtitle: 'Sign up to deliver pet food and supplies, choose your hours, and earn money.',
        heroStepBadge: (step: number) => `Step ${step} of 4`,
        logInInstead: 'Rider Log In Instead',
        backToLanding: 'Back to Home',
        heroImageAlt: 'A rider preparing for a delivery',

        // Step 1: Personal Info
        step1Title: 'Your Information',
        step1Subtitle: 'Enter your name, phone number, birthdate, and address.',
        firstName: 'First Name',
        lastName: 'Surname',
        middleName: 'Middle Name',
        suffix: 'Suffix',
        birthdate: 'Birthdate',
        age: 'Age',
        gender: 'Sex',
        phone: 'Mobile Phone',
        address: 'Home Address',
        addressPlaceholder: '123 Rizal St., Quezon City',
        validatedAddressLabel: 'Your Address',
        locationIncomplete: 'Address Incomplete',
        nextBtn: 'Next',

        // Step 2: Vehicle Details
        step2Title: 'Vehicle Details',
        step2Subtitle: 'Choose what vehicle you will use for deliveries.',
        vehicleTypeLabel: 'Vehicle Type',
        bicycleNoticeTitle: 'Bicycle Delivery',
        bicycleNoticeDesc: 'No driver\'s license or OR/CR needed for bicycles. Continue to the next step.',
        licenseNumberLabel: 'Driver\'s License Number',
        licenseUploadLabel: 'Driver\'s License',
        crUploadLabel: 'Certificate of Registration (CR)',
        orUploadLabel: 'Official Receipt (OR)',
        backBtn: 'Back',

        // Step 3: ID Check & Account Details
        step3Title: 'ID Check and Account',
        step3Subtitle: 'Upload your clearance and set your login password.',
        nbiUploadLabel: 'NBI or Police Clearance',
        ageVerifiedTitle: 'Age Requirement',
        ageVerifiedDesc: 'You are at least 18 years old.',
        hardwareRequirement: 'I have an Android phone with internet',
        emailLabel: 'Email Address',
        emailPlaceholder: 'rider@example.com',
        passwordLabel: 'Password',
        confirmPasswordLabel: 'Confirm Password',
        sendCodeBtn: 'Send Code',
        sendingCodeBtn: 'Sending Code...',

        // Step 4: Verification Code
        step4Title: 'Enter Code',
        step4Subtitle: (email: string) => `We sent a 6-digit code to ${email}`,
        noCodeText: "Didn't get a code?",
        resendBtn: 'Resend',
        waitCountdown: (sec: number) => `Wait ${sec}s`,
        reviewBtn: 'Back',
        completeSignUpBtn: 'Become a Rider',
        creatingAccountBtn: 'Creating Account...',

        // Upload Component States
        upload: {
            verifiedTitle: 'File Uploaded',
            verifiedSubtitle: 'Document Accepted',
            uploadPrompt: 'Upload Document',
            uploading: 'Uploading...',
            acceptedTypes: 'PDF, JPG, or PNG · Max 5MB',
        },

        // Pending Approval Screen
        pending: {
            title: 'Application Under Review',
            submittedFor: (email: string) => `Application submitted for ${email}`,
            step1Text: 'Our team will review your NBI clearance and documents within 1 to 2 business days.',
            step2Text: 'Once approved, we will send an email with your link to log in and start delivering.',
            returnBtn: 'Back to Home',
        },

        // Errors & Validation
        errors: {
            requiredFields: 'Please fill in all required fields.',
            phoneInvalid: 'Please enter a valid mobile number.',
            phoneUsed: 'This mobile number is already in use.',
            emailInvalid: 'Please enter a valid email address.',
            emailUsed: 'This email is already in use.',
            birthdateInvalid: 'Please choose a valid birthdate.',
            licenseRequired: 'Driver\'s license number is required.',
            vehicleDocsRequired: 'Please upload your driver\'s license, OR, and CR.',
            nbiRequired: 'Please upload your NBI or Police Clearance.',
            mustMeetRequirements: 'You must meet all requirements to proceed.',
            checkEmailPasswords: 'Please check your email and matching passwords.',
            passwordLength: 'Password must be at least 8 characters.',
            sendCodeFailed: 'Could not send verification code. Please try again.',
            networkError: 'Could not connect. Please try again.',
            codeIncomplete: 'Please enter the full 6-digit code.',
            regFailed: 'Could not complete rider registration. Please try again.',
        },
    },
};
