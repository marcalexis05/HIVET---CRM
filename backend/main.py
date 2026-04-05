import os
import uuid
import httpx
import uvicorn
import random
import shutil
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta
from typing import Optional, List
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, Form, Query, APIRouter
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256

from sqlalchemy import create_engine, Column, String, Text, DateTime, text, Integer, Boolean, Float, ForeignKey, func, inspect
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from dateutil.relativedelta import relativedelta

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

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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
    role        = Column(String, default="user") # user, rider
    loyalty_points = Column(Integer, default=0)
    referral_code  = Column(String, unique=True, nullable=True)
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
    created_at  = Column(DateTime, default=datetime.utcnow)

class RiderProfile(Base):
    __tablename__ = "rider_profiles"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    # Standalone auth fields — riders are NOT stored in customer table
    email         = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=True)
    first_name    = Column(String, nullable=True)
    last_name     = Column(String, nullable=True)
    suffix        = Column(String, nullable=True)
    name          = Column(String, nullable=True)  # full name
    phone         = Column(String, nullable=True)
    home_address  = Column(String, nullable=True)
    role          = Column(String, default="rider")
    picture       = Column(String, nullable=True)
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
    
    created_at            = Column(DateTime, default=datetime.utcnow)

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
    stars        = Column(Integer, default=5)
    loyalty_points = Column(Integer, default=0)
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
    customer_id = Column(Integer, nullable=False)
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
    id           = Column(Integer, primary_key=True, autoincrement=True)
    customer_id  = Column(Integer, nullable=False)
    business_id  = Column(Integer, nullable=True)
    service_id   = Column(Integer, ForeignKey("business_services.id"), nullable=True)
    pet_name     = Column(String, nullable=False)
    service      = Column(String, nullable=False)
    date         = Column(String, nullable=False)  # YYYY-MM-DD
    time         = Column(String, nullable=False)  # e.g. "10:00 AM"
    status       = Column(String, default="Pending")  # Pending|Confirmed|Ready for Pickup|Completed|Cancelled
    location     = Column(String, nullable=True)
    notes        = Column(Text, nullable=True)
    total_amount = Column(Float, default=0.0)
    created_at   = Column(DateTime, default=datetime.utcnow)

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
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    db = SessionLocal()
    try:
        if db.query(LoyaltyVoucher).count() == 0:
            vouchers = [
                LoyaltyVoucher(title="Free Grooming Add-on", cost=500, type="Service"),
                LoyaltyVoucher(title="15% Off Premium Foods", cost=800, type="Discount"),
                LoyaltyVoucher(title="Complimentary Vet Consult", cost=2000, type="Service"),
                LoyaltyVoucher(title="₱10 Store Credit", cost=1000, type="Credit"),
            ]
            db.add_all(vouchers)
            db.commit()
            print("Seeded loyalty vouchers.")
    finally:
        db.close()
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
    total_amount: Optional[float] = 0.0

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

class BusinessServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    loyalty_points: Optional[int] = None

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
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RedeemRequest(BaseModel):
    voucher_id: str

class RedeemedVoucher(BaseModel):
    id: str
    title: str

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
    stars: int
    loyalty_points: Optional[int] = 0
    created_at: datetime
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_lat: Optional[float] = None
    clinic_lng: Optional[float] = None

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
    loyalty_points: Optional[int] = 0

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
    loyalty_points: Optional[int] = None

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
    total_orders: int
    monthly_revenue: int
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
    month: str
    value: int

class TopProductAnalytics(BaseModel):
    name: str
    sold: int
    revenue: str
    pct: int
    delta: Optional[int] = 0

class BusinessAnalyticsData(BaseModel):
    kpis: List[dict]
    revenue_trend: List[RevenueTrendItem]
    top_products: List[TopProductAnalytics]
    loyalty_redemptions: List[dict]
    retention_rate: int = 0
    retention_change: str = ""

def add_notification(db: Session, customer_id: int, n_type: str, title: str, desc: str, link: str = None):
    new_notif = Notification(
        customer_id=customer_id,
        type=n_type,
        title=title,
        description=desc,
        link=link
    )
    db.add(new_notif)
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
async def get_business_orders(request: Request, db: Session = Depends(get_db)):
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
    results = db.query(OrderItem, Order, Product, Customer)\
        .join(Product, OrderItem.product_id == Product.id)\
        .join(Order, OrderItem.order_id == Order.id)\
        .join(Customer, Order.customer_id == Customer.id)\
        .filter(Product.business_id == business_id)\
        .filter(Order.status != "Payment Pending")\
        .order_by(Order.created_at.desc())\
        .all()
        
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

    # Verify this order belongs to this business
    # The order_id from frontend might look like ORD-12-34 but we only need the numeric DB ID
    # Actually wait, the order ID in the URL path is just order_id (int).
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Make sure this order contains products from this business
    order_has_business_items = db.query(OrderItem).join(Product, OrderItem.product_id == Product.id)\
        .filter(OrderItem.order_id == order_id, Product.business_id == business_id).first()
        
    if not order_has_business_items:
        raise HTTPException(status_code=403, detail="Not authorized to edit this order")

    previous_status = order.status
    order.status = body.status
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
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAFA; color: #333333; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4A3E3D; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">Hi-Vet CRM</h1>
            </div>
            <div style="background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <h2 style="font-size: 20px; font-weight: 700; color: #4A3E3D; margin-top: 0; margin-bottom: 15px;">Complete Your Google Sign-up</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #666666; margin-bottom: 30px; margin-top: 0;">
                    Welcome to Hi-Vet CRM! You have successfully linked your Google account. Please click the button below to verify your email and securely access your Customer Dashboard.
                </p>
                <a href="{magic_link}" style="display: inline-block; background-color: #E85D04; color: #FFFFFF; text-decoration: none; padding: 16px 32px; font-size: 14px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; border-radius: 50px; margin-bottom: 30px; box-shadow: 0 4px 10px rgba(232, 93, 4, 0.3);">
                    Verify & Login
                </a>
                <p style="font-size: 13px; color: #999999; margin-bottom: 0;">
                    If the button above does not work, copy and paste the following link into your browser:<br/>
                    <a href="{magic_link}" style="color: #E85D04; word-break: break-all;">{magic_link}</a>
                </p>
            </div>
        </div>
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Welcome to Hi-Vet - Complete Your Sign-Up"
        msg["From"] = f"Hi-Vet CRM <{EMAIL_SENDER}>"
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

@app.post("/api/auth/send-otp")
def send_otp(body: SendOtpRequest, db: Session = Depends(get_db)):
    """Generates and sends a 6-digit OTP to the user's email."""
    existing_customer = db.query(Customer).filter(Customer.email == body.email).first()
    existing_rider    = db.query(RiderProfile).filter(RiderProfile.email == body.email).first()
    existing_business = db.query(BusinessProfile).filter(BusinessProfile.email == body.email).first()
    if existing_customer or existing_rider or existing_business:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    otp_code = f"{random.randint(0, 999999):06d}"
    expires = datetime.utcnow() + timedelta(minutes=10)
    OTP_STORE[body.email] = {"otp": otp_code, "expires": expires}
    
    # HTML Email Template
    html_content = f"""
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAFA; color: #333333; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4A3E3D; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">Hi-Vet CRM</h1>
        </div>
        <div style="background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <h2 style="font-size: 20px; font-weight: 700; color: #4A3E3D; margin-top: 0; margin-bottom: 15px;">Verify Your Email Address</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #666666; margin-bottom: 30px; margin-top: 0;">
                Thank you for registering with Hi-Vet CRM. To complete your signup and secure your account, please enter the following 6-digit verification code.
            </p>
            <div style="background-color: #FFF5F0; border: 2px dashed #E85D04; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: inline-block;">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #E85D04;">{otp_code}</span>
            </div>
            <p style="font-size: 13px; color: #999999; margin-bottom: 0;">
                This code will expire in 10 minutes. If you did not request this verification, please ignore this email.
            </p>
        </div>
    </div>
    """
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify Your Account - Hi-Vet CRM"
    msg["From"] = f"Hi-Vet CRM <{EMAIL_SENDER}>"
    msg["To"] = body.email
    msg.attach(MIMEText(html_content, "html"))
    
    if not EMAIL_SENDER or not EMAIL_APP_PWD:
        raise HTTPException(status_code=500, detail="Email service not configured. Please set EMAIL_SENDER and EMAIL_APP_PWD in the .env file.")

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.sendmail(EMAIL_SENDER, body.email, msg.as_string())
        server.quit()
    except Exception as e:
        print("SMTP Error:", e)
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {str(e)}")
        
    return {"message": "Verification code sent"}

class RegisterRequest(BaseModel):
    email: str
    password: str
    otp: str
    first_name: str = ""
    last_name: str = ""
    middle_name: str = ""
    suffix: str = ""
    phone: str = ""
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
        if body.last_name: parts.append(body.last_name.strip())
        rider_full_name = " ".join(parts).strip() or "Rider"

        rider_prof = RiderProfile(
            email=body.email,
            password_hash=pwd_hash,
            first_name=body.first_name,
            last_name=body.last_name,
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
    return db.query(Product).order_by(Product.created_at.desc()).all()

@app.get("/api/catalog/{product_id}", response_model=ProductSchema)
async def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    """Fetch a single product's details by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Inject clinic info
    biz = db.query(BusinessProfile).filter(BusinessProfile.id == product.business_id).first()
    if biz:
        product.clinic_name = biz.clinic_name
        product.clinic_phone = biz.clinic_phone
        product.clinic_lat = biz.clinic_lat
        product.clinic_lng = biz.clinic_lng
        
    return product

@app.get("/api/business/catalog", response_model=List[ProductSchema])
async def get_business_catalog(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch products belonging specifically to the logged-in business."""
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    business_id = int(current_user["sub"])
    products = db.query(Product).filter(Product.business_id == business_id).order_by(Product.created_at.desc()).all()
    print(f"DEBUG: get_business_catalog for biz_id={business_id} returning {len(products)} products")
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
        stars=5,
        loyalty_points=body.loyalty_points or 0
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
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
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}

# ─── Reservation Endpoints ────────────────────────────────────────────────────

def _reservation_to_dict(r: Reservation, customer_name: Optional[str] = None) -> dict:
    return {
        "id": f"RV-{r.id:04d}",
        "db_id": r.id,
        "customer_id": r.customer_id,
        "customer_name": customer_name or f"Customer #{r.customer_id}",
        "business_id": r.business_id,
        "pet_name": r.pet_name,
        "service": r.service,
        "date": r.date,
        "time": r.time,
        "status": r.status,
        "location": r.location or "",
        "notes": r.notes or "",
        "total": r.total_amount,
        "total_amount": r.total_amount,
        "created_at": r.created_at.isoformat(),
    }

@app.get("/api/reservations")
async def get_reservations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Fetch reservations. Customers see their own; businesses see all incoming for them."""
    role = current_user.get("role")
    user_id = int(current_user["sub"])
    if role == "business":
        query = db.query(Reservation, Customer.name).join(Customer, Reservation.customer_id == Customer.id).filter(Reservation.business_id == user_id).order_by(Reservation.created_at.desc())
        results = []
        for r, name in query.all():
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
        
        # Check if in the past
        if res_datetime < datetime.now():
            raise HTTPException(status_code=400, detail="Cannot book a reservation in the past.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format.")

    # 2. Check Operating Hours (Special Date Overrides first)
    special = db.query(BusinessSpecialDateHours).filter(
        BusinessSpecialDateHours.business_id == body.business_id,
        BusinessSpecialDateHours.specific_date == body.date
    ).first()
    
    selected_hours = None
    if special:
        if not special.is_open:
            raise HTTPException(status_code=400, detail=f"Clinic is closed on {body.date}.")
        selected_hours = special
    else:
        # Check regular hours (0=Sun in DB, 1=Mon, ..., 6=Sat)
        # res_date_obj.weekday() returns 0=Mon, ..., 6=Sun
        dow_db = (res_date_obj.weekday() + 1) % 7
        hours = db.query(BusinessOperatingHours).filter(
            BusinessOperatingHours.business_id == body.business_id,
            BusinessOperatingHours.day_of_week == dow_db
        ).first()
        if not hours or not hours.is_open:
            raise HTTPException(status_code=400, detail="Clinic is closed on this day.")
        selected_hours = hours

    # 3. Time range check (Clinic Open/Close and Break)
    if selected_hours:
        try:
            open_t = datetime.strptime(selected_hours.open_time, "%I:%M %p").time()
            close_t = datetime.strptime(selected_hours.close_time, "%I:%M %p").time()
            
            if res_time_obj < open_t or res_time_obj >= close_t:
                raise HTTPException(status_code=400, detail=f"Clinic is only open from {selected_hours.open_time} to {selected_hours.close_time}.")
            
            # Check Break time
            if getattr(selected_hours, 'break_start', None) and getattr(selected_hours, 'break_end', None):
                break_s = datetime.strptime(selected_hours.break_start, "%I:%M %p").time()
                break_e = datetime.strptime(selected_hours.break_end, "%I:%M %p").time()
                if res_time_obj >= break_s and res_time_obj < break_e:
                    raise HTTPException(status_code=400, detail="Clinic is on break during this requested time.")
        except ValueError:
            # If clinic hours in DB are misconfigured
            pass

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

    # 5. Create the reservation
    new_res = Reservation(
        customer_id=customer_id,
        business_id=body.business_id,
        service_id=body.service_id,
        pet_name=body.pet_name,
        service=body.service,
        date=body.date,
        time=body.time,
        location=body.location,
        notes=body.notes,
        total_amount=body.total_amount or 0.0,
        status="Pending",
    )
    db.add(new_res)
    db.commit()
    db.refresh(new_res)
    
    # Include customer name in the response for immediate UI update
    customer_name = current_user.get("name")

    add_notification(
        db, customer_id, "System", 
        "Reservation Booked!", 
        f"Your reservation for {new_res.service} on {new_res.date} at {new_res.time} has been requested.",
        "/dashboard/user/reservations"
    )

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
    db.commit()
    db.refresh(res)

    add_notification(
        db, res.customer_id, "System", 
        "Reservation Cancelled", 
        f"Your reservation for {res.service} on {res.date} has been cancelled.",
        "/dashboard/user/reservations"
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
        elif res.status == "Completed":
            status_msg = "Your reservation has been marked as completed. Thank you!"

        add_notification(
            db, res.customer_id, "System", 
            f"Reservation {res.status}", 
            status_msg,
            "/dashboard/user/reservations"
        )

    return {"reservation": _reservation_to_dict(res)}

# ─── Business Operating Hours Endpoints ──────────────────────────────────────

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
        loyalty_points=body.loyalty_points or 0
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
            "services": [{"id": s.id, "name": s.name, "description": s.description, "price": s.price, "duration_minutes": s.duration_minutes} for s in services],
            "hours": [{"day_of_week": h.day_of_week, "day_name": DAYS_OF_WEEK[h.day_of_week], "is_open": h.is_open, "open_time": h.open_time, "close_time": h.close_time, "break_start": h.break_start, "break_end": h.break_end} for h in hours],
            "special_hours": [{"specific_date": sh.specific_date, "is_open": sh.is_open, "open_time": sh.open_time, "close_time": sh.close_time, "break_start": sh.break_start, "break_end": sh.break_end} for sh in special_hours]
        })
    return {"clinics": result}

# ─── Business Dashboard & Analytics Endpoints ─────────────────────────────────

@app.get("/api/business/dashboard/stats", response_model=BusinessDashboardStats)
async def get_business_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    biz_id = int(current_user["sub"])
    
    # Orders count for this business (Orders containing at least one item from this biz, excluding cancelled and pending)
    orders_count = db.query(Order).join(OrderItem, OrderItem.order_id == Order.id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id, Order.status.notin_(["Cancelled", "Pending"])).distinct().count()
    
    # revenue calculation
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    # Current month revenue
    revenue_query = db.query(OrderItem).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= month_start, Order.status.notin_(["Cancelled", "Pending"]))
    monthly_rev = sum(item.price * item.quantity for item in revenue_query.all())
    
    # Previous month revenue
    prev_revenue_query = db.query(OrderItem).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= last_month_start, Order.created_at < month_start, Order.status.notin_(["Cancelled", "Pending"]))
    prev_monthly_rev = sum(item.price * item.quantity for item in prev_revenue_query.all())
    
    # Calculate % change
    if prev_monthly_rev > 0:
        rev_change_pct = ((monthly_rev - prev_monthly_rev) / prev_monthly_rev) * 100
        rev_change_str = f"{'+' if rev_change_pct >= 0 else ''}{rev_change_pct:.0f}% vs last mo"
    else:
        rev_change_str = "+100% vs last mo" if monthly_rev > 0 else "0% vs last mo"

    # Orders change
    curr_orders = db.query(Order).join(OrderItem, OrderItem.order_id == Order.id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id, Order.created_at >= month_start, Order.status.notin_(["Cancelled", "Pending"])).distinct().count()
    prev_orders = db.query(Order).join(OrderItem, OrderItem.order_id == Order.id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id, Order.created_at >= last_month_start, Order.created_at < month_start, Order.status.notin_(["Cancelled", "Pending"])).distinct().count()
    
    if prev_orders > 0:
        ord_change_pct = ((curr_orders - prev_orders) / prev_orders) * 100
        ord_change_str = f"{'+' if ord_change_pct >= 0 else ''}{ord_change_pct:.0f}% this month"
    else:
        ord_change_str = "+100% this month" if curr_orders > 0 else "0% this month"

    active_prods = db.query(Product).filter(Product.business_id == biz_id).count()
    low_stock = db.query(Product).filter(Product.business_id == biz_id, Product.stock <= 10).count()
    
    return {
        "total_orders": orders_count,
        "monthly_revenue": int(monthly_rev),
        "active_products": active_prods,
        "low_stock_count": low_stock,
        "revenue_change": rev_change_str,
        "orders_change": ord_change_str
    }

@app.get("/api/business/dashboard/recent-orders", response_model=List[BusinessDashboardOrder])
async def get_business_recent_orders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    biz_id = int(current_user["sub"])
    
    # Get recent orders containing items from this business
    recent_order_items = db.query(OrderItem, Order, Customer).join(Order, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id).join(Customer, Customer.id == Order.customer_id).filter(Product.business_id == biz_id).order_by(Order.created_at.desc()).limit(10).all()
    
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
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "business":
        raise HTTPException(status_code=403, detail="Business access required")
    
    biz_id = int(current_user["sub"])
    
    # KPI Row
    stats = await get_business_dashboard_stats(db, current_user)
    
    # Define month_start for relativedelta usage below
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    # Accurate Units Sold (Total items across all successful orders for this business)
    units_sold_query = db.query(func.sum(OrderItem.quantity)).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.status.notin_(["Cancelled", "Pending"]))
    total_units = units_sold_query.scalar() or 0
    
    kpis = [
        {"label": "Total Revenue", "value": f"₱{stats['monthly_revenue']/1000:,.1f}k", "change": stats["revenue_change"], "up": "+" in stats["revenue_change"], "icon": "TrendingUp", "color": "bg-green-50 text-green-600"},
        {"label": "Units Sold", "value": f"{total_units:,}", "change": stats["orders_change"], "up": "+" in stats["orders_change"], "icon": "ShoppingBag", "color": "bg-orange-50 text-orange-600"},
        {"label": "Active Products", "value": f"{stats['active_products']}", "change": "Live", "up": True, "icon": "Package", "color": "bg-blue-50 text-blue-600"},
        {"label": "Low Stock", "value": f"{stats['low_stock_count']}", "change": "Action Required" if stats['low_stock_count'] > 0 else "Optimal", "up": stats['low_stock_count'] == 0, "icon": "Award", "color": "bg-purple-50 text-purple-600"}
    ]
    
    # Revenue Trend based on period
    revenue_trend_data = []
    
    if period == '7d':
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            next_day = day + timedelta(days=1)
            val = db.query(func.sum(OrderItem.price * OrderItem.quantity)).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= day, Order.created_at < next_day, Order.status.notin_(["Cancelled", "Pending"])).scalar() or 0
            revenue_trend_data.append({"name": day.strftime("%a"), "value": int(val)})
            
    elif period == '30d':
        for i in range(29, -1, -5): # Show every 5th day for 30d
            day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            next_interval = day + timedelta(days=5)
            val = db.query(func.sum(OrderItem.price * OrderItem.quantity)).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= day, Order.created_at < next_interval, Order.status.notin_(["Cancelled", "Pending"])).scalar() or 0
            revenue_trend_data.append({"name": day.strftime("%b %d"), "value": int(val)})
            
    elif period == '6m':
        for i in range(5, -1, -1):
            m_start = (month_start - relativedelta(months=i))
            m_end = (m_start + relativedelta(months=1))
            val = db.query(func.sum(OrderItem.price * OrderItem.quantity)).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= m_start, Order.created_at < m_end, Order.status.notin_(["Cancelled", "Pending"])).scalar() or 0
            revenue_trend_data.append({"name": m_start.strftime("%Y-%m"), "value": int(val)})
            
    else: # 1y
        for i in range(11, -1, -1):
            m_start = (month_start - relativedelta(months=i))
            m_end = (m_start + relativedelta(months=1))
            val = db.query(func.sum(OrderItem.price * OrderItem.quantity)).join(Product, Product.id == OrderItem.product_id).join(Order, Order.id == OrderItem.order_id).filter(Product.business_id == biz_id, Order.created_at >= m_start, Order.created_at < m_end, Order.status.notin_(["Cancelled", "Pending"])).scalar() or 0
            revenue_trend_data.append({"name": m_start.strftime("%Y-%m"), "value": int(val)})

    return {
        "kpis": kpis,
        "revenue_trend": {
            "trend": stats["revenue_change"],
            "chartData": revenue_trend_data
        },
        "top_products": top_products,
        "loyalty_redemptions": loyalty_redemptions,
        "retention_rate": int((repeat_customers / total_biz_customers * 100)) if total_biz_customers > 0 else 0,
        "retention_change": "+2%" # Placeholder for trend
    }
    
    # Top Products by Revenue/Volume (Excluding Cancelled and Pending)
    top_items = db.query(
        Product.name,
        func.sum(OrderItem.quantity).label("total_sold"),
        func.sum(OrderItem.price * OrderItem.quantity).label("total_revenue")
    ).join(OrderItem, OrderItem.product_id == Product.id)\
     .join(Order, Order.id == OrderItem.order_id)\
     .filter(Product.business_id == biz_id, Order.status.notin_(["Cancelled", "Pending"]))\
     .group_by(Product.id)\
     .order_by(text("total_revenue DESC"))\
     .limit(5).all()
     
    top_products = []
    max_rev = max([item.total_revenue for item in top_items]) if top_items else 1
    for item in top_items:
        top_products.append({
            "name": item.name,
            "sold": item.total_sold,
            "revenue": f"₱{item.total_revenue:,.0f}",
            "pct": int((item.total_revenue / max_rev) * 100),
            "delta": 5 # Hard to calculate delta without 12 months history easily, keeping 5 as "Stable"
        })
    
    # Mock fallback if no products found for business 
    if not top_products:
        top_products = [
            {"name": "No sales yet", "sold": 0, "revenue": "₱0", "pct": 0, "delta": 0}
        ]
        
    # Loyalty Redemptions Logic
    biz_customers_query = db.query(Order.customer_id).join(OrderItem, OrderItem.order_id == Order.id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id).distinct()
    biz_customer_ids = [c.customer_id for c in biz_customers_query.all()]
    
    loyalty_counts = {"Bronze": 0, "Silver": 0, "Gold": 0, "Platinum": 0}
    if biz_customer_ids:
        customers_with_redemptions = db.query(Customer.loyalty_points, func.count(LoyaltyHistory.id)).join(LoyaltyHistory, LoyaltyHistory.customer_id == Customer.id).filter(Customer.id.in_(biz_customer_ids), LoyaltyHistory.points < 0).group_by(Customer.id).all()
        for points, redemp_count in customers_with_redemptions:
            tier = get_loyalty_tier(points)["tier"]
            loyalty_counts[tier] += redemp_count

    total_redemp = sum(loyalty_counts.values())
    loyalty_redemptions = [
        {"tier": tier, "count": count, "pct": int((count / total_redemp * 100)) if total_redemp > 0 else 0}
        for tier, count in loyalty_counts.items()
    ]

    # Customer Retention Logic
    total_biz_customers = len(biz_customer_ids)
    repeat_customers = 0
    if biz_customer_ids:
        repeat_query = db.query(Order.customer_id).join(OrderItem, OrderItem.order_id == Order.id).join(Product, Product.id == OrderItem.product_id).filter(Product.business_id == biz_id).group_by(Order.customer_id).having(func.count(Order.id) >= 2).count()
        repeat_customers = repeat_query

    retention_rate = int((repeat_customers / total_biz_customers * 100)) if total_biz_customers > 0 else 0
    retention_change = "↑ 2pts vs last month" if retention_rate > 0 else "0% change"

    return {
        "kpis": kpis,
        "revenue_trend": revenue_trend,
        "top_products": top_products,
        "loyalty_redemptions": loyalty_redemptions,
        "retention_rate": retention_rate,
        "retention_change": retention_change
    }
        
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

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
    """Send formal email notification regarding compliance status."""
    if status == "verified":
        subject = f"Compliance Status Update: APPROVED – {clinic_name}"
        html_content = f"""
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAFA; color: #333333; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4A3E3D; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">Hi-Vet CRM</h1>
            </div>
            <div style="background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <p style="font-size: 15px; color: #666666;">Dear {owner_name},</p>
                <p style="font-size: 15px; color: #666666;">I hope this email finds you well.</p>
                <div style="font-size: 15px; color: #166534; font-weight: bold; background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #bbf7d0; margin: 25px 0;">
                    We are pleased to inform you that following a thorough review of your submitted documentation, the compliance requirements for <strong>{clinic_name}</strong> have been officially <span style="text-transform: uppercase;">APPROVED</span>.
                </div>
                <p style="font-size: 15px; color: #666666; line-height: 1.6;">Our records indicate that your facility is now fully compliant with the current regulatory standards. No further action is required at this time.</p>
                <p style="font-size: 15px; color: #666666; line-height: 1.6;">Thank you for your continued commitment to maintaining high standards of quality and safety.</p>
                <div style="margin-top: 40px; border-top: 1px solid #EAEAEA; padding-top: 25px;">
                    <p style="font-size: 14px; color: #999999; margin: 0;">Best regards,</p>
                    <p style="font-size: 14px; color: #4A3E3D; font-weight: 900; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">The Hi-Vet Compliance Team</p>
                </div>
            </div>
        </div>
        """
    elif status == "non_compliant":
        subject = f"Compliance Status Update: ACTION REQUIRED – {clinic_name}"
        # Format reasoning into bullet points
        reason_items = reasoning.split('\n') if '\n' in reasoning else [reasoning]
        reason_list_html = "".join([f"<li style='margin-bottom: 12px; line-height: 1.5;'>{r.strip()}</li>" for r in reason_items if r.strip()])
        
        html_content = f"""
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAFA; color: #333333; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4A3E3D; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">Hi-Vet CRM</h1>
            </div>
            <div style="background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <p style="font-size: 15px; color: #666666;">Dear {owner_name},</p>
                <p style="font-size: 15px; color: #666666;">This email is to notify you regarding the recent compliance review for <strong>{clinic_name}</strong>.</p>
                <div style="font-size: 15px; color: #991b1b; font-weight: bold; background-color: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca; margin: 25px 0;">
                    After careful evaluation, we regret to inform you that the compliance status is currently marked as <span style="text-transform: uppercase;">NOT APPROVED</span>.
                </div>
                <p style="font-size: 15px; color: #666666; margin-top: 25px; font-weight: bold;">The following items require your immediate attention:</p>
                <ul style="font-size: 14px; color: #4A3E3D; padding-left: 20px; margin-top: 15px;">
                    {reason_list_html}
                </ul>
                <p style="font-size: 15px; color: #666666; margin-top: 30px; line-height: 1.6;">
                    To finalize the approval process, please address the findings above and resubmit the necessary documentation through your <a href="{FRONTEND_URL}/login" style="color: #E85D04; font-weight: bold; text-decoration: none;">Partner Portal</a>.
                </p>
                <p style="font-size: 15px; color: #666666; line-height: 1.6;">
                    We are available to assist you should you have any questions regarding these requirements. We look forward to your prompt response to ensure your clinic remains in good standing.
                </p>
                <div style="margin-top: 40px; border-top: 1px solid #EAEAEA; padding-top: 25px;">
                    <p style="font-size: 14px; color: #999999; margin: 0;">Best regards,</p>
                    <p style="font-size: 14px; color: #4A3E3D; font-weight: 900; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">The Hi-Vet Compliance Team</p>
                </div>
            </div>
        </div>
        """
    else:
        return 

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Hi-Vet Compliance <{EMAIL_SENDER}>"
    msg["To"] = email
    msg.attach(MIMEText(html_content, "html"))
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.sendmail(EMAIL_SENDER, email, msg.as_string())
        server.quit()
    except Exception as e:
        print("SMTP Error sending compliance notification:", e)

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

@app.put("/api/admin/riders/{rider_id}/compliance")
async def update_rider_compliance(
    rider_id: int,
    body: RiderComplianceRequest,
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
    prof.compliance_status = body.compliance_status
    db.commit()
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
    customer = db.query(Customer).filter(Customer.email == body.email).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Email not found")
        
    if not customer.password_hash:
        raise HTTPException(status_code=400, detail="You registered using Google. Please log in with Google to manage your account.")
        
    otp_code = f"{random.randint(0, 999999):06d}"
    expires = datetime.utcnow() + timedelta(minutes=10)
    OTP_STORE[body.email] = {"otp": otp_code, "expires": expires}
    
    # HTML Email Template
    html_content = f"""
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAFA; color: #333333; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4A3E3D; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">Hi-Vet CRM</h1>
        </div>
        <div style="background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <h2 style="font-size: 20px; font-weight: 700; color: #4A3E3D; margin-top: 0; margin-bottom: 15px;">Secure Password Reset</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #666666; margin-bottom: 30px; margin-top: 0;">
                A formal request to reset the password associated with your Hi-Vet CRM professional account has been initiated. To authorize this change and restore your secure access, please utilize the 6-digit verification code provided below.
            </p>
            <div style="background-color: #FFF5F0; border: 2px dashed #E85D04; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: inline-block;">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #E85D04;">{otp_code}</span>
            </div>
            <p style="font-size: 13px; color: #999999; margin-bottom: 0;">
                This code will expire in 10 minutes. If you did not request a password reset, please ignore this email or contact support if you have concerns.
            </p>
        </div>
    </div>
    """
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset - Hi-Vet CRM"
    msg["From"] = f"Hi-Vet CRM <{EMAIL_SENDER}>"
    msg["To"] = body.email
    msg.attach(MIMEText(html_content, "html"))
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.sendmail(EMAIL_SENDER, body.email, msg.as_string())
        server.quit()
    except Exception as e:
        print("SMTP Error:", e)
        raise HTTPException(status_code=500, detail="Failed to send password reset email.")
        
    return {"message": "Verification code sent"}

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/api/auth/forgot-password/reset")
def forgot_password_reset(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Validates OTP and sets a new password."""
    customer = db.query(Customer).filter(Customer.email == body.email).first()
    if not customer:
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
        
    customer.password_hash = pbkdf2_sha256.hash(body.new_password)
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
    else:
        user = db.query(Customer).filter(Customer.id == user_id).first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
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
            "compliance_status": user.compliance_status
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
        if body.email is not None: user.email = body.email
        if body.phone is not None: user.phone = body.phone
        
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
        if body.email       is not None: user.email       = body.email
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
        recent_order = {
            "id": f"RV-{recent_order_obj.id:04d}",
            "status": recent_order_obj.status,
            "item_summary": f"{items[0].product_name} ({len(items)} Items)" if items else "Empty Order",
            "location": "Main Clinic", # Mocked for now as we don't have location on Order yet
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

    new_order = Order(
        customer_id=customer_id,
        status="Pending",
        total_amount=int(body.totalAmount),
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
    
    add_notification(
        db, customer_id, "System", 
        "Order Placed!", 
        f"Your order #HV-{new_order.id:04d} has been successfully placed.",
        "/dashboard/user/orders"
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

    # 1. Create the Order in "Payment Pending" status
    new_order = Order(
        customer_id=customer_id,
        status="Payment Pending",
        total_amount=int(body.totalAmount),
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

    if body.fulfillmentMethod == "delivery":
        line_items.append({
            "amount": 15000, # 150.00 PHP
            "currency": "PHP",
            "name": "Shipping Fee",
            "quantity": 1,
            "description": "Flat rate delivery fee"
        })

    enabled_methods = ["gcash", "paymaya"]
    if body.paymentMethod == "maya":
        enabled_methods = ["paymaya"]
    elif body.paymentMethod == "gcash":
        enabled_methods = ["gcash"]

    # 6. Prepare PayMongo Payload (Dynamic Data from DB)
    paymongo_payload = {
        "data": {
            "attributes": {
                "line_items": line_items,
                "billing": billing_info,
                "payment_method_types": enabled_methods,
                "success_url": f"{FRONTEND_URL}/dashboard/user/checkout/success?order_id={new_order.id}",
                "cancel_url": f"{FRONTEND_URL}/dashboard/user/checkout",
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
                # Revert order or keep for cleanup
                raise HTTPException(status_code=500, detail="Failed to create payment session")
            
            res_data = response.json()
            checkout_url = res_data["data"]["attributes"]["checkout_url"]
            
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
    clinic = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
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
        
        add_notification(
            db, customer_id, "System", 
            "Payment Received!", 
            f"Your payment for order #HV-{order.id:04d} was successful. Check your email for the receipt.",
            "/dashboard/user/orders"
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
                "image": i.image
            } for i in items]
        })
    return {"orders": results}

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
    
    if order.status != "Pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    order.status = "Cancelled"
    order.cancellation_reason = body.reason
    db.commit()
    
    add_notification(
        db, customer_id, "System", 
        "Order Cancelled", 
        f"Your order #HV-{order.id:04d} was successfully cancelled.",
        "/dashboard/user/orders"
    )
    
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
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    notifs = db.query(Notification).filter(Notification.customer_id == customer_id).order_by(Notification.created_at.desc()).all()
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
async def mark_notification_read(n_id: int, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    notif = db.query(Notification).filter(Notification.id == n_id, Notification.customer_id == customer_id).first()
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
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    db.query(Notification).filter(Notification.customer_id == customer_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@app.delete("/api/notifications/{n_id}")
async def delete_notification(n_id: int, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    notif = db.query(Notification).filter(Notification.id == n_id, Notification.customer_id == customer_id).first()
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
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    db.query(Notification).filter(Notification.customer_id == customer_id).delete()
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

    return {
        "points": customer.loyalty_points,
        "voucher": {
            "id": str(voucher.id),
            "title": voucher.title,
            "code": voucher_code
        }
    }

class VoucherCodeRequest(BaseModel):
    code: str

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
    
    # Calculate discount value (for simplicity, we assume fixed values or percentages)
    # If loyalty_v.type == 'Discount', we might want to return the percentage
    # If loyalty_v.type == 'Credit', we return the peso amount
    
    # For now, let's just return the info
    return {
        "id": user_v.id,
        "title": loyalty_v.title,
        "type": loyalty_v.type,
        "discount_value": 0 # This would be calculated based on business logic
    }


# ---------------------------------------------------------------------------
# Routes â€“ Rider
# ---------------------------------------------------------------------------

class RiderStatusUpdate(BaseModel):
    is_online: bool

class RiderLocationUpdate(BaseModel):
    lat: float
    lng: float

class OrderStatusUpdate(BaseModel):
    status: str # Picked Up, Delivered

@app.get("/api/rider/profile")
async def get_rider_profile(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == customer_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    
    return profile

@app.patch("/api/rider/status")
async def update_rider_status(body: RiderStatusUpdate, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == customer_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    
    profile.is_online = body.is_online
    db.commit()
    db.refresh(profile)
    return profile

@app.get("/api/rider/available-orders")
async def get_available_orders(request: Request, db: Session = Depends(get_db)):
    # Simple implementation: all Pending orders with fulfillment_method == 'delivery'
    orders = db.query(Order).filter(Order.status == "Pending", Order.fulfillment_method == "delivery").all()
    results = []
    for o in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
        results.append({
            "id": o.id,
            "status": o.status,
            "total_amount": o.total_amount,
            "fulfillment_method": o.fulfillment_method,
            "created_at": str(o.created_at),
            "items": [{
                "name": i.product_name,
                "quantity": i.quantity
            } for i in items]
        })
    return {"orders": results}

@app.get("/api/rider/earnings")
async def get_rider_earnings(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == customer_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    
    return {
        "total_earnings": profile.total_earnings,
        "completed_orders": 0, # Mocked for now
        "today_earnings": 0    # Mocked for now
    }

@app.post("/api/rider/orders/{order_id}/accept")
async def accept_order(order_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = await get_current_user(request)
    rider_id = int(current_user["sub"])
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == rider_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
        
    order = db.query(Order).filter(Order.id == order_id, Order.status == "Pending").first()
    if not order:
        raise HTTPException(status_code=404, detail="Available order not found")
        
    order.rider_id = profile.id
    order.status = "Processing"
    order.assigned_at = datetime.utcnow()
    db.commit()
    return {"message": "Order accepted", "order_id": order_id}

@app.patch("/api/rider/orders/{order_id}/status")
async def update_order_delivery_status(order_id: int, body: OrderStatusUpdate, request: Request, db: Session = Depends(get_db)):
    current_user = await get_current_user(request)
    rider_id = int(current_user["sub"])
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == rider_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
        
    order = db.query(Order).filter(Order.id == order_id, Order.rider_id == profile.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Assigned order not found")
        
    if body.status == "Picked Up":
        order.picked_up_at = datetime.utcnow()
    elif body.status == "Delivered":
        if order.status != "Completed":
            order.status = "Completed"
            order.delivered_at = datetime.utcnow()
            
            # Add earnings (simplified logic)
            profile.total_earnings += 5000 # ₱50.00
            
            # --- AWARD LOYALTY POINTS TO CUSTOMER ---
            # Fetch business profile for rates
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
                    total_points += int(item.price * item.quantity * 0.01) # fallback multiplier (1%)
                    
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
    return {"message": f"Order status updated to {body.status}"}

@app.patch("/api/rider/location")
async def update_rider_location(body: RiderLocationUpdate, request: Request, db: Session = Depends(get_db)):
    current_user = await get_current_user(request)
    rider_id = int(current_user["sub"])
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == rider_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
        
    profile.current_lat = body.lat
    profile.current_lng = body.lng
    profile.last_location_update = datetime.utcnow()
    db.commit()
    return {"message": "Location updated"}

@app.get("/api/rider/active-order")
async def get_active_order(request: Request, db: Session = Depends(get_db)):
    current_user = await get_current_user(request)
    rider_id = int(current_user["sub"])
    
    profile = db.query(RiderProfile).filter(RiderProfile.customer_id == rider_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
        
    order = db.query(Order).filter(
        Order.rider_id == profile.id, 
        Order.status.in_(["Processing", "Picked Up"])
    ).first()
    
    if not order:
        return {"order": None}
        
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    
    # Get Clinic Info for Pickup
    clinic = None
    if order.clinic_id:
        clinic = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
    
    return {
        "order": {
            "id": order.id,
            "status": order.status,
            "delivery_address": order.delivery_address,
            "delivery_lat": order.delivery_lat,
            "delivery_lng": order.delivery_lng,
            "picked_up_at": order.picked_up_at.isoformat() if order.picked_up_at else None,
            "items": [{"name": i.product_name, "quantity": i.quantity} for i in items],
            "clinic": {
                "name": clinic.clinic_name if clinic else "Hi-Vet Hub",
                "lat": clinic.clinic_lat if clinic else 14.5995, # Fallback to Manila
                "lng": clinic.clinic_lng if clinic else 120.9842
            } if clinic else None
        }
    }

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

    customers = db.query(Customer).all()
    businesses = db.query(BusinessProfile).all()
    riders = db.query(RiderProfile).all()
    super_admins = db.query(SuperAdminUser).all()
    system_admins = db.query(SystemAdminUser).all()

    results = []
    
    for u in customers:
        display_role = "Owner"
        if getattr(u, 'role', '') == 'rider':
            continue # Legacy riders handled explicitly in rider_profiles now
        results.append({
            "id": f"USR-{u.id:04d}",
            "name": u.name or u.first_name or u.email.split('@')[0],
            "email": u.email,
            "role": display_role,
            "status": "Active",
            "lastActive": "Just now" if (datetime.utcnow() - u.created_at).total_seconds() < 3600 else f"{int((datetime.utcnow() - u.created_at).total_seconds() // 3600)}h ago"
        })

    for r in riders:
        status_val = "Active"
        if getattr(r, 'compliance_status', '') == "pending":
            status_val = "Pending"
        elif getattr(r, 'compliance_status', '') == "non_compliant":
            status_val = "Rejected"
            
        results.append({
            "id": f"RD-{r.id:04d}",
            "name": r.name or r.first_name or r.email.split('@')[0],
            "email": r.email,
            "role": "Rider",
            "status": status_val,
            "lastActive": "Just now" if (datetime.utcnow() - r.created_at).total_seconds() < 3600 else f"{int((datetime.utcnow() - r.created_at).total_seconds() // 3600)}h ago"
        })
        
    for b in businesses:
        status_val = "Active"
        if getattr(b, 'compliance_status', '') == "pending":
            status_val = "Pending"
        elif getattr(b, 'compliance_status', '') == "non_compliant":
            status_val = "Rejected"

        results.append({
            "id": f"CL-{b.id:04d}",
            "name": b.owner_full_name or b.clinic_name or b.email.split('@')[0],
            "email": b.email,
            "role": "Partner",
            "status": status_val,
            "lastActive": "Just now" if (datetime.utcnow() - b.created_at).total_seconds() < 3600 else f"{int((datetime.utcnow() - b.created_at).total_seconds() // 3600)}h ago"
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
        results.append({
            "id": f"SYS-{sa.id:03d}",
            "name": sa.name or sa.first_name or sa.email.split('@')[0],
            "email": sa.email,
            "role": "System Admin",
            "status": "Active",
            "lastActive": "Just now" if (datetime.utcnow() - sa.created_at).total_seconds() < 3600 else f"{int((datetime.utcnow() - sa.created_at).total_seconds() // 3600)}h ago"
        })
    
    return {"users": results}

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
    
    # General End Users (total participation)
    user_count = db.query(Customer).filter(Customer.role == "user").count()
    user_trend = db.query(Customer).filter(Customer.role == "user", Customer.created_at >= thirty_days_ago).count()
    
    total_end_users = partner_count + rider_count + user_count
    total_trend = partner_trend + rider_trend + user_trend

    # Detailed lists for modals (limit to latest 50 for performance)
    def format_detail(u):
        name = getattr(u, 'clinic_name', '') or getattr(u, 'name', '') or getattr(u, 'owner_full_name', '') or getattr(u, 'first_name', '') or u.email
        return {
            "id": f"CL-{u.id:04d}" if hasattr(u, 'clinic_name') else f"RD-{u.id:04d}" if hasattr(u, 'vehicle_type') else f"USR-{u.id:04d}",
            "name": name,
            "email": u.email,
            "joined": u.created_at.strftime("%b %d, %Y")
        }

    return {
        "partners": partner_count,
        "partners_trend": f"+{partner_trend}",
        "riders": rider_count,
        "riders_trend": f"+{rider_trend}",
        "end_users": total_end_users,
        "end_users_trend": f"+{total_trend}",
        "details": {
            "partners": [format_detail(p) for p in partners_query.order_by(BusinessProfile.created_at.desc()).limit(50).all()],
            "riders": [format_detail(r) for r in riders_query.order_by(RiderProfile.created_at.desc()).limit(50).all()],
            "end_users": [format_detail(u) for u in db.query(Customer).filter(Customer.role == "user").order_by(Customer.created_at.desc()).limit(50).all()]
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


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
