/**
 * Shared plain-words text dictionary for the Rider App and Rider pages.
 * All texts follow the Hi-Vet Plain Language Rules:
 * - Friendly, everyday words (Grade 6 level).
 * - Sentences up to ~12 words, labels & buttons 2-4 words.
 * - Action verbs at start of buttons.
 * - Zero jargon: no fleet, dispatch, payload, manifest, operational, protocol, standby, sync, vault, agent, ops.
 */

export const RIDER_TEXT = {
    // ── Navigation ──
    nav: {
        home: 'Home',
        history: 'History',
        earnings: 'Earnings',
        notifications: 'Notifications',
        profile: 'Profile',
        homeAria: 'Go to Home',
        historyAria: 'Go to Delivery History',
        earningsAria: 'Go to Earnings',
        notificationsAria: 'Go to Notifications',
        profileAria: 'Go to Profile',
    },

    // ── Home / Dashboard ──
    dashboard: {
        pageTitle: 'Home',
        statusHeader: 'My Delivery Status',
        statusOnline: 'Online',
        statusOffline: 'Offline',
        readyTitle: 'Ready for Deliveries',
        offlineTitle: 'You Are Offline',
        goOnlineBtn: 'Start Receiving Orders',
        goOfflineBtn: 'Stop Receiving Orders',

        // Stat cards
        stats: {
            todayEarningsLabel: "Today's Earnings",
            todayEarningsDesc: 'The money you earned so far today.',
            completedOrdersLabel: 'Completed Deliveries',
            completedOrdersDesc: 'Total packages you safely delivered.',
            totalEarningsLabel: 'Total Earnings',
            totalEarningsDesc: 'All the money you have made, including tips.',
        },

        // Available deliveries section
        availableSection: {
            subHeader: 'Deliveries',
            mainHeader: 'Available Deliveries',
            waitingBadge: (count: number) =>
                `${count} ${count === 1 ? 'Delivery' : 'Deliveries'} Waiting`,
            noOrdersTitle: 'No Deliveries Right Now',
            noOrdersDesc:
                'We will notify you as soon as a delivery is available near you.',
            offlinePromptTitle: 'You Are Offline',
            offlinePromptDesc:
                'Start receiving orders to see deliveries near you.',
        },

        // Available order card
        orderCard: {
            idLabel: 'Order ID',
            payLabel: 'Your Pay',
            itemsTitle: 'Package Items',
            itemCount: (count: number) =>
                `${count} ${count === 1 ? 'Item' : 'Items'}`,
            noItems: 'No items listed for this order.',
            pickupLabel: 'Pickup Place',
            dropoffLabel: 'Drop-off Location',
            acceptBtn: 'Accept Delivery',
            viewDetailsBtn: 'View Details',
        },

        // Active delivery view
        activeDelivery: {
            headerLabel: 'Current Delivery',
            pickupMarker: 'Pickup Place',
            dropoffMarker: 'Drop-off Location',
            gpsConnected: 'GPS Connected',
            travelInfo: 'Travel Info',
            hideDirections: 'Hide Directions',
            getRoute: 'Get Directions',
            routeSummaryTitle: 'Delivery Route',
            pickupHeader: 'Pickup Place',
            dropoffHeader: 'Drop-off Location',
            contactLabel: 'Phone',
            itemsTitle: 'Items to Deliver',
            quantityLabel: 'Quantity',
            checkedBadge: 'Checked',
            confirmPickupBtn: 'Confirm Pickup',
            markDeliveredBtn: 'Mark as Delivered',
            contactBtn: 'Contact',
            cancelJobBtn: 'Cancel Job',
        },

        // PIN / Serial Pickup Verification Modal
        pickupModal: {
            title: 'Confirm Package Pickup',
            description:
                'Enter the serial number on the package to confirm you picked it up.',
            placeholder: 'HV-SN-...',
            cancelBtn: 'Cancel',
            confirmBtn: 'Confirm Pickup',
        },

        // Contact Modal
        contactModal: {
            title: 'Contact',
            callTitle: 'Phone Call',
            callSub: 'Call directly',
            smsTitle: 'Text Message',
            smsSub: 'Send SMS',
            whatsAppTitle: 'WhatsApp',
            whatsAppSub: 'Open WhatsApp',
            closeBtn: 'Close',
        },
    },

    // ── Delivery History / Orders ──
    orders: {
        pageTitle: 'History',
        headerTitle: 'Delivery Summary',
        headerSub: 'Your Numbers',
        completionRate: 'Completion Rate',
        completionRateDesc: 'Percentage of orders delivered safely.',
        activeDeliveries: 'Active Deliveries',
        activeDeliveriesDesc: 'Deliveries you are doing right now.',
        totalCompleted: 'Total Completed',
        totalCompletedDesc: 'Total packages you safely delivered.',
        historyHeader: 'Delivery History',
        historySub: 'Your Records',
        searchPlaceholder: 'Search order number or address...',
        filterAll: 'All',
        filterActive: 'In Progress',
        filterCompleted: 'Completed',
        loading: 'Loading your deliveries...',
        emptyTitle: 'No Deliveries Found',
        emptyDesc: 'You do not have any deliveries matching this search.',
        orderIdLabel: 'Order ID',
        payLabel: 'Pay',
        pickupLabel: 'Pickup Place',
        dropoffLabel: 'Drop-off Location',
        detailsBtn: 'View Details',

        modal: {
            title: 'Delivery Details',
            pickupLabel: 'Pickup Place',
            pickupFallback: 'Pickup address not specified',
            dropoffLabel: 'Drop-off Location',
            itemsTitle: 'Package Items',
            payLabel: 'Your Earnings',
            statusCompleted: 'Completed',
            closeBtn: 'Close',
        },
    },

    // ── Earnings / Wallet ──
    earnings: {
        pageTitle: 'Earnings',
        headerTitle: 'Earnings Summary',
        headerSub: 'Your Wallet',
        balanceLabel: 'Available Balance',
        balanceDesc: 'All the money you have earned from your deliveries.',
        cashOutBtn: 'Cash Out',
        viewSummaryBtn: 'View Summary',

        metrics: {
            todayEarnings: "Today's Earnings",
            selectedDateEarnings: "Selected Day's Earnings",
            todayDesc: 'Money earned today.',
            completedOrders: 'Completed Deliveries',
            completedDesc: 'Total orders you delivered.',
            pendingCashOut: 'Pending Cash Out',
            pendingDesc: 'Money currently being sent to you.',
        },

        activityTitle: 'Recent Activity',
        activitySub: 'Earnings History',
        filterDateLabel: 'Filter by Date',
        resetFilterBtn: 'Clear Date Filter',
        loading: 'Loading your earnings...',
        emptyTitle: 'No Earnings Found',
        emptyDesc: 'You do not have any earnings recorded for this date.',
        cardTitle: 'Delivery Payment',
        detailsBtn: 'View Details',

        payoutModal: {
            title: 'Cash Out',
            availableLabel: 'Available to Cash Out',
            amountLabel: 'Amount to Cash Out (₱)',
            methodLabel: 'Choose Payment Method',
            confirmBtn: 'Confirm Cash Out',
            successTitle: 'Cash Out Sent',
            successDesc: 'Your money is on the way.',
            errorMin: 'The minimum cash out is ₱100.00.',
            errorBalance: 'You do not have enough money to cash out this amount.',
            errorGeneral: 'Cash out failed. Please try again.',
            errorNetwork: 'No internet connection. Please try again.',
        },

        summaryModal: {
            title: 'Earnings Summary',
            totalEarnings: 'Total Earnings',
            todayEarnings: "Today's Earnings",
            completedDeliveries: 'Completed Deliveries',
            pendingCashOut: 'Pending Cash Out',
            ratingScore: 'Delivery Rating',
            ratingDesc: 'You are in the top 5% of riders.',
            closeBtn: 'Close',
        },

        receiptModal: {
            title: 'Payment Receipt',
            amountReceived: 'Payment Received',
            statusCompleted: 'Completed',
            pickupLabel: 'Pickup Place',
            dropoffLabel: 'Delivery Address',
            closeBtn: 'Close',
        },
    },

    // ── Notifications / Alerts ──
    alerts: {
        pageTitle: 'Notifications',
        backHomeBtn: 'Back to Home',
        allTab: 'All',
        unreadTab: 'Unread',
        markAllReadBtn: 'Mark All as Read',
        deleteAllBtn: 'Delete All',
        loading: 'Loading notifications...',
        emptyTitle: 'No Notifications Yet',
        emptyAll: 'You are all caught up.',
        emptyUnread: 'You have no unread notifications.',
        deleteTooltip: 'Delete notification',
    },

    // ── Profile / Account Settings ──
    profile: {
        pageTitle: 'Profile',
        portalBadge: 'Delivery Rider',
        infoHeader: 'Rider Information',
        vehicleLabel: 'Registered Vehicle',
        vehicleVerified: 'Verified',
        vehicleActive: 'Active',
        addressLabel: 'Home Address',
        addressSub: 'Your saved address',
        notifRequests: 'Delivery Requests',
        notifRequestsSub: 'New delivery requests and pickup updates',
        notifEarnings: 'Earnings & Cash Out',
        notifEarningsSub: 'Weekly summaries and payout updates',
        notifUpdates: 'Rider Updates',
        notifUpdatesSub: 'Safety tips, weather updates, and announcements',
    },

    // ── Auth & Landing (Rider Specific) ──
    auth: {
        portalName: 'Rider Portal',
        loginHero: 'See your deliveries, earnings, and updates in one place.',
        loginTitle: 'Rider Login',
        signUpLink: 'Sign Up as a Rider',
        registerHeader: 'Rider Sign Up',
        registerSub: 'Enter your details to create your rider account.',
        vehicleTypeLabel: 'Vehicle Type',
        bicycleOption: 'Bicycle Delivery',
        registerSubmit: 'Sign Up as Rider',
        landingTitle: 'Ride with Hi-Vet',
        landingSub: 'Deliver pet products and care essentials in your area. Flexible hours and fast payouts.',
    },
};
