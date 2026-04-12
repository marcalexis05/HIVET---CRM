import os
import ssl
import base64
import io
from PIL import Image
import uuid
import httpx
import uvicorn
import random
import shutil
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.utils import formatdate, make_msgid
import traceback
from fastapi.responses import JSONResponse, HTMLResponse

import asyncio
from datetime import datetime, timedelta
from typing import Optional, List
import urllib.parse
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, Form, Query, APIRouter, BackgroundTasks
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256

from sqlalchemy import create_engine, Column, String, Text, DateTime, text, Integer, Boolean, Float, ForeignKey, func, inspect, or_
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from dateutil.relativedelta import relativedelta

import traceback
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
load_dotenv()

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY           = os.getenv("SECRET_KEY", "fallback-secret")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:3000")
DATABASE_URL         = os.getenv("DATABASE_URL")
REDIRECT_URI         = "http://localhost:8000/auth/google/callback"
ALGORITHM            = "HS256"
TOKEN_EXPIRE_DAYS    = 30

EMAIL_SENDER = "hivetveterinary3@gmail.com"
EMAIL_APP_PWD = "dpan oejd uzvs tepw"

PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "test_key_placeholder")

PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "test_key_placeholder")


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------------------------
# Database Migrations
# ---------------------------------------------------------------------------
def run_migrations():
    inspector = inspect(engine)
    if "rider_profiles" in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('rider_profiles')]
        if 'birthday' not in columns:
            print("Adding birthday column to rider_profiles...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN birthday VARCHAR(255) NULL"))
                conn.commit()
        if 'gender' not in columns:
            print("Adding gender column to rider_profiles...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN gender VARCHAR(255) NULL"))
                conn.commit()
        if 'middle_name' not in columns:
            print("Adding middle_name column to rider_profiles...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN middle_name VARCHAR(255) NULL"))
                conn.commit()

    if "business_profiles" in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('business_profiles')]
        if 'owner_birthday' not in columns:
            print("Adding owner_birthday column to business_profiles...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE business_profiles ADD COLUMN owner_birthday VARCHAR(255) NULL"))
                conn.commit()
        if 'owner_gender' not in columns:
            print("Adding owner_gender column to business_profiles...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE business_profiles ADD COLUMN owner_gender VARCHAR(255) NULL"))
                conn.commit()

    if "reservations" in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('reservations')]
        if 'voucher_code' not in columns:
            print("Adding voucher_code column to reservations...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN voucher_code VARCHAR(100) NULL"))
                conn.commit()
        if 'tracking_id' not in columns:
            print("Adding tracking_id column to reservations...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN tracking_id VARCHAR(100) NULL"))
                conn.commit()

run_migrations()

class Customer(Base):
    __tablename__ = "customer"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    google_id   = Column(String, unique=True, nullable=True)   # nullable for manual signup
    password_hash = Column(String, nullable=True)              # store hashed password for manual signup
    email       = Column(String, unique=True, nullable=False)
    # Full name (from Google) â€“ kept for OAuth fallback
    name        = Column(String, nullable=True)
    # Detailed name fields (from manual registration)
    first_name  = Column(String, nullable=True)
    middle_name = Column(String, nullable=True)
    last_name   = Column(String, nullable=True)
    suffix      = Column(String, nullable=True)
    # Contact
    phone       = Column(String, unique=True, nullable=True)
    picture     = Column(String, nullable=True)
    gender      = Column(String, nullable=True)
    birthday    = Column(String, nullable=True)
    role        = Column(String, default="customer") # customer, rider
    loyalty_points = Column(Integer, default=0)
    referral_code  = Column(String, unique=True, nullable=True)
    last_active = Column(DateTime, nullable=True)
    is_deleted  = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

class SuperAdminUser(Base):
    __tablename__ = "super_admin_users"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    email       = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name        = Column(String, nullable=True)
    first_name  = Column(String, nullable=True)
    last_name   = Column(String, nullable=True)
    role        = Column(String, default="super_admin")
    last_active = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

class SystemAdminUser(Base):
    __tablename__ = "system_admin_users"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    email       = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name        = Column(String, nullable=True)
    first_name  = Column(String, nullable=True)
    last_name   = Column(String, nullable=True)
    role        = Column(String, default="system_admin")
    last_active = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

class RiderProfile(Base):
    __tablename__ = "rider_profiles"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    # Standalone auth fields — riders are NOT stored in customer table
    email         = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=True)
    first_name    = Column(String, nullable=True)
    last_name     = Column(String, nullable=True)
    middle_name   = Column(String, nullable=True)
    suffix        = Column(String, nullable=True)
    name          = Column(String, nullable=True)  # full name
    phone         = Column(String, nullable=True)
    home_address  = Column(String, nullable=True)
    role          = Column(String, default="rider")
    picture       = Column(String, nullable=True)
    gender        = Column(String, nullable=True)
    birthday      = Column(String, nullable=True)
    # Legacy FK kept for backward compat (old riders who were in customer table)
    customer_id   = Column(Integer, nullable=True, unique=True)
    # Vehicle & compliance
    vehicle_type  = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    license_document_url = Column(String, nullable=True)
    vehicle_cr_url = Column(String, nullable=True)
    vehicle_or_url = Column(String, nullable=True)
    nbi_police_clearance_url = Column(String, nullable=True)
    is_18_above   = Column(Boolean, default=False)
    has_android_6 = Column(Boolean, default=False)
    is_online     = Column(Boolean, default=False)
    total_earnings = Column(Integer, default=0)
    current_lat    = Column(Float, nullable=True)
    current_lng    = Column(Float, nullable=True)
    last_location_update = Column(DateTime, nullable=True)
    compliance_status = Column(String, default="pending") # pending | verified | non_compliant
    rejection_reason = Column(String, nullable=True)
    # Granular home address fields
    home_house_number = Column(String, nullable=True)
    home_block_number = Column(String, nullable=True)
    home_street       = Column(String, nullable=True)
    home_subdivision  = Column(String, nullable=True)
    home_sitio        = Column(String, nullable=True)
    home_barangay     = Column(String, nullable=True)
    home_city         = Column(String, nullable=True)
    home_district     = Column(String, nullable=True)
    home_province     = Column(String, nullable=True)
    home_zip          = Column(String, nullable=True)
    home_region       = Column(String, nullable=True)
    home_lat          = Column(Float, nullable=True)
    home_lng          = Column(Float, nullable=True)
    last_active   = Column(DateTime, nullable=True)
    is_deleted    = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    id                    = Column(Integer, primary_key=True, autoincrement=True)
    email                 = Column(String, unique=True, nullable=False)
    password_hash         = Column(String, nullable=False)
    role                  = Column(String, default="business")
    clinic_name           = Column(String, nullable=True)
    clinic_phone          = Column(String, nullable=True)
    # Owner Profile
    owner_full_name       = Column(String, nullable=True)
    owner_first_name      = Column(String, nullable=True)
    owner_last_name       = Column(String, nullable=True)
    owner_middle_name     = Column(String, nullable=True)
    owner_suffix          = Column(String, nullable=True)
    owner_home_address    = Column(String, nullable=True)
    owner_id_document_url = Column(String, nullable=True)  # government-issued ID file
    owner_phone           = Column(String, nullable=True)
    owner_birthday        = Column(String, nullable=True)
    owner_gender          = Column(String, nullable=True)
    # Clinic Location
    clinic_house_number   = Column(String, nullable=True)
    clinic_block_number   = Column(String, nullable=True)
    clinic_street         = Column(String, nullable=True)
    clinic_subdivision    = Column(String, nullable=True)
    clinic_sitio          = Column(String, nullable=True)
    clinic_barangay       = Column(String, nullable=True)
    clinic_city           = Column(String, nullable=True)
    clinic_district       = Column(String, nullable=True)
    clinic_province       = Column(String, nullable=True)
    clinic_zip            = Column(String, nullable=True)
    clinic_region         = Column(String, nullable=True)
    clinic_lat            = Column(Float, nullable=True)
    clinic_lng            = Column(Float, nullable=True)
    # Regulatory
    bai_number            = Column(String, nullable=True)
    bai_document_url      = Column(String, nullable=True)
    mayors_permit         = Column(String, nullable=True)
    mayors_permit_url     = Column(String, nullable=True)
    # Compliance status: pending | verified | non_compliant
    compliance_status     = Column(String, default="pending")
    
    # Loyalty Settings
    loyalty_points_per_peso        = Column(Float, default=0.01) # ₱100 = 1 pt (Pro Level)
    loyalty_points_per_reservation = Column(Integer, default=10) # flat reward (fallback)
    
    last_active           = Column(DateTime, nullable=True)
    is_deleted            = Column(Boolean, default=False)
    created_at            = Column(DateTime, default=datetime.utcnow)

class BranchInventory(Base):
    __tablename__ = "branch_inventory"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    product_id    = Column(Integer, ForeignKey("products.id"), nullable=False)
    branch_id     = Column(Integer, ForeignKey("business_branches.id"), nullable=False)
    stock         = Column(Integer, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    business_id  = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    name         = Column(String, nullable=False)
    description  = Column(String, nullable=True)
    price        = Column(Float, nullable=False)
    stock        = Column(Integer, default=0)
    category     = Column(String, nullable=True) # Cats | Dogs
    type         = Column(String, nullable=True) # Food | Accessories | Vitamins
    sku          = Column(String, nullable=True)
    image        = Column(String, nullable=True)
    tag          = Column(String, nullable=True)
    weight       = Column(String, nullable=True) # e.g. "2.4 lbs"
    variants_json = Column(Text, nullable=True)
    sizes_json   = Column(Text, nullable=True)
    stars        = Column(Float, default=0.0)
    loyalty_points = Column(Integer, default=0)
    is_archived    = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

class ProductReview(Base):
    __tablename__ = "product_reviews"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    product_id   = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_id  = Column(Integer, ForeignKey("customer.id"), nullable=False)
    rating       = Column(Integer, nullable=False) # 1-5
    comment      = Column(Text, nullable=True)
    image_url    = Column(String, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

class CustomerAddress(Base):
    __tablename__ = "customer_addresses"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    customer_id   = Column(Integer, nullable=False)
    full_name     = Column(String, nullable=False)
    phone         = Column(String, nullable=False)
    address_line1 = Column(String, nullable=True) # Street, unit, etc. (Legacy)
    address_line2 = Column(String, nullable=True) # Barangay, City, Province (Legacy)
    
    # Granular fields
    house_number  = Column(String, nullable=True)
    block_number  = Column(String, nullable=True)
    street        = Column(String, nullable=True)
    subdivision   = Column(String, nullable=True)
    sitio         = Column(String, nullable=True)
    barangay      = Column(String, nullable=True)
    city          = Column(String, nullable=True)
    district      = Column(String, nullable=True)
    province      = Column(String, nullable=True)
    zip_code      = Column(String, nullable=True)
    region        = Column(String, nullable=True)

    label         = Column(String, default="Home") # Home, Work, etc.
    lat           = Column(Float, nullable=True)
    lng           = Column(Float, nullable=True)
    is_default    = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

class BusinessBranch(Base):
    __tablename__ = "business_branches"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    business_id   = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    name          = Column(String, nullable=False) # e.g. Main Branch
    phone         = Column(String, nullable=False)
    address_line1 = Column(String, nullable=True) # Street, unit, etc. (Legacy)
    address_line2 = Column(String, nullable=True) # Barangay, City, Province (Legacy)
    
    # Granular fields
    house_number  = Column(String, nullable=True)
    block_number  = Column(String, nullable=True)
    street        = Column(String, nullable=True)
    subdivision   = Column(String, nullable=True)
    sitio         = Column(String, nullable=True)
    barangay      = Column(String, nullable=True)
    city          = Column(String, nullable=True)
    district      = Column(String, nullable=True)
    province      = Column(String, nullable=True)
    zip_code      = Column(String, nullable=True)
    region        = Column(String, nullable=True)

    lat           = Column(Float, nullable=True)
    lng           = Column(Float, nullable=True)
    is_main       = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id                  = Column(Integer, primary_key=True, autoincrement=True)
    customer_id         = Column(Integer, nullable=False)
    status              = Column(String, default="Pending") # Pending, Processing, Completed, Cancelled
    total_amount        = Column(Integer, nullable=False)
    fulfillment_method  = Column(String, nullable=False)    # delivery, pickup
    payment_method      = Column(String, nullable=False)
    clinic_id           = Column(Integer, nullable=True)     # For pickup
    branch_id           = Column(Integer, nullable=True)     # For pickup
    delivery_address    = Column(String, nullable=True)
    delivery_lat        = Column(Float, nullable=True)
    delivery_lng        = Column(Float, nullable=True)
    contact_name        = Column(String, nullable=True)
    contact_phone       = Column(String, nullable=True)
    rider_id            = Column(Integer, ForeignKey("rider_profiles.id"), nullable=True)
    assigned_at         = Column(DateTime, nullable=True)
    picked_up_at        = Column(DateTime, nullable=True)
    delivered_at        = Column(DateTime, nullable=True)
    cancellation_reason = Column(String, nullable=True)
    voucher_code        = Column(String, nullable=True)
    discount_amount     = Column(Integer, default=0)
    paymongo_session_id = Column(String, nullable=True)
    paymongo_intent_id  = Column(String, nullable=True)
    paymongo_qr_data    = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    order_id     = Column(Integer, nullable=False)
    product_id   = Column(Integer, nullable=False)
    product_name = Column(String, nullable=False)
    price        = Column(Integer, nullable=False)
    quantity     = Column(Integer, nullable=False)
    variant      = Column(String, nullable=True)
    size         = Column(String, nullable=True)
    image        = Column(String, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, nullable=True)
    business_id = Column(Integer, nullable=True) # For clinic owner alerts
    type        = Column(String, nullable=False) # System, Promo, Reminder
    title       = Column(String, nullable=False)
    description = Column(String, nullable=False)
    link        = Column(String, nullable=True)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

class LoyaltyVoucher(Base):
    __tablename__ = "loyalty_vouchers"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    title       = Column(String, nullable=False)
    cost        = Column(Integer, nullable=False)
    type        = Column(String, nullable=False) # Service, Discount, Credit
    value       = Column(Float, default=0.0)      # % for Discount, ₱ for Credit
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

class LoyaltyHistory(Base):
    __tablename__ = "loyalty_history"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    points      = Column(Integer, nullable=False) # Positive for earn, negative for redeem
    created_at  = Column(DateTime, default=datetime.utcnow)

class UserVoucher(Base):
    __tablename__ = "user_vouchers"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, nullable=False)
    voucher_id  = Column(Integer, ForeignKey("loyalty_vouchers.id"), nullable=False)
    code        = Column(String, nullable=False, unique=True)
    is_used     = Column(Boolean, default=False)
    redeemed_at = Column(DateTime, default=datetime.utcnow)

class Reservation(Base):
    __tablename__ = "reservations"
    id                  = Column(Integer, primary_key=True, autoincrement=True)
    customer_id         = Column(Integer, nullable=False)
    business_id         = Column(Integer, nullable=True)
    branch_id           = Column(Integer, nullable=True) # The specific location/branch
    service_id          = Column(Integer, ForeignKey("business_services.id"), nullable=True)
    pet_name            = Column(String, nullable=False)
    service             = Column(String, nullable=False)
    date                = Column(String, nullable=False)  # YYYY-MM-DD
    time                = Column(String, nullable=False)  # e.g. "10:00 AM"
    status              = Column(String, default="Pending")  # Payment Pending|Pending|Confirmed|Ready for Pickup|Completed|Cancelled
    payment_status      = Column(String, default="unpaid")   # unpaid | paid | refunded
    paymongo_session_id = Column(String, nullable=True)      # PayMongo checkout session ID
    paymongo_intent_id  = Column(String, nullable=True)
    paymongo_qr_data    = Column(Text, nullable=True)
    location            = Column(String, nullable=True)
    notes               = Column(Text, nullable=True)
    total_amount        = Column(Float, default=0.0)
    voucher_code        = Column(String, nullable=True)
    tracking_id         = Column(String, unique=True, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

class BusinessOperatingHours(Base):
    __tablename__ = "business_operating_hours"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    business_id  = Column(Integer, nullable=False)
    day_of_week  = Column(Integer, nullable=False)  # 0=Sun, 1=Mon, ..., 6=Sat
    is_open      = Column(Boolean, default=True)
    open_time    = Column(String, default="09:00 AM")
    break_start  = Column(String, nullable=True)
    break_end    = Column(String, nullable=True)
    close_time   = Column(String, default="06:00 PM")

class BusinessService(Base):
    __tablename__ = "business_services"
    id                = Column(Integer, primary_key=True, autoincrement=True)
    business_id       = Column(Integer, nullable=False)
    name              = Column(String, nullable=False)
    description       = Column(Text, nullable=True)
    price             = Column(Float, nullable=False)
    duration_minutes  = Column(Integer, default=60)
    is_active         = Column(Boolean, default=True)
    loyalty_points    = Column(Integer, default=0)
    is_package        = Column(Boolean, default=False)
    package_items_json = Column(Text, nullable=True) # JSON list of service IDs
    created_at        = Column(DateTime, default=datetime.utcnow)

class BusinessSpecialDateHours(Base):
    __tablename__ = "business_special_date_hours"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    business_id  = Column(Integer, nullable=False)
    specific_date = Column(String, nullable=False) # "YYYY-MM-DD"
    is_open      = Column(Boolean, default=True)
    open_time    = Column(String, default="09:00 AM")
    break_start  = Column(String, nullable=True)
    break_end    = Column(String, nullable=True)
    close_time   = Column(String, default="06:00 PM")

# Recreate the schema
Base.metadata.create_all(bind=engine)

# Auto-migrate orders table for PostgreSQL
inspector = inspect(engine)
if "orders" in inspector.get_table_names():
    columns = [col['name'] for col in inspector.get_columns("orders")]
    with engine.begin() as conn:
        if "delivery_address" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN delivery_address VARCHAR"))
        if "contact_name" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN contact_name VARCHAR"))
        if "contact_phone" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN contact_phone VARCHAR"))
        if "clinic_id" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN clinic_id INTEGER"))
        if "branch_id" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN branch_id INTEGER"))
        if "cancellation_reason" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN cancellation_reason VARCHAR"))
        if "delivery_lat" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN delivery_lat FLOAT"))
        if "delivery_lng" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN delivery_lng FLOAT"))
        if "paymongo_session_id" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN paymongo_session_id VARCHAR"))
        if "paymongo_intent_id" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN paymongo_intent_id VARCHAR"))
        if "paymongo_qr_data" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN paymongo_qr_data TEXT"))
        if "rider_id" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN rider_id INTEGER"))
        if "assigned_at" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN assigned_at TIMESTAMP"))
        if "picked_up_at" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN picked_up_at TIMESTAMP"))
        if "delivered_at" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP"))

# Auto-migrate rider_profiles table
if "rider_profiles" in inspector.get_table_names():
    rider_cols = [col['name'] for col in inspector.get_columns("rider_profiles")]
    with engine.begin() as conn:
        if "email" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN email VARCHAR UNIQUE"))
        if "password_hash" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN password_hash VARCHAR"))
        if "first_name" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN first_name VARCHAR"))
        if "last_name" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN last_name VARCHAR"))
        if "suffix" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN suffix VARCHAR"))
        if "name" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN name VARCHAR"))
        if "phone" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN phone VARCHAR"))
        if "home_address" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN home_address VARCHAR"))
        if "role" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN role VARCHAR DEFAULT 'rider'"))
        if "picture" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN picture VARCHAR"))
        
        # Make customer_id nullable for new standalone riders
        # Postgres syntax: ALTER TABLE rider_profiles ALTER COLUMN customer_id DROP NOT NULL
        # (We do it unconditionally since dropping a NOT NULL that's already dropped is fine or easy to ignore error, 
        # but safely we can just run it)
        try:
            conn.execute(text("ALTER TABLE rider_profiles ALTER COLUMN customer_id DROP NOT NULL"))
        except Exception as e:
            print("Note: Could not drop NOT NULL on customer_id, might already be dropped or not exist:", e)

        if "license_document_url" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN license_document_url VARCHAR"))
        if "vehicle_cr_url" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN vehicle_cr_url VARCHAR"))
        if "vehicle_or_url" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN vehicle_or_url VARCHAR"))
        if "nbi_police_clearance_url" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN nbi_police_clearance_url VARCHAR"))
        if "is_18_above" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN is_18_above BOOLEAN DEFAULT FALSE"))
        if "has_android_6" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN has_android_6 BOOLEAN DEFAULT FALSE"))
        if "compliance_status" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN compliance_status VARCHAR DEFAULT 'pending'"))
        if "rejection_reason" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN rejection_reason VARCHAR"))
        if "current_lat" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN current_lat FLOAT"))
        if "current_lng" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN current_lng FLOAT"))
        if "last_location_update" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN last_location_update TIMESTAMP"))
        # Granular home address fields
        for col in ["home_house_number", "home_block_number", "home_street", "home_subdivision", "home_sitio", "home_barangay", "home_city", "home_district", "home_province", "home_zip", "home_region"]:
            if col not in rider_cols:
                conn.execute(text(f"ALTER TABLE rider_profiles ADD COLUMN {col} VARCHAR"))
        if "home_lat" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN home_lat FLOAT"))
        if "home_lng" not in rider_cols:
            conn.execute(text("ALTER TABLE rider_profiles ADD COLUMN home_lng FLOAT"))

# Auto-migrate business_profiles table
if "business_profiles" in inspector.get_table_names():
    biz_cols = [col['name'] for col in inspector.get_columns("business_profiles")]
    with engine.begin() as conn:
        if "clinic_lat" not in biz_cols:
            conn.execute(text("ALTER TABLE business_profiles ADD COLUMN clinic_lat FLOAT"))
        if "clinic_lng" not in biz_cols:
            conn.execute(text("ALTER TABLE business_profiles ADD COLUMN clinic_lng FLOAT"))
        if "owner_first_name" not in biz_cols:
            conn.execute(text("ALTER TABLE business_profiles ADD COLUMN owner_first_name VARCHAR"))
        if "owner_last_name" not in biz_cols:
            conn.execute(text("ALTER TABLE business_profiles ADD COLUMN owner_last_name VARCHAR"))
        # Granular Philippine address fields for the clinic
        for col in ["clinic_house_number", "clinic_block_number", "clinic_street", "clinic_subdivision", "clinic_sitio", "clinic_barangay", "clinic_city", "clinic_district", "clinic_province", "clinic_zip", "clinic_region"]:
            if col not in biz_cols:
                conn.execute(text(f"ALTER TABLE business_profiles ADD COLUMN {col} VARCHAR"))

# Auto-migrate business_branches table
if "business_branches" in inspector.get_table_names():
    branch_cols = [col['name'] for col in inspector.get_columns("business_branches")]
    with engine.begin() as conn:
        if "lat" not in branch_cols:
            conn.execute(text("ALTER TABLE business_branches ADD COLUMN lat FLOAT"))
        if "lng" not in branch_cols:
            conn.execute(text("ALTER TABLE business_branches ADD COLUMN lng FLOAT"))
        # Granular Philippine address fields
        for col in ["house_number", "block_number", "street", "subdivision", "sitio", "barangay", "city", "district", "province", "zip_code", "region"]:
            if col not in branch_cols:
                conn.execute(text(f"ALTER TABLE business_branches ADD COLUMN {col} VARCHAR"))

# Auto-migrate customer_addresses table
if "customer_addresses" in inspector.get_table_names():
    addr_cols = [col['name'] for col in inspector.get_columns("customer_addresses")]
    with engine.begin() as conn:
        if "lat" not in addr_cols:
            conn.execute(text("ALTER TABLE customer_addresses ADD COLUMN lat FLOAT"))
        if "lng" not in addr_cols:
            conn.execute(text("ALTER TABLE customer_addresses ADD COLUMN lng FLOAT"))
        # Granular Philippine address fields
        for col in ["house_number", "block_number", "street", "subdivision", "sitio", "barangay", "city", "district", "province", "zip_code", "region"]:
            if col not in addr_cols:
                conn.execute(text(f"ALTER TABLE customer_addresses ADD COLUMN {col} VARCHAR"))

# Auto-migrate product_reviews table
if "product_reviews" in inspector.get_table_names():
    review_cols = [col['name'] for col in inspector.get_columns("product_reviews")]
    with engine.begin() as conn:
        if "image_url" not in review_cols:
            conn.execute(text("ALTER TABLE product_reviews ADD COLUMN image_url VARCHAR"))

# Auto-migrate products table
if "products" in inspector.get_table_names():
    prod_cols = [col['name'] for col in inspector.get_columns("products")]
    with engine.begin() as conn:
        if "weight" not in prod_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN weight VARCHAR"))

# Auto-migrate reservations table (payment columns)
if "reservations" in inspector.get_table_names():
    res_cols = [col['name'] for col in inspector.get_columns("reservations")]
    with engine.begin() as conn:
        if "payment_status" not in res_cols:
            conn.execute(text("ALTER TABLE reservations ADD COLUMN payment_status VARCHAR DEFAULT 'unpaid'"))
        if "paymongo_session_id" not in res_cols:
            conn.execute(text("ALTER TABLE reservations ADD COLUMN paymongo_session_id VARCHAR"))
        if "branch_id" not in res_cols:
            conn.execute(text("ALTER TABLE reservations ADD COLUMN branch_id INTEGER"))
        if "paymongo_intent_id" not in res_cols:
            conn.execute(text("ALTER TABLE reservations ADD COLUMN paymongo_intent_id VARCHAR"))
        if "paymongo_qr_data" not in res_cols:
            conn.execute(text("ALTER TABLE reservations ADD COLUMN paymongo_qr_data TEXT"))

# Auto-migrate business_services table
if "business_services" in inspector.get_table_names():
    service_cols = [col['name'] for col in inspector.get_columns("business_services")]
    with engine.begin() as conn:
        if "is_package" not in service_cols:
            conn.execute(text("ALTER TABLE business_services ADD COLUMN is_package BOOLEAN DEFAULT FALSE"))
        if "package_items_json" not in service_cols:
            conn.execute(text("ALTER TABLE business_services ADD COLUMN package_items_json TEXT"))

# Auto-migrate branch_inventory table
if "branch_inventory" not in inspector.get_table_names():
    Base.metadata.tables["branch_inventory"].create(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def get_loyalty_tier(points: int) -> dict:
    if points <= 1000:
        return {"tier": "Bronze", "next_tier": "Silver", "next_points": 1001}
    elif points <= 2000:
        return {"tier": "Silver", "next_tier": "Gold", "next_points": 2001}
    elif points <= 3000:
        return {"tier": "Gold", "next_tier": "Platinum", "next_points": 3001}
    else:
        return {"tier": "Platinum", "next_tier": "N/A", "next_points": 0}

async def get_current_user(request: Request) -> dict:
    """Extract and validate the JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Background task: auto-cancel overdue reservations
# ---------------------------------------------------------------------------
def get_distance(lat1, lon1, lat2, lon2):
    """Calculate the Haversine distance between two points on the earth."""
    from math import radians, cos, sin, asin, sqrt
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999999.0
        
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

# ---------------------------------------------------------------------------
# Background task: auto-cancel overdue reservations
# ---------------------------------------------------------------------------
async def auto_cancel_overdue_reservations():
    """Runs every 60 s. Cancels Pending/Confirmed/Payment Pending reservations
    whose scheduled date+time has already passed (using Philippine time UTC+8)."""
    CANCELLABLE = {"Pending", "Confirmed", "Payment Pending"}
    while True:
        try:
            db = SessionLocal()
            try:
                # Current time in Philippine Standard Time (UTC+8)
                now_pht = datetime.utcnow() + timedelta(hours=8)
                overdue = (
                    db.query(Reservation)
                    .filter(Reservation.status.in_(CANCELLABLE))
                    .all()
                )
                cancelled_count = 0
                for r in overdue:
                    try:
                        dt_str = f"{r.date} {r.time}"  # e.g. "2026-04-09 09:00 AM"
                        appt_dt = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
                        if appt_dt < now_pht:
                            r.status = "Cancelled"
                            cancelled_count += 1
                    except Exception:
                        continue
                if cancelled_count:
                    db.commit()
                    print(f"[Auto-Cancel] Cancelled {cancelled_count} overdue reservation(s).")
            finally:
                db.close()
        except Exception as e:
            print(f"[Auto-Cancel] Error: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    db = SessionLocal()
    try:
        if not db.query(LoyaltyVoucher).first():
            vouchers = [
                LoyaltyVoucher(title="15% Off Premium Foods", cost=800, type="Discount", value=15.0),
                LoyaltyVoucher(title="₱10 Store Credit", cost=1000, type="Credit", value=10.0),
                LoyaltyVoucher(title="50% Off Accessories", cost=1500, type="Discount", value=50.0),
                LoyaltyVoucher(title="₱50 Store Credit", cost=3000, type="Credit", value=50.0),
            ]
            db.add_all(vouchers)
            db.commit()
            print("Seeded loyalty vouchers.")
    finally:
        db.close()
    # Start background auto-cancel task
    asyncio.create_task(auto_cancel_overdue_reservations())
    yield
    # Shutdown logic (optional)


app = FastAPI(title="Hi-Vet CRM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Error Logging Middleware
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("error_log.txt", "a") as f:
        f.write(f"\n--- ERROR at {datetime.now()} ---\n")
        f.write(f"URL: {request.url}\n")
        f.write(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "msg": str(exc)},
    )

# Serve uploaded compliance documents as static files
os.makedirs("uploads/compliance", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReservationCreate(BaseModel):
    pet_name: str
    service: str
    service_id: int
    date: str
    time: str
    location: Optional[str] = ""
    notes: Optional[str] = ""
    business_id: Optional[int] = None
    branch_id: Optional[int] = None
    total_amount: Optional[float] = 0.0
    voucher_code: Optional[str] = None

class ReservationStatusUpdate(BaseModel):
    status: str  # Pending|Confirmed|Ready for Pickup|Completed|Cancelled

class ReservationSchema(BaseModel):
    id: int
    customer_id: int
    business_id: Optional[int] = None
    service_id: Optional[int] = None
    pet_name: str
    service: str
    date: str
    time: str
    status: str
    location: Optional[str] = ""
    notes: Optional[str] = ""
    total_amount: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OperatingHoursEntry(BaseModel):
    day_of_week: int  # 0=Sun...6=Sat
    is_open: bool
    open_time: Optional[str] = "09:00 AM"
    break_start: Optional[str] = None
    break_end: Optional[str] = None
    close_time: Optional[str] = "06:00 PM"

class OperatingHoursUpdate(BaseModel):
    hours: List[OperatingHoursEntry]

class OperatingHoursSchema(BaseModel):
    id: int
    business_id: int
    day_of_week: int
    is_open: bool
    open_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None
    close_time: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class BusinessServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: Optional[int] = 60
    is_active: Optional[bool] = True
    loyalty_points: Optional[int] = 0
    is_package: Optional[bool] = False
    package_items_json: Optional[str] = None

class BusinessServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    loyalty_points: Optional[int] = None
    is_package: Optional[bool] = None
    package_items_json: Optional[str] = None

class SpecialDateHoursBase(BaseModel):
    specific_date: str
    is_open: bool = True
    open_time: str = "09:00 AM"
    break_start: Optional[str] = None
    break_end: Optional[str] = None
    close_time: str = "06:00 PM"

class SpecialDateHoursCreate(SpecialDateHoursBase):
    pass

class SpecialDateHoursSchema(SpecialDateHoursBase):
    id: int
    business_id: int

    model_config = ConfigDict(from_attributes=True)

class BusinessServiceSchema(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    is_active: bool
    loyalty_points: Optional[int] = 0
    is_package: bool = False
    package_items_json: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RedeemRequest(BaseModel):
    voucher_id: str

class RedeemedVoucher(BaseModel):
    id: str
    title: str

class BranchStockSchema(BaseModel):
    branch_id: int
    name: str
    stock: int
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None

class ProductSchema(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    category: Optional[str] = None
    type: Optional[str] = None
    sku: Optional[str] = None
    image: Optional[str] = None
    tag: Optional[str] = None
    weight: Optional[str] = None
    variants_json: Optional[str] = None
    sizes_json: Optional[str] = None
    stars: float # Change to float for average
    review_count: int = 0
    loyalty_points: Optional[int] = 0
    inventory_distribution: Optional[dict] = None
    created_at: datetime
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_lat: Optional[float] = None
    clinic_lng: Optional[float] = None
    branch_availability: Optional[List[BranchStockSchema]] = None

    model_config = ConfigDict(from_attributes=True)

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None
    image_url: Optional[str] = None

class ReviewSchema(BaseModel):
    id: int
    product_id: int
    customer_id: int
    customer_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    category: Optional[str] = None
    type: Optional[str] = None
    sku: Optional[str] = None
    image: Optional[str] = None
    tag: Optional[str] = "New"
    weight: Optional[str] = None
    variants_json: Optional[str] = None
    sizes_json: Optional[str] = None
    loyalty_points: Optional[int] = 0
    # Dynamic distribution: {branch_id: stock_value}
    inventory_distribution: Optional[dict] = None 

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    type: Optional[str] = None
    sku: Optional[str] = None
    image: Optional[str] = None
    tag: Optional[str] = None
    weight: Optional[str] = None
    variants_json: Optional[str] = None
    sizes_json: Optional[str] = None
    loyalty_points: Optional[int] = None
    inventory_distribution: Optional[dict] = None

class OrderItemCreate(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    variant: Optional[str] = None
    size: Optional[str] = None
    image: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    totalAmount: float
    fulfillmentMethod: str
    paymentMethod: str
    clinic_id: Optional[int] = None
    branch_id: Optional[int] = None
    deliveryDetails: Optional[dict] = None
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    voucher_code: Optional[str] = None

class PayMongoSessionResponse(BaseModel):
    checkout_url: str

class CancelOrderRequest(BaseModel):
    reason: str

class NotificationReadRequest(BaseModel):
    is_read: bool

class AddressCreate(BaseModel):
    full_name: str
    phone: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    
    house_number: Optional[str] = None
    block_number: Optional[str] = None
    street: Optional[str] = None
    subdivision: Optional[str] = None
    sitio: Optional[str] = None
    barangay: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    zip_code: Optional[str] = None
    region: Optional[str] = None

    lat: Optional[float] = None
    lng: Optional[float] = None
    label: str = "Home"
    is_default: bool = False

class AddressUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    
    house_number: Optional[str] = None
    block_number: Optional[str] = None
    street: Optional[str] = None
    subdivision: Optional[str] = None
    sitio: Optional[str] = None
    barangay: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    zip_code: Optional[str] = None
    region: Optional[str] = None

    lat: Optional[float] = None
    lng: Optional[float] = None
    label: Optional[str] = None
    is_default: Optional[bool] = None

class BranchCreate(BaseModel):
    name: str
    phone: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    
    house_number: Optional[str] = None
    block_number: Optional[str] = None
    street: Optional[str] = None
    subdivision: Optional[str] = None
    sitio: Optional[str] = None
    barangay: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    zip_code: Optional[str] = None
    region: Optional[str] = None

    lat: Optional[float] = None
    lng: Optional[float] = None
    is_main: bool = False

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    
    house_number: Optional[str] = None
    block_number: Optional[str] = None
    street: Optional[str] = None
    subdivision: Optional[str] = None
    sitio: Optional[str] = None
    barangay: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    zip_code: Optional[str] = None
    region: Optional[str] = None

    lat: Optional[float] = None
    lng: Optional[float] = None
    is_main: Optional[bool] = None

class BranchSchema(BaseModel):
    id: int
    business_id: int
    name: str
    phone: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    house_number: Optional[str] = None
    block_number: Optional[str] = None
    street: Optional[str] = None
    subdivision: Optional[str] = None
    sitio: Optional[str] = None
    barangay: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    zip_code: Optional[str] = None
    region: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_main: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Business Dashboard Models
class BusinessDashboardStats(BaseModel):
    product_orders: int
    service_appointments: int
    product_revenue: int
    service_revenue: int
    total_revenue: int # Combined for trend
    active_products: int
    low_stock_count: int
    revenue_change: str
    orders_change: str

class BusinessDashboardOrder(BaseModel):
    id: str
    customer: str
    product: str
    total: str
    status: str
    date: str

class RevenueTrendItem(BaseModel):
    name: str # e.g. "2024-03"
    value: int

class RevenueTrendData(BaseModel):
    trend: str # e.g. "+5% vs last mo"
    chartData: List[RevenueTrendItem]

class TopItemAnalytics(BaseModel):
    name: str
    sold: int
    revenue: str
    pct: int
    delta: Optional[int] = 0

class RevenueTrendData(BaseModel):
    trend: Optional[str] = None # e.g. "+5% vs last mo"
    chartData: List[RevenueTrendItem]

class BusinessAnalyticsData(BaseModel):
    kpis: List[dict]
    revenue_trend: RevenueTrendData
    top_products: List[TopItemAnalytics]
    top_services: List[TopItemAnalytics]
    branch_performance: List[dict] # Replaces loyalty_redemptions
    retention_rate: int = 0
    retention_change: str = ""
    distribution_data: List[dict] = []

@app.delete("/api/account")
async def delete_account(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Soft delete the current user's account and related entities."""
    user_id = int(current_user["sub"])
    role = current_user.get("role")
    
    if role == "customer":
        target = db.query(Customer).filter(Customer.id == user_id).first()
    elif role == "business":
        target = db.query(BusinessProfile).filter(BusinessProfile.id == user_id).first()
        # Also archive all products
        db.query(Product).filter(Product.business_id == user_id).update({"is_archived": True})
    elif role == "rider":
        target = db.query(RiderProfile).filter(RiderProfile.id == user_id).first()
    else:
        raise HTTPException(status_code=403, detail="Admins cannot delete their own accounts via this endpoint.")
        
    if not target:
        raise HTTPException(status_code=404, detail="Account not found.")
        
    target.is_deleted = True
    db.commit()
    return {"message": "Account deactivated successfully."}

def add_notification(db: Session, user_id: int, n_type: str, title: str, desc: str, link: str = None, role: str = "customer"):
    """Adds a notification for either a customer or a business owner."""
    notif = Notification(
        type=n_type,
        title=title,
        description=desc,
        link=link
    )
    if role == "business":
        notif.business_id = user_id
    else:
        notif.customer_id = user_id
        
    db.add(notif)
    db.commit()

# ---------------------------------------------------------------------------
# Routes â€“ General
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "Welcome to Hi-Vet CRM API"}

@app.get("/api/stats")
async def get_stats():
    return {
        "top_selling": ["Premium Dog Food", "Luxury Cat Leash", "Multi-Vitamin"],
        "revenue_trend": [1200, 1500, 1100, 2000, 2500, 3000],
    }

# POST /api/orders moved to "Orders" section.

# GET /api/orders moved to "Orders" section.

# Order cancellation moved to "Orders" section.

@app.get("/api/business/orders")
async def get_business_orders(
    request: Request,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        business_id = int(payload["sub"])
        role = payload.get("role")
        if role != "business":
            raise HTTPException(status_code=403, detail="Not authorized as business")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Fetch all order items that belong to this business's products
    # Join OrderItem -> Product -> Order -> Customer
    query = db.query(OrderItem, Order, Product, Customer)\
        .join(Product, OrderItem.product_id == Product.id)\
        .join(Order, OrderItem.order_id == Order.id)\
        .join(Customer, Order.customer_id == Customer.id)\
        .filter(Product.business_id == business_id)\
        .filter(Order.status != "Payment Pending")

    if branch_id:
        query = query.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))

    results = query.order_by(Order.created_at.desc()).all()
        
    orders_response = []
    for order_item, order, product, customer in results:
        # Calculate the total for this specific item (price * qty)
        item_total = order_item.price * order_item.quantity
        
        customer_name = customer.first_name + " " + customer.last_name if customer.first_name and customer.last_name else customer.name or "Guest"
        
        orders_response.append({
            "id": f"ORD-{order.id}-{order_item.id}", # Make it unique per item
            "customer": customer_name,
            "email": customer.email,
            "product": order_item.product_name,
            "qty": order_item.quantity,
            "total": item_total,
            "date": order.created_at.strftime("%b %d, %Y"),
            "status": order.status,
            "payment": order.payment_method,
            "delivery_address": order.delivery_address,
            "delivery_lat": order.delivery_lat,
            "delivery_lng": order.delivery_lng,
            "fulfillment_method": order.fulfillment_method
        })

    return orders_response

class BusinessOrderStatusUpdate(BaseModel):
    status: str  # Pending | Processing | Order Received | Completed | Cancelled

@app.patch("/api/business/orders/{order_id}/status")
async def update_business_order_status(order_id: int, body: BusinessOrderStatusUpdate, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        business_id = int(payload["sub"])
        role = payload.get("role")
        if role != "business":
            raise HTTPException(status_code=403, detail="Not authorized as business")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Verify this order contains items that belong to this business
    order_has_business_items = db.query(OrderItem).join(Product, OrderItem.product_id == Product.id)\
        .filter(OrderItem.order_id == order_id, Product.business_id == business_id).first()
        
    if not order_has_business_items:
        raise HTTPException(status_code=403, detail="Not authorized to edit this order")

    previous_status = order.status
    order.status = body.status
    
    # Restore stock if cancelled (only if it was already completed/deducted)
    if body.status == "Cancelled" and (previous_status == "Completed" or previous_status == "Delivered"):
        restore_stock(db, order_id)
    
    # Deduct stock when status first changes to 'Completed'
    if (body.status == "Completed" or body.status == "Delivered") and previous_status not in ["Completed", "Delivered"]:
        reduce_stock(db, order_id)

    # Award loyalty points ONLY when status changes to 'Completed' for the first time
    if body.status == "Completed" and previous_status != "Completed":
        # Find business profile to get loyalty rates
        # Primary: Fetch from business_id of the requester (since they own this order)
        biz = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
        
        items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        total_loyalty_points = 0
        
        for item in items:
            # Use item-specific fixed points if available, otherwise calculate from price
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                if prod.loyalty_points > 0:
                    points = prod.loyalty_points * item.quantity
                elif biz:
                    points = int(item.price * item.quantity * biz.loyalty_points_per_peso)
                else:
                    points = int(item.price * item.quantity * 0.01) # fallback multiplier (1%)
                total_loyalty_points += points

        if total_loyalty_points > 0:
            customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
            if customer:
                customer.loyalty_points += total_loyalty_points
                db.add(LoyaltyHistory(
                    customer_id=order.customer_id,
                    description=f"Purchase Reward – Order #HV-{order.id:04d}",
                    points=total_loyalty_points
                ))

    db.commit()

    # NOTIFY CUSTOMER
    add_notification(
        db, order.customer_id, "System",
        f"Order Status: {body.status}",
        f"Your order #HV-{order.id:04d} has been updated to '{body.status}' by the clinic.",
        "/dashboard/customer/orders"
    )

    return {"message": f"Order status updated to {body.status}", "order_id": order_id, "status": body.status}

# ---------------------------------------------------------------------------
# Routes â€“ Google OAuth
# ---------------------------------------------------------------------------
@app.get("/auth/google")
async def google_login():
    """Redirect user to Google's OAuth consent screen."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url=google_auth_url)

@app.get("/auth/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Exchange code for token, upsert customer, return JWT to frontend."""
    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

    # 2. Fetch user profile from Google
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    google_user = user_resp.json()
    google_id = google_user.get("id")
    email     = google_user.get("email")
    name      = google_user.get("name", "")
    picture   = google_user.get("picture", "")

    if not google_id or not email:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=missing_profile")

    # 3. Upsert customer row
    try:
        # Check if user already exists with this Google ID
        customer = db.query(Customer).filter(Customer.google_id == google_id).first()
        is_new = False
        
        if not customer:
            # Check if user already exists with this email (manual signup)
            customer = db.query(Customer).filter(Customer.email == email).first()
            if customer:
                # Link Google ID to existing manual account
                customer.google_id = google_id
                if not customer.picture:
                    customer.picture = picture
                db.commit()
                db.refresh(customer)
            else:
                # Createnew account
                is_new = True
                customer = Customer(
                    google_id=google_id,
                    email=email,
                    name=name,
                    picture=picture,
                )
                db.add(customer)
                db.commit()
                db.refresh(customer)
    except Exception as e:
        db.rollback()
        print(f"Error upserting Google user {email}: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=db_error")

    # 4. Issue JWT
    token = create_access_token({
        "sub": str(customer.id),
        "email": customer.email,
        "name": customer.name,
        "first_name": customer.first_name,
        "middle_name": customer.middle_name,
        "last_name": customer.last_name,
        "suffix": customer.suffix,
        "phone": customer.phone,
        "gender": customer.gender,
        "birthday": customer.birthday,
        "avatar": customer.picture,
        "role": "user",
        "has_password": bool(customer.password_hash)
    })

    # 5. Send Welcome Email if new, then redirect
    if is_new:
        magic_link = f"{FRONTEND_URL}/auth/callback?token={token}"
        

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                body {{ margin: 0; padding: 0; background-color: #F7F6F2; font-family: 'Outfit', sans-serif; }}
                .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 48px; overflow: hidden; box-shadow: 0 40px 80px rgba(0, 0, 0, 0.06); border: 1px solid rgba(0,0,0,0.05); }}
                .content {{ padding: 80px 60px; text-align: center; }}
                .brand-tag {{ color: #F26B21; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; display: block; margin-bottom: 20px; }}
                h1 {{ color: #262626; font-size: 32px; font-weight: 900; margin: 0 0 25px 0; letter-spacing: -1px; }}
                p {{ color: #4A4A4A; font-size: 16px; line-height: 1.7; margin: 0 0 35px 0; font-weight: 500; font-style: italic; opacity: 0.7; }}
                .action-card {{ background-color: #F7F6F2; border-radius: 40px; padding: 45px; border: 1px solid rgba(0,0,0,0.03); margin-bottom: 30px; }}
                .footer {{ background-color: #ffffff; padding: 40px; text-align: center; border-top: 1px solid rgba(0,0,0,0.05); }}
                .footer-text {{ color: #262626; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; opacity: 0.2; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <span class="brand-tag">Initialization Receipt</span>
                    <h1>Welcome to Hi-Vet</h1>
                    <p>You have successfully initialized your professional identity via Google. We are honored to accompany you in your companion's health journey.</p>
                    <div class="action-card">
                        <p style="margin: 0 0 20px 0; color: #262626; font-weight: 900; not-italic; opacity: 1;">Access Your Portfolio</p>
                        <a href="{magic_link}" style="display: inline-block; background: #262626; color: #ffffff; text-decoration: none; padding: 22px 45px; border-radius: 25px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">Enter Portal Now</a>
                    </div>
                    <p style="font-size: 11px; color: #262626; margin: 0; opacity: 0.3;">Need assistance? Reply directly to this administrative handshake.</p>
                </div>
                <div class="footer">
                    <p class="footer-text">HI-VET &bull; Dedicated to your companion's care &copy; 2026</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Welcome to Hi-Vet - Complete Your Sign-Up"
        msg["From"] = f'"Hi-Vet Assistant" <{EMAIL_SENDER}>'
        msg["To"] = email
        msg.attach(MIMEText(html_content, "html"))
        
        try:
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            server.login(EMAIL_SENDER, EMAIL_APP_PWD)
            server.sendmail(EMAIL_SENDER, email, msg.as_string())
            server.quit()
        except Exception as e:
            print("SMTP Error sending welcome email:", e)
            
        return RedirectResponse(url=f"{FRONTEND_URL}/login?msg=check_email")
    else:
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={token}")

# Manual Signup & OTP
OTP_STORE: dict = {}  # Format: { "email": { "otp": "123456", "expires": datetime } }

class SendOtpRequest(BaseModel):
    email: str
    name: Optional[str] = None
    gender: Optional[str] = None
    last_name: Optional[str] = None

class EmailChangeRequest(BaseModel):
    new_email: str

class EmailChangeVerifyRequest(BaseModel):
    new_email: str

async def send_bespoke_reservation_email(to_email: str, receipt_data: dict, is_business: bool = False):
    """Sends a professional, minimalist dual-card invoice email (button-free) using local SMTP."""
    subject = "New Reservation Alert - Hi-Vet" if is_business else "Your Hi-Vet Reservation Receipt"
    
    # Minimalist Invoice Design (No Buttons)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
            body {{ margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }}
            .surface {{ padding: 60px 20px; text-align: center; }}
            .container {{ max-width: 580px; margin: 0 auto; text-align: left; }}
            
            .card {{
                background-color: #ffffff;
                border-radius: 12px;
                padding: 45px;
                margin-bottom: 24px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                border: 1px solid rgba(0,0,0,0.02);
            }}
            
            .header-info {{ color: #ea580c; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }}
            .header-addr {{ color: #64748B; font-size: 13px; font-weight: 500; margin-bottom: 20px; line-height: 1.4; }}
            .amount-container {{ display: table; width: 100%; margin-bottom: 8px; }}
            .amount-text {{ font-size: 52px; font-weight: 900; color: #ea580c; letter-spacing: -2px; line-height: 1; }}
            .amount-currency {{ font-size: 40px; font-weight: 700; vertical-align: top; margin-right: 2px; }}
            .date-subtitle {{ color: #64748B; font-size: 14px; font-weight: 500; margin-bottom: 40px; }}
            
            .divider {{ height: 1px; background-color: #F1F5F9; margin: 30px 0; }}
            
            .text-link-group {{ margin: 25px 0; }}
            .text-link {{ 
                color: #64748B; 
                text-decoration: none; 
                font-size: 13px; 
                font-weight: 600; 
                margin-right: 25px; 
                display: inline-flex; 
                align-items: center; 
            }}
            
            .data-grid {{ width: 100%; margin-top: 25px; border-collapse: collapse; }}
            .data-label {{ color: #64748B; font-size: 14px; font-weight: 500; padding: 8px 0; vertical-align: top; width: 50%; }}
            .data-value {{ color: #1E293B; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right; }}
            
            .item-header {{ color: #1E293B; font-size: 15px; font-weight: 700; margin-bottom: 4px; }}
            .item-subheader {{ color: #64748B; font-size: 13px; font-weight: 500; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.5px; }}
            
            .invoice-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .invoice-row-main td {{ padding: 20px 0 5px 0; border-top: 1px solid #F1F5F9; }}
            .invoice-row-sub td {{ padding: 0 0 20px 0; }}
            
            .invoice-label {{ font-size: 15px; font-weight: 700; color: #1E293B; }}
            .invoice-price {{ font-size: 15px; font-weight: 700; color: #ea580c; text-align: right; }}
            .invoice-desc {{ font-size: 13px; font-weight: 500; color: #64748B; }}
            
            .totals-row td {{ padding: 12px 0; border-top: 1px solid #F1F5F9; }}
            .totals-label {{ font-size: 15px; font-weight: 700; color: #1E293B; }}
            .totals-value {{ font-size: 15px; font-weight: 700; color: #ea580c; text-align: right; }}
            
            .footer-note {{ color: #94A3B8; font-size: 13px; font-weight: 500; margin-top: 30px; border-top: 1px solid #F1F5F9; padding-top: 20px; }}
            .footer-link {{ color: #3B82F6; text-decoration: none; font-weight: 600; }}
            
            .voucher-pill {{ 
                background-color: #F8FAFC; 
                color: #1E293B; 
                font-size: 10px; 
                font-weight: 700; 
                padding: 4px 8px; 
                border-radius: 4px; 
                border: 1px solid #E2E8F0;
                display: inline-block;
                margin-top: 4px;
            }}
            
            .qr-container {{ 
                margin-top: 30px; 
                padding: 20px; 
                background: #F8FAFC; 
                border-radius: 12px; 
                text-align: center;
                border: 1px solid #F1F5F9;
            }}
            .qr-image {{ width: 140px; height: 140px; margin-bottom: 12px; }}
            .qr-hint {{ font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; }}

            @media only screen and (max-width: 600px) {{
                .surface {{ padding: 30px 15px; }}
                .card {{ padding: 25px; }}
                .amount-text {{ font-size: 40px; }}
                .text-link {{ display: block; margin-bottom: 12px; }}
            }}
        </style>
    </head>
    <body>
        <div class="surface">
            <div class="container">
                <!-- CARD 1: SUMMARY -->
                <div class="card">
                    <div class="header-info">{receipt_data.get('clinic_name', 'Hi-Vet Clinic')}</div>
                    <div class="header-addr">{receipt_data.get('location', 'Main Branch')}</div>
                    <div class="amount-container">
                        <span class="amount-text">{receipt_data.get('total_amount')}</span>
                    </div>
                    <div class="date-subtitle">Finalized on {receipt_data.get('date')}</div>
                    
                    <div class="divider"></div>

                    <table class="data-grid">
                        <tr>
                            <td class="data-label">Receipt number</td>
                            <td class="data-value">{receipt_data.get('reservation_id')}</td>
                        </tr>
                        <tr>
                            <td class="data-label">Customer Name</td>
                            <td class="data-value">{receipt_data.get('customer_name')}</td>
                        </tr>
                        <tr>
                            <td class="data-label">Pet Name</td>
                            <td class="data-value">{receipt_data.get('pet_name')}</td>
                        </tr>
                        <tr>
                            <td class="data-label">Payment method</td>
                            <td class="data-value">
                                {f"Voucher Redemption" if receipt_data.get('voucher_code') else "Electronic Settlement"}
                            </td>
                        </tr>
                    </table>

                    <div class="qr-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={receipt_data.get('qr_content')}" class="qr-image" alt="Receipt QR">
                        <div class="qr-hint">Scan to verify authenticity</div>
                    </div>
                </div>

                <!-- CARD 2: ITEMIZED BREAKDOWN -->
                <div class="card">
                    <div class="item-header">Receipt #{receipt_data.get('reservation_id')}</div>
                    <div class="item-subheader">{receipt_data.get('date')} • {receipt_data.get('time')}</div>
                    
                    <table class="invoice-table">
                        <tr class="invoice-row-main">
                            <td class="invoice-label">
                                {receipt_data.get('service_name')}
                                {f'<br><span class="voucher-pill">Redeemed Reward</span>' if receipt_data.get('voucher_code') else ''}
                            </td>
                            <td class="invoice-price">{receipt_data.get('base_price')}</td>
                        </tr>
                        <tr class="invoice-row-sub">
                            <td class="invoice-desc">Quantity: 1</td>
                            <td></td>
                        </tr>
                        {f'''
                        <tr class="invoice-row-main">
                            <td>
                                <div class="invoice-label">Voucher: {receipt_data.get('voucher_title')}</div>
                                <div class="invoice-desc">{receipt_data.get('voucher_type')} • {receipt_data.get('voucher_code')}</div>
                            </td>
                            <td style="color: #10B981; text-align: right; font-weight: 700;">{receipt_data.get('discount_amount')}</td>
                        </tr>
                        ''' if receipt_data.get('voucher_code') else ''}
                        
                        <tr class="totals-row">
                            <td class="totals-label">Total</td>
                            <td class="totals-value">{receipt_data.get('total_amount')}</td>
                        </tr>
                        <tr class="totals-row">
                            <td class="totals-label">Amount paid</td>
                            <td class="totals-value">{receipt_data.get('total_amount')}</td>
                        </tr>
                    </table>

                    <div class="footer-note">
                        Questions? Contact us at <a href="mailto:support@hi-vet.com" class="footer-link">support@hi-vet.com</a>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="font-size: 11px; font-weight: 700; color: #CBD5E1; text-transform: uppercase; letter-spacing: 2px;">
                        HI-VET &bull; INTEGRATED CLINICAL SYSTEMS &copy; 2026
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = EMAIL_SENDER
    msg['To'] = to_email
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid()
    msg.attach(MIMEText(html_content, 'html'))

    try:
        # Use existing async-friendly SMTP sending pattern
        await asyncio.to_thread(_send_smtp_direct, to_email, msg)
        return True
    except Exception as e:
        print(f"[Bespoke Email Error] {e}")
        return False

def _send_smtp_direct(to_email, msg):
    """Sync helper for sending SMTP emails in a thread."""
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.send_message(msg)

def send_professional_otp_email(email: str, otp_code: str, title: str, description: str, subject: str, customer_name: str = "Valued Customer", gender: str = None, last_name: str = ""):
    """Sends a professional OTP email using a consistent high-end template."""
    prefix = "Valued Partner"
    if gender == "Male": prefix = f"Mr. {last_name}"
    elif gender == "Female": prefix = f"Ms. {last_name}"
    else: prefix = customer_name

    # Warm Institutional Architecture (Approachable & Professional)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body {{ margin: 0; padding: 0; background-color: #FAF9F6; }}
            .surface {{ padding: 60px 20px; text-align: center; }}
            .card {{ 
                max-width: 680px; 
                margin: 0 auto; 
                background-color: #ffffff; 
                border-radius: 40px; 
                overflow: hidden; 
                box-shadow: 0 30px 80px rgba(38, 38, 38, 0.05); 
                border: 1px solid rgba(0, 0, 0, 0.03); 
                display: inline-block; 
                text-align: center;
                width: 100%;
            }}
            .accent-bar {{ 
                height: 6px; 
                background-color: #F26B21; 
                width: 100%;
            }}
            .content {{ padding: 65px 60px; font-family: 'Outfit', sans-serif; }}
            .brand-tag {{ color: #F26B21; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; display: block; margin-bottom: 25px; opacity: 0.8; }}
            .greeting {{ color: #262626; font-weight: 900; font-size: 32px; letter-spacing: -1px; margin: 0 0 15px 0; line-height: 1.2; }}
            p {{ color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 45px 0; font-weight: 500; opacity: 0.7; }}
            
            .otp-container {{ 
                background-color: #FAF9F6; 
                border-radius: 32px; 
                padding: 45px 20px; 
                margin: 0 auto;
                max-width: 460px;
                border: 1px solid rgba(0, 0, 0, 0.03);
            }}
            .otp-code {{ font-size: 64px; font-weight: 900; letter-spacing: 15px; color: #262626; display: block; margin-left: 15px; }}
            .otp-label {{ font-size: 10px; font-weight: 900; color: #F26B21; text-transform: uppercase; letter-spacing: 5px; margin-top: 20px; display: block; opacity: 0.6; }}
            
            .footer {{ background-color: #ffffff; padding: 40px 60px; text-align: center; border-top: 1px solid rgba(0, 0, 0, 0.03); }}
            .footer-text {{ color: #262626; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; opacity: 0.2; }}
        </style>
    </head>
    <body>
        <div class="surface">
            <div class="card">
                <div class="accent-bar"></div>
                <div class="content">
                    <span class="brand-tag">Safe Initialization</span>
                    <h1 class="greeting">We are honored to assist you, {prefix}</h1>
                    <p>{description}</p>
                    <div class="otp-container">
                        <span class="otp-code">{otp_code}</span>
                        <span class="otp-label">Your Security Token</span>
                    </div>
                    <p style="font-size: 11px; margin-top: 40px; margin-bottom: 0; opacity: 0.4; font-weight: 700;">Valid for 10 minutes</p>
                </div>
                <div class="footer">
                    <span class="footer-text">HI-VET &bull; Your Companion in Health &copy; 2026</span>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Hi-Vet: {subject}
    
    {description}
    
    Your code: {otp_code}
    
    This code expires in 10 minutes.
    
    © 2026 Hi-Vet. All rights reserved.
    """
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f'"Hi-Vet Assistant" <{EMAIL_SENDER}>'
    msg["To"] = email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="gmail.com")
    msg["X-Auto-Response-Suppress"] = "All"
    msg["Auto-Submitted"] = "auto-generated"
    msg["X-Priority"] = "1 (Highest)"
    msg["Importance"] = "High"

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    if not EMAIL_SENDER or not EMAIL_APP_PWD:
         raise HTTPException(status_code=500, detail="Email service not configured.")

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(EMAIL_SENDER, EMAIL_APP_PWD)
            server.send_message(msg)
    except Exception as e:
        print("SMTP Error:", e)
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@app.post("/api/auth/send-otp")
def send_otp(body: SendOtpRequest, db: Session = Depends(get_db)):
    """Generates and sends a 6-digit OTP to the user's email."""
    existing_customer = db.query(Customer).filter(Customer.email == body.email).first()
    existing_rider        = db.query(RiderProfile).filter(RiderProfile.email == body.email).first()
    existing_business = db.query(BusinessProfile).filter(BusinessProfile.email == body.email).first()
    if existing_customer or existing_rider or existing_business:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    otp_code = f"{random.randint(0, 999999):06d}"
    expires = datetime.utcnow() + timedelta(minutes=10)
    OTP_STORE[body.email] = {"otp": otp_code, "expires": expires}
    
    send_professional_otp_email(
        email=body.email,
        otp_code=otp_code,
        title="Verification Required",
        description="We are honored to assist with your account setup. Please use the verification code to securely confirm your identity and proceed.",
        subject=f"{otp_code} is your Hi-Vet verification code",
        customer_name=body.name or "Valued Partner",
        gender=body.gender,
        last_name=body.last_name or ""
    )
    
    return {"message": "Verification code sent"}

@app.post("/api/auth/request-email-change")
async def request_email_change(body: EmailChangeRequest, request: Request, db: Session = Depends(get_db)):
    """Sends an OTP to the NEW email address for verification."""
    # Verify current user
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "customer")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check if new email is already registered by SOMEONE ELSE
    # We allow the user to 'change' to their own current email (even if redundant) 
    # to avoid complex exclusion logic across different tables if unnecessary, 
    # but the primary goal is to check for OTHER accounts.
    
    # Check across all tables
    queries = [
        (Customer, Customer.id),
        (BusinessProfile, BusinessProfile.id),
        (RiderProfile, RiderProfile.id),
        (SuperAdminUser, SuperAdminUser.id),
        (SystemAdminUser, SystemAdminUser.id)
    ]
    
    for model, id_attr in queries:
        existing = db.query(model).filter(model.email == body.new_email).first()
        if existing:
            # If it's the SAME person (same role and same ID), it's not a duplicate "by another account"
            # Note: We use string comparison for role matching if needed, 
            # but usually the ID check is enough if we know the table.
            
            # For simplicity, if the table matches the user's role and the ID matches, skip error
            is_same_user = False
            if role == "business" and model == BusinessProfile and int(existing.id) == user_id: is_same_user = True
            elif role == "rider" and model == RiderProfile and (int(getattr(existing, 'id', 0)) == user_id or int(getattr(existing, 'customer_id', 0)) == user_id): is_same_user = True
            elif role == "customer" and model == Customer and int(existing.id) == user_id: is_same_user = True
            elif role == "superadmin" and model == SuperAdminUser and int(existing.id) == user_id: is_same_user = True
            elif role == "admin" and model == SystemAdminUser and int(existing.id) == user_id: is_same_user = True
            
            if not is_same_user:
                raise HTTPException(status_code=400, detail="Email is already registered by another account")

    otp_code = f"{random.randint(0, 999999):06d}"
    expires = datetime.utcnow() + timedelta(minutes=10)
    # Store with a specific prefix to avoid collision with registration OTPs
    OTP_STORE[f"email_change:{body.new_email}"] = {"otp": otp_code, "expires": expires}

    send_professional_otp_email(
        email=body.new_email,
        otp_code=otp_code,
        title="Verify your new email",
        description="You've requested to change your Hi-Vet account email. Please use the code below to verify your new email address. If you didn't request this, you can safely ignore this email.",
        subject=f"{otp_code} is your Hi-Vet email change verification code"
    )
    return {"message": "Verification code sent to your new email"}

@app.post("/api/auth/verify-email-change")
async def verify_email_change(body: EmailChangeVerifyRequest, request: Request, db: Session = Depends(get_db)):
    """Verifies the OTP for the new email and updates the user's account."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role            = payload.get("role", "user")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Verify OTP
    key = f"email_change:{body.new_email}"
    record = OTP_STORE.get(key)
    if not record:
        raise HTTPException(status_code=400, detail="No verification code requested for this email")
    if datetime.utcnow() > record["expires"]:
        del OTP_STORE[key]
        raise HTTPException(status_code=400, detail="Verification code has expired")
    if record["otp"] != body.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Update correct table based on role
    user = None
    if role == "business":
        user = db.query(BusinessProfile).filter(BusinessProfile.id == user_id).first()
    elif role == "rider":
        user = db.query(RiderProfile).filter(RiderProfile.id == user_id).first()
        if not user:
             user = db.query(RiderProfile).filter(RiderProfile.customer_id == user_id).first()
    else:
        user = db.query(Customer).filter(Customer.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    user.email = body.new_email
    db.commit()
    db.refresh(user)

    # Cleanup OTP
    del OTP_STORE[key]

    # Generate new JWT token with updated email
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": getattr(user, 'role', role),
        "has_password": bool(user.password_hash)
    }
    
    if role == "business":
        token_data.update({
            "name": user.clinic_name,
            "clinic_name": user.clinic_name,
            "phone": user.clinic_phone,
            "avatar": user.owner_id_document_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        })
    elif role == "rider":
        token_data.update({
            "name": user.name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "suffix": user.suffix,
            "phone": user.phone,
            "avatar": user.picture or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        })
    else:
        token_data.update({
            "name": user.name,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "suffix": user.suffix,
            "phone": user.phone,
            "gender": user.gender,
            "birthday": user.birthday,
            "avatar": user.picture or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        })

    token = create_access_token(token_data)
    return {"message": "Email updated successfully", "token": token}


class RegisterRequest(BaseModel):
    email: str
    password: str
    otp: str
    first_name: str = ""
    last_name: str = ""
    middle_name: str = ""
    suffix: str = ""
    phone: str = ""
    gender: Optional[str] = None
    birthday: Optional[str] = None
    role: str = "user"
    # Business: Clinic Info
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    # Business: Owner Profile
    owner_home_address: Optional[str] = None
    owner_id_document_url: Optional[str] = None
    # Business: Clinic Location
    clinic_house_number: Optional[str] = None
    clinic_block_number: Optional[str] = None
    clinic_street: Optional[str] = None
    clinic_subdivision: Optional[str] = None
    clinic_sitio: Optional[str] = None
    clinic_barangay: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_district: Optional[str] = None
    clinic_province: Optional[str] = None
    clinic_zip: Optional[str] = None
    clinic_region: Optional[str] = None
    clinic_lat: Optional[float] = None
    clinic_lng: Optional[float] = None
    # Business: Regulatory
    bai_number: Optional[str] = None
    bai_document_url: Optional[str] = None
    mayors_permit: Optional[str] = None
    mayors_permit_url: Optional[str] = None
    referral_code: Optional[str] = None
    # Rider Compliance
    vehicle_type: Optional[str] = None
    driver_license: Optional[str] = None
    license_document_url: Optional[str] = None
    vehicle_cr_url: Optional[str] = None
    vehicle_or_url: Optional[str] = None
    nbi_police_clearance_url: Optional[str] = None
    home_address: Optional[str] = None
    home_house_number: Optional[str] = None
    home_block_number: Optional[str] = None
    home_street: Optional[str] = None
    home_subdivision: Optional[str] = None
    home_sitio: Optional[str] = None
    home_barangay: Optional[str] = None
    home_city: Optional[str] = None
    home_district: Optional[str] = None
    home_province: Optional[str] = None
    home_zip: Optional[str] = None
    home_region: Optional[str] = None
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None
    is_18_above: Optional[bool] = False
    has_android_6: Optional[bool] = False

@app.post("/api/auth/register", status_code=201)
async def register_customer(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new customer, business, or rider with a password, verifying the OTP."""
    if db.query(Customer).filter(Customer.email == body.email).first() or \
       db.query(BusinessProfile).filter(BusinessProfile.email == body.email).first() or \
       db.query(SuperAdminUser).filter(SuperAdminUser.email == body.email).first() or \
       db.query(SystemAdminUser).filter(SystemAdminUser.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Verify OTP
    record = OTP_STORE.get(body.email)
    if not record:
        raise HTTPException(status_code=400, detail="No verification code requested for this email")
    if datetime.utcnow() > record["expires"]:
        del OTP_STORE[body.email]  # clean up
        raise HTTPException(status_code=400, detail="Verification code has expired")
    if record["otp"] != body.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    pwd_hash = pbkdf2_sha256.hash(body.password)
    
    # Calculate full name
    parts = []
    if body.first_name: parts.append(body.first_name.strip())
    if body.middle_name:
        m = body.middle_name.strip()
        if len(m) == 1 and m.isalpha():
            m += "."
        parts.append(m)
    if body.last_name: parts.append(body.last_name.strip())
    if body.suffix: parts.append(body.suffix.strip())
    full_name = " ".join(parts).strip() if parts else "New User"
    
    if body.role == "rider":
        # Riders go ONLY into rider_profiles — NOT into the customer table
        is_bicycle = (body.vehicle_type or "").strip().lower() == "bicycle"
        parts = []
        if body.first_name: parts.append(body.first_name.strip())
        if body.middle_name: parts.append(body.middle_name.strip())
        if body.last_name: parts.append(body.last_name.strip())
        if body.suffix: parts.append(body.suffix.strip())
        rider_full_name = " ".join(parts).strip() or "Rider"

        rider_prof = RiderProfile(
            email=body.email,
            password_hash=pwd_hash,
            first_name=body.first_name,
            last_name=body.last_name,
            middle_name=body.middle_name,
            suffix=body.suffix,
            name=rider_full_name,
            phone=body.phone,
            home_address=body.home_address,
            role="rider",
            picture=f"https://api.dicebear.com/7.x/avataaars/svg?seed={body.email}",
            customer_id=None,  # not linked to customer table
            vehicle_type=body.vehicle_type,
            license_number=None if is_bicycle else body.driver_license,
            license_document_url=None if is_bicycle else body.license_document_url,
            vehicle_cr_url=None if is_bicycle else body.vehicle_cr_url,
            vehicle_or_url=None if is_bicycle else body.vehicle_or_url,
            nbi_police_clearance_url=body.nbi_police_clearance_url,
            is_18_above=body.is_18_above,
            has_android_6=body.has_android_6,
            home_house_number=body.home_house_number,
            home_block_number=body.home_block_number,
            home_street=body.home_street,
            home_subdivision=body.home_subdivision,
            home_sitio=body.home_sitio,
            home_barangay=body.home_barangay,
            home_city=body.home_city,
            home_district=body.home_district,
            home_province=body.home_province,
            home_zip=body.home_zip,
            home_region=body.home_region,
            home_lat=body.home_lat,
            home_lng=body.home_lng,
            birthday=body.birthday,
            gender=body.gender,
            compliance_status="pending"
        )
        db.add(rider_prof)
        db.commit()

        if body.email in OTP_STORE:
            del OTP_STORE[body.email]
        return {"status": "pending_approval", "message": "Registration submitted. Your rider application is under review."}

    elif body.role == "business":
        new_user = BusinessProfile(
            email=body.email,
            password_hash=pwd_hash,
            role=body.role,
            clinic_name=body.clinic_name,
            clinic_phone=body.clinic_phone,
            owner_full_name=full_name,
            owner_first_name=body.first_name,
            owner_last_name=body.last_name,
            owner_middle_name=body.middle_name,
            owner_suffix=body.suffix,
            owner_home_address=body.owner_home_address,
            owner_id_document_url=body.owner_id_document_url,
            owner_phone=body.phone,
            owner_birthday=body.birthday,
            owner_gender=body.gender,
            clinic_house_number=body.clinic_house_number,
            clinic_block_number=body.clinic_block_number,
            clinic_street=body.clinic_street,
            clinic_subdivision=body.clinic_subdivision,
            clinic_sitio=body.clinic_sitio,
            clinic_barangay=body.clinic_barangay,
            clinic_city=body.clinic_city,
            clinic_district=body.clinic_district,
            clinic_province=body.clinic_province,
            clinic_zip=body.clinic_zip,
            clinic_region=body.clinic_region,
            clinic_lat=body.clinic_lat,
            clinic_lng=body.clinic_lng,
            bai_number=body.bai_number,
            bai_document_url=body.bai_document_url,
            mayors_permit=body.mayors_permit,
            mayors_permit_url=body.mayors_permit_url,
            compliance_status="pending"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Automatically create the primary Main Branch based on signup address
        line1 = " ".join(filter(None, [new_user.clinic_house_number, new_user.clinic_block_number, new_user.clinic_street, new_user.clinic_subdivision]))
        line2 = ", ".join(filter(None, [new_user.clinic_barangay, new_user.clinic_city, new_user.clinic_province, new_user.clinic_zip]))

        main_branch = BusinessBranch(
            business_id=new_user.id,
            name="Main Branch",
            phone=new_user.clinic_phone or body.phone,
            address_line1=line1,
            address_line2=line2,
            house_number=new_user.clinic_house_number,
            block_number=new_user.clinic_block_number,
            street=new_user.clinic_street,
            subdivision=new_user.clinic_subdivision,
            sitio=new_user.clinic_sitio,
            barangay=new_user.clinic_barangay,
            city=new_user.clinic_city,
            district=new_user.clinic_district,
            province=new_user.clinic_province,
            zip_code=new_user.clinic_zip,
            region=new_user.clinic_region,
            lat=new_user.clinic_lat,
            lng=new_user.clinic_lng,
            is_main=True
        )
        db.add(main_branch)
        db.commit()
    else:
        new_user = Customer(
            email=body.email,
            password_hash=pwd_hash,
            name=full_name,
            first_name=body.first_name,
            last_name=body.last_name,
            middle_name=body.middle_name,
            suffix=body.suffix,
            phone=body.phone,
            gender=body.gender,
            birthday=body.birthday,
            role=body.role,
            picture=f"https://api.dicebear.com/7.x/avataaars/svg?seed={body.email}"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        if body.role == "rider":
            # Bicycle riders do not need a license or vehicle CR/OR — force null
            is_bicycle = (body.vehicle_type or "").strip().lower() == "bicycle"
            rider_prof = RiderProfile(
                customer_id=new_user.id,
                vehicle_type=body.vehicle_type,
                home_address=body.home_address,
                license_number=None if is_bicycle else body.driver_license,
                license_document_url=None if is_bicycle else body.license_document_url,
                vehicle_cr_url=None if is_bicycle else body.vehicle_cr_url,
                vehicle_or_url=None if is_bicycle else body.vehicle_or_url,
                nbi_police_clearance_url=body.nbi_police_clearance_url,
                is_18_above=body.is_18_above,
                has_android_6=body.has_android_6,
                compliance_status="pending"
            )
            db.add(rider_prof)
            db.commit()

        # Referral logic
        if body.referral_code:
            referrer = db.query(Customer).filter(Customer.referral_code == body.referral_code).first()
            if referrer:
                referrer.loyalty_points += 500
                db.add(LoyaltyHistory(
                    customer_id=referrer.id,
                    description=f"Referral Bonus: Invited {full_name}",
                    points=500
                ))
                new_user.loyalty_points += 500
                db.add(LoyaltyHistory(
                    customer_id=new_user.id,
                    description=f"Referral Bonus: Joined via {referrer.name or 'friend'}",
                    points=500
                ))
                db.commit()
    

    # For business accounts, don't issue a JWT — they must wait for admin approval
    if body.role == "business":
        if body.email in OTP_STORE:
            del OTP_STORE[body.email]
        return {"status": "pending_approval", "message": "Registration submitted. Your clinic is under review."}

    # Generate JWT for user accounts
    token_data = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role,
        "name": new_user.name,
        "first_name": new_user.first_name,
        "middle_name": new_user.middle_name,
        "last_name": new_user.last_name,
        "suffix": new_user.suffix,
        "phone": new_user.phone,
        "gender": new_user.gender,
        "birthday": new_user.birthday,
        "avatar": new_user.picture,
        "has_password": bool(new_user.password_hash)
    }
    token = create_access_token(token_data)
    
    # Cleanup OTP after successful signup
    if body.email in OTP_STORE:
        del OTP_STORE[body.email]
        
    return {"message": "Registration successful", "token": token}

# ─── File Upload Endpoint ────────────────────────────────────────────────────

UPLOAD_DIR = "uploads/compliance"
PRODUCT_UPLOAD_DIR = "uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PRODUCT_UPLOAD_DIR, exist_ok=True)

@app.post("/api/business/upload-document")
async def upload_compliance_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...)
):
    """Upload a compliance document (BAI or Mayor's Permit) and return its URL."""
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".pdf"
    if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, and PNG files are accepted.")
    unique_name = f"{doc_type}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://localhost:8000/{UPLOAD_DIR}/{unique_name}"}

@app.post("/api/business/upload-product-image")
async def upload_product_image(
    file: UploadFile = File(...),
):
    """Upload a product image and return its URL."""
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG and WEBP files are accepted.")
    
    unique_name = f"prod_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(PRODUCT_UPLOAD_DIR, unique_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"http://localhost:8000/{PRODUCT_UPLOAD_DIR}/{unique_name}"}

# ─── Product Catalog Endpoints ───────────────────────────────────────────────

@app.get("/api/catalog", response_model=List[ProductSchema])
async def get_public_catalog(db: Session = Depends(get_db)):
    """Fetch all products across all clinics for the user marketplace."""
    results = db.query(Product, BusinessProfile.clinic_name)\
        .join(BusinessProfile, Product.business_id == BusinessProfile.id)\
        .filter(Product.is_archived == False)\
        .order_by(Product.created_at.desc()).all()
    
    catalog = []
    for p, clinic_name in results:
        # Convert SQLAlchemy object to dict and inject clinic_name
        p_dict = {column.name: getattr(p, column.name) for column in p.__table__.columns}
        p_dict["clinic_name"] = clinic_name
        catalog.append(p_dict)
    return catalog

@app.get("/api/catalog/{product_id}", response_model=ProductSchema)
async def get_product_detail(product_id: int, branch_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Fetch a single product's details by ID, computing real stars and review count."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Calculate real aggregate stats from reviews
    reviews_data = db.query(
        func.avg(ProductReview.rating).label("avg_rating"),
        func.count(ProductReview.id).label("review_count")
    ).filter(ProductReview.product_id == product_id).first()
    
    product.stars = float(reviews_data.avg_rating) if reviews_data.avg_rating else 0.0
    product.review_count = int(reviews_data.review_count) if reviews_data.review_count else 0

    # Inject clinic info
    biz = db.query(BusinessProfile).filter(BusinessProfile.id == product.business_id).first()
    if biz:
        product.clinic_name = biz.clinic_name
        product.clinic_phone = biz.clinic_phone
        product.clinic_lat = biz.clinic_lat
        product.clinic_lng = biz.clinic_lng
        
    # Override stock/coords if a specific branch is requested
    if branch_id:
        branch = db.query(BusinessBranch).filter(BusinessBranch.id == branch_id, BusinessBranch.business_id == product.business_id).first()
        if branch:
            # Override coordinates for the map
            product.clinic_lat = branch.lat if branch.lat else product.clinic_lat
            product.clinic_lng = branch.lng if branch.lng else product.clinic_lng
            # Override stock
            branch_inv = db.query(BranchInventory).filter(BranchInventory.product_id == product_id, BranchInventory.branch_id == branch_id).first()
            product.stock = branch_inv.stock if branch_inv else 0

    # Fetch branch availability
    branches = db.query(BusinessBranch).filter(BusinessBranch.business_id == product.business_id).all()
    inventory = db.query(BranchInventory).filter(BranchInventory.product_id == product_id).all()
    inv_map = {inv.branch_id: inv.stock for inv in inventory}
    
    branch_stocks = []
    for b in branches:
        # Construct full address
        addr_parts = [b.house_number, b.block_number, b.street, b.subdivision, b.sitio, b.barangay, b.city, b.province]
        full_addr = ", ".join([p for p in addr_parts if p and p.strip()])
        if not full_addr and (b.address_line1 or b.address_line2):
            full_addr = ", ".join([p for p in [b.address_line1, b.address_line2] if p and p.strip()])

        branch_stocks.append({
            "branch_id": b.id,
            "name": b.name,
            "stock": inv_map.get(b.id, 0),
            "lat": b.lat,
            "lng": b.lng,
            "address": full_addr
        })
    product.branch_availability = branch_stocks
    
    return product

@app.get("/api/business/catalog", response_model=List[ProductSchema])
async def get_business_catalog(
    branch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch products. If branch_id is provided, return stock for that specific branch."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    business_id = int(current_user["sub"])
    
    # Base query: Only active (non-archived) products
    query = db.query(Product).filter(Product.business_id == business_id, Product.is_archived == False)
    
    products = query.order_by(Product.created_at.desc()).all()
    
    # If branch_id is specified, we need to adjust the .stock field based on branch inventory
    # For "All Branches" (no branch_id), we might want to sum or just return the list with distribution info
    
    for p in products:
        # Load inventory distribution for management UI
        distribution = db.query(BranchInventory).filter(BranchInventory.product_id == p.id).all()
        p.inventory_distribution = {str(inv.branch_id): inv.stock for inv in distribution}
        
        if branch_id:
            # Override .stock with branch-specific stock
            branch_inv = next((inv for inv in distribution if inv.branch_id == branch_id), None)
            p.stock = branch_inv.stock if branch_inv else 0
        else:
            # For aggregate view, we can choose to sum or keep legacy global stock
            # Let's sum for accuracy if distribution exists
            if distribution:
                p.stock = sum(inv.stock for inv in distribution)

    return products

@app.post("/api/business/catalog", response_model=ProductSchema)
async def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a new product to the business's own catalog."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
        
    business_id = int(current_user["sub"])
    new_product = Product(
        business_id=business_id,
        name=body.name,
        description=body.description,
        price=body.price,
        stock=body.stock,
        category=body.category,
        type=body.type,
        sku=body.sku,
        image=body.image or "/images/product_placeholder.png",
        tag=body.tag or "New",
        weight=body.weight,
        variants_json=body.variants_json,
        sizes_json=body.sizes_json,
        stars=0.0,
        loyalty_points=body.loyalty_points or 0
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Handle inventory distribution initialization
    if body.inventory_distribution:
        for b_id, s_val in body.inventory_distribution.items():
            inv = BranchInventory(product_id=new_product.id, branch_id=int(b_id), stock=int(s_val))
            db.add(inv)
        db.commit()
        
    return new_product

@app.put("/api/business/catalog/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Edit an existing product item."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
        
    business_id = int(current_user["sub"])
    product = db.query(Product).filter(Product.id == product_id, Product.business_id == business_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")
        
    if body.name is not None: product.name = body.name
    if body.description is not None: product.description = body.description
    if body.price is not None: product.price = body.price
    if body.stock is not None: product.stock = body.stock
    if body.category is not None: product.category = body.category
    if body.type is not None: product.type = body.type
    if body.sku is not None: product.sku = body.sku
    if body.image is not None: product.image = body.image
    if body.tag is not None: product.tag = body.tag
    if body.loyalty_points is not None: product.loyalty_points = body.loyalty_points
    if body.weight is not None: product.weight = body.weight
    if body.variants_json is not None: product.variants_json = body.variants_json
    if body.sizes_json is not None: product.sizes_json = body.sizes_json
    
    # Handle inventory distribution update
    if body.inventory_distribution is not None:
        for b_id, s_val in body.inventory_distribution.items():
            branch_id_int = int(b_id)
            stock_int = int(s_val)
            # Find existing record or create new
            inv = db.query(BranchInventory).filter(BranchInventory.product_id == product.id, BranchInventory.branch_id == branch_id_int).first()
            if inv:
                inv.stock = stock_int
            else:
                inv = BranchInventory(product_id=product.id, branch_id=branch_id_int, stock=stock_int)
                db.add(inv)
    
    db.commit()
    db.refresh(product)
    return product

@app.delete("/api/business/catalog/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a product from the business's own catalog."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    business_id = int(current_user["sub"])
    product = db.query(Product).filter(Product.id == product_id, Product.business_id == business_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Mark as archived instead of hard deleting to preserve order history and satisfy FK constraints
    product.is_archived = True
    db.commit()
    return {"message": "Product deleted"}

# --- Product Reviews Endpoints ---

@app.post("/api/catalog/{product_id}/reviews", response_model=ReviewSchema)
async def create_product_review(
    product_id: int,
    body: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Authenticated customer leaves a review for a product."""
    customer_id = int(current_user["sub"])
    
    # 1. Verify if the user actually bought and completed the order for this product
    from sqlalchemy import and_
    purchased = db.query(Order).join(OrderItem, Order.id == OrderItem.order_id)\
        .filter(
            Order.customer_id == customer_id,
            Order.status == "Completed",
            OrderItem.product_id == product_id
        ).first()
    
    if not purchased:
        raise HTTPException(
            status_code=403, 
            detail="You can only review products from successfully completed orders."
        )
    
    # 2. Prevent duplicate reviews from the same user for the same product
    existing = db.query(ProductReview).filter(
        ProductReview.product_id == product_id,
        ProductReview.customer_id == customer_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product.")

    new_review = ProductReview(
        product_id=product_id,
        customer_id=customer_id,
        rating=body.rating,
        comment=body.comment,
        image_url=body.image_url
    )
    db.add(new_review)
    db.commit()
    
    # Update Product Average
    avg_rating = db.query(func.avg(ProductReview.rating)).filter(ProductReview.product_id == product_id).scalar()
    db.query(Product).filter(Product.id == product_id).update({"stars": float(avg_rating) if avg_rating else 0.0})
    db.commit()

    db.refresh(new_review)
    
    # Return with customer name
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    review_dict = {column.name: getattr(new_review, column.name) for column in new_review.__table__.columns}
    review_dict["customer_name"] = customer.first_name + " " + customer.last_name if customer and customer.first_name else (customer.name if customer else "Anonymous")
    
    return review_dict

@app.get("/api/catalog/{product_id}/reviews", response_model=List[ReviewSchema])
async def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    """Publicly fetch all reviews for a product."""
    results = db.query(ProductReview, Customer.first_name, Customer.last_name, Customer.name)\
        .join(Customer, ProductReview.customer_id == Customer.id)\
        .filter(ProductReview.product_id == product_id)\
        .order_by(ProductReview.created_at.desc()).all()
    
    reviews = []
    for r, fn, ln, name in results:
        rev_dict = {column.name: getattr(r, column.name) for column in r.__table__.columns}
        rev_dict["customer_name"] = f"{fn} {ln}" if fn else (name or "Anonymous")
        reviews.append(rev_dict)
    return reviews

@app.get("/api/business/reviews")
async def get_business_reviews(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Business owner sees all reviews for their products."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    business_id = int(current_user["sub"])
    
    query = db.query(ProductReview, Product.name, Customer.first_name, Customer.last_name, Customer.name)\
        .join(Product, ProductReview.product_id == Product.id)\
        .join(Customer, ProductReview.customer_id == Customer.id)\
        .filter(Product.business_id == business_id)
    
    if branch_id:
        # If we want to filter reviews by branch, we need to find orders for those products at that branch
        # For simplicity, we'll look at the branch_id in the Order if we were to link them, 
        # but since ProductReview doesn't have order_id directly, we might skip or filter by product availability in branch.
        # However, for now, let's assume the user wants general reviews if branch_id is provided, 
        # OR we could join with Order if we had a link. 
        # For now, let's keep it simple as reviews are usually global for a business.
        pass

    results = query.order_by(ProductReview.created_at.desc()).all()
    
    reviews = []
    for r, prod_name, fn, ln, name in results:
        rev_dict = {column.name: getattr(r, column.name) for column in r.__table__.columns}
        rev_dict["product_name"] = prod_name
        rev_dict["customer_name"] = f"{fn} {ln}" if fn else (name or "Anonymous")
        reviews.append(rev_dict)
    return reviews

# ─── Reservation Endpoints ────────────────────────────────────────────────────

def _reservation_to_dict(r: Reservation, customer_name: Optional[str] = None) -> dict:
    return {
        "id": r.tracking_id or f"RV-{r.id:04d}",
        "tracking_id": r.tracking_id or f"RV-{r.id:04d}",
        "db_id": r.id,
        "customer_id": r.customer_id,
        "customer_name": customer_name or f"Customer #{r.customer_id}",
        "business_id": r.business_id,
        "branch_id": r.branch_id,
        "pet_name": r.pet_name,
        "service": r.service,
        "date": r.date,
        "time": r.time,
        "status": r.status,
        "payment_status": getattr(r, 'payment_status', 'unpaid') or 'unpaid',
        "paymongo_session_id": getattr(r, 'paymongo_session_id', None),
        "location": r.location or "",
        "notes": r.notes or "",
        "total": r.total_amount,
        "total_amount": r.total_amount,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }

@app.get("/api/public/verify/{tracking_id}", response_class=HTMLResponse)
async def verify_reservation_public(tracking_id: str, db: Session = Depends(get_db)):
    """Public verification page for QR codes - mobile friendly."""
    # Find reservation
    res = db.query(Reservation).filter(Reservation.tracking_id == tracking_id).first()
    if not res:
        return HTMLResponse(content="""
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
                <h1 style="color: #ef4444;">Invalid Receipt</h1>
                <p>This reservation ID could not be verified in our system.</p>
                <a href="/" style="color: #ea580c; text-decoration: none;">Return to Home</a>
            </body></html>
        """, status_code=404)

    # Fetch clinic and customer for more context
    clinic = db.query(BusinessProfile).filter(BusinessProfile.id == res.business_id).first()
    customer = db.query(Customer).filter(Customer.id == res.customer_id).first()
    
    clinic_name = clinic.clinic_name if clinic else "Hi-Vet Clinic"
    customer_name = f"{customer.first_name} {customer.last_name}" if customer and customer.first_name else (customer.name if customer else "Guest")
    
    # Format Date
    try:
        raw_date = datetime.strptime(res.date, "%Y-%m-%d")
        formatted_date = raw_date.strftime("%B %d, %Y")
    except:
        formatted_date = res.date

    status_color = "#22c55e" if res.status in ["Confirmed", "Completed"] else "#ea580c" if res.status == "Pending" else "#94a3b8"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Verified - Hi-Vet</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" rel="stylesheet">
        <style>
            body {{ 
                margin: 0; padding: 0; 
                font-family: 'Outfit', sans-serif; 
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
                color: #f8fafc;
                min-height: 100vh;
                display: flex; justify-content: center; align-items: center;
            }}
            .container {{
                width: 90%; max-width: 450px;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 40px;
                padding: 40px 30px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                text-align: center;
                animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
            }}
            @keyframes slideUp {{
                from {{ transform: translateY(30px); opacity: 0; }}
                to {{ transform: translateY(0); opacity: 1; }}
            }}
            .status-badge {{
                display: inline-block;
                padding: 10px 24px;
                background: {status_color};
                color: white;
                border-radius: 50px;
                font-size: 11px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 30px;
                box-shadow: 0 10px 20px -5px {status_color}66;
            }}
            .icon-wrapper {{
                width: 80px; height: 80px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 30px;
                display: flex; justify-content: center; align-items: center;
                margin: 0 auto 30px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }}
            .icon-wrapper svg {{ width: 40px; height: 40px; color: #ea580c; }}
            h1 {{ font-size: 28px; font-weight: 900; margin: 0 0 10px; }}
            .subtitle {{ color: #94a3b8; font-size: 14px; margin-bottom: 40px; }}
            
            .receipt-card {{
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 30px;
                padding: 30px;
                text-align: left;
                margin-bottom: 30px;
            }}
            .row {{ display: flex; justify-content: space-between; margin-bottom: 15px; }}
            .label {{ color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }}
            .value {{ color: #f1f5f9; font-size: 14px; font-weight: 700; }}
            .divider {{ height: 1px; background: rgba(255, 255, 255, 0.05); margin: 20px 0; }}
            .total-row {{ display: flex; justify-content: space-between; align-items: flex-end; }}
            .total-label {{ color: #f8fafc; font-size: 14px; font-weight: 900; }}
            .total-value {{ color: #ea580c; font-size: 24px; font-weight: 900; }}
            
            .footer-claim {{ color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-badge">{res.status}</div>
            <div class="icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h1>Verified Receipt</h1>
            <p class="subtitle">Valid Reservation – {clinic_name}</p>
            
            <div class="receipt-card">
                <div class="row">
                    <span class="label">ID</span>
                    <span class="value">{res.tracking_id}</span>
                </div>
                <div class="row">
                    <span class="label">Customer</span>
                    <span class="value">{customer_name}</span>
                </div>
                <div class="row">
                    <span class="label">Pet</span>
                    <span class="value">{res.pet_name}</span>
                </div>
                <div class="row">
                    <span class="label">Service</span>
                    <span class="value">{res.service}</span>
                </div>
                <div class="divider"></div>
                <div class="row">
                    <span class="label">Date</span>
                    <span class="value">{formatted_date}</span>
                </div>
                <div class="row">
                    <span class="label">Time</span>
                    <span class="value">{res.time}</span>
                </div>
                <div class="divider"></div>
                <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">₱{res.total_amount:,.2f}</span>
                </div>
            </div>
            
            <div class="footer-claim">Verified by Hi-Vet Security</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/api/reservations")

async def get_reservations(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch reservations. Customers see their own; businesses see all incoming for them."""
    role = current_user.get("role")
    user_id = int(current_user["sub"])
    if role == "business":
        query = db.query(Reservation, Customer.name).join(Customer, Reservation.customer_id == Customer.id).filter(Reservation.business_id == user_id)
        if branch_id:
            query = query.filter(Reservation.branch_id == branch_id)
        results = []
        for r, name in query.order_by(Reservation.created_at.desc()).all():
            results.append(_reservation_to_dict(r, customer_name=name))
        return {"reservations": results}
    else:
        items = db.query(Reservation).filter(Reservation.customer_id == user_id).order_by(Reservation.created_at.desc()).all()
        return {"reservations": [_reservation_to_dict(r) for r in items]}

@app.get("/api/reservations/booked")
async def get_booked_slots(clinic_id: int, date: str, db: Session = Depends(get_db)):
    """Fetch all booked time slots for a specific clinic and date."""
    bookings = db.query(Reservation).filter(
        Reservation.business_id == clinic_id,
        Reservation.date == date,
        Reservation.status.in_(["Pending", "Confirmed", "Ready for Pickup"])
    ).all()
    return {"booked_times": [b.time for b in bookings]}

@app.post("/api/reservations")
async def create_reservation(
    body: ReservationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Customer creates a new reservation with rigorous validation."""
    customer_id = int(current_user["sub"])
    
    # 1. Parse and validate requested date and time
    try:
        # Expected formats: date="YYYY-MM-DD", time="09:00 AM"
        res_date_obj = datetime.strptime(body.date, "%Y-%m-%d").date()
        res_time_obj = datetime.strptime(body.time, "%I:%M %p").time()
        res_datetime = datetime.combine(res_date_obj, res_time_obj)
        
        # Current time in Philippine Standard Time (UTC+8)
        now_pht = datetime.utcnow() + timedelta(hours=8)
        
        # Check if in the past (with a 10-minute grace period for same-day submissions)
        # This prevents 400 errors for "just now" bookings if the server/client clocks drift.
        grace_period = timedelta(minutes=10)
        if res_datetime < (now_pht - grace_period):
            raise HTTPException(
                status_code=400, 
                detail="Cannot book a reservation in the past. Please select a future time slot."
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format.")

    # 2. Check Operating Hours (Special Date Overrides first)
    if not body.business_id:
        raise HTTPException(status_code=400, detail="A valid Healthcare Provider (Business ID) is required to book a reservation.")

    special = db.query(BusinessSpecialDateHours).filter(
        BusinessSpecialDateHours.business_id == body.business_id,
        BusinessSpecialDateHours.specific_date == body.date
    ).first()
    
    selected_hours = None
    if special:
        if not special.is_open:
            raise HTTPException(status_code=400, detail=f"The clinic has marked {body.date} as a closed holiday/special date.")
        selected_hours = special
    else:
        # Check regular hours (0=Sun in DB, 1=Mon, ..., 6=Sat)
        # res_date_obj.weekday() returns 0=Mon, ..., 6=Sun
        dow_db = (res_date_obj.weekday() + 1) % 7
        hours = db.query(BusinessOperatingHours).filter(
            BusinessOperatingHours.business_id == body.business_id,
            BusinessOperatingHours.day_of_week == dow_db
        ).first()
        
        if not hours:
            # Fallback: If no hours are defined, the clinic might not have finished setup.
            # Instead of a generic 400, provide a helpful error.
            raise HTTPException(
                status_code=400, 
                detail="Clinic configuration error: Operating hours are not defined for this day. Please contact the clinic."
            )
            
        if not hours.is_open:
            raise HTTPException(status_code=400, detail="The clinic is closed on this day of the week.")
        selected_hours = hours

    # 3. Time range check (Clinic Open/Close and Break)
    if selected_hours:
        try:
            open_t = datetime.strptime(selected_hours.open_time, "%I:%M %p").time()
            close_t = datetime.strptime(selected_hours.close_time, "%I:%M %p").time()
            
            if res_time_obj < open_t or res_time_obj >= close_t:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Requested time is outside business hours. This clinic is open from {selected_hours.open_time} to {selected_hours.close_time}."
                )
            
            # Check Break time
            if getattr(selected_hours, 'break_start', None) and getattr(selected_hours, 'break_end', None):
                break_s = datetime.strptime(selected_hours.break_start, "%I:%M %p").time()
                break_e = datetime.strptime(selected_hours.break_end, "%I:%M %p").time()
                if res_time_obj >= break_s and res_time_obj < break_e:
                    raise HTTPException(status_code=400, detail="The clinic is on break during this requested time period.")
        except ValueError:
            # If clinic hours in DB are misconfigured
            raise HTTPException(status_code=500, detail="Clinic operating hours are misconfigured in our system.")

    # 4. Double-Booking Prevention
    # Check if any non-cancelled order already exists for this clinic, date, and time.
    existing = db.query(Reservation).filter(
        Reservation.business_id == body.business_id,
        Reservation.date == body.date,
        Reservation.time == body.time,
        Reservation.status.in_(["Pending", "Confirmed", "Ready for Pickup"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is already reserved. Please choose another time.")

    # 5. Handle Voucher Application
    base_price = body.total_amount or 0.0
    final_amount = base_price
    voucher_id_applied = None
    applied_voucher_title = None
    applied_voucher_type = None
    
    if body.voucher_code:
        v_res = db.query(UserVoucher, LoyaltyVoucher).join(
            LoyaltyVoucher, UserVoucher.voucher_id == LoyaltyVoucher.id
        ).filter(
            UserVoucher.code == body.voucher_code.upper(),
            UserVoucher.customer_id == customer_id,
            UserVoucher.is_used == False
        ).first()
        
        if v_res:
            uv, lv = v_res
            if lv.type == "Service":
                # For Service vouchers, we currently assume they make the service FREE
                # or match the specifically redeemed service.
                final_amount = 0.0
                uv.is_used = True
                voucher_id_applied = uv.id
                applied_voucher_title = lv.title
                applied_voucher_type = lv.type
                
                # Add history entry
                db.add(LoyaltyHistory(
                    customer_id=customer_id,
                    description=f"Service Reward Applied – {lv.title}",
                    points=0
                ))
            else:
                # If it's a discount/credit voucher, it shouldn't be here but we can handle it if needed
                # For now, we only allow Service vouchers in reservations as requested
                pass

    # 6. Create the reservation
    # Apply strict rounding to avoid floating point precision issues (e.g., 0.000000001)
    final_amount = round(float(final_amount), 2)
    if final_amount < 0.01:
        final_amount = 0.0

    new_status = "Pending" if final_amount <= 0 else "Payment Pending"
    new_payment_status = "paid" if final_amount <= 0 else "unpaid"

    new_res = Reservation(
        customer_id=customer_id,
        business_id=body.business_id,
        branch_id=body.branch_id,
        service_id=body.service_id,
        pet_name=body.pet_name,
        service=body.service,
        date=body.date,
        time=body.time,
        location=body.location,
        notes=body.notes,
        total_amount=final_amount,
        voucher_code=body.voucher_code if voucher_id_applied else None,
        status=new_status,
        payment_status=new_payment_status,
    )
    db.add(new_res)
    db.commit()
    db.refresh(new_res)

    # 7. Collect Data for Receipt/Notification Summary
    customer_name = current_user.get("name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or "Valued Customer"
    
    # Fetch Clinic Name
    clinic_name = db.query(BusinessProfile.clinic_name).filter(BusinessProfile.id == body.business_id).scalar() or "Hi-Vet Clinic"
    
    # Format Date (e.g., April 9, 2026)
    try:
        raw_date = datetime.strptime(new_res.date, "%Y-%m-%d")
        formatted_date = raw_date.strftime("%B %d, %Y")
    except:
        formatted_date = new_res.date

    # Generate Professional Tracking ID
    curr_year = datetime.now().year
    rand_suffix = random.randint(1000, 9999)
    tracking_id = f"#RV-{curr_year}-{new_res.id:06d}-{rand_suffix}"
    new_res.tracking_id = tracking_id
    db.commit()
    
    # Prepare QR content (Verification URL)
    base_url = str(request.base_url).rstrip('/')
    verify_url = f"{base_url}/api/public/verify/{tracking_id}"
    
    receipt_data = {
        "reservation_id": tracking_id,
        "customer_name": customer_name,
        "clinic_name": clinic_name,
        "pet_name": new_res.pet_name,
        "service_name": new_res.service,
        "date": formatted_date,
        "time": new_res.time,
        "location": new_res.location or "Main Clinic",
        "base_price": f"₱{base_price:,.2f}",
        "discount_amount": f"-₱{base_price:,.2f}" if voucher_id_applied else "₱0.00",
        "total_amount": f"₱{new_res.total_amount:,.2f}",
        "status": new_res.status,
        "payment_status": "PAID (Voucher)" if new_res.total_amount <= 0 else "Pending Payment",
        "notes": new_res.notes or "N/A",
        "voucher_code": new_res.voucher_code,
        "voucher_title": applied_voucher_title,
        "voucher_type": applied_voucher_type,
        "qr_content": urllib.parse.quote(verify_url)
    }

    # 8. NOTIFY BUSINESS OWNER
    add_notification(
        db, body.business_id, "System",
        "New Reservation Request!",
        f"A new booking for {body.service} ({body.pet_name}) by {customer_name}. Status: {new_res.status}.",
        "/dashboard/business/reservations",
        role="business"
    )
    
    # 9. NOTIFY CUSTOMER
    add_notification(
        db, customer_id, "System",
        "Reservation Confirmed" if new_res.total_amount <= 0 else "Reservation Initiated",
        f"Your reservation for {body.service} is {'confirmed' if new_res.total_amount <= 0 else 'initiated'}. Thank you for choosing Hi-Vet.",
        "/dashboard/customer/reservations"
    )

    # 10. Send Professional Bespoke Emails (Landscape)
    # Email to Customer
    asyncio.create_task(send_bespoke_reservation_email(
        to_email=current_user.get("email"),
        receipt_data=receipt_data
    ))
    
    # Email to Business Owner
    biz_email = db.query(BusinessProfile.email).filter(BusinessProfile.id == body.business_id).scalar()
    if biz_email:
        asyncio.create_task(send_bespoke_reservation_email(
            to_email=biz_email,
            receipt_data=receipt_data,
            is_business=True
        ))

    return {"reservation": _reservation_to_dict(new_res, customer_name=customer_name)}

@app.patch("/api/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cancel a reservation (customer or business)."""
    customer_id = int(current_user["sub"])
    role = current_user.get("role")
    if role == "business":
        res = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.business_id == customer_id).first()
    else:
        res = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.customer_id == customer_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if res.status in ["Completed", "Cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed or already-cancelled reservation")
    res.status = "Cancelled"
    
    # Return voucher if one was applied
    if getattr(res, 'voucher_code', None):
        uv = db.query(UserVoucher).filter(
            UserVoucher.code == res.voucher_code,
            UserVoucher.customer_id == res.customer_id
        ).first()
        if uv:
            uv.is_used = False
            db.add(LoyaltyHistory(
                customer_id=res.customer_id,
                description=f"Voucher Returned – Cancellation of {res.service}",
                points=0
            ))
            
    db.commit()
    db.refresh(res)

    add_notification(
        db, res.customer_id, "System", 
        "Reservation Cancelled", 
        f"Your reservation for {res.service} on {res.date} has been cancelled.",
        "/dashboard/customer/reservations"
    )
    # NOTIFY BUSINESS OWNER
    if res.business_id:
        add_notification(
            db, res.business_id, "System",
            "Reservation Cancelled",
            f"Reservation #RV-{res.id:04d} for {res.service} has been cancelled.",
            "/dashboard/business/reservations",
            role="business"
        )

    return {"reservation": _reservation_to_dict(res)}

@app.delete("/api/reservations/{reservation_id}")
async def delete_reservation(reservation_id: int, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.customer_id == customer_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Only allow deleting cancelled reservations
    if res.status != "Cancelled":
        raise HTTPException(status_code=400, detail="Only cancelled reservations can be deleted")

    db.delete(res)
    db.commit()
    
    return {"message": "Reservation deleted permanently"}

@app.patch("/api/reservations/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: int,
    body: ReservationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Business updates a reservation's status."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    res = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.business_id == business_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    valid_statuses = ["Pending", "Confirmed", "Ready for Pickup", "Completed", "Cancelled"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    old_status = res.status
    
    # Validation: Cannot confirm if time has passed
    from datetime import datetime
    try:
        now = datetime.now()
        res_dt = datetime.strptime(f"{res.date} {res.time}", "%Y-%m-%d %I:%M %p")
        if body.status == "Confirmed" and res_dt < now:
            raise HTTPException(status_code=400, detail="Cannot confirm a reservation whose time has already passed.")
    except Exception as e:
        print(f"Error parsing date/time: {e}")

    # Validation: Prevention of double-booking on confirmation
    if body.status == "Confirmed" and old_status != "Confirmed":
        existing_confirmed = db.query(Reservation).filter(
            Reservation.business_id == business_id,
            Reservation.date == res.date,
            Reservation.time == res.time,
            Reservation.status == "Confirmed",
            Reservation.id != reservation_id
        ).first()
        if existing_confirmed:
            raise HTTPException(status_code=400, detail="This time slot is already booked and confirmed by another client.")

    res.status = body.status
    
    # Award Loyalty Points on Completion
    if body.status == "Completed" and old_status != "Completed":
        biz = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
        if biz:
            customer = db.query(Customer).filter(Customer.id == res.customer_id).first()
            if customer:
                points_to_award = 0
                # 1. Check if the specific service has fixed fixed points
                if res.service_id:
                    service_obj = db.query(BusinessService).filter(BusinessService.id == res.service_id).first()
                    if service_obj and service_obj.loyalty_points > 0:
                        points_to_award = service_obj.loyalty_points
                
                # 2. If no fixed points, calculate based on reservation total (Professional Scale)
                if points_to_award == 0 and res.total_amount > 0:
                    points_to_award = int(res.total_amount * biz.loyalty_points_per_peso)
                
                # 3. Fallback to flat rate if still 0
                if points_to_award == 0:
                    points_to_award = biz.loyalty_points_per_reservation

                if points_to_award > 0:
                    customer.loyalty_points += points_to_award
                    db.add(LoyaltyHistory(
                        customer_id=customer.id,
                        description=f"Service Reward – {res.service} at {biz.clinic_name or 'Clinic'}",
                        points=points_to_award
                    ))
    
    db.commit()
    db.refresh(res)

    if old_status != res.status:
        status_msg = f"Your reservation status is now: {res.status}"
        if res.status == "Confirmed":
            status_msg = "Your reservation has been confirmed by the clinic!"
        elif res.status == "Ready for Pickup":
            status_msg = "Your pet/order is ready for pickup! Please proceed to the clinic."
        elif res.status == "Completed":
            status_msg = "Service completed. We hope to see you and your pet again soon!"
        elif res.status == "Cancelled":
            status_msg = "Your reservation was cancelled by the clinic."

        add_notification(
            db, res.customer_id, "System", 
            f"Reservation {res.status}", 
            status_msg,
            "/dashboard/customer/reservations"
        )

    return {"reservation": _reservation_to_dict(res)}

# ─── PayMongo Reservation Payment Endpoints ──────────────────────────────────

class ReservationCheckoutBody(BaseModel):
    reservation_id: int
    payment_method: Optional[str] = "gcash"  # gcash | paymaya | qrph

@app.post("/api/payments/paymongo/reservation-checkout")
async def create_reservation_checkout(
    body: ReservationCheckoutBody,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a PayMongo Checkout Session for a reservation."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = db.query(Reservation).filter(
        Reservation.id == body.reservation_id,
        Reservation.customer_id == customer_id
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if res.payment_status == "paid":
        raise HTTPException(status_code=400, detail="This reservation has already been paid.")
    if res.total_amount <= 0:
        raise HTTPException(status_code=400, detail="Reservation has no payable amount.")
    if res.total_amount < 1.0:
        raise HTTPException(status_code=400, detail="Online payment requires a minimum of ₱1.00. Please choose cash or contact the clinic.")

    # Fetch customer details for billing pre-fill
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    billing_name = "Guest User"
    billing_email = "email@example.com"
    billing_phone = None
    if customer:
        billing_email = customer.email
        billing_phone = customer.phone
        if customer.name:
            billing_name = customer.name
        elif customer.first_name and customer.last_name:
            billing_name = f"{customer.first_name} {customer.last_name}"

    # Fetch clinic name for description
    clinic = db.query(BusinessProfile).filter(BusinessProfile.id == res.business_id).first()
    clinic_name = clinic.clinic_name if clinic and clinic.clinic_name else "Hi-Vet Clinic"

    # Build billing info
    billing_info = {"name": billing_name, "email": billing_email}
    if billing_phone:
        billing_info["phone"] = billing_phone

    # Determine enabled payment methods
    method = body.payment_method or "gcash"
    if method == "paymaya":
        enabled_methods = ["paymaya"]
    elif method == "gcash":
        enabled_methods = ["gcash"]
    elif method == "qrph":
        enabled_methods = ["qrph"]
    else:
        # Fallback to current active types
        enabled_methods = ["qrph", "gcash", "paymaya"]

    amount_centavos = int(res.total_amount * 100)

    paymongo_payload = {
        "data": {
            "attributes": {
                "line_items": [{
                    "amount": amount_centavos,
                    "currency": "PHP",
                    "name": res.service,
                    "quantity": 1,
                    "description": f"Veterinary appointment for {res.pet_name} on {res.date} at {res.time}"
                }],
                "billing": billing_info,
                "payment_method_types": enabled_methods,
                "success_url": f"{FRONTEND_URL}/dashboard/customer/reservations/payment-success?reservation_id={res.id}",
                "cancel_url": f"{FRONTEND_URL}/dashboard/customer/reservations",
                "description": f"Reservation {res.tracking_id or f'#RV-{res.id:04d}'} – {res.service} at {clinic_name}",
                "send_email_receipt": False,
                "show_description": True,
                "show_line_items": True,
                "reference_number": res.tracking_id.replace('#', '') if res.tracking_id else f"RV-{res.id:04d}",
                "statement_descriptor": clinic_name[:22]
            }
        }
    }

    auth_header_val = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()

    async with httpx.AsyncClient() as client:
        try:
            # --- BRANCH: QRPH DIRECT FLOW ---
            if method == "qrph":
                pi_payload = {
                    "data": {
                        "attributes": {
                            "amount": amount_centavos,
                            "payment_method_allowed": ["qrph"],
                            "currency": "PHP",
                            "description": f"Reservation at {clinic_name} ({res.tracking_id or f'#RV-{res.id:04d}'})",
                            "statement_descriptor": clinic_name[:22]
                        }
                    }
                }
                pi_resp = await client.post("https://api.paymongo.com/v1/payment_intents", json=pi_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if pi_resp.status_code not in [200, 201]:
                    print(f"PI Error: {pi_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to create payment intent")
                pi_data = pi_resp.json()["data"]
                intent_id = pi_data["id"]
                client_key = pi_data["attributes"]["client_key"]

                pm_payload = {
                    "data": {
                        "attributes": {
                            "type": "qrph",
                            "billing": {
                                "name": billing_name,
                                "email": billing_email,
                                "phone": billing_phone or ""
                            }
                        }
                    }
                }
                pm_resp = await client.post("https://api.paymongo.com/v1/payment_methods", json=pm_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if pm_resp.status_code not in [200, 201]:
                    print(f"PM Error: {pm_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to create payment method")
                pm_id = pm_resp.json()["data"]["id"]

                attach_payload = {
                    "data": {
                        "attributes": {
                            "payment_method": pm_id,
                            "client_key": client_key
                        }
                    }
                }
                attach_resp = await client.post(f"https://api.paymongo.com/v1/payment_intents/{intent_id}/attach", json=attach_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if attach_resp.status_code != 200:
                    print(f"Attach Error: {attach_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to attach payment method")
                
                qr_image_url = attach_resp.json()["data"]["attributes"]["next_action"]["code"]["image_url"]
                
                res.paymongo_intent_id = intent_id
                res.paymongo_qr_data = qr_image_url
                db.commit()

                return {"qr_code": qr_image_url, "intent_id": intent_id}

            # --- BRANCH: HOSTED ---
            response = await client.post(
                "https://api.paymongo.com/v1/checkout_sessions",
                json=paymongo_payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Basic {auth_header_val}"
                }
            )
            if response.status_code != 200:
                print(f"PayMongo Reservation Error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create payment session")

            res_data = response.json()
            checkout_url = res_data["data"]["attributes"]["checkout_url"]
            session_id = res_data["data"]["id"]

            res.paymongo_session_id = session_id
            db.commit()

            return {"checkout_url": checkout_url, "reservation_id": res.id}

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"PayMongo Reservation Exception: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/payments/paymongo/reservation-confirm/{reservation_id}")
async def confirm_reservation_payment(
    reservation_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Mark a reservation as paid and activate it after successful PayMongo checkout."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.customer_id == customer_id
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if res.payment_status != "paid":
        res.payment_status = "paid"
        res.status = "Pending"
        db.commit()
        db.refresh(res)

        add_notification(
            db, customer_id, "System",
            "Reservation Confirmed & Paid!",
            f"Payment received for {res.service} on {res.date} at {res.time}. Your appointment is now pending clinic confirmation.",
            "/dashboard/customer/reservations"
        )
        
        # TRIGGER EMAIL RECEIPT
        send_clinic_reservation_receipt(db, reservation_id)

        # NOTIFY BUSINESS OWNER
        add_notification(
            db, res.business_id, "System",
            "Reservation Paid & Confirmed!",
            f"Reservation #RV-{res.id:04d} for {res.service} has been successfully paid.",
            "/dashboard/business/reservations",
            role="business"
        )

    return {"message": "Payment confirmed", "status": res.status, "payment_status": res.payment_status}



DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

@app.get("/api/business/operating-hours")
async def get_operating_hours(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch the business's operating hours. Auto-creates defaults if none exist."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    hours = db.query(BusinessOperatingHours).filter(BusinessOperatingHours.business_id == business_id).order_by(BusinessOperatingHours.day_of_week).all()
    if not hours:
        # Seed defaults: Mon-Sat open 9AM-6PM, Sun closed
        defaults = []
        for day in range(7):
            defaults.append(BusinessOperatingHours(
                business_id=business_id,
                day_of_week=day,
                is_open=(day != 0),  # Sunday closed
                open_time="09:00 AM",
                break_start="12:00 PM",
                break_end="01:00 PM",
                close_time="06:00 PM",
            ))
        db.add_all(defaults)
        db.commit()
        hours = db.query(BusinessOperatingHours).filter(BusinessOperatingHours.business_id == business_id).order_by(BusinessOperatingHours.day_of_week).all()
    return {"hours": [{"id": h.id, "day_of_week": h.day_of_week, "day_name": DAYS_OF_WEEK[h.day_of_week], "is_open": h.is_open, "open_time": h.open_time, "break_start": h.break_start, "break_end": h.break_end, "close_time": h.close_time} for h in hours]}

@app.put("/api/business/operating-hours")
async def update_operating_hours(
    body: OperatingHoursUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Business updates operating hours for each day."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    for entry in body.hours:
        hour = db.query(BusinessOperatingHours).filter(
            BusinessOperatingHours.business_id == business_id,
            BusinessOperatingHours.day_of_week == entry.day_of_week
        ).first()
        if hour:
            hour.is_open = entry.is_open
            hour.open_time = entry.open_time
            hour.break_start = entry.break_start
            hour.break_end = entry.break_end
            hour.close_time = entry.close_time
        else:
            db.add(BusinessOperatingHours(business_id=business_id, day_of_week=entry.day_of_week, is_open=entry.is_open, open_time=entry.open_time, break_start=entry.break_start, break_end=entry.break_end, close_time=entry.close_time))
    db.commit()
    return {"message": "Operating hours updated successfully"}

# ─── Business Services Endpoints ─────────────────────────────────────────────

@app.get("/api/business/services", response_model=List[BusinessServiceSchema])
async def get_business_services(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch all services offered by the logged-in business."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    return db.query(BusinessService).filter(BusinessService.business_id == business_id).order_by(BusinessService.created_at.desc()).all()

@app.post("/api/business/services", response_model=BusinessServiceSchema)
async def create_business_service(
    body: BusinessServiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a new service to the business's service menu."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    new_service = BusinessService(
        business_id=business_id,
        name=body.name,
        description=body.description,
        price=body.price,
        duration_minutes=body.duration_minutes or 60,
        is_active=body.is_active if body.is_active is not None else True,
        loyalty_points=body.loyalty_points or 0,
        is_package=body.is_package if body.is_package is not None else False,
        package_items_json=body.package_items_json
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service

@app.put("/api/business/services/{service_id}", response_model=BusinessServiceSchema)
async def update_business_service(
    service_id: int,
    body: BusinessServiceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a business service."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    service = db.query(BusinessService).filter(BusinessService.id == service_id, BusinessService.business_id == business_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if body.name is not None: service.name = body.name
    if body.description is not None: service.description = body.description
    if body.price is not None: service.price = body.price
    if body.duration_minutes is not None: service.duration_minutes = body.duration_minutes
    if body.is_active is not None: service.is_active = body.is_active
    if body.loyalty_points is not None: service.loyalty_points = body.loyalty_points
    if body.is_package is not None: service.is_package = body.is_package
    if body.package_items_json is not None: service.package_items_json = body.package_items_json
    db.commit()
    db.refresh(service)
    return service

@app.delete("/api/business/services/{service_id}")
async def delete_business_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a service from the business's menu."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    service = db.query(BusinessService).filter(BusinessService.id == service_id, BusinessService.business_id == business_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()
    return {"message": "Service deleted"}

# ─── Business Special Date Hours Endpoints ────────────────────────────────────

@app.get("/api/business/special-hours", response_model=List[SpecialDateHoursSchema])
async def get_special_hours(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch all special date operating hour overrides for the business."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    return db.query(BusinessSpecialDateHours).filter(BusinessSpecialDateHours.business_id == business_id).order_by(BusinessSpecialDateHours.specific_date.asc()).all()

@app.post("/api/business/special-hours", response_model=SpecialDateHoursSchema)
async def upsert_special_hours(
    body: SpecialDateHoursCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add or update an override for a specific date."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    
    # Check if exists
    existing = db.query(BusinessSpecialDateHours).filter(
        BusinessSpecialDateHours.business_id == business_id,
        BusinessSpecialDateHours.specific_date == body.specific_date
    ).first()
    
    if existing:
        existing.is_open = body.is_open
        existing.open_time = body.open_time
        existing.break_start = body.break_start
        existing.break_end = body.break_end
        existing.close_time = body.close_time
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_override = BusinessSpecialDateHours(
            business_id=business_id,
            specific_date=body.specific_date,
            is_open=body.is_open,
            open_time=body.open_time,
            break_start=body.break_start,
            break_end=body.break_end,
            close_time=body.close_time
        )
        db.add(new_override)
        db.commit()
        db.refresh(new_override)
        return new_override

@app.delete("/api/business/special-hours/{override_id}")
async def delete_special_hours(
    override_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a special date override."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    
    override = db.query(BusinessSpecialDateHours).filter(
        BusinessSpecialDateHours.id == override_id,
        BusinessSpecialDateHours.business_id == business_id
    ).first()
    
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")
        
    db.delete(override)
    db.commit()
    return {"message": "Override deleted"}

# ─── Business Branch Endpoints ──────────────────────────────────────────────

@app.get("/api/business/branches", response_model=List[BranchSchema])
async def get_business_branches(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch all branches for the logged-in business."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    return db.query(BusinessBranch).filter(BusinessBranch.business_id == business_id).order_by(BusinessBranch.created_at.asc()).all()

@app.post("/api/business/branches", response_model=BranchSchema)
async def create_business_branch(
    body: BranchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a new branch for the business."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    
    # If this is set as main, unset other main branches
    if body.is_main:
        db.query(BusinessBranch).filter(BusinessBranch.business_id == business_id).update({BusinessBranch.is_main: False})
        
    new_branch = BusinessBranch(
        business_id=business_id,
        name=body.name,
        phone=body.phone,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
        
        house_number=body.house_number,
        block_number=body.block_number,
        street=body.street,
        subdivision=body.subdivision,
        sitio=body.sitio,
        barangay=body.barangay,
        city=body.city,
        district=body.district,
        province=body.province,
        zip_code=body.zip_code,
        region=body.region,
        lat=body.lat,
        lng=body.lng,
        is_main=body.is_main
    )
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch

@app.put("/api/business/branches/{branch_id}", response_model=BranchSchema)
async def update_business_branch(
    branch_id: int,
    body: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a business branch."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    
    branch = db.query(BusinessBranch).filter(BusinessBranch.id == branch_id, BusinessBranch.business_id == business_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    if body.is_main:
        db.query(BusinessBranch).filter(BusinessBranch.business_id == business_id).update({BusinessBranch.is_main: False})
        
    if body.name is not None: branch.name = body.name
    if body.phone is not None: branch.phone = body.phone
    if body.address_line1 is not None: branch.address_line1 = body.address_line1
    if body.address_line2 is not None: branch.address_line2 = body.address_line2
    
    if body.house_number is not None: branch.house_number = body.house_number
    if body.block_number is not None: branch.block_number = body.block_number
    if body.street is not None: branch.street = body.street
    if body.subdivision is not None: branch.subdivision = body.subdivision
    if body.sitio is not None: branch.sitio = body.sitio
    if body.barangay is not None: branch.barangay = body.barangay
    if body.city is not None: branch.city = body.city
    if body.district is not None: branch.district = body.district
    if body.province is not None: branch.province = body.province
    if body.zip_code is not None: branch.zip_code = body.zip_code
    if body.region is not None: branch.region = body.region

    if body.lat is not None: branch.lat = body.lat
    if body.lng is not None: branch.lng = body.lng
    if body.is_main is not None: branch.is_main = body.is_main
    
    db.commit()
    db.refresh(branch)
    return branch

@app.delete("/api/business/branches/{branch_id}")
async def delete_business_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a business branch."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    
    branch = db.query(BusinessBranch).filter(BusinessBranch.id == branch_id, BusinessBranch.business_id == business_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    db.delete(branch)
    db.commit()
    return {"message": "Branch deleted"}

@app.patch("/api/business/branches/{branch_id}/default")
async def set_default_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Set a branch as the main location."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    business_id = int(current_user["sub"])
    
    # Unset all
    db.query(BusinessBranch).filter(BusinessBranch.business_id == business_id).update({BusinessBranch.is_main: False})
    
    # Set this one
    branch = db.query(BusinessBranch).filter(BusinessBranch.id == branch_id, BusinessBranch.business_id == business_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    branch.is_main = True
    db.commit()
    return {"message": "Default branch updated"}

# ─── Public Clinic / Services Endpoints (for customer booking) ────────────────

@app.get("/api/clinics")
async def get_clinics(db: Session = Depends(get_db)):
    """Public: fetch all approved clinics with their active services and hours."""
    businesses = db.query(BusinessProfile).filter(BusinessProfile.compliance_status == "verified").all()
    result = []
    for biz in businesses:
        services = db.query(BusinessService).filter(BusinessService.business_id == biz.id, BusinessService.is_active == True).all()
        hours = db.query(BusinessOperatingHours).filter(BusinessOperatingHours.business_id == biz.id).order_by(BusinessOperatingHours.day_of_week).all()
        special_hours = db.query(BusinessSpecialDateHours).filter(BusinessSpecialDateHours.business_id == biz.id).all()
        
        # Prioritize Main Branch address
        main_branch = db.query(BusinessBranch).filter(BusinessBranch.business_id == biz.id, BusinessBranch.is_main == True).first()
        
        addr_line1 = main_branch.address_line1 if main_branch else (biz.clinic_street or "")
        addr_line2 = main_branch.address_line2 if main_branch else (f"{biz.clinic_barangay + ', ' if biz.clinic_barangay else ''}{biz.clinic_city or ''}, {biz.clinic_province or ''}")
        zip_code = biz.clinic_zip or "" # zip is only on profile for now
        phone = main_branch.phone if main_branch else (biz.clinic_phone or "")

        # Fetch all branches for this clinic
        all_branches = db.query(BusinessBranch).filter(BusinessBranch.business_id == biz.id).all()
        branches_list = [
            {
                "id": b.id,
                "name": b.name,
                "is_main": b.is_main,
                "phone": b.phone,
                "address_line1": b.address_line1,
                "address_line2": b.address_line2,
                "lat": b.lat,
                "lng": b.lng
            }
            for b in all_branches
        ]

        result.append({
            "id": biz.id,
            "name": biz.clinic_name or "Unnamed Clinic",
            "address_line1": addr_line1,
            "address_line2": addr_line2,
            "zip": zip_code,
            "phone": phone,
            "branches": branches_list,
            "services": [{"id": s.id, "name": s.name, "description": s.description, "price": s.price, "duration_minutes": s.duration_minutes, "is_package": s.is_package, "package_items_json": s.package_items_json} for s in services],
            "hours": [{"day_of_week": h.day_of_week, "day_name": DAYS_OF_WEEK[h.day_of_week], "is_open": h.is_open, "open_time": h.open_time, "close_time": h.close_time, "break_start": h.break_start, "break_end": h.break_end} for h in hours],
            "special_hours": [{"specific_date": sh.specific_date, "is_open": sh.is_open, "open_time": sh.open_time, "close_time": sh.close_time, "break_start": sh.break_start, "break_end": sh.break_end} for sh in special_hours]
        })
    return {"clinics": result}

# ─── Business Dashboard & Analytics Endpoints ─────────────────────────────────

@app.get("/api/business/dashboard/stats", response_model=BusinessDashboardStats)
async def get_business_dashboard_stats(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    biz_id = int(current_user["sub"])
    
    # 1. Product Orders count (Successful) 
    order_q = db.query(Order).join(OrderItem, Order.id == OrderItem.order_id).join(Product, OrderItem.product_id == Product.id).filter(Product.business_id == biz_id, Order.status.notin_(["Cancelled", "Pending"]))
    if branch_id:
        order_q = order_q.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
    product_orders_count = order_q.distinct().count()
    
    # 2. Service Appointments count (Successful)
    res_q = db.query(Reservation).filter(Reservation.business_id == biz_id, Reservation.status.in_(["Completed", "Confirmed"]))
    if branch_id:
        res_q = res_q.filter(Reservation.branch_id == branch_id)
    service_appointments_count = res_q.count()
    
    # 3. Revenue calculation
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    # Product revenue (Current vs Previous)
    curr_prod_q = db.query(OrderItem).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= month_start, Order.status.notin_(["Cancelled", "Pending"]))
    if branch_id:
        curr_prod_q = curr_prod_q.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
    monthly_prod_rev = sum(item.price * item.quantity for item in curr_prod_q.all())
    
    prev_prod_q = db.query(OrderItem).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= last_month_start, Order.created_at < month_start, Order.status.notin_(["Cancelled", "Pending"]))
    if branch_id:
        prev_prod_q = prev_prod_q.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
    prev_monthly_prod_rev = sum(item.price * item.quantity for item in prev_prod_q.all())
    
    # Service revenue (Current vs Previous)
    curr_serv_q = db.query(Reservation).filter(Reservation.business_id == biz_id, Reservation.created_at >= month_start, Reservation.status.in_(["Completed", "Confirmed"]))
    if branch_id:
        curr_serv_q = curr_serv_q.filter(Reservation.branch_id == branch_id)
    monthly_service_rev = sum(res.total_amount for res in curr_serv_q.all())
    
    prev_serv_q = db.query(Reservation).filter(Reservation.business_id == biz_id, Reservation.created_at >= last_month_start, Reservation.created_at < month_start, Reservation.status.in_(["Completed", "Confirmed"]))
    if branch_id:
        prev_serv_q = prev_serv_q.filter(Reservation.branch_id == branch_id)
    prev_monthly_service_rev = sum(res.total_amount for res in prev_serv_q.all())
    
    # Totals
    total_curr_rev = monthly_prod_rev + monthly_service_rev
    total_prev_rev = prev_monthly_prod_rev + prev_monthly_service_rev
    
    # Revenue change
    if total_prev_rev > 0:
        rev_change_pct = ((total_curr_rev - total_prev_rev) / total_prev_rev) * 100
        rev_change_str = f"{'+' if rev_change_pct >= 0 else ''}{rev_change_pct:.0f}% vs last mo"
    else:
        rev_change_str = "+100% vs last mo" if total_curr_rev > 0 else "0% vs last mo"
    
    # Orders change
    prev_orders_q = db.query(Order).join(OrderItem, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id, Order.created_at >= last_month_start, Order.created_at < month_start, Order.status.notin_(["Cancelled", "Pending"]))
    if branch_id:
        prev_orders_q = prev_orders_q.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
    prev_orders = prev_orders_q.distinct().count()
    
    if prev_orders > 0:
        ord_change_pct = ((product_orders_count - prev_orders) / prev_orders) * 100
        ord_change_str = f"{'+' if ord_change_pct >= 0 else ''}{ord_change_pct:.0f}% this month"
    else:
        ord_change_str = "+100% this month" if product_orders_count > 0 else "0% this month"

    active_prods = db.query(Product).filter(Product.business_id == biz_id).count()
    low_stock = db.query(Product).filter(Product.business_id == biz_id, Product.stock <= 10).count()
    
    return {
        "product_orders": product_orders_count,
        "service_appointments": service_appointments_count,
        "product_revenue": int(monthly_prod_rev),
        "service_revenue": int(monthly_service_rev),
        "total_revenue": int(total_curr_rev),
        "active_products": active_prods,
        "low_stock_count": low_stock,
        "revenue_change": rev_change_str,
        "orders_change": ord_change_str
    }

@app.get("/api/business/dashboard/recent-orders", response_model=List[BusinessDashboardOrder])
async def get_business_recent_orders(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    biz_id = int(current_user["sub"])
    
    # Get recent orders containing items from this business
    query = db.query(OrderItem, Order, Customer).join(Order, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id).join(Customer, Customer.id == Order.customer_id).filter(Product.business_id == biz_id)
    if branch_id:
        query = query.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
    
    recent_order_items = query.order_by(Order.created_at.desc()).limit(10).all()
    
    results = []
    seen_orders = set()
    for item, order, customer in recent_order_items:
        if order.id not in seen_orders and len(results) < 5:
            results.append({
                "id": f"ORD-{order.id:04d}",
                "customer": customer.name or f"{customer.first_name} {customer.last_name}",
                "product": item.product_name,
                "total": f"₱{order.total_amount:,}",
                "status": order.status,
                "date": order.created_at.strftime("%b %d")
            })
            seen_orders.add(order.id)
            
    return results

@app.get("/api/business/dashboard/analytics", response_model=BusinessAnalyticsData)
async def get_business_analytics(
    period: str = Query("6m", pattern="^(7d|30d|6m|1y)$"),
    data_type: str = Query("all", pattern="^(all|products|services)$"),
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    biz_id = int(current_user["sub"])
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    # 1. Establish Cutoff Date
    if period == '7d':
        cutoff_date = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == '30d':
        cutoff_date = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == '6m':
        cutoff_date = month_start - relativedelta(months=5)
    else: # 1y
        cutoff_date = month_start - relativedelta(months=11)

    # 2. Consolidated Data Fetcher
    async def fetch_analytics_data(cutoff):
        # Fetch Orders & OrderItems
        op_query = db.query(OrderItem, Order).join(Order, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id).filter(
            Product.business_id == biz_id, 
            Order.created_at >= cutoff, 
            Order.status.notin_(["Cancelled", "Pending"])
        )
        if branch_id: 
            op_query = op_query.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
        p_items = op_query.all()
        
        # Fetch Reservations
        rs_query = db.query(Reservation).filter(
            Reservation.business_id == biz_id, 
            Reservation.created_at >= cutoff, 
            Reservation.status.in_(["Completed", "Confirmed"])
        )
        if branch_id: 
            rs_query = rs_query.filter(Reservation.branch_id == branch_id)
        s_items = rs_query.all()
        
        return p_items, s_items

    # Primary Data Load
    p_data, s_data = await fetch_analytics_data(cutoff_date)
    is_snapshot = False

    # 3. WOW Factor: 7d empty fallback (updates everything)
    if period == '7d':
        temp_p_rev = sum((item[0].price or 0) * (item[0].quantity or 0) for item in p_data)
        temp_s_rev = sum(res.total_amount or 0 for res in s_data if res.status == "Completed")
        if (temp_p_rev + temp_s_rev) == 0:
            snap_cutoff = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
            f_p_data, f_s_data = await fetch_analytics_data(snap_cutoff)
            if f_p_data or f_s_data:
                p_data, s_data = f_p_data, f_s_data
                cutoff_date = snap_cutoff # Sync cutoff for rankings/trend
                is_snapshot = True

    # 4. Computed Metrics (KPIs)
    p_rev = sum((item[0].price or 0) * (item[0].quantity or 0) for item in p_data)
    p_ords = len(set(item[1].id for item in p_data))
    
    s_rev = sum(res.total_amount or 0 for res in s_data if res.status == "Completed")
    s_appts = len(s_data)
    s_comp = len([res for res in s_data if res.status == "Completed"])
    
    total_rev = p_rev + s_rev
    avg_session_val = s_rev / s_comp if s_comp > 0 else 0
    kpi_suffix = " (30d Snapshot)" if is_snapshot else ""

    stats = await get_business_dashboard_stats(branch_id, db, current_user)
    
    if data_type == 'products':
        kpis = [
            {"label": "Product Revenue", "value": f"₱{int(p_rev):,}", "change": f"Period Sales{kpi_suffix}", "up": True, "icon": "TrendingUp", "color": "bg-green-50 text-green-600"},
            {"label": "Total Orders", "value": f"{p_ords}", "change": "in period", "up": True, "icon": "ShoppingBag", "color": "bg-blue-50 text-blue-600"},
            {"label": "Active Products", "value": f"{stats['active_products']}", "change": "Live", "up": True, "icon": "Package", "color": "bg-orange-50 text-orange-600"},
            {"label": "Inventory Status", "value": f"{stats['active_products']}", "change": f"{stats['low_stock_count']} low stock", "up": stats['low_stock_count'] == 0, "icon": "Package", "color": "bg-orange-50 text-orange-600"}
        ]
    elif data_type == 'services':
        kpis = [
            {"label": "Service Revenue", "value": f"₱{int(s_rev):,}", "change": f"Period Income{kpi_suffix}", "up": True, "icon": "TrendingUp", "color": "bg-green-50 text-green-600"},
            {"label": "Total Appointments", "value": f"{s_appts}", "change": "in period", "up": True, "icon": "Users", "color": "bg-blue-50 text-blue-600"},
            {"label": "Avg Appointment", "value": f"₱{int(avg_session_val):,}", "change": "Per completion", "up": True, "icon": "Award", "color": "bg-purple-50 text-purple-600"},
            {"label": "Inventory Status", "value": f"{stats['active_products']}", "change": f"{stats['low_stock_count']} low stock", "up": stats['low_stock_count'] == 0, "icon": "Package", "color": "bg-orange-50 text-orange-600"}
        ]
    else: # all
        kpis = [
            {"label": "Total Revenue", "value": f"₱{int(total_rev):,}", "change": f"Period Total{kpi_suffix}", "up": True, "icon": "TrendingUp", "color": "bg-green-50 text-green-600"},
            {"label": "Product Sales", "value": f"₱{int(p_rev):,}", "change": f"{p_ords} orders", "up": True, "icon": "ShoppingBag", "color": "bg-blue-50 text-blue-600"},
            {"label": "Clinic Services", "value": f"₱{int(s_rev):,}", "change": f"{s_appts} appts", "up": True, "icon": "Award", "color": "bg-purple-50 text-purple-600"},
            {"label": "Inventory Status", "value": f"{stats['active_products']}", "change": f"{stats['low_stock_count']} low stock", "up": stats['low_stock_count'] == 0, "icon": "Package", "color": "bg-orange-50 text-orange-600"}
        ]

    # 5. Revenue Trend (Optimized Python Aggr)
    revenue_trend_data = []
    intervals = []
    if period == '7d':
        for i in range(6, -1, -1):
            d = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            intervals.append((d, d + timedelta(days=1), d.strftime("%a")))
    elif period == '30d':
        for i in range(29, -1, -5):
            d = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            intervals.append((d, d + timedelta(days=5), d.strftime("%b %d")))
    elif period == '6m' or period == '1y':
        count = 6 if period == '6m' else 12
        for i in range(count - 1, -1, -1):
            d = month_start - relativedelta(months=i)
            intervals.append((d, d + relativedelta(months=1), d.strftime("%Y-%m")))

    for start, end, label in intervals:
        val = 0
        if data_type in ['all', 'products']:
            val += sum((item[0].price or 0) * (item[0].quantity or 0) for item in p_data if start <= item[1].created_at < end)
        if data_type in ['all', 'services']:
            val += sum(res.total_amount or 0 for res in s_data if start <= res.created_at < end and res.status == "Completed")
        revenue_trend_data.append({"name": label, "value": int(val)})

    # 6. Rank Data (Consistency Guaranteed)
    # Products
    top_products = []
    if data_type in ['all', 'products']:
        p_map = {}
        for item, _ in p_data:
            p_name = item.product_name or "Unknown Product"
            if p_name not in p_map: p_map[p_name] = {"sold": 0, "revenue": 0}
            p_map[p_name]["sold"] += (item.quantity or 0)
            p_map[p_name]["revenue"] += (item.price or 0) * (item.quantity or 0)
        
        p_list = sorted([{"name": k, **v} for k, v in p_map.items()], key=lambda x: x["revenue"], reverse=True)[:5]
        max_p = max([i["revenue"] for i in p_list]) if p_list else 1
        for i in p_list:
            top_products.append({"name": i["name"], "sold": i["sold"], "revenue": f"₱{i['revenue']:,.0f}", "pct": int((i["revenue"]/max_p)*100), "delta": 5})
    
    if not top_products:
        top_products = [{"name": "No sales yet", "sold": 0, "revenue": "₱0", "pct": 0, "delta": 0}]
    # Services
    top_services = []
    if data_type in ['all', 'services']:
        s_map = {}
        for res in s_data:
            s_name = res.service or "General Service"
            if s_name not in s_map: s_map[s_name] = {"sold": 0, "revenue": 0}
            s_map[s_name]["sold"] += 1
            if res.status == "Completed": s_map[s_name]["revenue"] += (res.total_amount or 0)
        
        s_list = sorted([{"name": k, **v} for k, v in s_map.items()], key=lambda x: x["revenue"], reverse=True)[:5]
        max_s = max([i["revenue"] for i in s_list]) if s_list else 1
        for i in s_list:
            top_services.append({"name": i["name"], "sold": i["sold"], "revenue": f"₱{i['revenue']:,.0f}", "pct": int((i['revenue']/max_s)*100), "delta": 5})

    if not top_services:
        top_services = [{"name": "No services yet", "sold": 0, "revenue": "₱0", "pct": 0, "delta": 0}]

    # 7. Distribution (Products vs Services)
    distribution_data = [
        {"name": "Products", "value": len(p_data), "color": "#FB8500"},
        {"name": "Services", "value": len(s_data), "color": "#219EBC"}
    ]

    # 8. Branch Performance (Consolidated & Accurate)
    branches = db.query(BusinessBranch).filter(BusinessBranch.business_id == biz_id).all()
    biz_profile = db.query(BusinessProfile).filter(BusinessProfile.id == biz_id).first()
    biz_name = biz_profile.clinic_name if biz_profile else "Clinic"
    
    # Establish actual branches
    branch_name_map = {}
    address_map = {}
    main_branch_id = 0

    for b in branches:
        if b.is_main: main_branch_id = b.id
        addr_pts = [b.house_number, b.street, b.barangay, b.city, b.province]
        exact_address = ", ".join(p.strip() for p in addr_pts if p and p.strip())
        branch_name_map[b.id] = f"{biz_name} - {exact_address}" if exact_address else f"{biz_name} - Branch #{b.id}"
        address_map[b.id] = exact_address

    if not main_branch_id and branches:
        main_branch_id = branches[0].id
    
    # Process revenue
    branch_stats = {bid: 0 for bid in branch_name_map.keys()}
    
    op_global = db.query(OrderItem, Order).join(Order, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id, Order.created_at >= cutoff_date, Order.status.notin_(["Cancelled", "Pending"])).all()
    rs_global = db.query(Reservation).filter(Reservation.business_id == biz_id, Reservation.created_at >= cutoff_date, Reservation.status.in_(["Completed", "Confirmed"])).all()
    
    for item in op_global:
        bid = item[1].branch_id
        target_bid = bid if bid in branch_stats else main_branch_id
        if target_bid in branch_stats:
            branch_stats[target_bid] += ((item[0].price or 0) * (item[0].quantity or 0))
            
    for res in rs_global:
        bid = res.branch_id
        target_bid = bid if bid in branch_stats else main_branch_id
        if res.status == "Completed" and target_bid in branch_stats:
            branch_stats[target_bid] += (res.total_amount or 0)
            
    total_rev_all = sum(branch_stats.values()) or 1
    branch_performance = []
    
    for bid, rev in branch_stats.items():
        branch_performance.append({
            "id": bid,
            "branch": branch_name_map.get(bid, f"Branch #{bid}"),
            "address": address_map.get(bid, ""),
            "revenue": int(rev),
            "pct": int((rev / total_rev_all) * 100)
        })
    branch_performance.sort(key=lambda x: x["revenue"], reverse=True)

    # 9. Retention (Simplified & Context-Aware)
    r_query = db.query(Order.customer_id).join(OrderItem, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id).filter(
        Product.business_id == biz_id,
        Order.created_at >= cutoff_date,
        Order.status.notin_(["Cancelled", "Pending"])
    )
    if branch_id:
        r_query = r_query.filter(or_(Order.branch_id == branch_id, Order.branch_id == None))
    
    biz_cust_ids = [c[0] for c in r_query.distinct().all()]
    total_cust = len(biz_cust_ids)
    
    repeat_cust = r_query.group_by(Order.customer_id).having(func.count(Order.id) >= 2).count() if total_cust > 0 else 0
    retention_rate = int((repeat_cust / total_cust * 100)) if total_cust > 0 else 0

    return {
        "kpis": kpis,
        "revenue_trend": {"chartData": revenue_trend_data},
        "top_products": top_products,
        "top_services": top_services,
        "branch_performance": branch_performance,
        "retention_rate": retention_rate,
        "retention_change": "↑ Stable performance" if retention_rate > 0 else "0% change",
        "distribution_data": distribution_data
    }

# ─── Admin Compliance Endpoints ───────────────────────────────────────────────
@app.get("/api/admin/compliance")
async def get_compliance_list(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Admin: list all businesses with their compliance status."""
    if current_user.get("role") not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    profiles = db.query(BusinessProfile).all()
    result = []
    for p in profiles:
        result.append({
            "id": p.id,
            "clinic_name": p.clinic_name or "Unknown",
            "owner_name": p.owner_full_name or "Unknown",
            "email": p.email or "",
            "location": f"{p.clinic_city or ''}, {p.clinic_province or ''}".strip(", "),
            "bai_number": p.bai_number or "",
            "bai_document_url": p.bai_document_url or "",
            "mayors_permit": p.mayors_permit or "",
            "mayors_permit_url": p.mayors_permit_url or "",
            "owner_id_document_url": getattr(p, "owner_id_document_url", "") or "",
            "compliance_status": p.compliance_status or "pending",
            "created_at": p.created_at.isoformat() if p.created_at else "",
        })
    return result

class ComplianceUpdateRequest(BaseModel):
    compliance_status: str  # pending | verified | non_compliant
    notes: Optional[str] = None


def send_compliance_email(email: str, clinic_name: str, owner_name: str, status: str, reasoning: str = ""):
    """Send formal email notification regarding compliance status using the premium Hi-Vet template."""
    
    # 1. Setup Branding (Mascot)
    mascot_img_bytes = None
    mascot_path = r"C:\Users\Gene\.gemini\antigravity\brain\35c9e455-75fa-454a-a22c-5d092fedd953\hivet_mascot_email_header_1775572118329.png"
    if os.path.exists(mascot_path):
        try:
            with Image.open(mascot_path) as img:
                img.thumbnail((300, 300))
                if img.mode != 'RGB':
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == 'RGBA':
                        bg.paste(img, mask=img.split()[3])
                    else:
                        bg.paste(img)
                    img = bg
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG", quality=85, optimize=True)
                mascot_img_bytes = buffered.getvalue()
        except Exception as e:
            print(f"ERROR: Could not load mascot for compliance email: {e}")

    # 2. Define Content based on Status
    if status == "verified":
        subject = f"Compliance Status Update: APPROVED — {clinic_name}"
        title = "Compliance Approved"
        header_color = "#166534"
        bg_color = "#F0FDF4"
        border_color = "#BBF7D0"
        status_text = "APPROVED"
        main_message = f"We are pleased to inform you that following a thorough review of your submitted documentation, the compliance requirements for <strong>{clinic_name}</strong> have been officially {status_text}."
        sub_message = "Our records indicate that your facility is now fully compliant with current regulatory standards. No further action is required at this time."
        list_html = ""
    else: # non_compliant
        subject = f"Compliance Status Update: ACTION REQUIRED — {clinic_name}"
        title = "Action Required"
        header_color = "#991B1B"
        bg_color = "#FEF2F2"
        border_color = "#FECACA"
        status_text = "NOT APPROVED"
        main_message = f"After careful evaluation, we regret to inform you that the compliance status for <strong>{clinic_name}</strong> is currently marked as {status_text}."
        sub_message = "To finalize the approval process, please address the findings below and resubmit the necessary documentation through your portal."
        
        reason_items = reasoning.split('\n') if '\n' in reasoning else [reasoning]
        reason_list = "".join([f"<li style='margin-bottom: 8px;'>{r.strip()}</li>" for r in reason_items if r.strip()])
        list_html = f"""
        <div style="text-align: left; margin-top: 25px; padding: 20px; background: #ffffff; border: 1px dashed #FECACA; border-radius: 20px;">
            <p style="font-size: 13px; font-weight: 900; color: #991B1B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Required Adjudications:</p>
            <ul style="font-size: 14px; color: #6B5E5C; margin: 0; padding-left: 20px; line-height: 1.6;">
                {reason_list}
            </ul>
        </div>
        """

    # 3. Build the HTML Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body {{ margin: 0; padding: 0; background-color: #FFF9F5; font-family: 'Outfit', sans-serif; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 48px; overflow: hidden; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.04); border: 1px solid #FFEDE0; }}
            .hero-section {{ padding: 30px 40px; text-align: center; background: #ffffff; }}
            .mascot {{ width: 200px; height: auto; border-radius: 32px; filter: drop-shadow(0 15px 30px rgba(232, 93, 4, 0.15)); }}
            .brand-name {{ color: #E85D04; font-weight: 900; font-size: 18px; letter-spacing: -0.5px; margin-top: 15px; display: block; text-transform: uppercase; }}
            .content {{ padding: 0 50px 50px 50px; text-align: center; }}
            h1 {{ color: #2D2422; font-size: 30px; font-weight: 900; margin: 10px 0 20px 0; letter-spacing: -1px; }}
            .status-banner {{ background-color: {bg_color}; border: 1px solid {border_color}; border-radius: 32px; padding: 30px; margin-bottom: 25px; }}
            .status-msg {{ font-size: 16px; color: #4A3E3D; line-height: 1.6; margin: 0; font-weight: 500; }}
            .sub-msg {{ color: #6B5E5C; font-size: 14px; line-height: 1.6; margin-top: 20px; font-weight: 500; }}
            .footer {{ background-color: #FDFBFA; padding: 40px; text-align: center; border-top: 1px solid #FFEDE0; }}
            .footer-text {{ color: #A69491; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }}
            .footer-sub {{ color: #C4B5B2; font-size: 10px; line-height: 1.6; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="hero-section">
                <img src="cid:mascot" alt="Hi-Vet Mascot" class="mascot">
                <span class="brand-name">HI-VET COMPLIANCE</span>
            </div>
            <div class="content">
                <p style="color: #A69491; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Portal Notification</p>
                <h1>{title}</h1>
                <div class="status-banner">
                    <p class="status-msg">Dear {owner_name},</p>
                    <p class="status-msg" style="margin-top: 10px;">{main_message}</p>
                    {list_html}
                </div>
                <p class="sub-msg">{sub_message}</p>
                
                <div style="margin-top: 35px; text-align: center;">
                    <a href="{FRONTEND_URL}/login" style="display: inline-block; background: #E85D04; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 20px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(232, 93, 4, 0.2);">Access Partner Portal</a>
                </div>
            </div>
            <div class="footer">
                <p class="footer-text">Maintaining High Standards in Veterinary Care</p>
                <p class="footer-sub">
                    &copy; 2026 Hi-Vet Compliance. All rights reserved.<br>
                    Regulatory Affairs & Quality Assurance Division.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    # 4. Assemble and Send
    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = f'"Hi-Vet Compliance" <{EMAIL_SENDER}>'
    msg["To"] = email
    
    msg_alt = MIMEMultipart("alternative")
    msg.attach(msg_alt)
    msg_alt.attach(MIMEText(html_content, "html"))

    if mascot_img_bytes:
        img = MIMEImage(mascot_img_bytes)
        img.add_header('Content-ID', '<mascot>')
        img.add_header('Content-Disposition', 'inline', filename='mascot.jpg')
        msg.attach(img)
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.sendmail(EMAIL_SENDER, email, msg.as_string())
        server.quit()
    except Exception as e:
        print("SMTP Error sending compliance notification:", e)

def send_rider_compliance_email(email: str, rider_name: str, status: str, reasoning: str = ""):
    """Send formal email notification regarding rider compliance status using the premium Hi-Vet template."""
    mascot_img_bytes = None
    mascot_path = r"C:\Users\Gene\.gemini\antigravity\brain\35c9e455-75fa-454a-a22c-5d092fedd953\hivet_mascot_email_header_1775572118329.png"
    if os.path.exists(mascot_path):
        try:
            with Image.open(mascot_path) as img:
                img.thumbnail((300, 300))
                if img.mode != 'RGB':
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == 'RGBA':
                        bg.paste(img, mask=img.split()[3])
                    else:
                        bg.paste(img)
                    img = bg
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG", quality=85, optimize=True)
                mascot_img_bytes = buffered.getvalue()
        except Exception as e:
            print(f"ERROR: Could not load mascot for rider email: {e}")

    if status == "verified":
        subject = f"Rider Application Status: APPROVED — Welcome to Hi-Vet!"
        title = "Application Approved"
        header_color = "#166534"
        bg_color = "#F0FDF4"
        border_color = "#BBF7D0"
        status_text = "APPROVED"
        main_message = f"We are pleased to inform you that your application to join the Hi-Vet Rider Fleet has been officially {status_text}."
        sub_message = "Your background clearances and vehicle documents met all our standards. You are now authorized to accept and deliver orders on the platform."
        list_html = ""
    else: # non_compliant
        subject = f"Rider Application Status: ACTION REQUIRED — Hi-Vet Fleet"
        title = "Action Required"
        header_color = "#991B1B"
        bg_color = "#FEF2F2"
        border_color = "#FECACA"
        status_text = "NOT APPROVED"
        main_message = f"After reviewing your application, we regret to inform you that your registration for the Hi-Vet Rider Fleet is currently marked as {status_text}."
        sub_message = "To proceed with your application, please address the issues below and update your documents accordingly."
        
        reason_items = reasoning.split('\n') if '\n' in reasoning else [reasoning]
        reason_list = "".join([f"<li style='margin-bottom: 8px;'>{r.strip()}</li>" for r in reason_items if r.strip()])
        list_html = f'''
        <div style="text-align: left; margin-top: 25px; padding: 20px; background: #ffffff; border: 1px dashed #FECACA; border-radius: 20px;">
            <p style="font-size: 13px; font-weight: 900; color: #991B1B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Required Updates:</p>
            <ul style="font-size: 14px; color: #6B5E5C; margin: 0; padding-left: 20px; line-height: 1.6;">
                {reason_list}
            </ul>
        </div>
        '''

    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body {{ margin: 0; padding: 0; background-color: #FFF9F5; font-family: 'Outfit', sans-serif; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 48px; overflow: hidden; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.04); border: 1px solid #FFEDE0; }}
            .hero-section {{ padding: 30px 40px; text-align: center; background: #ffffff; }}
            .mascot {{ width: 200px; height: auto; border-radius: 32px; filter: drop-shadow(0 15px 30px rgba(232, 93, 4, 0.15)); }}
            .brand-name {{ color: #E85D04; font-weight: 900; font-size: 18px; letter-spacing: -0.5px; margin-top: 15px; display: block; text-transform: uppercase; }}
            .content {{ padding: 0 50px 50px 50px; text-align: center; }}
            h1 {{ color: #2D2422; font-size: 30px; font-weight: 900; margin: 10px 0 20px 0; letter-spacing: -1px; }}
            .status-banner {{ background-color: {bg_color}; border: 1px solid {border_color}; border-radius: 32px; padding: 30px; margin-bottom: 25px; }}
            .status-msg {{ font-size: 16px; color: #4A3E3D; line-height: 1.6; margin: 0; font-weight: 500; }}
            .sub-msg {{ color: #6B5E5C; font-size: 14px; line-height: 1.6; margin-top: 20px; font-weight: 500; }}
            .footer {{ background-color: #FDFBFA; padding: 40px; text-align: center; border-top: 1px solid #FFEDE0; }}
            .footer-text {{ color: #A69491; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }}
            .footer-sub {{ color: #C4B5B2; font-size: 10px; line-height: 1.6; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="hero-section">
                <img src="cid:mascot" alt="Hi-Vet Mascot" class="mascot">
                <span class="brand-name">HI-VET RIDER FLEET</span>
            </div>
            <div class="content">
                <p style="color: #A69491; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Registration Update</p>
                <h1>{title}</h1>
                <div class="status-banner">
                    <p class="status-msg">Dear {rider_name},</p>
                    <p class="status-msg" style="margin-top: 10px;">{main_message}</p>
                    {list_html}
                </div>
                <p class="sub-msg">{sub_message}</p>
                
                <div style="margin-top: 35px; text-align: center;">
                    <a href="{FRONTEND_URL}/login/rider" style="display: inline-block; background: #E85D04; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 20px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(232, 93, 4, 0.2);">Access Rider App</a>
                </div>
            </div>
            <div class="footer">
                <p class="footer-text">Delivering Care Safely & Promptly</p>
                <p class="footer-sub">
                    &copy; 2026 Hi-Vet Network. All rights reserved.<br>
                    Logistics & Fleet Operations Department.
                </p>
            </div>
        </div>
    </body>
    </html>
    '''

    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = f'"Hi-Vet Fleet Operations" <{EMAIL_SENDER}>'
    msg["To"] = email
    
    msg_alt = MIMEMultipart("alternative")
    msg.attach(msg_alt)
    msg_alt.attach(MIMEText(html_content, "html"))

    if mascot_img_bytes:
        img = MIMEImage(mascot_img_bytes)
        img.add_header('Content-ID', '<mascot>')
        img.add_header('Content-Disposition', 'inline', filename='mascot.jpg')
        msg.attach(img)
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.sendmail(EMAIL_SENDER, email, msg.as_string())
        server.quit()
    except Exception as e:
        print("SMTP Error sending rider compliance notification:", e)

@app.put("/api/admin/compliance/{customer_id}")
async def update_compliance_status(
    customer_id: int,
    body: ComplianceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Admin: approve or reject a clinic's compliance status and notify owner via email."""
    if current_user.get("role") not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    profile = db.query(BusinessProfile).filter(BusinessProfile.id == customer_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
        
    old_status = profile.compliance_status
    profile.compliance_status = body.compliance_status
    db.commit()
    
    # Send email notification if status changed and is verified or non_compliant
    if body.compliance_status in ["verified", "non_compliant"] and body.compliance_status != old_status:
        # In a real app, this should be a background task (e.g. FastAPI BackgroundTasks)
        # to avoid blocking the response. For now, we'll run it inline.
        send_compliance_email(
            email=profile.email,
            clinic_name=profile.clinic_name or "Your Clinic",
            owner_name=profile.owner_full_name or "Clinic Owner",
            status=body.compliance_status,
            reasoning=body.notes or "No specific reasoning provided."
        )
        
    return {"message": "Compliance status updated and notification sent", "compliance_status": body.compliance_status}

# ─── Rider Compliance Endpoints ────────────────────────────────────────────────
@app.get("/api/admin/riders")
async def get_riders_compliance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Admin: list all riders with their compliance status (from rider_profiles directly)."""
    if current_user.get("role") not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    # New riders are stored directly in rider_profiles
    riders = db.query(RiderProfile).all()
    result = []
    for prof in riders:
        # Resolve name: could be from rider_profiles directly OR from linked customer (legacy)
        if prof.name or prof.first_name:
            display_name = prof.name or f"{prof.first_name or ''} {prof.last_name or ''}".strip()
            email = prof.email or ""
            phone = prof.phone or ""
            created_at = prof.created_at.isoformat() if prof.created_at else ""
        else:
            # Legacy rider linked via customer_id
            c = db.query(Customer).filter(Customer.id == prof.customer_id).first() if prof.customer_id else None
            display_name = (c.name or f"{c.first_name or ''} {c.last_name or ''}".strip()) if c else "Unknown"
            email = (c.email if c else "") or ""
            phone = (c.phone if c else "") or ""
            created_at = (c.created_at.isoformat() if c and c.created_at else "") or ""
        result.append({
            "id": prof.id,
            "name": display_name,
            "email": email,
            "phone": phone,
            "vehicle_type": prof.vehicle_type or "",
            "compliance_status": prof.compliance_status or "pending",
            "license_document_url": prof.license_document_url or "",
            "vehicle_cr_url": prof.vehicle_cr_url or "",
            "vehicle_or_url": prof.vehicle_or_url or "",
            "nbi_clearance_url": prof.nbi_police_clearance_url or "",
            "created_at": created_at,
        })
    return result

class RiderComplianceRequest(BaseModel):
    compliance_status: str  # pending | verified | non_compliant
    notes: Optional[str] = None

@app.put("/api/admin/riders/{rider_id}/compliance")
async def update_rider_compliance(
    rider_id: int,
    body: RiderComplianceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Admin: approve or reject a rider's compliance status (by rider_profiles.id)."""
    if current_user.get("role") not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    if body.compliance_status not in ["pending", "verified", "non_compliant"]:
        raise HTTPException(status_code=400, detail="Invalid compliance_status value")
    # Try rider_profiles.id first (new approach)
    prof = db.query(RiderProfile).filter(RiderProfile.id == rider_id).first()
    if not prof:
        # Fallback: old approach via customer_id
        prof = db.query(RiderProfile).filter(RiderProfile.customer_id == rider_id).first()
    if not prof:
        raise HTTPException(status_code=404, detail="Rider not found")
        
    old_status = prof.compliance_status
    if body.compliance_status == "non_compliant" and body.notes:
        prof.rejection_reason = body.notes
    
    prof.compliance_status = body.compliance_status
    db.commit()

    # Send email notification if status changed and is verified or non_compliant
    if body.compliance_status != old_status and body.compliance_status in ["verified", "non_compliant"]:
        # Find email and name
        email = prof.email
        rider_name = "Rider"
        if not email and prof.customer_id:
            c = db.query(Customer).filter(Customer.id == prof.customer_id).first()
            if c:
                email = c.email
                rider_name = f"{c.first_name} {c.last_name}".strip() if (c.first_name or c.last_name) else c.name
        
        if email:
            notes_str = body.notes or prof.rejection_reason or ""
            background_tasks.add_task(send_rider_compliance_email, email, rider_name, body.compliance_status, notes_str)

    return {"message": "Rider compliance status updated", "compliance_status": body.compliance_status}

@app.get("/api/admin/alerts")
async def get_admin_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Admin: get summary of pending applications (riders and clinics) for notifications."""
    if current_user.get("role") not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # 1. Pending Clinics
    pending_clinics = db.query(BusinessProfile).filter(BusinessProfile.compliance_status == "pending").all()
    
    # 2. Pending Riders
    pending_riders = db.query(RiderProfile).filter(RiderProfile.compliance_status == "pending").all()
    
    alerts = []
    
    for p in pending_clinics:
        alerts.append({
            "id": f"clinic_{p.id}",
            "type": "System",
            "title": "Pending Clinic Approval",
            "desc": f"{p.clinic_name or 'Clinic'} is awaiting compliance review.",
            "link": "/dashboard/admin/compliance?tab=clinics",
            "read": False,
            "created_at": p.created_at.isoformat() if p.created_at else datetime.utcnow().isoformat()
        })
        
    for r in pending_riders:
        display_name = r.name or f"{r.first_name or ''} {r.last_name or ''}".strip() or "Rider"
        alerts.append({
            "id": f"rider_{r.id}",
            "type": "System",
            "title": "Pending Rider Approval",
            "desc": f"{display_name} is awaiting compliance review.",
            "link": "/dashboard/admin/compliance?tab=riders",
            "read": False,
            "created_at": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat()
        })
        
    # Sort by created_at desc
    alerts.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"notifications": alerts}




class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/login")
async def login_customer(body: LoginRequest, db: Session = Depends(get_db)):
    """Local login for customers, businesses, riders, and admins."""

    
    user = None
    is_rider = False

    # 1. Check rider_profiles first (standalone auth, not in customer table)
    rider_user = db.query(RiderProfile).filter(RiderProfile.email == body.email).first()
    if rider_user and rider_user.password_hash:
        is_rider = True
        user = rider_user

    # 2. Check customer table
    if not user:
        user = db.query(Customer).filter(Customer.email == body.email).first()
    # 3. Check business table
    if not user:
        user = db.query(BusinessProfile).filter(BusinessProfile.email == body.email).first()
    # 4. Check super admin
    if not user:
        user = db.query(SuperAdminUser).filter(SuperAdminUser.email == body.email).first()
    # 5. Check system admin
    if not user:
        user = db.query(SystemAdminUser).filter(SystemAdminUser.email == body.email).first()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Block deactivated accounts
    if getattr(user, 'is_deleted', False):
        raise HTTPException(status_code=401, detail="This account has been deactivated.")

    if not pbkdf2_sha256.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Block accounts that are not yet approved
    if getattr(user, 'role', '') == "business":
        if getattr(user, "compliance_status", "pending") == "pending":
            raise HTTPException(status_code=403, detail="Your clinic registration is currently under review. You will be notified once approved.")
        if getattr(user, "compliance_status", "pending") == "non_compliant":
            raise HTTPException(status_code=403, detail="Your clinic registration has been declined. Please contact support or resubmit your documents.")

    if is_rider:
        status = getattr(user, 'compliance_status', 'pending')
        if status == "pending":
            raise HTTPException(status_code=403, detail="Your rider application is currently under review. You will be notified once approved.")
        if status == "non_compliant":
            raise HTTPException(status_code=403, detail="Your rider application has been declined. Please contact support or resubmit your documents.")
    elif getattr(user, 'role', '') == "rider":
        # Legacy rider in customer table — check their rider_profiles
        rider_prof = db.query(RiderProfile).filter(RiderProfile.customer_id == user.id).first()
        status = rider_prof.compliance_status if rider_prof else "pending"
        if status == "pending":
            raise HTTPException(status_code=403, detail="Your rider application is currently under review. You will be notified once approved.")
        if status == "non_compliant":
            raise HTTPException(status_code=403, detail="Your rider application has been declined. Please contact support or resubmit your documents.")

    if getattr(user, 'role', '') == "business":
        name = getattr(user, "clinic_name", "") or getattr(user, "owner_full_name", "")
    else:
        name = getattr(user, "name", "") or getattr(user, "owner_full_name", "")

    if is_rider and not name:
        fn = getattr(user, 'first_name', '') or ''
        ln = getattr(user, 'last_name', '') or ''
        name = f"{fn} {ln}".strip()
    first_name = getattr(user, "first_name", "")
    last_name = getattr(user, "last_name", "")
    middle_name = getattr(user, "middle_name", "") or getattr(user, "owner_middle_name", "")
    suffix = getattr(user, "suffix", "") or getattr(user, "owner_suffix", "")
    phone = getattr(user, "phone", "") or getattr(user, "owner_phone", "") or getattr(user, "clinic_phone", "")
    
    # Do not use ID documents as avatars for business accounts
    if getattr(user, 'role', '') == "business":
        avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
    else:
        avatar = getattr(user, "picture", "") or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"

    # Build token — for rider, use RiderProfile.id directly
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": getattr(user, 'role', 'user'),
        "name": name,
        "first_name": getattr(user, 'first_name', ''),
        "middle_name": getattr(user, 'middle_name', '') or getattr(user, 'owner_middle_name', ''),
        "last_name": getattr(user, 'last_name', ''),
        "suffix": getattr(user, 'suffix', '') or getattr(user, 'owner_suffix', ''),
        "phone": getattr(user, 'phone', '') or getattr(user, 'owner_phone', '') or getattr(user, 'clinic_phone', ''),
        "gender": getattr(user, "gender", ""),
        "birthday": getattr(user, "birthday", ""),
        "avatar": avatar,
        "has_password": bool(user.password_hash)
    }
    token = create_access_token(token_data)
    return {"token": token}

# ---------------------------------------------------------------------------
# Forgot Password
# ---------------------------------------------------------------------------

@app.post("/api/auth/forgot-password/send-otp")
def forgot_password_send_otp(body: SendOtpRequest, db: Session = Depends(get_db)):
    """Generates and sends a 6-digit OTP to the user's email for password reset."""
    # Search across all relevant tables
    user = db.query(Customer).filter(Customer.email == body.email).first()
    if not user:
        user = db.query(BusinessProfile).filter(BusinessProfile.email == body.email).first()
    if not user:
        user = db.query(RiderProfile).filter(RiderProfile.email == body.email).first()
    if not user:
        user = db.query(SuperAdminUser).filter(SuperAdminUser.email == body.email).first()
    if not user:
        user = db.query(SystemAdminUser).filter(SystemAdminUser.email == body.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="You registered using Google. Please log in with Google to manage your account.")
        
    otp_code = f"{random.randint(0, 999999):06d}"
    expires = datetime.utcnow() + timedelta(minutes=10)
    OTP_STORE[body.email] = {"otp": otp_code, "expires": expires}
    
    send_professional_otp_email(
        email=body.email,
        otp_code=otp_code,
        title="Reset password",
        description="We received a humble request to access your Hi-Vet account. Please use the verification code below to securely update your password.",
        subject=f"{otp_code} is your Hi-Vet password reset code"
    )
        
    return {"message": "Verification code sent"}

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/api/auth/forgot-password/reset")
def forgot_password_reset(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Validates OTP and sets a new password."""
    # Search across all relevant tables
    user = db.query(Customer).filter(Customer.email == body.email).first()
    if not user:
        user = db.query(BusinessProfile).filter(BusinessProfile.email == body.email).first()
    if not user:
        user = db.query(RiderProfile).filter(RiderProfile.email == body.email).first()
    if not user:
        user = db.query(SuperAdminUser).filter(SuperAdminUser.email == body.email).first()
    if not user:
        user = db.query(SystemAdminUser).filter(SystemAdminUser.email == body.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    # Verify OTP
    record = OTP_STORE.get(body.email)
    if not record:
        raise HTTPException(status_code=400, detail="No password reset requested for this email")
    if datetime.utcnow() > record["expires"]:
        del OTP_STORE[body.email]  # clean up
        raise HTTPException(status_code=400, detail="Verification code has expired")
    if record["otp"] != body.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    user.password_hash = pbkdf2_sha256.hash(body.new_password)
    db.commit()
    
    # Cleanup OTP after successful reset
    del OTP_STORE[body.email]
        
    return {"message": "Password successfully reset"}

@app.get("/api/auth/me")
async def get_me(request: Request, db: Session = Depends(get_db)):
    """Return the current user's full profile from a Bearer JWT."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "business":
        user = db.query(BusinessProfile).filter(BusinessProfile.id == user_id).first()
    elif role == "rider":
        user = db.query(RiderProfile).filter(RiderProfile.id == user_id).first()
        if not user:
            # Fallback for legacy riders who might be indexed by customer_id
            user = db.query(RiderProfile).filter(RiderProfile.customer_id == user_id).first()
    else:
        user = db.query(Customer).filter(Customer.id == user_id).first()
        
    if not user:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")
        
    res = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "created_at": str(user.created_at),
        "has_password": bool(user.password_hash)
    }
    
    if role == "business":
        res.update({
            "clinic_name": user.clinic_name,
            "clinic_phone": user.clinic_phone,
            "owner_full_name": user.owner_full_name,
            "owner_middle_name": user.owner_middle_name,
            "owner_suffix": user.owner_suffix,
            "owner_phone": user.owner_phone,
            "clinic_house_number": user.clinic_house_number,
            "clinic_block_number": user.clinic_block_number,
            "clinic_street": user.clinic_street,
            "clinic_subdivision": user.clinic_subdivision,
            "clinic_sitio": user.clinic_sitio,
            "clinic_barangay": user.clinic_barangay,
            "clinic_city": user.clinic_city,
            "clinic_district": user.clinic_district,
            "clinic_province": user.clinic_province,
            "clinic_zip": user.clinic_zip,
            "clinic_region": user.clinic_region,
            "clinic_lat": user.clinic_lat,
            "clinic_lng": user.clinic_lng,
            "bai_number": user.bai_number,
            "mayors_permit": user.mayors_permit,
            "compliance_status": user.compliance_status,
            "owner_birthday": user.owner_birthday,
            "owner_gender": user.owner_gender,
        })
    elif role == "rider":
        res.update({
            "name": user.name,
            "first_name": user.first_name,
            "middle_name": getattr(user, 'middle_name', None),
            "last_name": user.last_name,
            "suffix": user.suffix,
            "phone": user.phone,
            "birthday": user.birthday,
            "gender": user.gender,
            "vehicle_type": user.vehicle_type,
            "picture": user.picture
        })
    else:
        res.update({
            "name": user.name,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "suffix": user.suffix,
            "phone": user.phone,
            "gender": user.gender,
            "birthday": user.birthday,
            "picture": user.picture,
            "google_id": user.google_id,
        })
    return res

class ProfileUpdate(BaseModel):
    # User Profile Fields
    first_name:  Optional[str] = None
    middle_name: Optional[str] = None
    last_name:   Optional[str] = None
    suffix:      Optional[str] = None
    email:       Optional[str] = None
    phone:       Optional[str] = None
    gender:      Optional[str] = None
    birthday:    Optional[str] = None
    owner_birthday: Optional[str] = None
    owner_gender:   Optional[str] = None
    vehicle_type: Optional[str] = None
    # Business Profile Fields
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_house_number: Optional[str] = None
    clinic_block_number: Optional[str] = None
    clinic_street: Optional[str] = None
    clinic_subdivision: Optional[str] = None
    clinic_sitio: Optional[str] = None
    clinic_barangay: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_district: Optional[str] = None
    clinic_province: Optional[str] = None
    clinic_zip: Optional[str] = None
    clinic_region: Optional[str] = None
    clinic_lat: Optional[float] = None
    clinic_lng: Optional[float] = None
    # Loyalty Settings
    loyalty_points_per_peso: Optional[float] = None
    loyalty_points_per_reservation: Optional[int] = None

@app.put("/api/customer/profile")
async def update_profile(body: ProfileUpdate, request: Request, db: Session = Depends(get_db)):
    """Update the logged-in user's profile fields."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # AGE VALIDATION (18+)
    from datetime import datetime
    target_birthday = body.owner_birthday if role == "business" else body.birthday
    if target_birthday:
        try:
            bdate = datetime.strptime(target_birthday, "%Y-%m-%d")
            today = datetime.utcnow()
            age = today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day))
            if age < 18:
                raise HTTPException(status_code=400, detail="You must be at least 18 years old to use Hi-Vet.")
        except ValueError:
            pass # ignore invalid format for now or handle specifically
        
    if role == "business":
        user = db.query(BusinessProfile).filter(BusinessProfile.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Business profile not found")
        if body.clinic_name is not None: user.clinic_name = body.clinic_name
        if body.clinic_phone is not None: user.clinic_phone = body.clinic_phone
        if body.first_name is not None: user.owner_full_name = body.first_name
        if body.clinic_house_number is not None: user.clinic_house_number = body.clinic_house_number
        if body.clinic_block_number is not None: user.clinic_block_number = body.clinic_block_number
        if body.clinic_street is not None: user.clinic_street = body.clinic_street
        if body.clinic_subdivision is not None: user.clinic_subdivision = body.clinic_subdivision
        if body.clinic_sitio is not None: user.clinic_sitio = body.clinic_sitio
        if body.clinic_barangay is not None: user.clinic_barangay = body.clinic_barangay
        if body.clinic_city is not None: user.clinic_city = body.clinic_city
        if body.clinic_district is not None: user.clinic_district = body.clinic_district
        if body.clinic_province is not None: user.clinic_province = body.clinic_province
        if body.clinic_zip is not None: user.clinic_zip = body.clinic_zip
        if body.clinic_region is not None: user.clinic_region = body.clinic_region
        if body.clinic_lat is not None: user.clinic_lat = body.clinic_lat
        if body.clinic_lng is not None: user.clinic_lng = body.clinic_lng
        if body.phone is not None: user.owner_phone = body.phone
        if body.loyalty_points_per_peso is not None: user.loyalty_points_per_peso = body.loyalty_points_per_peso
        if body.loyalty_points_per_reservation is not None: user.loyalty_points_per_reservation = body.loyalty_points_per_reservation
        if body.owner_birthday is not None: user.owner_birthday = body.owner_birthday
        if body.owner_gender is not None: user.owner_gender = body.owner_gender
    elif role == "rider":
        user = db.query(RiderProfile).filter(RiderProfile.id == user_id).first()
        if not user:
            # Check legacy rider in customer table if not found in RiderProfile by id
            user = db.query(RiderProfile).filter(RiderProfile.customer_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="Rider profile not found")
        if body.first_name is not None: user.first_name = body.first_name
        if body.last_name is not None: user.last_name = body.last_name
        if body.suffix is not None: user.suffix = body.suffix
        if body.phone is not None: user.phone = body.phone
        if body.vehicle_type is not None: user.vehicle_type = body.vehicle_type
        if body.birthday is not None: user.birthday = body.birthday
        if body.gender is not None: user.gender = body.gender
        
        # Calculate full name for Rider
        parts = []
        if user.first_name: parts.append(user.first_name.strip())
        if user.last_name: parts.append(user.last_name.strip())
        if user.suffix: parts.append(user.suffix.strip())
        if parts: user.name = " ".join(parts).strip()
    else:
        user = db.query(Customer).filter(Customer.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Customer not found")
        if body.first_name  is not None: user.first_name  = body.first_name
        if body.middle_name is not None: user.middle_name = body.middle_name
        if body.last_name   is not None: user.last_name   = body.last_name
        if body.suffix      is not None: user.suffix      = body.suffix
        if body.phone       is not None: user.phone       = body.phone
        if body.gender      is not None: user.gender      = body.gender
        if body.birthday    is not None: user.birthday    = body.birthday
        
        # Calculate full name for Customer
        parts = []
        if user.first_name: parts.append(user.first_name.strip())
        if user.middle_name:
            m = user.middle_name.strip()
            if len(m) == 1 and m.isalpha(): m += "."
            parts.append(m)
        if user.last_name: parts.append(user.last_name.strip())
        if user.suffix: parts.append(user.suffix.strip())
        if parts: user.name = " ".join(parts).strip()
        
    db.commit()
    db.refresh(user)
    
    # Generate new token with updated info
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": getattr(user, 'role', role),
        "has_password": bool(user.password_hash)
    }
    
    if role == "business":
        token_data.update({
            "name": user.clinic_name,
            "clinic_name": user.clinic_name,
            "phone": user.clinic_phone,
            "avatar": user.owner_id_document_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        })
    elif role == "rider":
        token_data.update({
            "name": user.name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "suffix": user.suffix,
            "phone": user.phone,
            "avatar": user.picture or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        })
    else:
        token_data.update({
            "name": user.name,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "suffix": user.suffix,
            "phone": user.phone,
            "gender": user.gender,
            "birthday": user.birthday,
            "avatar": user.picture or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        })
        
    token = create_access_token(token_data)
    return {"message": "Profile updated", "token": token}

@app.get("/api/customer/dashboard/stats")
async def get_customer_dashboard_stats(request: Request, db: Session = Depends(get_db)):
    """Return real-time stats for the customer dashboard."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # 1. Loyalty Stats
    loyalty_info = get_loyalty_tier(customer.loyalty_points)
    
    # 2. Recent Order
    recent_order_obj = db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.created_at.desc()).first()
    recent_order = None
    if recent_order_obj:
        items = db.query(OrderItem).filter(OrderItem.order_id == recent_order_obj.id).all()

        # ── Step A: Resolve the clinic (BusinessProfile) ──────────────────────
        # Priority 1: Tally which business owns the most products in this order
        # (handles mixed-clinic carts correctly)
        clinic = None
        if items:
            from collections import Counter
            product_ids = [item.product_id for item in items]
            products_in_order = db.query(Product).filter(Product.id.in_(product_ids)).all()
            biz_counts = Counter(p.business_id for p in products_in_order if p.business_id)
            if biz_counts:
                dominant_biz_id = biz_counts.most_common(1)[0][0]
                clinic = db.query(BusinessProfile).filter(BusinessProfile.id == dominant_biz_id).first()

        # Priority 2: Explicit clinic_id on the order (if product lookup failed)
        if not clinic and recent_order_obj.clinic_id:
            clinic = db.query(BusinessProfile).filter(
                BusinessProfile.id == recent_order_obj.clinic_id
            ).first()

        clinic_name = (clinic.clinic_name or "Partner Clinic") if clinic else "Partner Clinic"


        # ── Step B: Resolve the branch (BusinessBranch) ───────────────────────
        # Priority 1: Exact branch_id on the order
        branch = None
        if recent_order_obj.branch_id:
            branch = db.query(BusinessBranch).filter(
                BusinessBranch.id == recent_order_obj.branch_id
            ).first()

        # Priority 2: If branch not found OR branch doesn't belong to this clinic (ghosting fix),
        # use main or first branch of the resolved clinic
        if (not branch or (clinic and branch.business_id != clinic.id)) and clinic:
            branch = (
                db.query(BusinessBranch)
                .filter(BusinessBranch.business_id == clinic.id, BusinessBranch.is_main == True)
                .first()
                or
                db.query(BusinessBranch)
                .filter(BusinessBranch.business_id == clinic.id)
                .order_by(BusinessBranch.id.asc())
                .first()
            )

        # ── Step C: Build the location string ────────────────────────────────
        if branch:
            # Address — use granular fields for precision, sanitizing 'None' values
            addr_pts = [branch.house_number, branch.street, branch.barangay, branch.city]
            branch_addr = ", ".join(p.strip() for p in addr_pts if p and p.strip() and p.lower() != 'none')

            # Label: "Main Branch" if is_main flag is set, else use actual branch name
            # If name is same as clinic name, don't repeat it
            is_generic_name = not branch.name or (clinic and branch.name == clinic.clinic_name)
            branch_label = "Main Branch" if branch.is_main else (branch.name if not is_generic_name else "Branch")

            location_display = (
                f"{clinic_name} · {branch_label}, {branch_addr}"
                if branch_addr else
                f"{clinic_name} · {branch_label}"
            )
        else:
            # No branch found — show clinic's own address fields
            clinic_addr_pts = [
                clinic.clinic_house_number if clinic else None,
                clinic.clinic_street       if clinic else None,
                clinic.clinic_barangay     if clinic else None,
                clinic.clinic_city         if clinic else None,
            ]
            clinic_addr = ", ".join(p.strip() for p in clinic_addr_pts if p and p.strip())
            location_display = f"{clinic_name}, {clinic_addr}" if clinic_addr else clinic_name



        recent_order = {
            "id": f"RV-{recent_order_obj.id:04d}",
            "status": recent_order_obj.status,
            "item_summary": f"{items[0].product_name} ({len(items)} Items)" if items else "Order Items",
            "location": location_display,
            "created_at": str(recent_order_obj.created_at)
        }


    # 3. Alerts (Unread Notifications)
    unread_notifs = db.query(Notification).filter(
        Notification.customer_id == customer_id, 
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).limit(3).all()
    
    unread_count = db.query(Notification).filter(
        Notification.customer_id == customer_id, 
        Notification.is_read == False
    ).count()

    return {
        "loyalty": {
            "points": customer.loyalty_points,
            "tier": loyalty_info["tier"],
            "next_tier": loyalty_info["next_tier"],
            "next_points": loyalty_info["next_points"],
            "points_to_next": max(0, loyalty_info["next_points"] - customer.loyalty_points) if loyalty_info["next_points"] > 0 else 0,
            "points_per_peso": 10.0, # Default for dashboard overview
            "points_per_reservation": 50
        },
        "recent_order": recent_order,
        "alerts": [{
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "desc": n.description,
            "created_at": str(n.created_at)
        } for n in unread_notifs],
        "unread_count": unread_count
    }

class PasswordUpdate(BaseModel):
    current_password: Optional[str] = None
    new_password: str

@app.put("/api/customer/password")
async def update_password(body: PasswordUpdate, request: Request, db: Session = Depends(get_db)):
    """Update or set the customer's password."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Check current password if they have one
    if customer.password_hash:
        if not body.current_password:
            raise HTTPException(status_code=401, detail="Current password required")
        if not pbkdf2_sha256.verify(body.current_password, customer.password_hash):
            raise HTTPException(status_code=401, detail="Invalid current password")
            
    # Set new password
    customer.password_hash = pbkdf2_sha256.hash(body.new_password)
    db.commit()
    db.refresh(customer)
    
    # Return fresh token
    token = create_access_token({
        "sub": str(customer.id),
        "email": customer.email,
        "role": customer.role,
        "name": customer.name,
        "first_name": customer.first_name,
        "middle_name": customer.middle_name,
        "last_name": customer.last_name,
        "suffix": customer.suffix,
        "phone": customer.phone,
        "gender": customer.gender,
        "birthday": customer.birthday,
        "avatar": customer.picture,
        "has_password": True
    })
    return {"message": "Password updated", "token": token}

# ---------------------------------------------------------------------------
# Routes â€“ Addresses
# ---------------------------------------------------------------------------
@app.get("/api/customer/addresses")
async def get_addresses(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    addresses = db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc()).all()
    return {"addresses": addresses}

@app.post("/api/customer/addresses", status_code=201)
async def create_address(body: AddressCreate, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # If set as default, unset others first
    if body.is_default:
        db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).update({"is_default": False})
    
    # If this is the first address, make it default regardless
    first_addr = db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).first()
    is_def = body.is_default or (not first_addr)

    new_addr = CustomerAddress(
        customer_id=customer_id,
        full_name=body.full_name,
        phone=body.phone,
        address_line1=body.address_line1,
        address_line2=body.address_line2,

        house_number=body.house_number,
        block_number=body.block_number,
        street=body.street,
        subdivision=body.subdivision,
        sitio=body.sitio,
        barangay=body.barangay,
        city=body.city,
        district=body.district,
        province=body.province,
        zip_code=body.zip_code,
        region=body.region,
        lat=body.lat,
        lng=body.lng,
        label=body.label,
        is_default=is_def
    )
    db.add(new_addr)
    db.commit()
    db.refresh(new_addr)
    return new_addr

@app.put("/api/customer/addresses/{addr_id}")
async def update_address(addr_id: int, body: AddressUpdate, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    addr = db.query(CustomerAddress).filter(CustomerAddress.id == addr_id, CustomerAddress.customer_id == customer_id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    
    if body.is_default:
        db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).update({"is_default": False})
        addr.is_default = True

    if body.full_name is not None: addr.full_name = body.full_name
    if body.phone is not None: addr.phone = body.phone
    if body.address_line1 is not None: addr.address_line1 = body.address_line1
    if body.address_line2 is not None: addr.address_line2 = body.address_line2
    
    if body.house_number is not None: addr.house_number = body.house_number
    if body.block_number is not None: addr.block_number = body.block_number
    if body.street is not None: addr.street = body.street
    if body.subdivision is not None: addr.subdivision = body.subdivision
    if body.sitio is not None: addr.sitio = body.sitio
    if body.barangay is not None: addr.barangay = body.barangay
    if body.city is not None: addr.city = body.city
    if body.district is not None: addr.district = body.district
    if body.province is not None: addr.province = body.province
    if body.zip_code is not None: addr.zip_code = body.zip_code
    if body.region is not None: addr.region = body.region

    if body.lat is not None: addr.lat = body.lat
    if body.lng is not None: addr.lng = body.lng
    if body.is_default is not None: addr.is_default = body.is_default
    if body.label is not None: addr.label = body.label
    
    db.commit()
    db.refresh(addr)
    return addr

@app.delete("/api/customer/addresses/{addr_id}")
async def delete_address(addr_id: int, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    addr = db.query(CustomerAddress).filter(CustomerAddress.id == addr_id, CustomerAddress.customer_id == customer_id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    
    was_default = addr.is_default
    db.delete(addr)
    db.commit()

    # If we deleted the default, set another one as default
    if was_default:
        next_addr = db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).first()
        if next_addr:
            next_addr.is_default = True
            db.commit()
            
    return {"message": "Address deleted"}

@app.patch("/api/customer/addresses/{addr_id}/default")
async def set_default_address(addr_id: int, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).update({"is_default": False})
    addr = db.query(CustomerAddress).filter(CustomerAddress.id == addr_id, CustomerAddress.customer_id == customer_id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    
    addr.is_default = True
    db.commit()
    return {"message": "Default address updated"}


# ---------------------------------------------------------------------------
# Routes â€“ Orders
# ---------------------------------------------------------------------------

def restore_stock(db: Session, order_id: int):
    """Helper to return items to stock when a completed order is cancelled."""
    import json
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for item in order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
        
        qty = item.quantity
        restored = False
        
        # 1. Restore Variants
        if item.variant and product.variants_json:
            try:
                variants = json.loads(product.variants_json)
                for v in variants:
                    if v.get('name') == item.variant:
                        v['stock'] = v.get('stock', 0) + qty
                        product.variants_json = json.dumps(variants)
                        restored = True
                        break
            except Exception as e:
                print(f"Restore stock error (variants): {e}")
        
        # 2. Restore Sizes
        if not restored and item.size and product.sizes_json:
            try:
                sizes = json.loads(product.sizes_json)
                for s in sizes:
                    if s.get('name') == item.size:
                        s['stock'] = s.get('stock', 0) + qty
                        product.sizes_json = json.dumps(sizes)
                        restored = True
                        break
            except Exception as e:
                print(f"Restore stock error (sizes): {e}")
        
        # 3. Fallback to main stock
        if not restored:
            product.stock = product.stock + qty
    db.commit()

def reduce_stock(db: Session, order_id: int):
    """Helper to decrement stock when an order is completed."""
    import json
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for item in order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
        
        needed = item.quantity
        reduced = False
        
        # 1. Variants
        if item.variant and product.variants_json:
            try:
                variants = json.loads(product.variants_json)
                for v in variants:
                    if v.get('name') == item.variant:
                        v['stock'] = max(0, v.get('stock', 0) - needed)
                        product.variants_json = json.dumps(variants)
                        reduced = True
                        break
            except Exception as e:
                print(f"Reduce stock error (variants): {e}")
        
        # 2. Sizes
        if not reduced and item.size and product.sizes_json:
            try:
                sizes = json.loads(product.sizes_json)
                for s in sizes:
                    if s.get('name') == item.size:
                        s['stock'] = max(0, s.get('stock', 0) - needed)
                        product.sizes_json = json.dumps(sizes)
                        reduced = True
                        break
            except Exception as e:
                print(f"Reduce stock error (sizes): {e}")
        
        # 3. Main Stock
        if not reduced:
            product.stock = max(0, product.stock - needed)
    db.commit()

@app.post("/api/orders", status_code=201)
async def create_order(body: OrderCreate, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Handle Voucher (Phase 1: Validation)
    discount_val = 0
    voucher_obj = None
    if body.voucher_code:
        v_res = db.query(UserVoucher, LoyaltyVoucher).join(
            LoyaltyVoucher, UserVoucher.voucher_id == LoyaltyVoucher.id
        ).filter(
            UserVoucher.code == body.voucher_code.upper(),
            UserVoucher.customer_id == customer_id,
            UserVoucher.is_used == False
        ).first()
        
        if v_res:
            uv, lv = v_res
            voucher_obj = uv
            if lv.type == "Discount":
                if "Food" in lv.title: # 15% Off Premium Foods
                    food_total = 0
                    for item in body.items:
                        p = db.query(Product).filter(Product.id == item.id).first()
                        # Apply ONLY to Food items
                        if p and p.type == "Food":
                            food_total += item.price * item.quantity
                    discount_val = int(food_total * (lv.value / 100))
                else:
                    discount_val = int(body.totalAmount * (lv.value / 100))
            elif lv.type == "Credit":
                discount_val = int(lv.value)

    # --- NEW: Stock Validation (DO NOT DECREMENT YET) ---
    import json
    for item in body.items:
        product = db.query(Product).filter(Product.id == item.id).first()
        if not product:
            raise HTTPException(404, detail=f"Product {item.name} not found.")
        
        needed = item.quantity
        stock_ok = False
        
        # 1. Check Variants
        if item.variant and product.variants_json:
            try:
                variants = json.loads(product.variants_json)
                for v in variants:
                    if v.get('name') == item.variant:
                        if v.get('stock', 0) < needed:
                            raise HTTPException(400, detail=f"Insufficient stock for {product.name} ({item.variant}). Only {v.get('stock')} left.")
                        stock_ok = True
                        break
            except Exception as e:
                print(f"Stock check error (variants): {e}")
        
        # 2. Check Sizes
        if not stock_ok and item.size and product.sizes_json:
            try:
                sizes = json.loads(product.sizes_json)
                for s in sizes:
                    if s.get('name') == item.size:
                        if s.get('stock', 0) < needed:
                            raise HTTPException(400, detail=f"Insufficient stock for {product.name} ({item.size}). Only {s.get('stock')} left.")
                        stock_ok = True
                        break
            except Exception as e:
                print(f"Stock check error (sizes): {e}")
        
        # 3. Fallback to main stock
        if not stock_ok:
            if product.stock < needed:
                raise HTTPException(400, detail=f"Insufficient stock for {product.name}. Only {product.stock} left.")

    # Consume voucher (Phase 2)
    if voucher_obj:
        voucher_obj.is_used = True
        voucher_obj.redeemed_at = datetime.utcnow()

    new_order = Order(
        customer_id=customer_id,
        status="Pending",
        total_amount=int(body.totalAmount) - discount_val,
        discount_amount=discount_val,
        voucher_code=body.voucher_code.upper() if body.voucher_code else None,
        fulfillment_method=body.fulfillmentMethod,
        payment_method=body.paymentMethod,
        delivery_address=body.deliveryDetails.get("address") if body.deliveryDetails else None,
        delivery_lat=body.delivery_lat or (body.deliveryDetails.get("lat") if body.deliveryDetails else None),
        delivery_lng=body.delivery_lng or (body.deliveryDetails.get("lng") if body.deliveryDetails else None),
        contact_name=body.deliveryDetails.get("contactName") if body.deliveryDetails else None,
        contact_phone=body.deliveryDetails.get("phone") if body.deliveryDetails else None,
        clinic_id=body.clinic_id,
        branch_id=body.branch_id
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Loyalty points are now awarded when the business accepts/receives the order
    # for better accuracy and to prevent awarding for cancelled orders.

    for item in body.items:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item.id,
            product_name=item.name,
            price=int(float(item.price)),
            quantity=item.quantity,
            variant=item.variant,
            size=item.size,
            image=item.image
        )
        db.add(order_item)
    db.commit()

    # NOTIFY BUSINESS OWNERS (Split per Clinic)
    notified_biz = set()
    for item in body.items:
        p = db.query(Product).filter(Product.id == item.id).first()
        if p and p.business_id and p.business_id not in notified_biz:
            add_notification(
                db, p.business_id, "System",
                "New Incoming Order!",
                f"You have a new order (#HV-{new_order.id:04d}) awaiting processing.",
                "/dashboard/business/orders",
                role="business"
            )
            notified_biz.add(p.business_id)
    
    # NOTIFY CUSTOMER
    add_notification(
        db, customer_id, "System",
        "Order Placed successfully",
        f"Your order #HV-{new_order.id:04d} has been received and is now pending clinic processing.",
        "/dashboard/customer/orders"
    )
    db.commit()
    
    add_notification(
        db, customer_id, "System", 
        "Order Placed!", 
        f"Your order #HV-{new_order.id:04d} has been successfully placed.",
        "/dashboard/customer/orders"
    )
    
    return {"order_id": new_order.id}
@app.post("/api/payments/paymongo/checkout")
async def create_paymongo_checkout(body: OrderCreate, request: Request, db: Session = Depends(get_db)):
    """Create a PayMongo Checkout Session and persist order as 'Payment Pending'."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Handle Voucher (Phase 1: Validation)
    discount_val = 0
    voucher_obj = None
    if body.voucher_code:
        v_res = db.query(UserVoucher, LoyaltyVoucher).join(
            LoyaltyVoucher, UserVoucher.voucher_id == LoyaltyVoucher.id
        ).filter(
            UserVoucher.code == body.voucher_code.upper(),
            UserVoucher.customer_id == customer_id,
            UserVoucher.is_used == False
        ).first()
        
        if v_res:
            uv, lv = v_res
            voucher_obj = uv
            if lv.type == "Discount":
                if "Food" in lv.title: # 15% Off Premium Foods
                    food_total = 0
                    for item in body.items:
                        p = db.query(Product).filter(Product.id == item.id).first()
                        if p and p.type == "Food":
                            food_total += item.price * item.quantity
                    discount_val = int(food_total * (lv.value / 100))
                else:
                    discount_val = int(body.totalAmount * (lv.value / 100))
            elif lv.type == "Credit":
                discount_val = int(lv.value)

    # --- NEW: Stock Validation (DO NOT DECREMENT YET) ---
    import json
    for item in body.items:
        product = db.query(Product).filter(Product.id == item.id).first()
        if not product:
            raise HTTPException(404, detail=f"Product {item.name} not found.")
        
        needed = item.quantity
        stock_ok = False
        
        # 1. Check Variants
        if item.variant and product.variants_json:
            try:
                variants = json.loads(product.variants_json)
                for v in variants:
                    if v.get('name') == item.variant:
                        if v.get('stock', 0) < needed:
                            raise HTTPException(400, detail=f"Insufficient stock for {product.name} ({item.variant}). Only {v.get('stock')} left.")
                        stock_ok = True
                        break
            except Exception as e:
                print(f"Stock check error (variants): {e}")
        
        # 2. Check Sizes
        if not stock_ok and item.size and product.sizes_json:
            try:
                sizes = json.loads(product.sizes_json)
                for s in sizes:
                    if s.get('name') == item.size:
                        if s.get('stock', 0) < needed:
                            raise HTTPException(400, detail=f"Insufficient stock for {product.name} ({item.size}). Only {s.get('stock')} left.")
                        stock_ok = True
                        break
            except Exception as e:
                print(f"Stock check error (sizes): {e}")
        
        # 3. Fallback to main stock
        if not stock_ok:
            if product.stock < needed:
                raise HTTPException(400, detail=f"Insufficient stock for {product.name}. Only {product.stock} left.")

    # Consume voucher (Phase 2)
    if voucher_obj:
        voucher_obj.is_used = True
        voucher_obj.redeemed_at = datetime.utcnow()

    # 1. Create the Order in "Payment Pending" status
    new_order = Order(
        customer_id=customer_id,
        status="Payment Pending",
        total_amount=int(body.totalAmount) - discount_val,
        discount_amount=discount_val,
        voucher_code=body.voucher_code.upper() if body.voucher_code else None,
        fulfillment_method=body.fulfillmentMethod,
        payment_method=body.paymentMethod,
        delivery_address=body.deliveryDetails.get("address") if body.deliveryDetails else None,
        delivery_lat=body.delivery_lat or (body.deliveryDetails.get("lat") if body.deliveryDetails else None),
        delivery_lng=body.delivery_lng or (body.deliveryDetails.get("lng") if body.deliveryDetails else None),
        contact_name=body.deliveryDetails.get("contactName") if body.deliveryDetails else None,
        contact_phone=body.deliveryDetails.get("phone") if body.deliveryDetails else None,
        clinic_id=body.clinic_id,
        branch_id=body.branch_id
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # 2. Add Order Items
    for item in body.items:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item.id,
            product_name=item.name,
            price=int(float(item.price)),
            quantity=item.quantity,
            variant=item.variant,
            size=item.size,
            image=item.image
        )
        db.add(order_item)
    db.commit()

    # 3. Fetch Customer Details for Pre-filling
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    billing_name = "Guest User"
    billing_email = "email@example.com"
    billing_phone = None

    if customer:
        billing_email = customer.email
        billing_phone = customer.phone
        if customer.name:
            billing_name = customer.name
        elif customer.first_name and customer.last_name:
            billing_name = f"{customer.first_name} {customer.last_name}"

    # 4. Fetch Clinic Details for Branding
    clinic = db.query(BusinessProfile).filter(BusinessProfile.id == body.clinic_id).first()
    clinic_name = clinic.clinic_name if clinic and clinic.clinic_name else "Hi-Vet Clinic"

    # 5. Prepare PayMongo Payload
    billing_info = {
        "name": billing_name,
        "email": billing_email
    }
    if billing_phone:
        billing_info["phone"] = billing_phone

    line_items = []
    for item in body.items:
        line_items.append({
            "amount": int(float(item.price) * 100),
            "currency": "PHP",
            "name": item.name,
            "quantity": item.quantity,
            "description": f"Product from Hi-Vet CRM"
        })

    # Shipping fee removed per user request (placeholder 150)

    enabled_methods = ["qrph", "gcash", "paymaya"]
    if body.paymentMethod == "maya":
        enabled_methods = ["paymaya"]
    elif body.paymentMethod == "gcash":
        enabled_methods = ["gcash"]
    elif body.paymentMethod == "qrph":
        enabled_methods = ["qrph"]

    # 6. Prepare PayMongo Payload (Dynamic Data from DB)
    paymongo_payload = {
        "data": {
            "attributes": {
                "line_items": line_items,
                "billing": billing_info,
                "payment_method_types": enabled_methods,
                "success_url": f"{FRONTEND_URL}/dashboard/customer/checkout/success?order_id={new_order.id}",
                "cancel_url": f"{FRONTEND_URL}/dashboard/customer/checkout",
                "description": f"Payment for Order #HV-{new_order.id:04d} at {clinic_name}",
                "send_email_receipt": False, # Disable static PayMongo receipts
                "show_description": True,
                "show_line_items": True,
                "reference_number": f"HV-{new_order.id:04d}",
                "statement_descriptor": clinic_name[:22]
            }
        }
    }

    import base64
    auth_header_val = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()

    async with httpx.AsyncClient() as client:
        try:
            # --- BRANCH: QRPH DIRECT FLOW ---
            if body.paymentMethod == "qrph":
                # 1. Calculate Total Amount in Centavos
                total_centavos = sum(int(float(item.price) * 100) * item.quantity for item in body.items)
                # Shipping fee removed per user request

                # 2. Create Payment Intent
                pi_payload = {
                    "data": {
                        "attributes": {
                            "amount": total_centavos,
                            "payment_method_allowed": ["qrph"],
                            "payment_method_options": {"card": {"request_three_d_secure": "any"}},
                            "currency": "PHP",
                            "description": f"Payment for Order #HV-{new_order.id:04d} at {clinic_name}",
                            "statement_descriptor": clinic_name[:22]
                        }
                    }
                }
                pi_resp = await client.post("https://api.paymongo.com/v1/payment_intents", json=pi_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if pi_resp.status_code not in [200, 201]:
                    print(f"PI Error: {pi_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to create payment intent")
                pi_data = pi_resp.json()["data"]
                intent_id = pi_data["id"]
                client_key = pi_data["attributes"]["client_key"]

                # 3. Create Payment Method (type: qrph)
                pm_payload = {
                    "data": {
                        "attributes": {
                            "type": "qrph",
                            "billing": {
                                "name": billing_name,
                                "email": billing_email,
                                "phone": billing_phone or ""
                            }
                        }
                    }
                }
                pm_resp = await client.post("https://api.paymongo.com/v1/payment_methods", json=pm_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if pm_resp.status_code not in [200, 201]:
                    print(f"PM Error: {pm_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to create payment method")
                pm_id = pm_resp.json()["data"]["id"]

                # 4. Attach Payment Method to Intent
                attach_payload = {
                    "data": {
                        "attributes": {
                            "payment_method": pm_id,
                            "client_key": client_key
                        }
                    }
                }
                attach_resp = await client.post(f"https://api.paymongo.com/v1/payment_intents/{intent_id}/attach", json=attach_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if attach_resp.status_code != 200:
                    print(f"Attach Error: {attach_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to attach payment method")
                
                attach_data = attach_resp.json()["data"]
                next_action = attach_data["attributes"].get("next_action")
                
                if not next_action or next_action.get("type") != "consume_qr":
                    raise HTTPException(status_code=500, detail="Failed to generate QR code")

                qr_image_url = next_action["code"]["image_url"]

                # 5. Update Order
                new_order.paymongo_intent_id = intent_id
                new_order.paymongo_qr_data = qr_image_url
                db.commit()

                # Notify
                if body.clinic_id:
                    add_notification(db, body.clinic_id, "System", "New Potential Order!", f"A customer is initiating payment for order #HV-{new_order.id:04d} via QRPh.", "/dashboard/business/orders", role="business")
                add_notification(db, customer_id, "System", "Order Processed", f"Your order #HV-{new_order.id:04d} is pending payment. Scan the QR code to complete.", "/dashboard/customer/orders")

                return {"qr_code": qr_image_url, "intent_id": intent_id}

            # --- BRANCH: HOSTED CHECKOUT (GCASH/MAYA/DEFAULTS) ---
            response = await client.post(
                "https://api.paymongo.com/v1/checkout_sessions",
                json=paymongo_payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Basic {auth_header_val}"
                }
            )
            
            if response.status_code != 200:
                print(f"PayMongo Error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create payment session")
            
            res_data = response.json()
            checkout_url = res_data["data"]["attributes"]["checkout_url"]
            
            new_order.paymongo_session_id = res_data["data"]["id"]
            db.commit()

            if body.clinic_id:
                add_notification(db, body.clinic_id, "System", "New Potential Order!", f"A customer is initiating payment for order #HV-{new_order.id:04d}.", "/dashboard/business/orders", role="business")
            add_notification(db, customer_id, "System", "Order Processed", f"Your order #HV-{new_order.id:04d} is pending payment. Please complete the checkout.", "/dashboard/customer/orders")

            return {"checkout_url": checkout_url}
            
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"PayMongo Request Exception: {e}")
            raise HTTPException(status_code=500, detail=str(e))

def send_clinic_order_receipt(db: Session, order_id: int):
    """Sends a professional branded order receipt using Clinic's DB information."""
    print(f"--- ATTEMPTING TO SEND RECEIPT FOR ORDER #{order_id:04d} ---")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order: 
        print("ERROR: Order not found in database.")
        return
    
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    if not customer:
        print(f"ERROR: Customer #{order.customer_id} not found.")
        return
    
    # Fetch real data from BusinessProfile
    clinic = None
    if order.clinic_id:
        clinic = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
    else:
        # If no clinic_id (delivery), deduce it from the first item
        first_item = db.query(OrderItem).filter(OrderItem.order_id == order.id).first()
        if first_item:
            product = db.query(Product).filter(Product.id == first_item.product_id).first()
            if product:
                clinic = db.query(BusinessProfile).filter(BusinessProfile.id == product.business_id).first()

    clinic_name = clinic.clinic_name if clinic and clinic.clinic_name else "Hi-Vet Clinic"
    clinic_email = clinic.email if clinic else EMAIL_SENDER
    clinic_phone = clinic.clinic_phone if clinic else "N/A"
    
    print(f"ORDER DETAILS: Clinic: {clinic_name}, Customer Email: {customer.email}")

    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    
    # Construct Professional HTML
    items_html = ""
    for item in order_items:
        items_html += f"<tr><td style='padding: 8px;'>{item.product_name} x {item.quantity}</td><td style='text-align: right; padding: 8px;'>P{item.price:,.2f}</td></tr>"
    
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #fdf8f6;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #eee; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(255,159,28,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ff9f1c; margin: 0; font-size: 28px;">{clinic_name}</h1>
                    <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; font-weight: bold; color: #999;">Order Receipt</p>
                </div>
                
                <p>Hi <strong>{customer.name or (f"{customer.first_name} {customer.last_name}")}</strong>,</p>
                <p>Thank you for choosing {clinic_name}. Your payment for order <strong>#HV-{order.id:04d}</strong> has been successfully processed.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                    <thead>
                        <tr style="border-bottom: 2px solid #fdf8f6;">
                            <th style="text-align: left; padding: 10px; color: #999; font-size: 12px; text-transform: uppercase;">Item</th>
                            <th style="text-align: right; padding: 10px; color: #999; font-size: 12px; text-transform: uppercase;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                    <tfoot>
                        <tr style="border-top: 2px solid #fdf8f6;">
                            <td style="padding: 20px 10px; font-weight: bold; font-size: 16px;">Total Amount Paid</td>
                            <td style="padding: 20px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #ff9f1c;">P{order.total_amount:,.2f}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style="margin-top: 40px; padding: 20px; background: #fdf8f6; border-radius: 12px;">
                    <p style="margin: 0; font-weight: bold; color: #555; font-size: 14px;">Need Help?</p>
                    <p style="margin: 5px 0; color: #777; font-size: 13px;">Contact the clinic directly at:</p>
                    <p style="margin: 2px 0; color: #333; font-size: 13px;"><strong>Email:</strong> {clinic_email}</p>
                    <p style="margin: 2px 0; color: #333; font-size: 13px;"><strong>Phone:</strong> {clinic_phone}</p>
                </div>
                
                <div style="margin-top: 30px; text-align: center; color: #bbb; font-size: 11px;">
                    <p>This is an automated receipt from the Hi-Vet CRM System.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{clinic_name} <{EMAIL_SENDER}>"
        msg['To'] = customer.email
        msg['Subject'] = f"Success! Your receipt from {clinic_name} (#HV-{order.id:04d})"
        msg.attach(MIMEText(html, 'html'))
        
        # Using Port 587 with STARTTLS
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_APP_PWD)
            server.send_message(msg)
            print(f"SUCCESS: Receipt sent to {customer.email}")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to send custom receipt via SMTP: {e}")

def send_clinic_reservation_receipt(db: Session, reservation_id: int):
    """Sends a professional branded reservation receipt using Clinic's DB information."""
    print(f"--- ATTEMPTING TO SEND RECEIPT FOR RESERVATION #{reservation_id:04d} ---")
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res: 
        print("ERROR: Reservation not found in database.")
        return
    
    customer = db.query(Customer).filter(Customer.id == res.customer_id).first()
    if not customer:
        print(f"ERROR: Customer #{res.customer_id} not found.")
        return
    
    # Fetch real data from BusinessProfile
    clinic = None
    if res.business_id:
        clinic = db.query(BusinessProfile).filter(BusinessProfile.id == res.business_id).first()

    clinic_name = clinic.clinic_name if clinic and clinic.clinic_name else "Hi-Vet Clinic"
    clinic_email = clinic.email if clinic else EMAIL_SENDER
    clinic_phone = clinic.clinic_phone if clinic else "N/A"
    
    print(f"RESERVATION DETAILS: Clinic: {clinic_name}, Customer Email: {customer.email}")

    # Construct Professional HTML
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #fdf8f6;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #eee; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(255,159,28,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ff9f1c; margin: 0; font-size: 28px;">{clinic_name}</h1>
                    <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; font-weight: bold; color: #999;">Reservation Receipt</p>
                </div>
                
                <p>Hi <strong>{customer.name or (f"{customer.first_name} {customer.last_name}")}</strong>,</p>
                <p>Thank you for choosing {clinic_name}. Your reservation <strong>#RV-{res.id:04d}</strong> has been successfully paid and confirmed.</p>
                
                <div style="background-color: #fdf8f6; padding: 25px; border-radius: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #999; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Appointment Details</p>
                    <h2 style="color: #3d2b1f; margin: 10px 0 5px 0; font-size: 20px;">{res.service}</h2>
                    <p style="margin: 0; color: #ff9f1c; font-weight: bold; font-size: 14px;">Pet: {res.pet_name}</p>
                    
                    <div style="margin-top: 20px; border-top: 1px solid #eee; pt: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p style="margin: 0; color: #999; font-size: 10px; font-weight: bold; text-transform: uppercase;">Date</p>
                            <p style="margin: 2px 0; font-weight: bold; color: #3d2b1f;">{res.date}</p>
                        </div>
                        <div>
                            <p style="margin: 0; color: #999; font-size: 10px; font-weight: bold; text-transform: uppercase;">Time</p>
                            <p style="margin: 2px 0; font-weight: bold; color: #3d2b1f;">{res.time}</p>
                        </div>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                    <tfoot>
                        <tr style="border-top: 2px solid #fdf8f6;">
                            <td style="padding: 20px 10px; font-weight: bold; font-size: 16px;">Total Paid</td>
                            <td style="padding: 20px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #ff9f1c;">P{res.total_amount:,.2f}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style="margin-top: 40px; padding: 20px; background: #fdf8f6; border-radius: 12px;">
                    <p style="margin: 0; font-weight: bold; color: #555; font-size: 14px;">Need Help?</p>
                    <p style="margin: 5px 0; color: #777; font-size: 13px;">Contact the clinic directly at:</p>
                    <p style="margin: 2px 0; color: #333; font-size: 13px;"><strong>Email:</strong> {clinic_email}</p>
                    <p style="margin: 2px 0; color: #333; font-size: 13px;"><strong>Phone:</strong> {clinic_phone}</p>
                </div>
                
                <div style="margin-top: 30px; text-align: center; color: #bbb; font-size: 11px;">
                    <p>This is an automated receipt from the Hi-Vet CRM System.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{clinic_name} <{EMAIL_SENDER}>"
        msg['To'] = customer.email
        msg['Subject'] = f"Success! Your Reservation at {clinic_name} (#RV-{res.id:04d})"
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_APP_PWD)
            server.send_message(msg)
            print(f"SUCCESS: Reservation Receipt sent to {customer.email}")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to send reservation receipt via SMTP: {e}")

@app.post("/api/payments/paymongo/order-recheckout")
async def retry_order_payment(body: dict, request: Request, db: Session = Depends(get_db)):
    """Create a PayMongo Checkout Session for an existing 'Payment Pending' order."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    order_id = body.get("order_id")
    payment_method = body.get("payment_method", "gcash") # Default to gcash if not provided

    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != "Payment Pending":
        raise HTTPException(status_code=400, detail="Order is not in Payment Pending status")

    # Fetch items for PayMongo
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    
    # Update order's payment method if changed
    if payment_method:
        order.payment_method = payment_method
        db.commit()

    # 3. Fetch Customer Details for Pre-filling
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    billing_name = "Guest User"
    billing_email = "email@example.com"
    billing_phone = None

    if customer:
        billing_email = customer.email
        billing_phone = customer.phone
        if customer.name:
            billing_name = customer.name
        elif customer.first_name and customer.last_name:
            billing_name = f"{customer.first_name} {customer.last_name}"

    # 4. Fetch Clinic Details for Branding
    clinic = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
    if not clinic and order_items:
        # Fallback for delivery orders where clinic_id might be missing
        product = db.query(Product).filter(Product.id == order_items[0].product_id).first()
        if product:
            clinic = db.query(BusinessProfile).filter(BusinessProfile.id == product.business_id).first()
    
    clinic_name = clinic.clinic_name if clinic and clinic.clinic_name else "Hi-Vet Clinic"

    # 5. Prepare PayMongo Payload
    billing_info = {
        "name": billing_name,
        "email": billing_email
    }
    if billing_phone:
        billing_info["phone"] = billing_phone

    line_items = []
    for item in order_items:
        line_items.append({
            "amount": int(float(item.price) * 100),
            "currency": "PHP",
            "name": item.product_name,
            "quantity": item.quantity,
            "description": f"Product from {clinic_name}"
        })

    # Shipping fee removed per user request (placeholder 150)

    enabled_methods = ["qrph", "gcash", "paymaya"]
    if payment_method == "paymaya" or payment_method == "maya":
        enabled_methods = ["paymaya"]
    elif payment_method == "gcash":
        enabled_methods = ["gcash"]
    elif payment_method == "qrph":
        enabled_methods = ["qrph"]

    paymongo_payload = {
        "data": {
            "attributes": {
                "line_items": line_items,
                "billing": billing_info,
                "payment_method_types": enabled_methods,
                "success_url": f"{FRONTEND_URL}/dashboard/customer/checkout/success?order_id={order.id}",
                "cancel_url": f"{FRONTEND_URL}/dashboard/customer/orders",
                "description": f"Payment for Order #HV-{order.id:04d} at {clinic_name}",
                "send_email_receipt": False,
                "show_description": True,
                "show_line_items": True,
                "reference_number": f"HV-{order.id:04d}",
                "statement_descriptor": clinic_name[:22]
            }
        }
    }

    import base64
    auth_header_val = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()

    async with httpx.AsyncClient() as client:
        try:
            # --- BRANCH: QRPH DIRECT FLOW ---
            if enabled_methods == ["qrph"]:
                # 1. Total Amount
                total_centavos = sum(int(float(item.price) * 100) * item.quantity for item in order_items)
                # Shipping fee removed per user request

                # 2. Create Intent
                pi_payload = {
                    "data": {
                        "attributes": {
                            "amount": total_centavos,
                            "payment_method_allowed": ["qrph"],
                            "currency": "PHP",
                            "description": f"Payment for Order #HV-{order.id:04d} at {clinic_name}",
                            "statement_descriptor": clinic_name[:22]
                        }
                    }
                }
                pi_resp = await client.post("https://api.paymongo.com/v1/payment_intents", json=pi_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if pi_resp.status_code not in [200, 201]:
                    print(f"PI Error: {pi_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to create payment intent")
                pi_data = pi_resp.json()["data"]
                intent_id = pi_data["id"]
                client_key = pi_data["attributes"]["client_key"]

                # 3. Create Method
                pm_payload = {
                    "data": {
                        "attributes": {
                            "type": "qrph",
                            "billing": {
                                "name": billing_name,
                                "email": billing_email,
                                "phone": billing_phone or ""
                            }
                        }
                    }
                }
                pm_resp = await client.post("https://api.paymongo.com/v1/payment_methods", json=pm_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if pm_resp.status_code not in [200, 201]:
                    print(f"PM Error: {pm_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to create payment method")
                pm_id = pm_resp.json()["data"]["id"]

                # 4. Attach
                attach_payload = {
                    "data": {
                        "attributes": {
                            "payment_method": pm_id,
                            "client_key": client_key
                        }
                    }
                }
                attach_resp = await client.post(f"https://api.paymongo.com/v1/payment_intents/{intent_id}/attach", json=attach_payload, headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_header_val}"})
                if attach_resp.status_code != 200:
                    print(f"Attach Error: {attach_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to attach payment method")
                
                qr_image_url = attach_resp.json()["data"]["attributes"]["next_action"]["code"]["image_url"]
                
                order.paymongo_intent_id = intent_id
                order.paymongo_qr_data = qr_image_url
                db.commit()

                return {"qr_code": qr_image_url, "intent_id": intent_id}

            # --- BRANCH: HOSTED ---
            response = await client.post(
                "https://api.paymongo.com/v1/checkout_sessions",
                json=paymongo_payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Basic {auth_header_val}"
                }
            )
            
            if response.status_code != 200:
                print(f"PayMongo Error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create payment session")
            
            res_data = response.json()
            checkout_url = res_data["data"]["attributes"]["checkout_url"]
            order.paymongo_session_id = res_data["data"]["id"]
            db.commit()
            
            return {"checkout_url": checkout_url}
            
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"PayMongo Request Exception: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/payments/paymongo/confirm/{order_id}")

async def confirm_paymongo_payment(order_id: int, request: Request, db: Session = Depends(get_db)):
    """Update order status after successful PayMongo checkout and send branded receipt."""
    print(f"--- CONFIRMING PAYMENT FOR ORDER #{order_id} ---")
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status == "Payment Pending":
        order.status = "Pending"
        db.commit()
        
        # TRIGGER CUSTOM RECEIPT
        send_clinic_order_receipt(db, order_id)
        
        # NOTIFY BUSINESS OWNERS (Split per Clinic)
        notified_biz = set()
        paid_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        for itm in paid_items:
            p = db.query(Product).filter(Product.id == itm.product_id).first()
            if p and p.business_id and p.business_id not in notified_biz:
                add_notification(
                    db, p.business_id, "System",
                    "Order Payment Received!",
                    f"Order #HV-{order.id:04d} has been successfully paid by the customer.",
                    "/dashboard/business/orders",
                    role="business"
                )
                notified_biz.add(p.business_id)
        
        add_notification(
            db, customer_id, "System", 
            "Payment Received!", 
            f"Your payment for order #HV-{order.id:04d} was successful. Check your email for the receipt.",
            "/dashboard/customer/orders"
        )
    
    return {"message": "Payment confirmed", "status": order.status}

@app.get("/api/orders")
async def get_orders(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    orders = db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.created_at.desc()).all()
    results = []
    for o in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
        
        branch_lat = None
        branch_lng = None
        branch_name = None
        branch_address = None
        
        if o.branch_id:
            branch = db.query(BusinessBranch).filter(BusinessBranch.id == o.branch_id).first()
            if branch:
                branch_lat = branch.lat
                branch_lng = branch.lng
                branch_name = branch.name
                # Construct branch address
                parts = [branch.house_number, branch.block_number, branch.street, branch.subdivision, branch.barangay, branch.city, branch.province]
                branch_address = ", ".join([p for p in parts if p])
        
        # Fallback to clinic coordinates if branch data is missing or incomplete
        if (branch_lat is None or branch_lng is None) and o.clinic_id:
            clinic = db.query(BusinessProfile).filter(BusinessProfile.id == o.clinic_id).first()
            if clinic:
                if branch_lat is None: branch_lat = clinic.clinic_lat
                if branch_lng is None: branch_lng = clinic.clinic_lng
                if branch_name is None: branch_name = clinic.clinic_name
                if branch_address is None:
                    # Construct clinic address
                    parts = [clinic.clinic_house_number, clinic.clinic_block_number, clinic.clinic_street, clinic.clinic_subdivision, clinic.clinic_barangay, clinic.clinic_city, clinic.clinic_province]
                    branch_address = ", ".join([p for p in parts if p])

        results.append({
            "id": o.id,
            "status": o.status,
            "total_amount": o.total_amount,
            "fulfillment_method": o.fulfillment_method,
            "payment_method": o.payment_method,
            "delivery_address": o.delivery_address,
            "delivery_lat": o.delivery_lat,
            "delivery_lng": o.delivery_lng,
            "branch_id": o.branch_id,
            "branch_lat": branch_lat,
            "branch_lng": branch_lng,
            "branch_name": branch_name,
            "branch_address": branch_address,
            "clinic_id": o.clinic_id,
            "contact_name": o.contact_name,
            "contact_phone": o.contact_phone,
            "cancellation_reason": o.cancellation_reason,
            "created_at": str(o.created_at),
            "items": [{
                "id": i.product_id,
                "name": i.product_name,
                "price": i.price,
                "quantity": i.quantity,
                "variant": i.variant,
                "size": i.size,
                "image": i.image,
                "business_id": db.query(Product.business_id).filter(Product.id == i.product_id).scalar()
            } for i in items]
        })
    return {"orders": results}

@app.get("/api/clinics/branches/{branch_id}")
async def get_clinic_branch(branch_id: int, db: Session = Depends(get_db)):
    """Fetch details for a specific branch, including its parent clinic name."""
    branch = db.query(BusinessBranch).filter(BusinessBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    clinic = db.query(BusinessProfile).filter(BusinessProfile.id == branch.business_id).first()
    return {
        "branch": {
            "id": branch.id,
            "name": branch.name,
            "clinic_id": branch.business_id,
            "clinic_name": clinic.clinic_name if clinic else "Clinic",
            "address_line1": branch.address_line1,
            "address_line2": branch.address_line2,
            "phone": branch.phone,
            "lat": branch.lat,
            "lng": branch.lng,
            "is_main": branch.is_main
        }
    }


@app.get("/api/orders/check-purchased/{product_id}")
async def check_purchased(product_id: int, request: Request, db: Session = Depends(get_db)):
    """Check if the current user has a Completed order containing the specified product."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return {"has_purchased": False}
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except Exception:
        return {"has_purchased": False}

    from sqlalchemy import and_
    purchased = db.query(Order).join(OrderItem, Order.id == OrderItem.order_id).filter(
        and_(
            Order.customer_id == customer_id,
            Order.status == "Completed",
            OrderItem.product_id == product_id
        )
    ).first()
    return {"has_purchased": purchased is not None}

@app.patch("/api/orders/{order_id}/cancel")
async def cancel_order(order_id: int, body: CancelOrderRequest, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ["Cancelled", "Payment Pending"]:
        restore_stock(db, order.id)
        
    order.status = "Cancelled"
    order.cancellation_reason = body.reason
    db.commit()
    
    add_notification(
        db, customer_id, "System", 
        "Order Cancelled", 
        f"Your order #HV-{order.id:04d} was successfully cancelled.",
        "/dashboard/customer/orders"
    )
    
    # NOTIFY BUSINESS OWNERS (Split per Clinic)
    notified_biz = set()
    cancelled_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for itm in cancelled_items:
        p = db.query(Product).filter(Product.id == itm.product_id).first()
        if p and p.business_id and p.business_id not in notified_biz:
            add_notification(
                db, p.business_id, "System",
                "Order Cancelled by Customer",
                f"Customer has cancelled order #HV-{order.id:04d}.",
                "/dashboard/business/orders",
                role="business"
            )
            notified_biz.add(p.business_id)
    
    return {"message": "Order cancelled successfully"}

@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: int, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # We only allow deleting cancelled orders as per request
    if order.status != "Cancelled":
        raise HTTPException(status_code=400, detail="Only cancelled orders can be deleted")

    # Delete order items first (or depend on cascade if configured)
    db.query(OrderItem).filter(OrderItem.order_id == order_id).delete()
    db.delete(order)
    db.commit()
    
    return {"message": "Order deleted permanently"}

# ---------------------------------------------------------------------------
# Routes â€“ Notifications
# ---------------------------------------------------------------------------

@app.get("/api/notifications")
async def get_notifications(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "customer")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "business":
        notifs = db.query(Notification).filter(Notification.business_id == user_id).order_by(Notification.created_at.desc()).all()
    else:
        notifs = db.query(Notification).filter(Notification.customer_id == user_id).order_by(Notification.created_at.desc()).all()
        
    return {
        "notifications": [{
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "desc": n.description,
            "link": n.link,
            "read": n.is_read,
            "created_at": str(n.created_at)
        } for n in notifs]
    }

@app.patch("/api/notifications/{n_id}/read")
async def mark_notification_read(n_id: str, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "customer")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Handle synthetic admin alerts (clinic_X, rider_X)
    if n_id.startswith("clinic_") or n_id.startswith("rider_"):
        return {"message": "System alert marked as read (locally)"}

    try:
        int_id = int(n_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    if role == "business":
        notif = db.query(Notification).filter(Notification.id == int_id, Notification.business_id == user_id).first()
    elif role in ["super_admin", "system_admin"]:
        notif = db.query(Notification).filter(Notification.id == int_id).first()
    else:
        notif = db.query(Notification).filter(Notification.id == int_id, Notification.customer_id == user_id).first()
        
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@app.post("/api/notifications/read-all")
async def mark_all_read(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "customer")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "business":
        db.query(Notification).filter(Notification.business_id == user_id, Notification.is_read == False).update({"is_read": True}, synchronize_session=False)
    else:
        db.query(Notification).filter(Notification.customer_id == user_id, Notification.is_read == False).update({"is_read": True}, synchronize_session=False)
        
    db.commit()
    return {"message": "All notifications marked as read"}

@app.delete("/api/notifications/{n_id}")
async def delete_notification(n_id: str, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "customer")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Handle synthetic admin alerts (clinic_X, rider_X)
    if n_id.startswith("clinic_") or n_id.startswith("rider_"):
        return {"message": "System alert dismissed (locally)"}

    try:
        int_id = int(n_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    if role == "business":
        notif = db.query(Notification).filter(Notification.id == int_id, Notification.business_id == user_id).first()
    elif role in ["super_admin", "system_admin"]:
        notif = db.query(Notification).filter(Notification.id == int_id).first()
    else:
        notif = db.query(Notification).filter(Notification.id == int_id, Notification.customer_id == user_id).first()
        
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted"}

@app.delete("/api/notifications/all")
async def delete_all_notifications(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        user_id = int(payload["sub"])
        role = payload.get("role", "customer")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "business":
        db.query(Notification).filter(Notification.business_id == user_id).delete(synchronize_session=False)
    else:
        db.query(Notification).filter(Notification.customer_id == user_id).delete(synchronize_session=False)
        
    db.commit()
    return {"message": "All notifications deleted"}

# ---------------------------------------------------------------------------
# Routes â€“ Loyalty
# ---------------------------------------------------------------------------
@app.get("/api/loyalty")
async def get_loyalty(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Fetch user-specific loyalty data from the database."""
    customer_id = int(current_user["sub"])
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, detail="Customer not found")

    # Ensure customer has a referral code
    if not customer.referral_code:
        customer.referral_code = f"HIVET-{customer.email.split('@')[0].upper()}{customer.id}"
        db.commit()

    loyalty_info = get_loyalty_tier(customer.loyalty_points)
    
    # Fetch History
    history_objs = db.query(LoyaltyHistory).filter(
        LoyaltyHistory.customer_id == customer_id
    ).order_by(LoyaltyHistory.created_at.desc()).all()
    
    history = [{
        "desc": h.description,
        "points": h.points,
        "date": h.created_at.strftime("%Y-%m-%d")
    } for h in history_objs]
    
    # Fetch Vouchers
    vouchers_objs = db.query(LoyaltyVoucher).filter(LoyaltyVoucher.is_active == True).all()
    vouchers = [{
        "id": str(v.id),
        "title": v.title,
        "cost": v.cost,
        "type": v.type,
        "active": customer.loyalty_points >= v.cost
    } for v in vouchers_objs]

    # Fetch representative rates (from first verified clinic)
    representative_biz = db.query(BusinessProfile).filter(BusinessProfile.compliance_status == "verified").first()
    points_per_peso = representative_biz.loyalty_points_per_peso if representative_biz else 10.0
    points_per_reservation = representative_biz.loyalty_points_per_reservation if representative_biz else 50

    # Fetch Active User Vouchers
    active_user_vouchers = db.query(UserVoucher, LoyaltyVoucher).join(
        LoyaltyVoucher, UserVoucher.voucher_id == LoyaltyVoucher.id
    ).filter(
        UserVoucher.customer_id == customer_id,
        UserVoucher.is_used == False
    ).all()
    
    my_vouchers = [{
        "id": uv.UserVoucher.id,
        "title": uv.LoyaltyVoucher.title,
        "code": uv.UserVoucher.code,
        "type": uv.LoyaltyVoucher.type,
        "date": uv.UserVoucher.redeemed_at.strftime("%Y-%m-%d")
    } for uv in active_user_vouchers]

    return {
        "points": customer.loyalty_points,
        "tier": loyalty_info["tier"],
        "next_tier": loyalty_info["next_tier"],
        "next_tier_points": loyalty_info["next_points"],
        "history": history,
        "vouchers": vouchers,
        "my_vouchers": my_vouchers,
        "referral_code": customer.referral_code,
        "points_per_peso": points_per_peso,
        "points_per_reservation": points_per_reservation
    }

@app.post("/api/loyalty/redeem")
async def redeem_voucher(body: RedeemRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Redeem a voucher using loyalty points."""
    customer_id = int(current_user["sub"])
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, detail="Customer not found")

    voucher = db.query(LoyaltyVoucher).filter(LoyaltyVoucher.id == int(body.voucher_id)).first()
    if not voucher:
        raise HTTPException(404, detail="Voucher not found.")
    
    if customer.loyalty_points < voucher.cost:
        raise HTTPException(400, detail="Insufficient points.")

    # Process Redemption
    customer.loyalty_points -= voucher.cost
    
    # Generate unique voucher code
    import string
    import random
    voucher_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    # Create User Voucher
    new_user_voucher = UserVoucher(
        customer_id=customer_id,
        voucher_id=voucher.id,
        code=voucher_code
    )
    db.add(new_user_voucher)
    
    # Add History Entry
    new_history = LoyaltyHistory(
        customer_id=customer_id,
        description=f"Voucher Redeemed – {voucher.title}",
        points=-voucher.cost
    )
    db.add(new_history)
    db.commit()
    db.refresh(customer)

    # NOTIFY CUSTOMER
    add_notification(
        db, customer_id, "System",
        "Voucher Redeemed!",
        f"Your code for '{voucher.title}' is {voucher_code}. You can find it in your Rewards hub.",
        "/dashboard/customer/rewards"
    )

    return {
        "points": customer.loyalty_points,
        "voucher": {
            "id": str(voucher.id),
            "title": voucher.title,
            "code": voucher_code
        }
    }

class ItemBasics(BaseModel):
    id: int
    quantity: int
    price: float

class VoucherCodeRequest(BaseModel):
    code: str
    items: Optional[List[ItemBasics]] = []

@app.post("/api/loyalty/validate-voucher")
async def validate_voucher(body: VoucherCodeRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Validate a voucher code and return its discount details."""
    customer_id = int(current_user["sub"])
    
    # Fetch UserVoucher joined with LoyaltyVoucher
    result = db.query(UserVoucher, LoyaltyVoucher).join(
        LoyaltyVoucher, UserVoucher.voucher_id == LoyaltyVoucher.id
    ).filter(
        UserVoucher.code == body.code.upper(),
        UserVoucher.customer_id == customer_id,
        UserVoucher.is_used == False
    ).first()
    
    if not result:
        raise HTTPException(404, detail="Invalid or already used voucher code.")
    
    user_v, loyalty_v = result
    
    # Calculate actual discount based on items
    discount_val = 0
    if loyalty_v.type == "Discount":
        if "Food" in loyalty_v.title and body.items:
            food_total = 0
            for item in body.items:
                p = db.query(Product).filter(Product.id == item.id).first()
                if p and p.type == "Food":
                    food_total += item.price * item.quantity
            discount_val = int(food_total * (loyalty_v.value / 100))
        else:
            total_amt = sum(i.price * i.quantity for i in body.items) if body.items else 0
            discount_val = int(total_amt * (loyalty_v.value / 100))
    elif loyalty_v.type == "Credit":
        discount_val = int(loyalty_v.value)
    
    return {
        "id": user_v.id,
        "title": loyalty_v.title,
        "type": loyalty_v.type,
        "value": loyalty_v.value,
        "code": user_v.code,
        "calculated_discount": discount_val
    }


# ---------------------------------------------------------------------------
# Routes â€“ Rider
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Routes â€“ Admin
# ---------------------------------------------------------------------------

@app.get("/api/admin/users")
async def get_admin_users(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        admin_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    # Basic role check - only 'super_admin' can see all users
    is_admin = db.query(SuperAdminUser).filter(SuperAdminUser.id == admin_id).first()
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    customers = db.query(Customer).filter(Customer.is_deleted == False).all()
    businesses = db.query(BusinessProfile).filter(BusinessProfile.is_deleted == False).all()
    riders = db.query(RiderProfile).filter(RiderProfile.is_deleted == False).all()
    super_admins = db.query(SuperAdminUser).all()
    system_admins = db.query(SystemAdminUser).all()

    results = []
    
    for u in customers:
        display_role = "Customer"
        if getattr(u, 'role', '') == 'rider':
            continue # Legacy riders handled explicitly in rider_profiles now
        last_active_dt = u.last_active
        last_active_str = "Never"
        if last_active_dt:
            last_active_str = "Just now" if (datetime.utcnow() - last_active_dt).total_seconds() < 3600 else f"{int((datetime.utcnow() - last_active_dt).total_seconds() // 3600)}h ago"
        
        results.append({
            "id": f"CST-{u.id:04d}",
            "name": u.name or u.first_name or u.email.split('@')[0],
            "email": u.email,
            "role": display_role,
            "status": "Active",
            "lastActive": last_active_str
        })

    for r in riders:
        status_val = "Active"
        if getattr(r, 'compliance_status', '') == "pending":
            status_val = "Pending"
        elif getattr(r, 'compliance_status', '') == "non_compliant":
            status_val = "Rejected"
            
        last_active_dt = r.last_active
        last_active_str = "Never"
        if last_active_dt:
            last_active_str = "Just now" if (datetime.utcnow() - last_active_dt).total_seconds() < 3600 else f"{int((datetime.utcnow() - last_active_dt).total_seconds() // 3600)}h ago"
            
        results.append({
            "id": f"RD-{r.id:04d}",
            "name": r.name or r.first_name or r.email.split('@')[0],
            "email": r.email,
            "role": "Rider",
            "status": status_val,
            "lastActive": last_active_str
        })
        
    for b in businesses:
        status_val = "Active"
        if getattr(b, 'compliance_status', '') == "pending":
            status_val = "Pending"
        elif getattr(b, 'compliance_status', '') == "non_compliant":
            status_val = "Rejected"

        last_active_dt = b.last_active
        last_active_str = "Never"
        if last_active_dt:
            last_active_str = "Just now" if (datetime.utcnow() - last_active_dt).total_seconds() < 3600 else f"{int((datetime.utcnow() - last_active_dt).total_seconds() // 3600)}h ago"
        results.append({
            "id": f"CL-{b.id:04d}",
            "name": b.owner_full_name or b.clinic_name or b.email.split('@')[0],
            "email": b.email,
            "role": "Partner",
            "status": status_val,
            "lastActive": last_active_str
        })
        
    for a in super_admins:
        results.append({
            "id": f"SAD-{a.id:03d}",
            "name": a.name or a.first_name or a.email.split('@')[0],
            "email": a.email,
            "role": "Super Admin",
            "status": "Active",
            "lastActive": "Just now" if (datetime.utcnow() - a.created_at).total_seconds() < 3600 else f"{int((datetime.utcnow() - a.created_at).total_seconds() // 3600)}h ago"
        })
        
    for sa in system_admins:
        last_active_dt = sa.last_active
        last_active_str = "Never"
        if last_active_dt:
            last_active_str = "Just now" if (datetime.utcnow() - last_active_dt).total_seconds() < 3600 else f"{int((datetime.utcnow() - last_active_dt).total_seconds() // 3600)}h ago"
        results.append({
            "id": f"SYS-{sa.id:03d}",
            "name": sa.name or sa.first_name or sa.email.split('@')[0],
            "email": sa.email,
            "role": "System Admin",
            "status": "Active",
            "lastActive": last_active_str
        })
    
    return {"users": results}

@app.get("/api/admin/riders")
async def get_admin_riders(request: Request, db: Session = Depends(get_db)):
    """Fetch all riders for the admin fleet management page."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        admin_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    # Verify requester is an admin
    is_admin = db.query(SuperAdminUser).filter(SuperAdminUser.id == admin_id).first()
    if not is_admin:
        is_sys_admin = db.query(SystemAdminUser).filter(SystemAdminUser.id == admin_id).first()
        if not is_sys_admin:
            raise HTTPException(status_code=403, detail="Not authorized")

    riders = db.query(RiderProfile).all()
    results = []
    for r in riders:
        results.append({
            "id": r.id,
            "name": r.name or r.first_name or "Rider",
            "email": r.email,
            "phone": r.phone,
            "vehicle_type": r.vehicle_type,
            "compliance_status": r.compliance_status,
            "created_at": r.created_at.isoformat()
        })
    return results

# ─── User Management Action Endpoints ────────────────────────────────────────

@app.delete("/api/admin/users/{user_id}")
async def delete_platform_user(user_id: str, request: Request, db: Session = Depends(get_db)):
    """Permanently delete a user, rider, or partner by their formatted ID (e.g., CST-0001)."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if role != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admins can delete accounts")

    # Parse prefix and integer ID
    try:
        prefix, id_str = user_id.split("-")
        internal_id = int(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    target = None
    if prefix == "CST":
        target = db.query(Customer).filter(Customer.id == internal_id).first()
    elif prefix == "RD":
        target = db.query(RiderProfile).filter(RiderProfile.id == internal_id).first()
    elif prefix == "CL":
        target = db.query(BusinessProfile).filter(BusinessProfile.id == internal_id).first()
    elif prefix == "SYS":
        target = db.query(SystemAdminUser).filter(SystemAdminUser.id == internal_id).first()
    
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Perform soft-delete if the model supports it
    if hasattr(target, 'is_deleted'):
        target.is_deleted = True
        # If business, archive products
        if isinstance(target, BusinessProfile):
            db.query(Product).filter(Product.business_id == target.id).update({"is_archived": True})
        db.commit()
        return {"message": f"Successfully deactivated {user_id} (Soft-deleted)"}
    else:
        # Fallback for models without soft-delete flag
        db.delete(target)
        db.commit()
        return {"message": f"Successfully deleted {user_id}"}

@app.post("/api/admin/users/{user_id}/suspend")
async def toggle_user_suspension(user_id: str, request: Request, db: Session = Depends(get_db)):
    """Suspend or unsuspend a user. Note: Simple implementation toggles compliance_status."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if role not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        prefix, id_str = user_id.split("-")
        internal_id = int(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    target = None
    if prefix == "CST":
        target = db.query(Customer).filter(Customer.id == internal_id).first()
    elif prefix == "RD":
        target = db.query(RiderProfile).filter(RiderProfile.id == internal_id).first()
    elif prefix == "CL":
        target = db.query(BusinessProfile).filter(BusinessProfile.id == internal_id).first()
    
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # If it's a business or rider, we can use compliance_status
    if prefix in ["CL", "RD"]:
        current = getattr(target, 'compliance_status', 'verified')
        target.compliance_status = "suspended" if current != "suspended" else "verified"
    else:
        # For general customers, since they don't have compliance_status, we use role or a dummy field 
        # In a real app we'd add an is_active column, for now let's just use a role suffix for demo
        pass

    db.commit()
    return {"message": f"User {user_id} status updated"}

@app.get("/api/admin/dashboard-stats")
async def get_dashboard_stats(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        admin_id = int(payload["sub"])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if role == "super_admin":
        is_admin = db.query(SuperAdminUser).filter(SuperAdminUser.id == admin_id).first()
    elif role == "system_admin":
        is_admin = db.query(SystemAdminUser).filter(SystemAdminUser.id == admin_id).first()
    else:
        is_admin = None

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Calculate trends (new entries in last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Partners
    partners_query = db.query(BusinessProfile).filter(BusinessProfile.compliance_status == "verified")
    partner_count = partners_query.count()
    partner_trend = partners_query.filter(BusinessProfile.created_at >= thirty_days_ago).count()
    
    # Riders
    riders_query = db.query(RiderProfile).filter(RiderProfile.compliance_status == "verified")
    rider_count = riders_query.count()
    rider_trend = riders_query.filter(RiderProfile.created_at >= thirty_days_ago).count()
    
    # General Customers (isolated) - UPDATED 100% ACCURATE: role is "user" in database
    customers_query = db.query(Customer).filter(Customer.role == "user")
    customer_count = customers_query.count()
    customer_trend = customers_query.filter(Customer.created_at >= thirty_days_ago).count()
    
    # Total Platform End Users (Partners + Riders + Customers)
    total_end_users = partner_count + rider_count + customer_count
    total_trend = partner_trend + rider_trend + customer_trend

    # Detailed lists for modals (limit to latest 50 for performance)
    def format_detail(u):
        name = getattr(u, 'clinic_name', '') or getattr(u, 'name', '') or getattr(u, 'owner_full_name', '') or getattr(u, 'first_name', '') or u.email
        # Updated prefix for customers to CST for accuracy
        prefix = "CL" if hasattr(u, 'clinic_name') else "RD" if hasattr(u, 'vehicle_type') else "CST"
        return {
            "id": f"{prefix}-{u.id:04d}",
            "name": name,
            "email": u.email,
            "joined": u.created_at.strftime("%b %d, %Y")
        }

    # Aggregate all entities for Overall Population (Partners + Riders + Customers)
    all_partners_details = [format_detail(p) for p in partners_query.order_by(BusinessProfile.created_at.desc()).limit(50).all()]
    all_riders_details = [format_detail(r) for r in riders_query.order_by(RiderProfile.created_at.desc()).limit(50).all()]
    all_customers_details = [format_detail(u) for u in customers_query.order_by(Customer.created_at.desc()).limit(50).all()]
    
    # Combined list for "Overall Population" sorted by joined date (descending)
    combined_population = sorted(
        all_partners_details + all_riders_details + all_customers_details,
        key=lambda x: datetime.strptime(x["joined"], "%b %d, %Y"),
        reverse=True
    )[:100]

    return {
        "partners": partner_count,
        "partners_trend": f"+{partner_trend}",
        "riders": rider_count,
        "riders_trend": f"+{rider_trend}",
        "customers": customer_count,
        "customers_trend": f"+{customer_trend}",
        "end_users": total_end_users,
        "end_users_trend": f"+{total_trend}",
        "details": {
            "partners": all_partners_details,
            "riders": all_riders_details,
            "customers": all_customers_details,
            "end_users": combined_population
        }
    }

@app.get("/api/admin/recent-onboarding")
async def get_recent_onboarding(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        admin_id = int(payload["sub"])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if role == "super_admin":
        is_admin = db.query(SuperAdminUser).filter(SuperAdminUser.id == admin_id).first()
    elif role == "system_admin":
        is_admin = db.query(SystemAdminUser).filter(SystemAdminUser.id == admin_id).first()
    else:
        is_admin = None

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch recent activities
    limit = 3
    recent_partners = db.query(BusinessProfile).order_by(BusinessProfile.created_at.desc()).limit(limit).all()
    recent_riders = db.query(RiderProfile).order_by(RiderProfile.created_at.desc()).limit(limit).all()
    recent_customers = db.query(Customer).filter(Customer.role != "rider").order_by(Customer.created_at.desc()).limit(limit).all()

    def format_user(u):
        name_val = getattr(u, 'name', '') or getattr(u, 'owner_full_name', '') or getattr(u, 'clinic_name', '') or getattr(u, 'first_name', '') or u.email.split('@')[0]
        prefix = "CL" if getattr(u, 'role', '') == "business" else "RD" if getattr(u, 'role', '') == "rider" else "USR"
        
        status_val = "Active"
        if hasattr(u, 'compliance_status'):
            if u.compliance_status == "verified":
                status_val = "Active"
            elif u.compliance_status == "non_compliant":
                status_val = "Rejected"
            else:
                status_val = "Pending"
                
        return {
            "id": f"{prefix}-{u.id:04d}",
            "name": name_val,
            "status": status_val,
            "time": "Just now" if (datetime.utcnow() - u.created_at).total_seconds() < 3600 else f"{int((datetime.utcnow() - u.created_at).total_seconds() // 3600)}h ago"
        }

    return {
        "partners": [format_user(p) for p in recent_partners],
        "riders": [format_user(r) for r in recent_riders],
        "customers": [format_user(c) for c in recent_customers]
    }

@app.get("/api/admin/businesses")
async def get_admin_businesses(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        admin_id = int(payload["sub"])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "super_admin":
        is_admin = db.query(SuperAdminUser).filter(SuperAdminUser.id == admin_id).first()
    elif role == "system_admin":
        is_admin = db.query(SystemAdminUser).filter(SystemAdminUser.id == admin_id).first()
    else:
        is_admin = None

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(BusinessProfile)

    # Filter by compliance_status
    if status and status.lower() != "all":
        status_map = {
            "active": "verified",
            "pending": "pending",
            "inactive": "non_compliant",
        }
        db_status = status_map.get(status.lower(), status.lower())
        query = query.filter(BusinessProfile.compliance_status == db_status)

    # Search by clinic name or owner name or email
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (BusinessProfile.clinic_name.ilike(search_term)) |
            (BusinessProfile.owner_full_name.ilike(search_term)) |
            (BusinessProfile.email.ilike(search_term))
        )

    total = query.count()
    businesses = query.order_by(BusinessProfile.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    def fmt_status(s):
        if s == "verified":
            return "Active"
        elif s == "non_compliant":
            return "Inactive"
        return "Pending"

    def fmt_joined(dt):
        return dt.strftime("%b %Y") if dt else ""

    results = []
    for b in businesses:
        results.append({
            "id": f"CL-{b.id:04d}",
            "db_id": b.id,
            "name": b.clinic_name or b.email.split("@")[0],
            "owner": b.owner_full_name or "N/A",
            "email": b.email,
            "phone": b.clinic_phone or b.owner_phone or "N/A",
            "status": fmt_status(b.compliance_status),
            "compliance_status": b.compliance_status,
            "joined": fmt_joined(b.created_at),
        })

    return {
        "businesses": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


class BusinessStatusUpdate(BaseModel):
    compliance_status: str  # pending | verified | non_compliant


@app.patch("/api/admin/businesses/{business_id}/status")
async def update_business_status(
    business_id: int,
    body: BusinessStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        admin_id = int(payload["sub"])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "super_admin":
        is_admin = db.query(SuperAdminUser).filter(SuperAdminUser.id == admin_id).first()
    elif role == "system_admin":
        is_admin = db.query(SystemAdminUser).filter(SystemAdminUser.id == admin_id).first()
    else:
        is_admin = None

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    allowed = {"pending", "verified", "non_compliant"}
    if body.compliance_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {allowed}")

    biz = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    biz.compliance_status = body.compliance_status
    db.commit()
    db.refresh(biz)
    return {"message": "Status updated", "business_id": business_id, "compliance_status": biz.compliance_status}

@app.get("/api/admin/analytics")
async def get_admin_analytics(request: Request, db: Session = Depends(get_db)):
    """Backend for Admin Dashboard charts."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        admin_id = int(payload["sub"])
        role = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if role not in ["super_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Growth Data (Last 6 Months)
    growth_data = []
    for i in range(5, -1, -1):
        start_date = (datetime.utcnow().replace(day=1) - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0)
        # Approximate end date as 1st of next month
        if i == 0:
            end_date = datetime.utcnow()
        else:
            end_date = (start_date + timedelta(days=32)).replace(day=1)
            
        name = start_date.strftime("%b")
        
        # Cumulative total until end_date
        partners = db.query(BusinessProfile).filter(BusinessProfile.created_at < end_date).count()
        riders = db.query(RiderProfile).filter(RiderProfile.created_at < end_date).count()
        users = db.query(Customer).filter(Customer.role == "user", Customer.created_at < end_date).count()
        
        growth_data.append({
            "name": name,
            "Partners": partners,
            "Riders": riders,
            "Customers": users
        })

    # 2. Distribution Data (Pie Chart)
    partner_count = db.query(BusinessProfile).count()
    rider_count = db.query(RiderProfile).count()
    user_count = db.query(Customer).filter(Customer.role == "user").count()
    
    total = partner_count + rider_count + user_count
    distribution = [
        {"name": "Partners", "value": partner_count, "color": "#FB8500"},
        {"name": "Riders", "value": rider_count, "color": "#219EBC"},
        {"name": "Customers", "value": user_count, "color": "#8D6E63"}
    ]

    # 3. Daily Onboarding Velocity (Last 14 Days)
    velocity_data = []
    for i in range(13, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = day + timedelta(days=1)
        
        new_partners = db.query(BusinessProfile).filter(BusinessProfile.created_at >= day, BusinessProfile.created_at < next_day).count()
        new_riders = db.query(RiderProfile).filter(RiderProfile.created_at >= day, RiderProfile.created_at < next_day).count()
        new_users = db.query(Customer).filter(Customer.role == "user", Customer.created_at >= day, Customer.created_at < next_day).count()
        
        velocity_data.append({
            "date": day.strftime("%m/%d"),
            "new": new_partners + new_riders + new_users
        })

    return {
        "growth": growth_data,
        "distribution": distribution,
        "velocity": velocity_data
    }

@app.get("/api/payments/paymongo/status/{intent_id}")
async def get_paymongo_status(intent_id: str, db: Session = Depends(get_db)):
    """Poll for PaymentIntent status and update order/reservation if paid."""
    import base64
    auth_header_val = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"https://api.paymongo.com/v1/payment_intents/{intent_id}",
                headers={"Authorization": f"Basic {auth_header_val}"}
            )
            if resp.status_code != 200:
                print(f"Status check error: {resp.text}")
                # Don't raise, just return processing
                return {"status": "processing"}
            
            data = resp.json()["data"]
            status = data["attributes"]["status"]
            
            if status == "succeeded":
                # Find the order or reservation
                order = db.query(Order).filter(Order.paymongo_intent_id == intent_id).first()
                if order and order.status == "Payment Pending":
                    order.status = "Pending"
                    # Add notification
                    add_notification(db, order.customer_id, "System", "Payment Received!", f"Your payment for order #HV-{order.id:04d} has been confirmed.", "/dashboard/customer/orders")
                    db.commit()
                    return {"status": "succeeded", "type": "order", "id": order.id}
                
                res = db.query(Reservation).filter(Reservation.paymongo_intent_id == intent_id).first()
                if res and res.status == "Payment Pending":
                    res.status = "Pending"
                    res.payment_status = "paid"
                    # Add notification
                    add_notification(db, res.customer_id, "System", "Payment Received!", f"Your payment for reservation #RV-{res.id:04d} has been confirmed.", "/dashboard/customer/reservations")
                    db.commit()
                    return {"status": "succeeded", "type": "reservation", "id": res.id}

            return {"status": status}
        except Exception as e:
            print(f"Status check exception: {e}")
            return {"status": "processing"}



# ─── Rider Specific Endpoints ───────────────────────────────────────────────

@app.get("/api/rider/profile")
async def get_rider_role_profile(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Fetch rider-specific profile data including online status."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        # Fallback for old rider linkage
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    return {
        "id": rider.id,
        "is_online": rider.is_online,
        "compliance_status": rider.compliance_status,
        "total_earnings": rider.total_earnings
    }

@app.patch("/api/rider/status")
async def update_rider_online_status(body: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Toggle rider's online visibility for accepting delivery jobs."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    
    # Optional: Verify compliance
    if rider.compliance_status != "verified":
        raise HTTPException(status_code=403, detail="Your rider account is not yet verified by Admin.")

    rider.is_online = body.get("is_online", False)
    db.commit()
    return {"message": "Status updated", "is_online": rider.is_online}

@app.patch("/api/rider/location")
async def update_rider_gps_location(body: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Periodic GPS update for real-time tracking during deliveries."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")

    rider.current_lat = body.get("lat")
    rider.current_lng = body.get("lng")
    rider.last_location_update = datetime.utcnow()
    db.commit()
    return {"status": "success"}

@app.get("/api/rider/earnings")
async def get_rider_earnings_summary(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Fetch earnings summary: today, total completed orders, and accumulated earnings."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()
    
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")

    # Calculate today's earnings (standardizing on 'Completed' as final status)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today = db.query(Order).filter(
        Order.rider_id == rider.id,
        Order.status == "Completed",
        Order.delivered_at >= today
    ).all()
    today_earnings = sum(50 for o in completed_today) # Standardized ₱50 per delivery
    
    total_completed = db.query(Order).filter(
        Order.rider_id == rider.id,
        Order.status == "Completed"
    ).count()

    return {
        "total_earnings": rider.total_earnings or 0,
        "completed_orders": total_completed,
        "today_earnings": today_earnings
    }

    # Total completed orders
    total_completed = db.query(Order).filter(
        Order.rider_id == rider.id,
        Order.status == "Delivered"
    ).count()

    return {
        "today_earnings": today_earnings,
        "completed_orders": total_completed,
        "total_earnings": rider.total_earnings or 0
    }

@app.get("/api/rider/available-orders")
async def get_available_jobs(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Pull list of orders requiring delivery (Status = 'Processing' and no rider assigned).
    Filters by distance if rider location is known."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()

    # We show all 'Pending' and 'Processing' orders that are for delivery and don't have a rider
    orders = db.query(Order).filter(
        Order.status.in_(["Pending", "Processing"]),
        Order.fulfillment_method == "delivery",
        Order.rider_id == None
    ).all()
    
    print(f"DEBUG: Found {len(orders)} total delivery orders.")
    results = []
    for o in orders:
        # Determine Pickup Location
        pickup_lat, pickup_lng = None, None
        pickup_name = "Hi-Vet Hub"
        
        if o.branch_id:
            branch = db.query(BusinessBranch).filter(BusinessBranch.id == o.branch_id).first()
            if branch:
                pickup_lat, pickup_lng = branch.lat, branch.lng
                biz = db.query(BusinessProfile).filter(BusinessProfile.id == o.clinic_id).first()
                if biz:
                    pickup_name = f"{biz.clinic_name} - {branch.name}"
                else:
                    pickup_name = branch.name
        if not pickup_lat or not pickup_lng:
            # Fallback: Get business from first item in order
            item = db.query(OrderItem).filter(OrderItem.order_id == o.id).first()
            if item:
                prod = db.query(Product).filter(Product.id == item.product_id).first()
                if prod:
                    biz = db.query(BusinessProfile).filter(BusinessProfile.id == prod.business_id).first()
                    if biz:
                        pickup_name = biz.clinic_name
                        # Check for main branch
                        main_b = db.query(BusinessBranch).filter(BusinessBranch.business_id == biz.id, BusinessBranch.is_main == True).first()
                        if main_b:
                            pickup_lat, pickup_lng = main_b.lat, main_b.lng
                        else:
                            pickup_lat, pickup_lng = biz.clinic_lat, biz.clinic_lng

        distance = 0.0
        if rider and rider.current_lat and rider.current_lng and pickup_lat and pickup_lng:
            distance = get_distance(rider.current_lat, rider.current_lng, pickup_lat, pickup_lng)
        
        print(f"DEBUG: Order #{o.id} - Distance: {distance}km - Rider Lat: {rider.current_lat if rider else 'N/A'}")
        
        # Filter: Only show orders within 20km for "Nearby" effectiveness
        if distance > 20.0 and rider and rider.current_lat:
            print(f"DEBUG: Skipping Order #{o.id} due to distance (>20km)")
            continue

        # Format friendly time
        time_str = "Just now"
        if o.created_at:
            diff = datetime.utcnow() - o.created_at
            if diff.total_seconds() < 60: time_str = "Just now"
            elif diff.total_seconds() < 3600: time_str = f"{int(diff.total_seconds() // 60)}m ago"
            else: time_str = f"{int(diff.total_seconds() // 3600)}h ago"

        results.append({
            "id": o.id,
            "total_amount": o.total_amount,
            "delivery_address": o.delivery_address,
            "delivery_lat": o.delivery_lat,
            "delivery_lng": o.delivery_lng,
            "pickup_name": pickup_name,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "distance_km": round(distance, 1),
            "created_at": time_str,
            "status": o.status
        })
        
    # Sort by distance (nearest first)
    results.sort(key=lambda x: x["distance_km"])
    
    return {"orders": results}

@app.get("/api/rider/active-order")
async def get_ongoing_job(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Check if the current rider has an active delivery in progress."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()

    if not rider:
         return {"order": None}

    order = db.query(Order).filter(
        Order.rider_id == rider.id,
        Order.status.in_(["Processing", "Picked Up", "Out for Delivery"])
    ).first()
    
    if not order:
        return {"order": None}
        
    # Inject pickup data (Branch or Clinic)
    pickup_lat, pickup_lng = None, None
    pickup_name = "Hi-Vet Hub"
    pickup_address = "Main Branch Address"
    
    if order.branch_id:
        branch = db.query(BusinessBranch).filter(BusinessBranch.id == order.branch_id).first()
        if branch:
            pickup_lat, pickup_lng = branch.lat, branch.lng
            pickup_address = f"{branch.house_number or ''} {branch.street or ''}, {branch.barangay or ''}, {branch.city or ''}".strip(', ')
            if not pickup_address: pickup_address = branch.address_line1 or "Branch Address"
            
            biz = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
            if biz:
                pickup_name = f"{biz.clinic_name} - {branch.name}"
            else:
                pickup_name = branch.name
    elif order.clinic_id:
        biz = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
        if biz:
            pickup_lat, pickup_lng = biz.clinic_lat, biz.clinic_lng
            pickup_name = biz.clinic_name
            pickup_address = f"{biz.clinic_house_number or ''} {biz.clinic_street or ''}, {biz.clinic_barangay or ''}, {biz.clinic_city or ''}".strip(', ')
            if not pickup_address: pickup_address = "Clinic Address"
    
    # Fetch items
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    item_list = []
    for it in items:
        p = db.query(Product).filter(Product.id == it.product_id).first()
        item_list.append({"name": p.name if p else "Product", "quantity": it.quantity})

    return {
        "order": {
            "id": order.id,
            "status": order.status,
            "delivery_address": order.delivery_address,
            "delivery_lat": order.delivery_lat,
            "delivery_lng": order.delivery_lng,
            "items": item_list,
            "clinic": {
                "name": pickup_name,
                "address": pickup_address,
                "lat": pickup_lat,
                "lng": pickup_lng
            }
        }
    }

@app.post("/api/rider/orders/{order_id}/accept")
async def accept_delivery_job(order_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Claim a delivery request."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    
    rider = db.query(RiderProfile).filter(RiderProfile.id == int(current_user["sub"])).first()
    if not rider:
        rider = db.query(RiderProfile).filter(RiderProfile.customer_id == int(current_user["sub"])).first()

    order = db.query(Order).filter(Order.id == order_id, Order.rider_id == None).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order already claimed or not found.")
        
    order.rider_id = rider.id
    order.status = "Processing"
    order.assigned_at = datetime.utcnow()
    db.commit()
    return {"message": "Order accepted"}

@app.patch("/api/rider/orders/{order_id}/status")
async def update_delivery_step(order_id: int, body: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Move the delivery through stages: Picked Up -> Delivered."""
    if current_user.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Rider access required")
    
    new_status = body.get("status")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = new_status
    if new_status == "Pending":
        order.rider_id = None
        order.assigned_at = None
    elif new_status == "Picked Up":
        order.picked_up_at = datetime.utcnow()
    elif new_status == "Delivered":
        if order.status != "Completed":
            # --- DEDUCT STOCK ---
            reduce_stock(db, order_id)
            order.status = "Completed"
            order.delivered_at = datetime.utcnow()
            
            # Update rider earnings
            rider = db.query(RiderProfile).filter(RiderProfile.id == order.rider_id).first()
            if rider:
                rider.total_earnings = (rider.total_earnings or 0) + 5000 # Standard ₱50 delivery fee
            
            # --- AWARD LOYALTY POINTS TO CUSTOMER ---
            biz = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
            items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
            total_points = 0
            for item in items:
                prod = db.query(Product).filter(Product.id == item.product_id).first()
                if prod and prod.loyalty_points > 0:
                    total_points += prod.loyalty_points * item.quantity
                elif biz:
                    total_points += int(item.price * item.quantity * biz.loyalty_points_per_peso)
                else:
                    total_points += int(item.price * item.quantity * 0.01)
                    
            if total_points > 0:
                customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
                if customer:
                    customer.loyalty_points += total_points
                    db.add(LoyaltyHistory(
                        customer_id=order.customer_id,
                        description=f"Purchase Reward – Order #HV-{order.id:04d}",
                        points=total_points
                    ))
        
    db.commit()

    # NOTIFY CUSTOMER
    status_msg = f"Your order #HV-{order.id:04d} status is now: {new_status}"
    if new_status == "Picked Up":
        status_msg = f"A rider has picked up your order #HV-{order.id:04d} and is on the way!"
    elif new_status == "Delivered":
        status_msg = f"Your order #HV-{order.id:04d} has been delivered. Enjoy!"

    add_notification(
        db, order.customer_id, "System",
        f"Delivery Update: {new_status}",
        status_msg,
        "/dashboard/customer/orders"
    )

    return {"message": f"Order status updated to {new_status}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
