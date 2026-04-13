# Hi-Vet: E-Commerce Web Application for Household Pets Supplies
## Project Overview & System Analysis

---

## 1. PROJECT OVERVIEW

### 1.1 Project Title
**Hi-Vet: Proposed Implementation of an E-Commerce Web Application for Household Pets Supplies**

### 1.2 Team Members
- **Evangelista, Marc Alexis N.**
- **Garcia, Marc Justine M.**
- **Lamsen, Val Javez M.**
- **Tabios, Gene G.**

**Course**: BSIS3-A  
**Subject**: IS 109 – Customer Relationship Management  
**Submitted to**: Prof. Benjamin Dave Z. Cruz

---

## 2. PROBLEM STATEMENT

Pet owners and local pet supply businesses face operational challenges:

### Current Issues
- **Fragmented Operations**: Pet supply shops operate without centralized digital management
- **Inventory Management**: Manual tracking leads to stockouts and overstocking
- **Customer Engagement**: Limited tools for customer loyalty and communication
- **Order Processing**: Inefficient order handling and pickup coordination
- **Data Insight**: Lack of business analytics for informed decision-making

### Market Gap
While food delivery and general e-commerce platforms exist, specialized pet supply platforms with "Click and Collect" convenience and local business support are rare, especially in the Philippine market.

---

## 3. PROPOSED SOLUTION

### 3.1 System Description
The **Hi-Vet system** is a specialized "Click and Collect" e-commerce platform designed to digitalize and streamline retail operations for pet supplies. It bridges the gap between online browsing and physical storefront efficiency through:

- **Integrated order reservations**: Customers reserve items online, collect in-store
- **Real-time inventory management**: Automatic stock tracking and alerts
- **Loyalty program**: Reward system to encourage repeat purchases
- **Business analytics**: Dashboard for owners to make data-driven decisions
- **Automated communication**: Email and SMS notifications

### 3.2 System Stakeholders

| Stakeholder | Role | Primary Goals |
|-------------|------|---------------|
| **Pet Owners** | Customers | Browse products, place orders, track loyalty points |
| **Shop Owners** | Businesses | Manage inventory, track sales, serve customers efficiently |
| **Delivery Riders** | Logistics | Manage delivery routes and earn commissions |
| **Admin/Platform Manager** | System Governance | Monitor platform health, analytics, security |
| **System Administrator** | Technical Support | Maintain infrastructure, manage users, resolve issues |

---

## 4. GENERAL OBJECTIVE

**To design and implement an affordable, user-friendly pet supply web application that helps pet owners and local businesses by streamlining order reservations and inventory management.**

---

## 5. SPECIFIC OBJECTIVES

### 5.1 Secure Access
**Objective**: To create and customize a product catalog for dog and cat supplies featuring secure Google authentication for verified access.

**Deliverables**:
- ✅ Google OAuth 2.0 integration
- ✅ JWT-based session management
- ✅ Role-based access control (Customer, Business, Rider, Admin)
- ✅ Product catalog with dog and cat categories
- ✅ Store-specific pricing configurations

### 5.2 Enhanced Navigation
**Objective**: To integrate filtering by category (food, accessories, vitamins) and advanced search functions to improve user experience.

**Deliverables**:
- ✅ Multi-level category hierarchy
- ✅ Full-text search with relevance ranking
- ✅ Filter by: Category, Price range, Ratings, Availability
- ✅ Sort by: Popularity, Price, Newest, Top-rated
- ✅ Advanced filtering UI with faceted search

### 5.3 Data Analytics
**Objective**: To develop a Business Intelligence (BI) dashboard that displays statistics on top-selling products and revenue trends for informed decision-making.

**Deliverables**:
- ✅ Business dashboard with KPIs (revenue, orders, items sold)
- ✅ Top selling products visualization
- ✅ Revenue trends (daily, monthly, yearly)
- ✅ Customer demographics and behavior analytics
- ✅ Inventory insights and low-stock alerts
- ✅ Export reports functionality

### 5.4 Communication
**Objective**: To implement a notification system via Gmail for automated order confirmations and pickup alerts.

**Deliverables**:
- ✅ Email notifications for order confirmations
- ✅ Pickup readiness alerts
- ✅ Payment confirmation emails
- ✅ Personalized promotional emails
- ✅ Admin notifications for order alerts
- ✅ SMS integration capable

---

## 6. PROJECT SCOPE

### 6.1 Functional Requirements by User Type

#### **Customer Side - Pet Owners**

1. **User Account Management**
   - Google authentication & social login
   - Profile management with address book
   - Birthday tracking for personalization
   - Loyalty program enrollment

2. **Product Browsing**
   - Categorized catalog (Dogs, Cats, General)
   - Subcategories: Food, Accessories, Vitamins, Toys
   - Product details with images, descriptions, price
   - Stock availability indication
   - Customer ratings and reviews

3. **Shopping & Order System**
   - Shopping cart with quantity management
   - Wishlist functionality
   - Order placement and confirmation
   - Multiple payment methods (Credit/Debit, E-wallets, Cash)
   - Order tracking

4. **Pickup/Delivery System**
   - Choose pickup location or delivery
   - Delivery address management
   - Estimated pickup/delivery time
   - Status tracking

5. **Loyalty Program**
   - Earn points on purchases
   - View loyalty balance and history
   - Redeem vouchers and discounts
   - Referral rewards

6. **Notifications**
   - Email notifications for order updates
   - SMS alerts for pickup readiness
   - Push notifications for promotions
   - Gmail integration for confirmations

#### **Business Side - Shop/Clinic Owners**

1. **Catalog Management**
   - Add/edit/delete products
   - Bulk inventory management
   - Category organization
   - Product variants (sizes, colors)
   - Store-specific pricing
   - Image uploads and optimization

2. **Inventory Management**
   - Real-time stock tracking
   - Low stock alerts
   - Automated reorder suggestions
   - Stock history and trends

3. **Order Management**
   - View incoming orders
   - Order accept/reject
   - Prepare for pickup/delivery
   - Mark as fulfilled
   - Order history and analytics

4. **Business Analytics Dashboard**
   - Sales KPIs (revenue, orders, average order value)
   - Top-selling products
   - Customer acquisition and retention metrics
   - Revenue trends (daily, weekly, monthly)
   - Product performance analysis
   - Inventory valuation

5. **Branch/Location Management**
   - Multiple branch support
   - Separate inventory per branch
   - Branch-specific pricing
   - Staff management

6. **Customer Communication**
   - Send promotional campaigns
   - Direct messaging capability
   - Email templates for orders
   - SMS alerts

#### **Rider Side - Delivery Staff**

1. **Delivery Management**
   - View assigned deliveries
   - Route optimization
   - Real-time location tracking
   - Proof of delivery (photo/signature)

2. **Earnings Management**
   - Track daily/monthly earnings
   - Commission structure visibility
   - Performance metrics
   - Payment history

3. **Customer Interaction**
   - Customer contact information
   - Delivery notes
   - Customer communication

#### **Admin Side - Platform Management**

1. **User Management**
   - Activate/deactivate users
   - Role assignment
   - Permission management
   - User activity logs

2. **Platform Analytics**
   - Platform-wide KPIs
   - User growth metrics
   - System health monitoring
   - Performance analytics

3. **Content Management**
   - Promotional banners
   - Featured products
   - System announcements

4. **System Governance**
   - Transaction monitoring
   - Security logs
   - Dispute resolution
   - Compliance tracking

5. **Report Generation**
   - Export platform reports
   - Financial reconciliation
   - User behavior analysis

### 6.2 Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| **Performance** | Page load < 2 seconds; API response < 500ms |
| **Scalability** | Support 10,000+ concurrent users |
| **Security** | SSL/TLS encryption, PCI-DSS for payments, GDPR compliance |
| **Availability** | 99.9% uptime SLA |
| **Usability** | Mobile-responsive, intuitive UI, accessibility compliance |
| **Reliability** | Automated backups, disaster recovery plan |
| **Compatibility** | Chrome, Firefox, Safari, Edge; iOS and Android |
| **Maintainability** | Clean code, API documentation, automated tests |

---

## 7. EXPECTED BENEFITS

### 7.1 For Customers
- ✅ Convenient online shopping with in-store pickup
- ✅ Real-time product availability
- ✅ Loyalty rewards for repeat purchases
- ✅ Transparent pricing and promotions
- ✅ Easy order tracking

### 7.2 For Businesses
- ✅ Digitalized sales channel without major investment
- ✅ Real-time inventory visibility
- ✅ Data-driven business insights
- ✅ Reduced operational overhead
- ✅ Expanded market reach

### 7.3 For the Platform
- ✅ Sustainable revenue from commission structure
- ✅ Network effects from multi-sided marketplace
- ✅ Data repository for market insights
- ✅ Opportunity for geographic expansion

---

## 8. PROJECT CONSTRAINTS & LIMITATIONS

### 8.1 Scope Limitations (Not Included in Phase 1)
- Advanced AI recommendations (planned for Phase 2)
- Blockchain-based loyalty system
- Real-time video consultations
- Augmented reality product try-on
- International shipping

### 8.2 Technical Constraints
- Initial deployment limited to Metro Manila
- Payment gateway limited to local providers
- Database limited to Philippines-specific compliance

### 8.3 Resource Constraints
- Team size: 4 developers
- Timeline: 6 months (development) + 3 months (testing/deployment)
- Budget: Project scope per approved resources

---

## 9. DELIVERABLES

### Phase 1: Planning & Design (Month 1)
- Requirements specification document
- System design documentation
- Database schema
- UI/UX mockups and prototypes

### Phase 2: Development (Months 2-4)
- Backend API development
- Frontend application
- Mobile application
- Database implementation
- Integration testing

### Phase 3: Testing & Deployment (Months 5-6)
- User acceptance testing
- Performance testing
- Security testing
- Production deployment
- User training and documentation

---

## 10. SUCCESS CRITERIA

### 10.1 Functional Success
- ✅ All specified features implemented and tested
- ✅ 99% uptime in first 3 months
- ✅ Zero critical security vulnerabilities

### 10.2 Business Success
- ✅ 50+ registered shops on platform
- ✅ 5,000+ registered customers
- ✅ 1,000+ orders/month by end of year

### 10.3 User Success
- ✅ 90% user retention after 1 month
- ✅ Net Promoter Score (NPS) > 50
- ✅ 4+ average rating

---

## 11. APPROVAL

**Project Submitted by**: Marc Alexis Evangelista, Marc Justine Garcia, Val Javez Lamsen, Gene G. Tabios

**Approved by**: Prof. Benjamin Dave Z. Cruz  
**Date**: As of April 13, 2026

---

**Next Section**: System Analysis & Requirements Documentation
