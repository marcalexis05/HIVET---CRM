# Hi-Vet: System Analysis & Design
## Data Flow Diagrams, Entity-Relationship Models, and Use Cases

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     HI-VET ECOSYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Customer    │  │   Business   │  │    Admin     │           │
│  │   App (Web)  │  │  Portal      │  │  Dashboard   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                      │
│         ┌──────────────────▼──────────────────┐                  │
│         │    FastAPI Backend Server           │                  │
│         │  (REST API + WebSockets)            │                  │
│         └──────────────────┬──────────────────┘                  │
│                            │                                      │
│       ┌────────────────────┼─────────────────────┐               │
│       │                    │                     │               │
│  ┌────▼─────┐    ┌────────▼──────┐  ┌──────────▼──┐            │
│  │ PostgreSQL│    │  File Storage │  │ Cache/Redis │            │
│  │ Database  │    │  (Image CDN)  │  │   Layer     │            │
│  └───────────┘    └───────────────┘  └─────────────┘            │
│                                                                   │
│       ┌──────────────────────────┐                               │
│       │  External Integrations   │                               │
│       ├──────────────────────────┤                               │
│       │ • Google Auth (OAuth)    │                               │
│       │ • PayMongo (Payments)    │                               │
│       │ • Gmail (Notifications)  │                               │
│       │ • Google Maps (Location) │                               │
│       └──────────────────────────┘                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Mobile App (Flutter) 
    │
    └──(Same API Connection)──→ FastAPI Backend
```

---

## 2. DATA FLOW DIAGRAMS (DFDs)

### 2.1 Level 0 (Context Diagram)

```
         ┌─────────────┐
         │   Google    │
         │  OAuth/Maps │
         └──────┬──────┘
                │
     ┌──────────▼──────────┐
     │    HI-VET SYSTEM    │
     └──────────┬──────────┘
     ┌────────────┼─────────────┐
     │            │             │
  ┌──▼──┐  ┌─────▼────┐  ┌────▼──┐
  │Cust │  │ Business │  │ Admin  │
  │omer │  │   Owner  │  │  User  │
  └─────┘  └──────────┘  └────────┘

     │            │             │
     └────────────┼─────────────┘
                │
         ┌──────▼───────┐
         │   PayMongo   │
         │  (Payments)  │
         └──────────────┘
         
         ┌──────────────┐
         │    Gmail     │
         │ (Emails)     │
         └──────────────┘
```

### 2.2 Level 1 DFD - Main Processes

```
Process Flow:

1. CUSTOMER BROWSING
   Customer → [Search/Filter] → Category Filter (Flow: 1.1)
            ↓
   Database Query (Flow: 1.2)
            ↓
   Display Products
   
2. ORDER PLACEMENT
   Customer → [Add to Cart] → Cart Management (Flow: 2.1)
            ↓
   [Checkout] → Payment Processing (Flow: 2.2)
            ↓
   [Confirm Order] → Order Creation (Flow: 2.3)
            ↓
   Email Notification (Flow: 2.4)
   
3. BUSINESS ANALYTICS
   Owner → [Request Dashboard] → Analytics Engine (Flow: 3.1)
        ↓
   Database Aggregation (Flow: 3.2)
        ↓
   Display KPIs & Trends
```

### 2.3 Level 2 - Order Processing Flow

```
Customer                    System                      Backend
   │                          │                            │
   ├─ Add Items to Cart ──────→│                            │
   │                          ├─ Validate Stock ──────────→│
   │                          │←─ Stock OK ────────────────┤
   │                          │ (Cache cart)               │
   │                          │                            │
   ├─ Proceed to Checkout ───→│                            │
   │                          ├─ Calculate Total(with VAT,tax)
   │                          │ ├─ Apply Discount/Voucher  │
   │                          │ └─ Calculate Final Amount   │
   │                          │                            │
   ├─ Process Payment ────────→│                            │
   │                          ├─ Send to PayMongo ────────→│
   │                          │←─ Payment Authorized ──────┤
   │                          │                            │
   │←─ Order Confirmed ───────┤                            │
   │                          ├─ Create Order Record ─────→│
   │                          │                            │
   │                          ├─ Send Email Confirmation ──→
   │                          │   (Gmail)                  │
   │                          │                            │
   │←─ Receive Confirmation ──┤                            │
   │                          ├─ Notify Business Owner ───→│
   │                          │                            │
   (Order visible in          (Stock decremented          (Rider assigned
    My Orders)                 in inventory)               for delivery)
```

### 2.4 Inventory Management Flow

```
Business Owner              System                      Database
      │                       │                            │
      ├─ Update Stock ───────→│                            │
      │                       ├─ Validate Input ──────────→│
      │                       ├─ Check Low Stock ─────────→│
      │                       │←─ Check Result ────────────┤
      │                       │                            │
      │                       ├─ If Stock < Threshold:     │
      │                       │   ├─ Alert Business Owner  │
      │                       │   └─ Suggest Reorder       │
      │                       │                            │
      │←─ Confirmation ───────┤                            │
      │                       ├─ Update Database ────────→│
      │                       │                            │
      │←─ Auto Email Alert ───┤                            │
      │   (if low stock)      │                            │
```

---

## 3. ENTITY-RELATIONSHIP DIAGRAM (ERD)

### 3.1 Core Entities

```
CUSTOMERS
├─ id (PK)
├─ email (UNIQUE)
├─ name
├─ phone
├─ google_id
├─ loyalty_points
├─ birthday
├─ gender
├─ referral_code
├─ created_at
└─ is_deleted

BUSINESS_PROFILES
├─ id (PK)
├─ clinic_name
├─ owner_name
├─ email
├─ phone
├─ google_id
├─ clinic_address
├─ clinic_lat/lng
├─ bai_number
├─ mayors_permit
├─ compliance_status
├─ created_at
└─ is_deleted

PRODUCTS
├─ id (PK)
├─ business_id (FK → BUSINESS_PROFILES)
├─ name
├─ description
├─ price
├─ sku
├─ category
├─ type (Dog/Cat/General)
├─ image_url
├─ stock
├─ loyalty_points (reward)
├─ stars (rating)
└─ is_archived

ORDERS
├─ id (PK)
├─ customer_id (FK → CUSTOMERS)
├─ business_id (FK → BUSINESS_PROFILES)
├─ status (Pending/Confirmed/Completed/Cancelled)
├─ total_amount
├─ payment_method
├─ fulfillment_method (Pickup/Delivery)
├─ created_at
├─ pickup_location
├─ delivery_address
├─ delivery_lat/lng
├─ rider_id (FK → RIDERS)
└─ paymongo_id

ORDER_ITEMS
├─ id (PK)
├─ order_id (FK → ORDERS)
├─ product_id (FK → PRODUCTS)
├─ quantity
├─ price_at_purchase
└─ loyalty_earned

RESERVATIONS
├─ id (PK)
├─ customer_id (FK → CUSTOMERS)
├─ business_id (FK → BUSINESS_PROFILES)
├─ status (Pending/Confirmed/Completed)
├─ items_reserved (JSON)
├─ total_amount
├─ reserved_date
├─ pickup_date
├─ notes
└─ created_at

RIDERS
├─ id (PK)
├─ email
├─ name
├─ phone
├─ vehicle_type
├─ plate_number
├─ is_active
├─ rating
├─ total_deliveries
└─ created_at

LOYALTY_TRANSACTIONS
├─ id (PK)
├─ customer_id (FK → CUSTOMERS)
├─ order_id (FK → ORDERS)
├─ points_earned
├─ points_redeemed
├─ transaction_type
├─ created_at
└─ notes

VOUCHERS
├─ id (PK)
├─ business_id (FK → BUSINESS_PROFILES)
├─ code (UNIQUE)
├─ discount_type (Percentage/Fixed)
├─ discount_value
├─ min_order_value
├─ max_uses
├─ valid_from
├─ valid_until
└─ is_active

NOTIFICATIONS
├─ id (PK)
├─ customer_id (FK → CUSTOMERS)
├─ type (Order/Promotion/Alert)
├─ title
├─ message
├─ email_sent
├─ sms_sent
├─ read_at
└─ created_at

BUSINESS_BRANCHES
├─ id (PK)
├─ business_id (FK → BUSINESS_PROFILES)
├─ name
├─ address
├─ lat/lng
├─ phone
├─ is_main
└─ created_at

CATEGORIES
├─ id (PK)
├─ name
├─ parent_id (FK → CATEGORIES)
├─ icon_url
├─ description
└─ display_order
```

### 3.2 Relationships Summary

| Entity 1 | Relationship | Entity 2 | Cardinality |
|----------|-------------|----------|------------|
| CUSTOMERS | places | ORDERS | 1:N |
| PRODUCTS | included_in | ORDERS | N:M (via ORDER_ITEMS) |
| BUSINESS | owns | PRODUCTS | 1:N |
| CUSTOMERS | earns | LOYALTY | 1:N |
| CATEGORIES | contains | PRODUCTS | 1:N |
| RIDERS | fulfills | ORDERS | 1:N |
| BUSINESS | offers | VOUCHERS | 1:N |
| BUSINESS | operates | BRANCHES | 1:N |

---

## 4. USE CASES

### 4.1 Customer Use Cases

#### UC-1: Browse Products
**Actors**: Customer  
**Preconditions**: Customer logged in  
**Main Flow**:
1. Customer navigates to catalog
2. System displays product categories
3. Customer selects category (e.g., "Dog Food")
4. System displays filtered products
5. Customer applies additional filters (price, rating)
6. System displays filtered results
7. Customer views product details

**Alternative**: Use search function instead of categories

---

#### UC-2: Place Order
**Actors**: Customer  
**Preconditions**: Customer authenticated, products available  
**Main Flow**:
1. Customer adds products to cart
2. System updates cart UI
3. Customer reviews cart
4. Customer proceeds to checkout
5. System calculates total (including taxes, discounts)
6. Customer selects delivery method
7. Customer enters delivery/pickup details
8. Customer selects payment method
9. System processes payment via PayMongo
10. Payment authorized
11. System creates order record
12. System sends email confirmation
13. System notifies business owner
14. Order confirmation displayed to customer

**Exception Flows**:
- Payment fails → Display error, allow retry
- Product out of stock → Notify customer, remove from cart
- Voucher invalid → Display error, clear voucher

---

#### UC-3: Track Order Status
**Actors**: Customer  
**Preconditions**: Customer has active orders  
**Main Flow**:
1. Customer opens "My Orders"
2. System displays order list with status
3. Customer selects order
4. System displays detailed order information
5. System shows real-time status updates
6. System shows estimated delivery/pickup time
7. For delivery: Shows rider info and live tracking

**Extensions**:
- Receive email notification on status change
- Chat with rider or business owner

---

#### UC-4: Earn & Redeem Loyalty Points
**Actors**: Customer  
**Preconditions**: Customer has completed purchases  
**Main Flow**:
1. Customer completes order
2. System calculates loyalty points earned (points = amount × loyalty_rate)
3. Points added to customer account
4. Customer navigates to Loyalty Dashboard
5. System displays available points
6. System displays available vouchers to redeem
7. Customer selects voucher to redeem
8. System deducts points
9. System applies voucher to next order
10. Confirmation displayed

---

#### UC-5: Manage Account & Addresses
**Actors**: Customer  
**Preconditions**: Customer authenticated  
**Main Flow**:
1. Customer opens Account Settings
2. System displays profile information
3. Customer can update: Name, birthday, gender, phone
4. Customer can manage addresses
5. Add new address: Input details, map selection
6. Edit/Delete address
7. Set default address for orders
8. Changes saved

---

### 4.2 Business Owner Use Cases

#### UC-6: Manage Product Catalog
**Actors**: Business Owner  
**Preconditions**: Business profile complete  
**Main Flow**:
1. Owner navigates to Catalog Management
2. System displays product list
3. Owner can: Add Product, Edit, Delete, Archive
4. **Add Product**:
   - Input name, description, price
   - Upload image(s)
   - Select category and type (Dog/Cat)
   - Set initial stock
   - Define loyalty points reward
   - Save product
5. System validates and saves product
6. Product appears in customer catalog

**Alternative Flow - Bulk Update**:
- Owner uploads CSV with product data
- System validates and imports

---

#### UC-7: Monitor Inventory & Low Stock Alerts
**Actors**: Business Owner  
**Preconditions**: Products in system  
**Main Flow**:
1. Owner opens Inventory Dashboard
2. System displays all products with stock levels
3. System highlights low-stock items in red
4. Owner can set minimum stock threshold per product
5. When stock < threshold:
   - System sends email alert
   - System suggests automatic reorder
   - System displays alert in dashboard
6. Owner can manually restock entry

**Historical View**:
- View stock movement history
- Analyze trends (seasonality, popularity)

---

#### UC-8: View Business Analytics
**Actors**: Business Owner  
**Preconditions**: Orders exist in system  
**Main Flow**:
1. Owner opens Analytics Dashboard
2. System displays KPIs:
   - Total revenue (current period)
   - Number of orders
   - Average order value
   - Top 5 selling products
   - Revenue trend chart
3. Owner can select time period (Daily/Weekly/Monthly/Yearly)
4. System updates all visualizations
5. Owner can view product-specific analytics
6. Owner can filter by branch (if multi-branch)
7. Owner can export report as PDF/CSV

**Advanced Analytics**:
- Customer acquisition funnel
- Customer lifetime value
- Repeat purchase rate
- Product performance matrix

---

#### UC-9: Manage Orders & Reservations
**Actors**: Business Owner  
**Preconditions**: Customer placed order  
**Main Flow**:
1. Owner opens Order Management
2. System displays incoming orders (default: unfulfilled)
3. Owner reviews order details
4. Owner can: Accept, Reject, or Request Modification
5. **Accept Order**:
   - Mark as "Preparing"
   - System notifies customer
   - Owner prepares items
   - Owner marks as "Ready for Pickup/Delivery"
   - System sends notification to customer

**Rejection Flow**:
- If product unavailable, owner can reject
- System notifies customer with option to reorder

**Pickup Confirmation**:
- Customer arrives for pickup
- Owner verifies order
- Marks as "Delivered"
- System emails invoice/receipt

---

#### UC-10: Create Promotional Campaigns
**Actors**: Business Owner  
**Preconditions**: Products available  
**Main Flow**:
1. Owner navigates to Promotions
2. Owner creates new voucher:
   - Discount type (% or fixed amount)
   - Discount value
   - Min order value (optional)
   - Valid date range
   - Max uses (optional)
3. System generates unique code
4. Owner can share code or auto-apply to customers
5. System tracks usage
6. Owner can view redemption analytics

---

### 4.3 Admin/System Manager Use Cases

#### UC-11: Monitor Platform Health
**Actors**: Admin  
**Preconditions**: Admin role  
**Main Flow**:
1. Admin opens Admin Dashboard
2. System displays:
   - Platform status (up/down/degraded)
   - Response time metrics
   - Error rate
   - Active users
   - Database status
3. Admin can drill down into issues
4. Alerts sent for critical issues

---

#### UC-12: User Management
**Actors**: Admin  
**Preconditions**: Admin role  
**Main Flow**:
1. Admin opens User Management
2. Admin can:
   - View all users by type (Customer/Business/Rider/Admin)
   - Search by email or ID
   - View user activity history
   - Enable/Disable user account
   - Reset password
   - Verify business documentation
   - Assign roles

---

#### UC-13: View Platform Analytics
**Actors**: Admin  
**Preconditions**: Data available  
**Main Flow**:
1. Admin opens Platform Analytics
2. System displays:
   - Total users, businesses, orders
   - Platform GMV (Gross Merchandise Value)
   - Commission revenue
   - Customer acquisition trends
   - Top performing businesses
   - System performance metrics
3. Admin can export detailed reports

---

### 4.4 Rider Use Cases

#### UC-14: View Assigned Deliveries
**Actors**: Rider  
**Preconditions**: Deliveries exist for rider  
**Main Flow**:
1. Rider opens app
2. System displays list of assigned deliveries
3. Rider selects delivery
4. System shows: Customer address, pickup address, contact info, items
5. Rider taps "Start Delivery"
6. App shows route and GPS navigation
7. Rider follows navigation
8. Rider arrives at location
9. Rider confirms delivery: takes photo, gets signature, or PIN
10. System marks as "Delivered"
11. Rider continues to next delivery

---

#### UC-15: Track Earnings
**Actors**: Rider  
**Preconditions**: Completed deliveries  
**Main Flow**:
1. Rider opens Earnings section
2. System displays:
   - Today's earnings
   - This week's earnings
   - This month's earnings
   - Total deliveries
3. Rider can view detailed delivery list with earnings per delivery
4. Rider can view payment history (when paid)

---

## 5. SYSTEM INTERACTION SEQUENCES

### 5.1 Complete Order-to-Delivery Sequence

```
Customer          App              Backend           Business         Rider
   │                │                  │                 │              │
   ├─ Browse ──────→│                  │                 │              │
   │                ├─ Request ───────→│                 │              │
   │                │←─ Products ──────┤                 │              │
   │                │                  │                 │              │
   ├─ Add to Cart ─→│                  │                 │              │
   │                ├─ Update ────────→│                 │              │
   │                │←─ Confirm ───────┤                 │              │
   │                │                  │                 │              │
   ├─ Checkout ────→│                  │                 │              │
   │                ├─ Payment ───────→│ (PayMongo)      │              │
   │                │←─ Confirm ───────┤                 │              │
   │                │                  ├─ Create Order ─→│              │
   │                │                  ├─ Alert ────────→│              │
   │                │←─ Order OK ──────┤                 │              │
   │                ├─ Email ─────────────────────────────➜            │
   │                │                  │                 │              │
   │←─ Confirmation─┤                  │                 │              │
   │ (Email)        │                  │                 │              │
   │                │                  │  ┌─ Review ────┐│              │
   │                │                  │  │ Prepare     │              │
   │                │                  │  └─ Mark Ready ┤              │
   │                │                  │  Notify ──────→│              │
   │                │←─ Status Update ─┤                 │              │
   │←─ Ready Email ─┤                  │                 │              │
   │                │                  │  Assign ──────────────────────→│
   │                │                  │                 │     Accept   │
   │ (Goes to       │                  │                 │     Navigate │
   │  pickup)       │                  │                 │              │
   │                │                  │                 │   Deliver    │
   │  Confirms      │                  │                 │   Complete   │
   │  Payment       │                  │                 │              │
   │  At Store      │                  │←─ Delivery Done─┤              │
   │                │←─ Order Complete─┤                 │              │
   │                ├─ Email ─────────────────────────────➜            │
   │←─ Receipt ─────┤                  │                 │              │
   │                │                  │                 │              │
```

---

## 6. DATA VALIDATION RULES

### 6.1 Customer Registration
- Email must be valid and unique
- Phone number must be 11 digits (PH format)
- Birthday must be valid past date
- Password must be 8+ chars with mixed case and numbers

### 6.2 Product Entry
- Name must be non-empty and < 200 chars
- Price must be > 0
- Stock must be ≥ 0
- Image must be PNG/JPG < 5MB

### 6.3 Order Processing
- Order total must match cart sum + VAT
- Delivery address required if delivery method selected
- Payment must be authorized before order creation
- Stock must be available at order time

### 6.4 Loyalty Points
- Points earned = (order_total - vouchers) × loyalty_rate
- Points cannot go negative
- Redeemed points deducted immediately

---

## 7. ERROR HANDLING STRATEGIES

| Error Type | Handling |
|-----------|----------|
| Payment Failed | Notify user, allow retry, save cart |
| Out of Stock | Remove item from cart, notify |
| Network Error | Queue order, retry automatically |
| Invalid Input | Display validation message, highlight field |
| Server Error | Display generic message, log error, retry |
| Duplicate Order | Detect within 60 seconds, prevent double-charging |

---

**Next Document**: System Design & Implementation Details
