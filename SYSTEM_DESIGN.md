# Hi-Vet: System Design & Implementation
## Architecture, Database Schema, UI/UX Design, and Security

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Technology Stack

#### Frontend Layer
```
Technology Stack:
├── React 19.2        (UI Framework)
├── TypeScript 5.9    (Type Safety)
├── Tailwind CSS 4.2  (Styling)
├── Framer Motion     (Animations)
├── React Router v7   (Navigation)
├── Recharts          (Data Visualization)
├── Vite              (Build Tool)
└── Axios             (HTTP Client)

Browsers Supported: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
Responsive: Mobile (320px), Tablet (768px), Desktop (1024px+)
```

#### Backend Layer
```
Technology Stack:
├── Python 3.11+           (Language)
├── FastAPI                (Web Framework)
├── Uvicorn                (ASGI Server)
├── SQLAlchemy             (ORM)
├── Pydantic               (Data Validation)
├── JWT (python-jose)      (Authentication)
├── python-dotenv          (Configuration)
├── APScheduler            (Task Scheduling)
├── Celery                 (Async Tasks)
└── Gunicorn               (Production Server)

Server: Uvicorn/Gunicorn on port 8000
Rate Limiting: 100 requests/minute per IP
Timeout: 30 seconds
```

#### Database Layer
```
Primary: PostgreSQL 12+
├── User Management
├── Product Catalog
├── Order Processing
├── Analytics Data
└── Transaction Logs

Cache: Redis 6+
├── Session Storage
├── Rate Limiting
├── Real-time Notifications
└── Temporary Data

Backup: Automated daily snapshots
Replication: Enable master-slave for HA
Indexing: Strategic indexes on frequently queried columns
```

#### Mobile Layer
```
Technology Stack:
├── Flutter 3.38.8     (Framework)
├── Dart 3.10.7        (Language)
├── Riverpod           (State Management)
├── Google Maps        (Location Services)
└── Firebase           (Cloud Services)

Platforms: Android 10+, iOS 12+, Web
Package Size: ~150 MB (Android)
```

#### External Services
```
Authentication:
├── Google OAuth 2.0
└── JWT-based sessions

Payments:
├── PayMongo API (Primary)
└── GCash, Grab Pay (via PayMongo)

Email/SMS:
├── Gmail API
└── Twilio (SMS)

Maps & Location:
└── Google Maps JavaScript API

CDN:
└── AWS CloudFront (for image CDN)

Analytics:
└── Google Analytics 4
```

### 1.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ENVIRONMENT                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐         ┌─────────────┐                        │
│  │ CDN         │         │  Load       │                        │
│  │ (CloudFront)│         │ Balancer    │                        │
│  └──────┬──────┘         └─────┬───────┘                        │
│         │                      │                                 │
│         └──────────┬───────────┘                                │
│                    │                                             │
│         ┌──────────▼──────────┐                                 │
│         │ Web Servers (3+)    │ (Auto-scaling)                  │
│         │ nginx + gunicorn    │                                 │
│         └──────────┬──────────┘                                 │
│                    │                                             │
│  ┌─────────────────┼──────────────┬────────────────┐            │
│  │                 │              │                │            │
│  ▼                 ▼              ▼                ▼            │
│ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│ │PostgreSQL │ │  Redis   │ │  S3      │ │ Task Queue   │       │
│ │ Primary   │ │  Cache   │ │  Storage │ │ (Celery)     │       │
│ │           │ │          │ │          │ │              │       │
│ └───┬───────┘ └──────────┘ └──────────┘ └──────┬───────┘       │
│     │                                          │                │
│     ▼                                          ▼                │
│ ┌──────────────┐                        ┌──────────────┐        │
│ │ Replication  │                        │ Worker Nodes │        │
│ │ Standby      │                        │ (Email, SMS) │        │
│ └──────────────┘                        └──────────────┘        │
│                                                                   │
│  Monitoring: Prometheus + Grafana                               │
│  Logging: ELK Stack (Elasticsearch, Logstash, Kibana)          │
│  Backup: Automated daily snapshots (S3)                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. DATABASE DESIGN

### 2.1 Complete Database Schema

#### Users & Authentication

```sql
-- CUSTOMERS TABLE
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(128),
    middle_name VARCHAR(128),
    last_name VARCHAR(128),
    suffix VARCHAR(32),
    phone VARCHAR(20),
    picture_url TEXT,
    birthday DATE,
    gender VARCHAR(10),
    loyalty_points INT DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Notification preferences
    notif_order_updates BOOLEAN DEFAULT TRUE,
    notif_loyalty_alerts BOOLEAN DEFAULT TRUE,
    notif_promotions BOOLEAN DEFAULT TRUE,
    notif_gmail BOOLEAN DEFAULT TRUE,
    
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_loyalty_points (loyalty_points)
);

-- BUSINESS_PROFILES TABLE
CREATE TABLE business_profiles (
    id SERIAL PRIMARY KEY,
    clinic_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    owner_full_name VARCHAR(255) NOT NULL,
    owner_first_name VARCHAR(128),
    owner_middle_name VARCHAR(128),
    owner_last_name VARCHAR(128),
    owner_suffix VARCHAR(32),
    owner_home_address TEXT,
    owner_phone VARCHAR(20),
    owner_birthday DATE,
    owner_gender VARCHAR(10),
    owner_id_document_url TEXT,
    
    -- Clinic/Business Details
    clinic_house_number VARCHAR(50),
    clinic_block_number VARCHAR(50),
    clinic_street VARCHAR(255),
    clinic_subdivision VARCHAR(255),
    clinic_barangay VARCHAR(255),
    clinic_sitio VARCHAR(255),
    clinic_city VARCHAR(255),
    clinic_district VARCHAR(255),
    clinic_province VARCHAR(255),
    clinic_region VARCHAR(50),
    clinic_zip VARCHAR(10),
    clinic_lat DECIMAL(10, 8),
    clinic_lng DECIMAL(11, 8),
    
    -- License & Compliance
    bai_number VARCHAR(50) UNIQUE,
    bai_document_url TEXT,
    mayors_permit VARCHAR(50),
    mayors_permit_url TEXT,
    compliance_status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected
    
    -- Settings
    role VARCHAR(50) DEFAULT 'business',
    loyalty_points_per_peso DECIMAL(3, 2) DEFAULT 0.01,
    loyalty_points_per_reservation INT DEFAULT 10,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    INDEX idx_email (email),
    INDEX idx_clinic_city (clinic_city),
    INDEX idx_compliance_status (compliance_status)
);

-- RIDERS TABLE
CREATE TABLE riders (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50), -- motorcycle, tricycle, van
    plate_number VARCHAR(20),
    license_number VARCHAR(50),
    rating DECIMAL(2, 1) DEFAULT 5.0,
    total_deliveries INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
);

-- ADMIN_USERS TABLE
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50), -- admin, moderator, analyst
    permissions TEXT[], -- JSON array of permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
);
```

#### Products & Inventory

```sql
-- CATEGORIES TABLE
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES categories(id),
    icon_url TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_parent_id (parent_id)
);

-- PRODUCTS TABLE
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    business_id INT NOT NULL REFERENCES business_profiles(id),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2), -- for business analytics
    stock INT DEFAULT 0,
    category_id INT REFERENCES categories(id),
    type VARCHAR(50), -- Dog, Cat, General
    image_url TEXT,
    alt_images TEXT[], -- JSON array of image URLs
    tag VARCHAR(100),
    
    -- Ratings & Reviews
    stars DECIMAL(3, 2) DEFAULT 0,
    review_count INT DEFAULT 0,
    
    -- Loyalty
    loyalty_points INT DEFAULT 0,
    
    -- Variants & Options
    variants_json JSONB, -- {size: [S, M, L], color: [Red, Blue]}
    sizes_json JSONB, -- {"S": "Small", "M": "Medium"}
    weight DECIMAL(6, 2), -- in kg
    
    -- Status
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_business_id (business_id),
    INDEX idx_category_id (category_id),
    INDEX idx_name (name),
    INDEX idx_type (type),
    FULLTEXT idx_search (name, description)
);

-- INVENTORY_TRANSACTIONS TABLE (Audit Trail)
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    business_id INT NOT NULL REFERENCES business_profiles(id),
    transaction_type VARCHAR(50), -- Order, Adjustment, Return, Damage
    quantity_change INT NOT NULL,
    old_stock INT,
    new_stock INT,
    reference_id INT, -- order_id, return_id, etc
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES admin_users(id),
    
    INDEX idx_product_id (product_id),
    INDEX idx_business_id (business_id),
    INDEX idx_created_at (created_at)
);
```

#### Orders & Transactions

```sql
-- ORDERS TABLE
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE, -- HV-2026-001234
    customer_id INT NOT NULL REFERENCES customers(id),
    business_id INT NOT NULL REFERENCES business_profiles(id),
    branch_id INT REFERENCES business_branches(id),
    rider_id INT REFERENCES riders(id),
    
    -- Order Status
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Confirmed, Preparing, Ready, Cancelled, Completed
    
    -- Amounts
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    delivery_fee DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(50), -- Credit, Debit, E-wallet, Cash, Bank Transfer
    payment_status VARCHAR(50), -- Pending, Authorized, Captured, Failed, Refunded
    paymongo_session_id VARCHAR(255),
    paymongo_intent_id VARCHAR(255),
    paymongo_qr_data JSONB,
    reference_number VARCHAR(100),
    
    -- Fulfillment
    fulfillment_method VARCHAR(50), -- Pickup, Delivery
    
    -- Pickup Details
    pickup_location VARCHAR(255),
    pickup_date TIMESTAMP,
    pickup_notes TEXT,
    
    -- Delivery Details
    delivery_address TEXT NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    delivery_note TEXT,
    
    -- Timings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    assigned_to_rider_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Voucher
    voucher_id INT REFERENCES vouchers(id),
    voucher_code VARCHAR(100),
    
    -- Additional
    special_instructions TEXT,
    
    INDEX idx_customer_id (customer_id),
    INDEX idx_business_id (business_id),
    INDEX idx_rider_id (rider_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ORDER_ITEMS TABLE
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255), -- snapshot
    quantity INT NOT NULL,
    price_per_unit DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    loyalty_points_earned INT,
    
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- RESERVATIONS TABLE (Clinic Appointments)
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    business_id INT NOT NULL REFERENCES business_profiles(id),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Confirmed, Completed, Cancelled
    
    items_reserved JSONB, -- {product_id: quantity, ...}
    total_amount DECIMAL(10, 2),
    
    reserved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pickup_date TIMESTAMP NOT NULL,
    
    notes TEXT,
    
    INDEX idx_customer_id (customer_id),
    INDEX idx_business_id (business_id),
    INDEX idx_status (status)
);

-- PAYMENTS_AUDIT TABLE (PCI-DSS Compliance)
CREATE TABLE payments_audit (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    status VARCHAR(50),
    paymongo_reference VARCHAR(255),
    response_code VARCHAR(50),
    response_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Loyalty & Vouchers

```sql
-- LOYALTY_TRANSACTIONS TABLE
CREATE TABLE loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    order_id INT REFERENCES orders(id),
    transaction_type VARCHAR(50), -- Earned, Redeemed, Referred, Bonus
    points INT NOT NULL,
    previous_balance INT,
    new_balance INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_customer_id (customer_id),
    INDEX idx_created_at (created_at)
);

-- VOUCHERS TABLE
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    business_id INT NOT NULL REFERENCES business_profiles(id),
    code VARCHAR(100) UNIQUE NOT NULL,
    
    -- Discount Details
    discount_type VARCHAR(50), -- Percentage, Fixed, Points
    discount_value DECIMAL(10, 2),
    max_discount DECIMAL(10, 2),
    
    -- Conditions
    min_order_value DECIMAL(10, 2),
    applicable_categories TEXT[], -- JSON array, NULL = all
    
    -- Validity
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    max_uses INT,
    current_uses INT DEFAULT 0,
    uses_per_customer INT DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_business_id (business_id),
    INDEX idx_valid_until (valid_until)
);

-- VOUCHER_REDEMPTIONS TABLE (Usage Tracking)
CREATE TABLE voucher_redemptions (
    id SERIAL PRIMARY KEY,
    voucher_id INT NOT NULL REFERENCES vouchers(id),
    order_id INT NOT NULL REFERENCES orders(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    discount_given DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_voucher_id (voucher_id),
    INDEX idx_order_id (order_id)
);
```

#### Communications

```sql
-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(50), -- Customer, Business, Rider, Admin
    recipient_id INT NOT NULL,
    notification_type VARCHAR(50), -- OrderConfirmed, OrderReady, Promotion, Alert, System
    
    subject VARCHAR(255),
    message TEXT,
    action_url VARCHAR(500),
    
    -- Delivery Methods
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP,
    
    -- Status
    read_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_created_at (created_at)
);

-- EMAIL_TEMPLATES TABLE
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    slug VARCHAR(100) UNIQUE,
    subject VARCHAR(255),
    html_content TEXT,
    text_content TEXT,
    variables JSONB, -- {customer_name, order_id, total_amount}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Business Structure

```sql
-- BUSINESS_BRANCHES TABLE
CREATE TABLE business_branches (
    id SERIAL PRIMARY KEY,
    business_id INT NOT NULL REFERENCES business_profiles(id),
    name VARCHAR(255) NOT NULL,
    
    address TEXT NOT NULL,
    house_number VARCHAR(50),
    street VARCHAR(255),
    barangay VARCHAR(255),
    city VARCHAR(255),
    province VARCHAR(255),
    zip_code VARCHAR(10),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Operations
    is_main BOOLEAN DEFAULT FALSE,
    is_operational BOOLEAN DEFAULT TRUE,
    operating_hours JSONB, -- {Mon: {open: "08:00", close: "18:00"}}
    
    staff_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_business_id (business_id),
    INDEX idx_is_main (is_main)
);
```

#### Analytics & Reporting

```sql
-- DAILY_SALES_SUMMARY TABLE (Pre-aggregated for performance)
CREATE TABLE daily_sales_summary (
    id SERIAL PRIMARY KEY,
    business_id INT NOT NULL REFERENCES business_profiles(id),
    branch_id INT REFERENCES business_branches(id),
    date DATE NOT NULL,
    
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    total_items_sold INT DEFAULT 0,
    average_order_value DECIMAL(10, 2),
    
    unique_customers INT DEFAULT 0,
    new_customers INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_business_date (business_id, date)
);

-- PRODUCT_PERFORMANCE_SUMMARY TABLE
CREATE TABLE product_performance_summary (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    business_id INT NOT NULL REFERENCES business_profiles(id),
    
    monthly_sales INT DEFAULT 0,
    monthly_revenue DECIMAL(12, 2) DEFAULT 0,
    monthly_avg_rating DECIMAL(3, 2),
    
    ranking_current_month INT,
    ranking_last_month INT,
    
    trend VARCHAR(20), -- up, stable, down
    
    year_month VARCHAR(7), -- YYYY-MM
    
    UNIQUE KEY unique_product_month (product_id, year_month)
);

-- CUSTOMER_ANALYTICS TABLE
CREATE TABLE customer_analytics (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    
    lifetime_purchases INT DEFAULT 0,
    lifetime_spend DECIMAL(12, 2) DEFAULT 0,
    average_order_value DECIMAL(10, 2),
    
    total_loyalty_points_earned INT DEFAULT 0,
    total_loyalty_points_spent INT DEFAULT 0,
    current_loyalty_points INT DEFAULT 0,
    
    first_purchase_date TIMESTAMP,
    last_purchase_date TIMESTAMP,
    
    repeat_customer BOOLEAN DEFAULT FALSE,
    
    preferred_category VARCHAR(100),
    preferred_brand VARCHAR(100),
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2.2 Indexes for Performance

```sql
-- Search Performance
CREATE FULLTEXT INDEX idx_product_search ON products (name, description);
CREATE INDEX idx_product_category ON products (category_id);

-- Order Lookup
CREATE INDEX idx_order_status ON orders (status);
CREATE INDEX idx_order_customer ON orders (customer_id);
CREATE INDEX idx_order_business ON orders (business_id);
CREATE INDEX idx_order_date ON orders (created_at);

-- Analytics
CREATE INDEX idx_daily_sales_business_date ON daily_sales_summary (business_id, date);
CREATE INDEX idx_product_performance_month ON product_performance_summary (business_id, year_month);

-- Notifications
CREATE INDEX idx_notification_recipient ON notifications (recipient_id, recipient_type);
```

### 2.3 Backup & Recovery Strategy

```
Backup Strategy:
├── Daily snapshots at 2 AM (UTC+8)
├── Weekly full backups (every Sunday)
├── Monthly archives (stored for 1 year)
├── Point-in-time recovery (7-day window)
└── Georeplicated to AWS S3

Recovery Time Objective (RTO): 1 hour
Recovery Point Objective (RPO): 15 minutes

Testing:
├── Monthly restore test
├── Documented recovery procedures
└── Team training on recovery
```

---

## 3. USER INTERFACE (UI) DESIGN

### 3.1 Design Principles

**Design System**: Modern, Clean, Accessible

```
Color Palette:
├── Primary: #FB8500 (Orange - Action CTAs)
├── Secondary: #8D6E63 (Brown - Brand)
├── Accent: #FFB703 (Gold - Highlights)
├── Neutral: #F5F5F5, #333, #999
└── Status: Green (#12A148), Red (#E63946), Yellow (#FFB703)

Typography:
├── Heading: 'Poppins' Bold (24-32px)
├── Subheading: 'Poppins' SemiBold (16-20px)
├── Body: 'Inter' Regular (14-16px)
└── Caption: 'Inter' Regular (12-14px)

Spacing: 8px grid system (8, 16, 24, 32, 40, 48px)
Border Radius: 8px (components), 12px (cards), 24px (buttons)
Shadows: Elevation 1-4 (for depth)
```

### 3.2 Customer App Screens

```
Main Navigation:
├── Home (Browse, Featured) ─→ Hero + Product Grid + Categories
├── Search ─→ Full-text search + Filters + Results
├── Cart ─→ Items + Quantity + Checkout
├── Orders ─→ Status tracking + History
├── Loyalty ─→ Points + Vouchers + Rewards
└── Account ─→ Profile + Addresses + Settings

Key Screens:
1. Product Detail
   ├── Images (carousel)
   ├── Basic Info (name, price, rating)
   ├── Description
   ├── Reviews
   ├── Add to Cart
   └── Share options

2. Checkout
   ├── Order Summary
   ├── Delivery/Pickup Selection
   ├── Address Selection/Entry
   ├── Payment Method Selection
   ├── Review & Confirm
   └── Order Number Confirmation

3. Order Tracking
   ├── Status timeline (Confirmed → Preparing → Ready → Delivered)
   ├── Estimated time
   ├── Store info + contact
   ├── Live rider tracking (if delivery)
   └── Chat with business/rider
```

### 3.3 Business Dashboard Screens

```
Main Navigation:
├── Dashboard (KPIs, Recent Orders, Analytics)
├── Orders (Management, Fulfillment)
├── Catalog (Products, Inventory)
├── Analytics (Charts, Reports, Export)
├── Customers (List, Insights)
└── Settings (Profile, Branch, Staff)

Key Screens:
1. Analytics Dashboard
   ├── KPI Cards (Revenue, Orders, Customers, Growth %)
   ├── Revenue Trend Chart (Line/Bar)
   ├── Top Selling Products (Table/Card)
   ├── Customer Acquisition Funnel
   ├── Period Selector (Daily/Weekly/Monthly/Yearly)
   └── Export Options (PDF/CSV)

2. Order Management
   ├── Order List (Filters: Status, Date, Amount)
   ├── Order Detail (Items, Customer, Address, Payment)
   ├── Status Update Buttons (Accept, Reject, Mark Ready, Complete)
   ├── Customer Communication
   └── Print Invoice/Recipe

3. Inventory Management
   ├── Product List (Stock levels, Categories)
   ├── Low Stock Alert (Visual indicator)
   ├── Add/Edit Product Form
   ├── Bulk Import (CSV)
   └── Stock Movement History

4. Catalog Management
   ├── Category Hierarchy
   ├── Product CRUD
   ├── Batch Operations
   ├── SEO Settings
   └── Visibility Toggle
```

### 3.4 Admin Dashboard

```
Key Screens:
1. Platform Overview
   ├── Platform KPIs (GMV, Users, Orders, Grow %)
   ├── System Health (Uptime, Response Time, Errors)
   ├── Transaction Monitoring
   ├── Active Users Map
   └── Revenue Breakdown

2. User Management
   ├── User Directory (Filter by type)
   ├── User Detail (Profile, Activity, Actions)
   ├── Approval Queue (Businesses to verify)
   ├── Role Assignment
   └── Ban/Suspend Users

3. Content Management
   ├── Featured Products
   ├── Promotional Banners
   ├── Email Templates
   ├── System Announcements
   └── Static Pages

4. Reports
   ├── Financial Reports
   ├── Operational Metrics
   ├── Customer Analytics
   ├── Fraud Detection
   └── Custom Reports
```

---

## 4. DATA SECURITY & COMPLIANCE

### 4.1 Authentication & Authorization

```python
# JWT Token Strategy
{
    "sub": "customer_id/business_id",      # Subject (user ID)
    "type": "access",                      # Token type
    "role": "customer/business/rider/admin", # User role
    "exp": 1704067200,                     # Expiration (1 hour)
    "iat": 1704063600,                     # Issued at
    "jti": "unique_token_id"               # JWT ID (for revocation)
}

Refresh Token: 7-day expiration (stored in httpOnly cookie)
Access Token: 1-hour expiration (in memory or secure storage)
Token Revocation: Blacklist stored in Redis
```

### 4.2 Password Security

```
Requirements:
├── Minimum 8 characters
├── At least 1 uppercase letter
├── At least 1 lowercase letter
├── At least 1 number
├── At least 1 special character

Hashing:
├── Algorithm: bcrypt (cost factor: 12)
├── No plain text storage
└── Salt automatically included

Reset Flow:
├── Request reset email
├── Verify email token (15-minute expiration)
├── Set new password
└── Invalidate all sessions
```

### 4.3 API Security

```
Rate Limiting:
├── Authentication: 5 requests/minute
├── Public endpoints: 100 requests/minute
├── Premium users: 1000 requests/minute
└── DDoS protection: IP-based blocking

CORS Configuration:
├── Allowed origins: https://domain.com, mobile app URLs
├── Allowed methods: GET, POST, PUT, DELETE
├── Allowed headers: Content-Type, Authorization
└── Credentials: Include (for cookies)

Request Validation:
├── Input sanitization (SQL injection prevention)
├── XSS protection (content encoding)
├── CSRF tokens for state-changing operations
└── Request signing (for API clients) OR OAuth
```

### 4.4 Payment Security (PCI-DSS)

```
Card Data Handling:
├── NO Card data storage locally
├── PayMongo handles all PCI-DSS compliance
├── Tokenization for recurring payments
├── SSL/TLS for all payment endpoints
└── Logging of transaction (not card details)

Webhook Security:
├── Verify webhook signature
├── Timestamp validation (prevent replay attacks)
├── Idempotency keys for payment confirmations
└── Queue webhooks for processing
```

### 4.5 Data Privacy

```
GDPR/Personal Data:
├── Consent for data collection
├── Right to be forgotten (account deletion)
├── Data portability (export user data)
├── Privacy policy acceptance on registration
├── Clear opt-in/opt-out for communications
└── Data retention policy (24 months inactive)

Data Classification:
├── Public: Product descriptions
├── Confidential: Email addresses, phone numbers
├── Restricted: Payment info, identity documents
└── Public: Anonymized analytics

Encryption:
├── At Rest: AES-256 for sensitive data
├── In Transit: TLS 1.3 for all communications
├── Backup: Encrypted snapshots
└── Key Management: AWS KMS or similar
```

### 4.6 Audit & Compliance

```
Audit Logging:
├── All authentication attempts (success/failure)
├── Data access logs (user view sensitive data)
├── Configuration changes (admin actions)
├── Payment transactions
├── API errors and exceptions
└── Retention: 2 years

Compliance Standards:
├── PCI-DSS (Payment Card Industry)
├── GDPR (if EU users)
├── Data Residency (Philippines: local servers)
└── Regular security audits (quarterly)

Incident Response:
├── Detection: Automated alerts for anomalies
├── Response: Incident handler activation
├── Containment: Service isolation if needed
├── Post-mortem: Root cause analysis
└── Communication: Affected users notification (within 72 hours)
```

---

## 5. ERROR HANDLING & VALIDATION

### 5.1 HTTP Status Codes

```
Success:
├── 200 OK - Request successful
├── 201 Created - Resource created
├── 204 No Content - Success, no response body

Client Errors:
├── 400 Bad Request - Invalid input
├── 401 Unauthorized - Missing/invalid authentication
├── 403 Forbidden - Insufficient permissions
├── 404 Not Found - Resource doesn't exist
├── 409 Conflict - Duplicate/conflict (email already exists)
├── 422 Unprocessable Entity - Validation failed

Server Errors:
├── 500 Internal Server Error - Unexpected error
├── 503 Service Unavailable - Maintenance/overload
└── 504 Gateway Timeout - Request timeout
```

### 5.2 Error Response Format

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            {
                "field": "email",
                "message": "Invalid email format"
            },
            {
                "field": "password",
                "message": "Password too weak"
            }
        ]
    },
    "timestamp": "2026-04-13T10:30:00Z",
    "requestId": "req_12345"
}
```

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Frontend Optimization

```
Code Splitting:
├── Route-based splitting
├── Component lazy loading
├── Vendor bundle optimization
└── Target size: < 300 KB per route

Image Optimization:
├── WebP format with fallback
├── Responsive images (srcset)
├── Lazy loading for below-fold images
├── CDN delivery with compression

Caching Strategy:
├── Service Worker for offline support
├── Cache-first for static assets
├── Network-first for API calls
└── Cache validation with ETags
```

### 6.2 Backend Optimization

```
Database:
├── Query optimization (use EXPLAIN)
├── Index on frequently queried columns
├── Denormalization for analytics tables
├── Pagination (max 50 items/page)
├── Connection pooling (10-20 connections)

API Optimization:
├── Pagination for list endpoints
├── Response compression (gzip)
├── HTTP caching headers
├── GraphQL batching (if applicable)
├── N+1 query prevention (JOINs, eager loading)

Analytics:
├── Pre-aggregated daily summaries
├── Materialized views for complex reports
├── Scheduled jobs for heavy computations
└── Time-series data partitioning
```

---

**Next Document**: Deployment & Operations Guide
