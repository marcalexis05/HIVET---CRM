# Hi-Vet: Complete Functional & Non-Functional Requirements

**Source Document**: CRM HIVET.docx (IS 109 - Customer Relationship Management)  
**Project**: Hi-Vet E-Commerce Web Application for Household Pets Supplies  
**Team**: Evangelista, Garcia, Lamsen, Tabios (BSIS3-A)  
**Submitted to**: Prof. Benjamin Dave Z. Cruz  

---

## 0. PROJECT REQUIREMENTS FROM DOCX

### Project Description
The Hi-Vet system is a specialized **"Click and Collect" e-commerce platform** designed to digitalize and streamline retail operations for pet supplies. The system provides:
- Dedicated digital space for pet owners and local businesses
- Bridges online browsing with physical storefront efficiency
- Integrated order reservations and inventory management
- Three interconnected interfaces: Customer Side, Business Side, Admin Side, and Rider Side
- Store-specific pricing, automated stock alerts, and high-level growth analytics

### General Objective (DOCX Section 1)
> To design and implement an affordable, user-friendly pet supply web application that helps pet owners and local businesses by streamlining order reservations and inventory management.

### Specific Objectives (DOCX Section 1)

#### SO-1: Secure Access ✅
**Mapped to FR**: FR-1, FR-2, FR-3, FR-4, FR-5
- Create and customize a product catalog for dog and cat supplies
- Secure Google authentication for verified access
- **Implementation**: OAuth 2.0, JWT tokens, role-based access control
- **Status**: ✅ Implemented in FR-1 through FR-5

#### SO-2: Enhanced Navigation ✅
**Mapped to FR**: FR-6, FR-7, FR-8, FR-9, FR-10
- Integrate filtering by category (food, accessories, vitamins)
- Advanced search functions to improve user experience
- **Implementation**: Product filtering, search API, category management
- **Status**: ✅ Implemented in FR-6 through FR-10

#### SO-3: Data Analytics ✅
**Mapped to FR**: FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-36, FR-37, FR-38, FR-39
- Develop a Business Intelligence (BI) dashboard
- Display statistics on top-selling products and revenue trends
- Enable informed decision-making by business owners
- **Implementation**: Real-time KPI dashboard, analytics engine, trend analysis
- **Status**: ✅ Implemented in FR-30 through FR-39

#### SO-4: Communication ✅
**Mapped to FR**: FR-28, FR-29, FR-40, FR-41
- Implement a notification system via Gmail
- Automated order confirmations and pickup alerts
- **Implementation**: Gmail API integration, email templates, notification queue
- **Status**: ✅ Implemented in FR-28, FR-29, FR-40, FR-41

### Scope (DOCX Section 2)

#### Customer Side (Pet Owners)
**Mapped to FR**: FR-1 through FR-29

1. **Product Browsing** (SO-2)
   - Access to categorized catalog of pet supplies
   - Categories: food, accessories, vitamins
   - **Implementation**: FR-6, FR-7, FR-8

2. **Reservation System** (CORE)
   - Ability to place "Pickup Orders" online
   - Local collection from physical storefront
   - **Implementation**: FR-13, FR-14, FR-15, FR-16, FR-17, FR-18

3. **Loyalty Dashboard** (CUSTOMER ENGAGEMENT)
   - Personalized interface to track reward points
   - View and manage available vouchers
   - **Implementation**: FR-24, FR-25, FR-26, FR-27

4. **Automated Alerts** (SO-4)
   - Gmail notifications for order status
   - Pickup readiness alerts
   - **Implementation**: FR-28, FR-29, FR-40

**Customer Side Requirements Mapping**:
| Scope Item | Feature | Functional Requirement | Status |
|-----------|---------|----------------------|--------|
| Product Browsing | Categorized catalog | FR-6, FR-7, FR-8 | ✅ |
| Reservation System | Pickup orders | FR-13, FR-14, FR-15, FR-16, FR-17, FR-18 | ✅ |
| Loyalty Dashboard | Points tracking | FR-24, FR-25, FR-26, FR-27 | ✅ |
| Automated Alerts | Gmail notifications | FR-28, FR-29, FR-40 | ✅ |

#### Business Side (Clinic Owners / Store Owners)
**Mapped to FR**: FR-20 through FR-39

1. **Catalog Management** (SO-2)
   - Tools to update products
   - Manage categories and inventory levels
   - **Implementation**: FR-20, FR-21, FR-22, FR-23

2. **BI Dashboard** (SO-3)
   - Real-time visualization of sales performance
   - Product trends analysis
   - **Implementation**: FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-36, FR-37, FR-38, FR-39

3. **Order Management**
   - Oversight of incoming reservations
   - Pickup fulfillment management
   - **Implementation**: FR-18, FR-19, FR-28

**Business Side Requirements Mapping**:
| Scope Item | Feature | Functional Requirement | Status |
|-----------|---------|----------------------|--------|
| Catalog Management | Product CRUD | FR-20, FR-21, FR-22, FR-23 | ✅ |
| BI Dashboard | Sales analytics | FR-30, FR-31, FR-32, FR-33, FR-34, FR-35 | ✅ |
| Order Management | Order oversight | FR-18, FR-19, FR-28 | ✅ |

#### Admin Side
**Mapped to FR**: FR-38, FR-39, FR-40, FR-41

- Platform management and system governance
- User account management
- System-wide data visualization
- Security monitoring

**Admin Side Requirements Mapping**:
| Feature | Functional Requirement | Status |
|---------|----------------------|--------|
| System governance | FR-39 | ✅ |
| User management | FR-41 | ✅ |
| Analytics | FR-38 | ✅ |
| Security monitoring | FR-40 | ✅ |

#### Rider Side
**Mapped to FR**: Delivery management features

- Rider job assignment and acceptance
- Real-time delivery tracking
- Payment and earnings tracking
- Performance ratings

---

## 1. FUNCTIONAL REQUIREMENTS

### 1.1 User Registration & Authentication

#### FR-1: Google OAuth Integration
- **Description**: Users can register and login using Google account
- **Actors**: Customer, Business Owner, Rider, Admin
- **Acceptance Criteria**:
  - [x] OAuth 2.0 implementation with Google
  - [x] Automatic user profile creation on first login
  - [x] Email from Google account captured
  - [x] Option to link additional accounts to same user
  - [x] Logout functionality clears JWT tokens

#### FR-2: Email/Password Registration
- **Description**: Users can create account with email and password
- **Actors**: Customer, Business Owner, Rider
- **Requirements**:
  - [x] Email validation (format check)
  - [x] Password strength validation (min 8 chars, mixed case, number, special)
  - [x] Email verification (confirmation link sent)
  - [x] Password hashing with bcrypt
  - [x] Cannot register duplicate email

#### FR-3: Role-Based Access Control
- **Description**: Different user roles with specific permissions
- **Actors**: Admin
- **Roles**:
  - [x] **Customer**: Browse products, place orders, view loyalty points
  - [x] **Business Owner**: Manage catalog, view orders, access analytics
  - [x] **Rider**: View deliveries, update status, track earnings
  - [x] **Admin**: Full platform control, user management, analytics
- **Requirements**:
  - [x] Role assignment at account creation
  - [x] Role-based endpoint access (401 Unauthorized if insufficient permissions)
  - [x] Ability to change roles (admin only)

#### FR-4: Password Management
- **Description**: Password reset and change functionality
- **Acceptance Criteria**:
  - [x] Forgot password email with reset link (15-minute expiration)
  - [x] Change password in account settings
  - [x] Old password verification required
  - [x] Password history (cannot reuse last 5 passwords)

---

### 1.2 Product Catalog Management

#### FR-5: Product Browsing
- **Description**: Customers can browse pet supply products
- **Actors**: Customer
- **Features**:
  - [x] View all products in catalog
  - [x] Product details: name, description, price, image, stock status
  - [x] Product ratings and review count
  - [x] Availability indicator (in stock/out of stock)

#### FR-6: Category Navigation
- **Description**: Products organized hierarchically by category
- **Actors**: Customer
- **Categories**:
  - [x] Main categories: Dogs, Cats, General Supplies
  - [x] Subcategories: Food, Accessories, Vitamins, Toys
  - [x] Display order customizable
  - [x] Each category has icon and description

#### FR-7: Advanced Search & Filter
- **Description**: Find products efficiently
- **Actors**: Customer
- **Filters**:
  - [x] Full-text search by name/description/SKU
  - [x] Filter by category (multi-select)
  - [x] Filter by price range (min-max slider)
  - [x] Filter by rating (4+, 3+, 2+)
  - [x] Filter by availability (in stock/out of stock)
  - [x] Sort by: Popularity, Price (Low-High, High-Low), Newest, Rating
  - [x] Search suggestions/autocomplete

#### FR-8: Product Details Page
- **Description**: Comprehensive product information
- **Actors**: Customer
- **Content**:
  - [x] Product gallery (primary image + thumbnails)
  - [x] Zoom functionality for images
  - [x] Detailed description with formatting
  - [x] Price display with currency
  - [x] Stock level indicator
  - [x] Loyalty points reward (points earned)
  - [x] Average rating and number of reviews
  - [x] Customer reviews (name, rating, text, date)
  - [x] Related/recommended products
  - [x] Share options (social media, email)

#### FR-9: Catalog Management (Business)
- **Description**: Business owners manage their product catalog
- **Actors**: Business Owner
- **Operations**:
  - [x] Add new product (form: name, desc, price, category, image, SKU)
  - [x] Edit existing product (all fields modifiable)
  - [x] Delete product (soft delete - archive)
  - [x] Bulk upload via CSV
  - [x] Set product variants (size, color, etc.)
  - [x] Update price and stock
  - [x] Set loyalty points per product
  - [x] Manage product images (upload, reorder, delete)
  - [x] Publish/unpublish product

#### FR-10: Inventory Management
- **Description**: Track and manage stock levels
- **Actors**: Business Owner
- **Features**:
  - [x] View current stock for all products
  - [x] Real-time stock updates
  - [x] Low stock alerts (configurable threshold)
  - [x] Stock movement history with timestamps
  - [x] Manual stock adjustment (with reason)
  - [x] Automatic stock decrement on order
  - [x] Automatic stock restoration on order cancellation
  - [x] Stock transfer between branches

---

### 1.3 Shopping & Order Management

#### FR-11: Shopping Cart
- **Description**: Customers add items and prepare to checkout
- **Actors**: Customer
- **Features**:
  - [x] Add product to cart (with quantity)
  - [x] Update quantity in cart
  - [x] Remove item from cart
  - [x] View cart summary (items, quantities, total)
  - [x] Clear cart (remove all items)
  - [x] Cart persistence (saved across sessions)
  - [x] Stock availability check before checkout
  - [x] Stock reserved during checkout (30-second hold)

#### FR-12: Checkout Process
- **Description**: Complete order placement
- **Actors**: Customer
- **Steps**:
  1. [x] Review cart items
  2. [x] Select delivery method (Pickup or Delivery)
  3. [x] Provide delivery/pickup details
  4. [x] Select payment method
  5. [x] Apply voucher code (if available)
  6. [x] Review order summary
  7. [x] Confirm and pay
  8. [x] Receive order confirmation

#### FR-13: Payment Processing
- **Description**: Process payments securely
- **Actors**: Customer
- **Payment Methods**:
  - [x] Credit/Debit Card (via PayMongo)
  - [x] E-wallets (GCash, Grab Pay via PayMongo)
  - [x] Bank Transfer
  - [x] Cash on Pickup/Delivery
- **Features**:
  - [x] Secure payment gateway integration (PayMongo)
  - [x] Payment authorization and capture
  - [x] Invoice generation
  - [x] Transaction logging (PCI-DSS compliant)
  - [x] Handle payment failures gracefully

#### FR-14: Order Confirmation
- **Description**: Confirm order and notify customer
- **Actors**: System
- **Actions**:
  - [x] Generate order number (HV-YYYY-XXXXX format)
  - [x] Send email confirmation with order details
  - [x] Create order record in database
  - [x] Decrement product inventory
  - [x] Notify business owner of new order
  - [x] Notify rider (if delivery)
  - [x] Display order confirmation page

#### FR-15: Order Tracking
- **Description**: Customers track order status
- **Actors**: Customer
- **Features**:
  - [x] View all orders (active and completed)
  - [x] Order status timeline
  - [x] Estimated pickup/delivery time
  - [x] Store information and contact
  - [x] Live tracking (if delivery - rider location)
  - [x] Chat with business owner/rider
  - [x] Print order receipt/invoice

#### FR-16: Order Management (Business)
- **Description**: Business manages incoming orders
- **Actors**: Business Owner
- **Operations**:
  - [x] View incoming orders (list, sortable, filterable)
  - [x] Accept or reject order
  - [x] Request modification from customer
  - [x] Update order status (Preparing → Ready)
  - [x] Notify customer of status changes
  - [x] Print order/recipe for fulfillment
  - [x] Confirm pickup/delivery completion
  - [x] View order history

#### FR-17: Refunds & Cancellations
- **Description**: Handle order cancellations and refunds
- **Actors**: Customer, Business Owner
- **Rules**:
  - [x] Customer can cancel within 1 hour of order
  - [x] Business can reject orders (with reason)
  - [x] Automatic refund processing
  - [x] Inventory restored on cancellation
  - [x] Email notification of cancellation
  - [x] Cancellation reason logged

---

### 1.4 Loyalty Program

#### FR-18: Loyalty Points Earning
- **Description**: Customers earn points for purchases
- **Actors**: System
- **Calculation**:
  - [x] Points earned = (Order Total - Discounts) × Business Loyalty Rate
  - [x] Minimum: 1 point per peso
  - [x] Bonus points on first purchase
  - [x] Referral bonus points
  - [x] Birthday bonus points
- **Display**:
  - [x] Points displayed after order completion
  - [x] Points shown in customer dashboard
  - [x] Points history with detailed breakdown

#### FR-19: Loyalty Points Redemption
- **Description**: Customers redeem points for vouchers
- **Actors**: Customer
- **Features**:
  - [x] Browse available vouchers
  - [x] Check voucher cost in points
  - [x] Confirm redemption
  - [x] Points deducted immediately
  - [x] Voucher code generated
  - [x] Usage limit enforcement (1 voucher per order)

#### FR-20: Loyalty Dashboard
- **Description**: Personalized loyalty interface
- **Actors**: Customer
- **Content**:
  - [x] Current loyalty points balance
  - [x] Points history (earned/redeemed)
  - [x] Available vouchers
  - [x] Redeemed vouchers
  - [x] Referral status
  - [x] Loyalty tier (if applicable)

#### FR-21: Referral System
- **Description**: Customers earn points by referring friends
- **Actors**: Customer, System
- **Features**:
  - [x] Generate unique referral code
  - [x] Track referral links
  - [x] Bonus points for successful referral
  - [x] View referral history and rewards
  - [x] Share referral via social media/email

---

### 1.5 Vouchers & Promotional Codes

#### FR-22: Voucher Management (Business)
- **Description**: Business creates promotional vouchers
- **Actors**: Business Owner
- **Operations**:
  - [x] Create voucher (code, discount type, value, conditions)
  - [x] Set discount: Percentage OR Fixed Amount
  - [x] Set minimum order value
  - [x] Set validity period (from/until dates)
  - [x] Set max uses (total and per customer)
  - [x] Applicable categories (optional)
  - [x] Activate/deactivate voucher
  - [x] View redemption analytics

#### FR-23: Voucher Application (Customer)
- **Description**: Apply voucher code at checkout
- **Actors**: Customer
- **Flow**:
  - [x] Enter voucher code
  - [x] Validate code (valid, active, sufficient uses, min order met)
  - [x] Show discount amount
  - [x] Deduct from total
  - [x] Display updated order total
  - [x] Remove voucher (if needed)

---

### 1.6 Notifications & Communications

#### FR-24: Email Notifications
- **Description**: Automated email alerts and confirmations
- **Actors**: System
- **Templates**:
  - [x] Welcome email (same-day after registration)
  - [x] Order confirmation (immediately after payment)
  - [x] Order status updates (Preparing, Ready, Delivered)
  - [x] Promotional campaigns
  - [x] Loyalty points earned notification
  - [x] Password reset email
  - [x] Account verification email

#### FR-25: SMS Notifications
- **Description**: SMS alerts for critical updates
- **Actors**: System
- **Messages**:
  - [x] Order ready for pickup
  - [x] Delivery in progress
  - [x] Delivery completed
  - [x] Important promotions (opt-in)

#### FR-26: Push Notifications
- **Description**: In-app notifications
- **Actors**: System
- **Events**:
  - [x] Order status changes
  - [x] Promotions and deals
  - [x] New product announcements
  - [x] Loyalty points earned

#### FR-27: Notification Preferences
- **Description**: Customers control notification channels
- **Actors**: Customer
- **Settings**:
  - [x] Email preferences (opt-in/out for order, promo, loyalty)
  - [x] SMS preferences
  - [x] Push preferences
  - [x] Frequency controls (daily digest vs immediate)
  - [x] Unsubscribe from emails (one-click)

---

### 1.7 Business Analytics & Reporting

#### FR-28: Sales Dashboard
- **Description**: Key performance indicators for business
- **Actors**: Business Owner
- **KPIs**:
  - [x] Total Revenue (current period)
  - [x] Number of Orders
  - [x] Average Order Value
  - [x] New vs Repeat Customers
  - [x] Conversion Rate (if available)

#### FR-29: Revenue Trends
- **Description**: Visualize revenue over time
- **Actors**: Business Owner
- **Features**:
  - [x] Line/Bar chart visualization
  - [x] Time period selector: Daily, Weekly, Monthly, Yearly
  - [x] Comparison with previous period
  - [x] Growth percentage indicator
  - [x] Export as image/PDF

#### FR-30: Top Selling Products
- **Description**: Identify best-performing products
- **Actors**: Business Owner
- **Data**:
  - [x] Product name, quantity sold, revenue
  - [x] Ranking by revenue
  - [x] Growth compared to last period
  - [x] Drilldown to product detail

#### FR-31: Customer Analytics
- **Description**: Understand customer behavior
- **Actors**: Business Owner
- **Metrics**:
  - [x] Total customers (active, inactive)
  - [x] Customer acquisition trend
  - [x] Repeat purchase rate
  - [x] Customer lifetime value
  - [x] Segmentation by purchase frequency

#### FR-32: Report Generation & Export
- **Description**: Export analytics data
- **Actors**: Business Owner
- **Formats**:
  - [x] PDF report with charts
  - [x] CSV export for spreadsheet analysis
  - [x] Email report (scheduled)
  - [x] Custom date ranges

#### FR-33: Inventory Insights
- **Description**: Analytics on inventory
- **Actors**: Business Owner
- **Data**:
  - [x] Stock valuation
  - [x] Inventory turnover ratio
  - [x] Slow-moving products
  - [x] Fast-moving products
  - [x] Stockout incidents

---

### 1.8 Admin & Platform Management

#### FR-34: User Management
- **Description**: Admin controls all platform users
- **Actors**: Admin
- **Operations**:
  - [x] View all users by type (Customer, Business, Rider, Admin)
  - [x] Search users (email, name, ID)
  - [x] View user profile and activity
  - [x] Enable/disable user account
  - [x] Reset user password
  - [x] Assign roles and permissions
  - [x] View activity logs

#### FR-35: Business Verification
- **Description**: Verify and approve new businesses
- **Actors**: Admin
- **Process**:
  - [x] View pending verifications
  - [x] Review submitted documents (BAI, Mayor's Permit, ID)
  - [x] Approve or reject
  - [x] Send notification to business owner
  - [x] Request additional documents if needed

#### FR-36: Platform Analytics
- **Description**: High-level platform metrics
- **Actors**: Admin
- **Metrics**:
  - [x] Total users, businesses, orders, GMV
  - [x] Commission revenue
  - [x] Platform growth trends
  - [x] Top performing businesses
  - [x] System health (uptime, response time, errors)

#### FR-37: Dispute Resolution
- **Description**: Handle user disputes
- **Actors**: Admin
- **Features**:
  - [x] View reported disputes
  - [x] Review evidence from both parties
  - [x] Make resolution decision
  - [x] Process refunds if needed
  - [x] Send resolution notification

#### FR-38: Content Management
- **Description**: Manage promotional and static content
- **Actors**: Admin
- **CMS**:
  - [x] Featured products rotation
  - [x] Promotional banners
  - [x] Email templates
  - [x] FAQ/Help articles
  - [x] System announcements

---

### 1.9 Rider Management

#### FR-39: Delivery Assignment
- **Description**: Assign delivery orders to riders
- **Actors**: System/Admin
- **Logic**:
  - [x] Automatic assignment based on proximity/availability
  - [x] Manual assignment available
  - [x] Rider rating consideration
  - [x] Route optimization

#### FR-40: Delivery Tracking
- **Description**: Track deliveries in real-time
- **Actors**: Customer, Business Owner, Admin
- **Features**:
  - [x] Live rider location (GPS)
  - [x] ETA to destination
  - [x] Delivery status (Picked Up, In Transit, Arrived)
  - [x] Route visualization
  - [x] Contact rider option

#### FR-41: Proof of Delivery
- **Description**: Confirm delivery completion
- **Actors**: Rider
- **Methods**:
  - [x] Photo upload
  - [x] Customer signature (digital)
  - [x] OTP code
  - [x] Notes from rider

---

## 2. NON-FUNCTIONAL REQUIREMENTS

### 2.1 Performance

#### NFR-1: Response Time
- **Requirement**: API responses < 500ms (95th percentile)
- **Frontend**: Page load < 2 seconds (first contentful paint)
- **Target**: <100ms for simple queries

#### NFR-2: Scalability
- **Concurrent Users**: Support 10,000+ simultaneous users without degradation
- **Database**: Handle 1M+ customer records, 10M+ orders
- **API**: Horizontal scaling via load balancing
- **Storage**: 1TB+ capacity for images and backups

#### NFR-3: Throughput
- **Products**: Support 100,000+ SKUs
- **Orders**: Process 10,000+ orders/day
- **Transactions**: Process 1,000+ payments/day

---

### 2.2 Availability & Reliability

#### NFR-4: Uptime
- **Target**: 99.9% uptime (8.76 hours downtime/year)
- **Monitoring**: 24/7 monitoring and alerting
- **Incident Response**: <15 minute MTTR (mean time to recovery)

#### NFR-5: Disaster Recovery
- **RTO**: <1 hour (Recovery Time Objective)
- **RPO**: <15 minutes (Recovery Point Objective)
- **Backup**: Daily snapshots, 1-year retention
- **Failover**: Automated for critical components

#### NFR-6: Data Integrity
- **ACID Compliance**: Database transactions
- **Validation**: Input validation on all endpoints
- **Duplicate Prevention**: Idempotency keys for payments
- **Audit Trail**: All critical operations logged

---

### 2.3 Security

#### NFR-7: Authentication Security
- **JWT Signing**: HS256 or RS256
- **Token Expiration**: 1 hour (access), 7 days (refresh)
- **Password Storage**: bcrypt with cost factor 12
- **Session Management**: Secure cookie (httpOnly, secure, sameSite)

#### NFR-8: Authorization
- **RBAC**: Role-based access control enforced
- **Principle of Least Privilege**: Users get minimum required permissions
- **API Scoping**: Token scopes limit what API can do

#### NFR-9: Data Encryption
- **In Transit**: TLS 1.3 for all communications
- **At Rest**: AES-256 for sensitive data (passwords, payment info)
- **Key Management**: AWS KMS or similar
- **Database Encryption**: All PII fields encrypted

#### NFR-10: API Security
- **Rate Limiting**: 100 requests/min per IP
- **CORS**: Strict origin verification
- **CSRF**: CSRF tokens for state-changing operations
- **Input Validation**: Sanitize all inputs, prevent injection

#### NFR-11: PCI-DSS Compliance
- **Card Data**: NO card storage locally (tokenization via PayMongo)
- **Encryption**: All payment communication encrypted
- **Audit Logs**: Payment transactions logged (no sensitive data)
- **Compliance Scan**: Annual penetration testing

---

### 2.4 Usability

#### NFR-12: Accessibility
- **WCAG 2.1 AA Compliance**: Color contrast, keyboard navigation
- **Screen Reader Support**: Semantic HTML, ARIA labels
- **Mobile Responsive**: Works on all screen sizes (320px+)
- **Touch-Friendly**: Buttons 48x48px minimum

#### NFR-13: Mobile Responsiveness
- **Breakpoints**: Mobile (320px), Tablet (768px), Desktop (1024px)
- **Touch Interface**: No hover, swipe gestures
- **Performance**: Optimized for 3G connections
- **Testing**: Tested on iOS and Android devices

#### NFR-14: User Experience
- **Onboarding**: Quick signup (< 30 seconds)
- **Navigation**: Intuitive menu structure
- **Error Messages**: Clear, actionable error messages
- **Search**: Fast search with autocomplete

---

### 2.5 Compatibility

#### NFR-15: Browser Compatibility
- **Supported Browsers**: Chrome 120+, Firefox 121+, Safari 16+, Edge 120+
- **Desktop**: Windows, macOS, Linux
- **Mobile Browsers**: Chrome Android, Safari iOS

#### NFR-16: Mobile App Support
- **Platforms**: iOS 12+, Android 10+
- **Distribution**: Apple App Store, Google Play
- **Push Notifications**: FCM (Android), APNs (iOS)

#### NFR-17: Third-Party Integrations
- **Google OAuth**: Latest API version
- **PayMongo**: Latest SDK
- **Google Maps**: JavaScript API v3
- **Email Service**: Gmail/SMTP compatibility

---

### 2.6 Maintainability

#### NFR-18: Code Quality
- **Language**: TypeScript for frontend/API types
- **Linting**: ESLint, Prettier for formatting
- **Testing**: >80% code coverage for critical paths
- **Documentation**: API docs, code comments, architecture docs

#### NFR-19: Deployment
- **CI/CD**: Automated testing, builds, deployments
- **Versioning**: Semantic versioning
- **Blue-Green Deployment**: Zero-downtime deployments
- **Rollback**: Easy rollback to previous version

#### NFR-20: Monitoring
- **Logging**: Centralized logs (ELK Stack or similar)
- **APM**: Application Performance Monitoring
- **Alerting**: Automated alerts for critical issues
- **Dashboards**: Real-time operational dashboards

---

### 2.7 Data Management

#### NFR-21: Data Backup
- **Frequency**: Daily automated backups
- **Retention**: 1-year archive, 30-day full backups
- **Location**: Redundant geographic locations
- **Testing**: Monthly restore tests

#### NFR-22: Data Privacy
- **Consent**: User consent for data collection
- **Retention**: Delete data after 24 months inactivity (GDPR)
- **Anonymization**: Anonymized analytics for reporting
- **Opt-out**: Easy unsubscribe from communications

#### NFR-23: Data Residency
- **Primary**: Philippines-based data centers
- **Replication**: Local backup for disaster recovery
- **Compliance**: Comply with local data protection laws

---

### 2.8 Localization

#### NFR-24: Language Support
- **Primary**: English
- **Secondary**: Filipino (Tagalog)
- **Translation**: UI, emails, notifications

#### NFR-25: Localization
- **Currency**: PHP (₱) default
- **Payment Methods**: Local methods (GCash, Grab Pay)
- **Date Format**: MM/DD/YYYY or DD/MM/YYYY selection
- **Phone Format**: +63 Philippines format

---

## 3. CONSTRAINTS & ASSUMPTIONS

### 3.1 Technical Constraints
- Python 3.11+ required for backend
- PostgreSQL 12+ required
- Modern browsers required
- Stable internet connection recommended

### 3.2 Business Constraints
- Initial deployment: Metro Manila only
- Payment processor: PayMongo
- Email service: Gmail API
- Maps: Google Maps API

### 3.3 Assumptions
- Users have valid email addresses
- Phone numbers are in Ph format
- Customers have reliable internet
- Riders own smartphones with GPS

---

## 4. ACCEPTANCE CRITERIA

### 4.1 System Goes Live When
- [x] All critical features implemented
- [x] Security audit passed
- [x] Performance testing meets targets
- [x] UAT passed (90%+ test cases pass)
- [x] Documentation complete
- [x] Team trained and ready

### 4.2 Success Metrics (First 3 Months)
- [x] 50+ businesses onboarded
- [x] 5,000+ registered customers
- [x] 1,000+ orders placed
- [x] 99.5%+ uptime
- [x] <100ms average API response time
- [x] 90%+ customer satisfaction

---

**End of Requirements Document**

For implementation details, refer to: SYSTEM_DESIGN.md, SYSTEM_ANALYSIS.md, and DEPLOYMENT.md
