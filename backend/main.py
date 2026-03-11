import os
import uuid
import httpx
import uvicorn
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta
from typing import Optional, List
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256

from sqlalchemy import create_engine, Column, String, DateTime, text, Integer, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session

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
    # Full name (from Google) – kept for OAuth fallback
    name        = Column(String, nullable=True)
    # Detailed name fields (from manual registration)
    first_name  = Column(String, nullable=True)
    middle_name = Column(String, nullable=True)
    last_name   = Column(String, nullable=True)
    suffix      = Column(String, nullable=True)
    # Contact
    phone       = Column(String, unique=True, nullable=True)
    picture     = Column(String, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id                  = Column(Integer, primary_key=True, autoincrement=True)
    customer_id         = Column(Integer, nullable=False)
    status              = Column(String, default="Pending") # Pending, Processing, Completed, Cancelled
    total_amount        = Column(Integer, nullable=False)
    fulfillment_method  = Column(String, nullable=False)    # delivery, pickup
    payment_method      = Column(String, nullable=False)
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


# Recreate the schema
Base.metadata.create_all(bind=engine)

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

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Hi-Vet CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory data (unchanged)
# ---------------------------------------------------------------------------
RESERVATIONS: List[dict] = [
    {
        "id": "RV-8822",
        "pet_name": "Max",
        "service": "Grooming",
        "date": "2026-10-24",
        "time": "10:00 AM",
        "status": "Ready for Pickup",
        "location": "Main Clinic - Los Angeles",
        "notes": "Please use hypoallergenic shampoo.",
        "total": 174.00,
    },
    {
        "id": "RV-8750",
        "pet_name": "Max",
        "service": "Vet Consultation",
        "date": "2026-09-12",
        "time": "02:00 PM",
        "status": "Completed",
        "location": "Main Clinic - Los Angeles",
        "notes": "",
        "total": 173.00,
    },
    {
        "id": "RV-8611",
        "pet_name": "Bella",
        "service": "Dental Cleaning",
        "date": "2026-08-05",
        "time": "09:00 AM",
        "status": "Completed",
        "location": "Westside Branch",
        "notes": "",
        "total": 52.00,
    },
]

LOYALTY = {
    "points": 2450,
    "tier": "Gold",
    "next_tier": "Platinum",
    "next_tier_points": 2500,
    "history": [
        {"desc": "Vet Consultation – RV-8750", "points": +500, "date": "2026-09-12"},
        {"desc": "Grooming – RV-8822", "points": +1740, "date": "2026-10-24"},
        {"desc": "Voucher Redeemed – Free Grooming Add-on", "points": -500, "date": "2026-09-01"},
        {"desc": "Shop Purchase – Organic Salmon 12lb", "points": +520, "date": "2026-08-20"},
        {"desc": "Referral Bonus", "points": +500, "date": "2026-07-15"},
    ],
    "vouchers": [
        {"id": "V001", "title": "Free Grooming Add-on",       "cost": 500,  "type": "Service",  "active": True},
        {"id": "V002", "title": "15% Off Premium Foods",      "cost": 800,  "type": "Discount", "active": True},
        {"id": "V003", "title": "Complimentary Vet Consult",  "cost": 2000, "type": "Service",  "active": False},
        {"id": "V004", "title": "₱10 Store Credit",           "cost": 1000, "type": "Credit",   "active": False},
    ],
    "referral_code": "HIVET-SARAH42",
}

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ReservationCreate(BaseModel):
    pet_name: str
    service: str
    date: str
    time: str
    location: str
    notes: Optional[str] = ""

class RedeemRequest(BaseModel):
    voucher_id: str

class OrderItemCreate(BaseModel):
    id: int
    name: str
    price: str
    quantity: int
    variant: Optional[str] = None
    size: Optional[str] = None
    image: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    totalAmount: float
    fulfillmentMethod: str
    paymentMethod: str

class CancelOrderRequest(BaseModel):
    reason: str

class NotificationReadRequest(BaseModel):
    is_read: bool

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
# Routes – General
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

# ---------------------------------------------------------------------------
# Routes – Google OAuth
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
    customer = db.query(Customer).filter(Customer.google_id == google_id).first()
    is_new = False
    if not customer:
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

# ---------------------------------------------------------------------------
# Manual Signup & OTP
# ---------------------------------------------------------------------------
OTP_STORE: dict = {}  # Format: { "email": { "otp": "123456", "expires": datetime } }

EMAIL_SENDER = "hivetveterinary3@gmail.com"
EMAIL_APP_PWD = "dpan oejd uzvs tepw"

class SendOtpRequest(BaseModel):
    email: str

@app.post("/api/auth/send-otp")
def send_otp(body: SendOtpRequest, db: Session = Depends(get_db)):
    """Generates and sends a 6-digit OTP to the user's email."""
    existing = db.query(Customer).filter(Customer.email == body.email).first()
    if existing:
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
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_APP_PWD)
        server.sendmail(EMAIL_SENDER, body.email, msg.as_string())
        server.quit()
    except Exception as e:
        print("SMTP Error:", e)
        raise HTTPException(status_code=500, detail="Failed to send verification email.")
        
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

@app.post("/api/auth/register", status_code=201)
async def register_customer(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new customer with a password, verifying the OTP."""
    existing = db.query(Customer).filter(Customer.email == body.email).first()
    if existing:
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
    
    new_customer = Customer(
        email=body.email,
        password_hash=pwd_hash,
        name=full_name,
        first_name=body.first_name,
        last_name=body.last_name,
        middle_name=body.middle_name,
        suffix=body.suffix,
        phone=body.phone,
        picture=f"https://api.dicebear.com/7.x/avataaars/svg?seed={body.email}"
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    # Generate JWT
    token_data = {
        "sub": str(new_customer.id),
        "email": new_customer.email,
        "role": "user",
        "name": new_customer.name,
        "first_name": new_customer.first_name,
        "middle_name": new_customer.middle_name,
        "last_name": new_customer.last_name,
        "suffix": new_customer.suffix,
        "phone": new_customer.phone,
        "avatar": new_customer.picture,
        "has_password": bool(new_customer.password_hash)
    }
    token = create_access_token(token_data)
    
    # Cleanup OTP after successful signup
    if body.email in OTP_STORE:
        del OTP_STORE[body.email]
        
    return {"message": "Registration successful", "token": token}

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
async def login_customer(body: LoginRequest, db: Session = Depends(get_db)):
    """Local login for customers using email and password."""
    customer = db.query(Customer).filter(Customer.email == body.email).first()
    if not customer or not customer.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not pbkdf2_sha256.verify(body.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # Generate JWT
    token_data = {
        "sub": str(customer.id),
        "email": customer.email,
        "role": "user",
        "name": customer.name or "",
        "first_name": customer.first_name,
        "middle_name": customer.middle_name,
        "last_name": customer.last_name,
        "suffix": customer.suffix,
        "phone": customer.phone,
        "avatar": customer.picture,
        "has_password": bool(customer.password_hash)
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
    """Return the current customer's full profile from a Bearer JWT."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        customer_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "id": customer.id,
        "email": customer.email,
        "name": customer.name,
        "first_name": customer.first_name,
        "middle_name": customer.middle_name,
        "last_name": customer.last_name,
        "suffix": customer.suffix,
        "phone": customer.phone,
        "picture": customer.picture,
        "google_id": customer.google_id,
        "created_at": str(customer.created_at),
        "has_password": bool(customer.password_hash)
    }

class ProfileUpdate(BaseModel):
    first_name:  Optional[str] = None
    middle_name: Optional[str] = None
    last_name:   Optional[str] = None
    suffix:      Optional[str] = None
    email:       Optional[str] = None
    phone:       Optional[str] = None

@app.put("/api/customer/profile")
async def update_profile(body: ProfileUpdate, request: Request, db: Session = Depends(get_db)):
    """Update the logged-in customer's name and contact fields."""
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
    if body.first_name  is not None: customer.first_name  = body.first_name
    if body.middle_name is not None: customer.middle_name = body.middle_name
    if body.last_name   is not None: customer.last_name   = body.last_name
    if body.suffix      is not None: customer.suffix      = body.suffix
    if body.email       is not None: customer.email       = body.email
    if body.phone       is not None: customer.phone       = body.phone
    
    # Calculate full name
    parts = []
    if customer.first_name: parts.append(customer.first_name.strip())
    if customer.middle_name:
        m = customer.middle_name.strip()
        if len(m) == 1 and m.isalpha():
            m += "."
        parts.append(m)
    if customer.last_name: parts.append(customer.last_name.strip())
    if customer.suffix: parts.append(customer.suffix.strip())
    
    if parts:
        customer.name = " ".join(parts).strip()
        
    db.commit()
    db.refresh(customer)
    
    # Issue fresh token
    token = create_access_token({
        "sub": str(customer.id),
        "email": customer.email,
        "role": "user",
        "name": customer.name,
        "first_name": customer.first_name,
        "middle_name": customer.middle_name,
        "last_name": customer.last_name,
        "suffix": customer.suffix,
        "phone": customer.phone,
        "avatar": customer.picture,
        "has_password": bool(customer.password_hash)
    })
    
    return {"message": "Profile updated", "token": token}

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
        "role": "user",
        "name": customer.name,
        "first_name": customer.first_name,
        "middle_name": customer.middle_name,
        "last_name": customer.last_name,
        "suffix": customer.suffix,
        "phone": customer.phone,
        "avatar": customer.picture,
        "has_password": True
    })
    return {"message": "Password updated", "token": token}

# ---------------------------------------------------------------------------
# Routes – Reservations
# ---------------------------------------------------------------------------
@app.get("/api/reservations")
async def get_reservations():
    return {"reservations": RESERVATIONS}

@app.post("/api/reservations", status_code=201)
async def create_reservation(body: ReservationCreate, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    customer_id = None
    if auth_header and auth_header.startswith("Bearer "):
        try:
            payload = decode_token(auth_header.split(" ", 1)[1])
            customer_id = int(payload["sub"])
        except: pass

    service_prices = {
        "Grooming": 150.00,
        "Vet Consultation": 200.00,
        "Boarding": 300.00,
        "Dental Cleaning": 250.00,
    }
    new_res = {
        "id": f"RV-{str(uuid.uuid4())[:4].upper()}",
        "pet_name": body.pet_name,
        "service": body.service,
        "date": body.date,
        "time": body.time,
        "status": "Pending",
        "location": body.location,
        "notes": body.notes or "",
        "total": service_prices.get(body.service, 150.00),
    }
    RESERVATIONS.insert(0, new_res)
    
    if customer_id:
        add_notification(
            db, customer_id, "Reminder", 
            "Reservation Confirmed", 
            f"Your {body.service} for {body.pet_name} is set for {body.date} at {body.time}.",
            "/dashboard/user/reservations"
        )
    
    return {"reservation": new_res}

@app.patch("/api/reservations/{reservation_id}/cancel")
async def cancel_reservation(reservation_id: str, request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    customer_id = None
    if auth_header and auth_header.startswith("Bearer "):
        try:
            payload = decode_token(auth_header.split(" ", 1)[1])
            customer_id = int(payload["sub"])
        except: pass

    for res in RESERVATIONS:
        if res["id"] == reservation_id:
            if res["status"] in ("Completed", "Cancelled"):
                raise HTTPException(400, detail="Cannot cancel a completed or already cancelled reservation.")
            res["status"] = "Cancelled"
            
            if customer_id:
                add_notification(
                    db, customer_id, "System", 
                    "Reservation Cancelled", 
                    f"Your reservation {reservation_id} has been successfully cancelled.",
                    "/dashboard/user/reservations"
                )
            return {"reservation": res}
    raise HTTPException(404, detail="Reservation not found.")

# ---------------------------------------------------------------------------
# Routes – Orders
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
        payment_method=body.paymentMethod
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

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
        results.append({
            "id": o.id,
            "status": o.status,
            "total_amount": o.total_amount,
            "fulfillment_method": o.fulfillment_method,
            "payment_method": o.payment_method,
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

# ---------------------------------------------------------------------------
# Routes – Notifications
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

# ---------------------------------------------------------------------------
# Routes – Loyalty
# ---------------------------------------------------------------------------
@app.get("/api/loyalty")
async def get_loyalty():
    return LOYALTY

@app.post("/api/loyalty/redeem")
async def redeem_voucher(body: RedeemRequest):
    voucher = next((v for v in LOYALTY["vouchers"] if v["id"] == body.voucher_id), None)
    if not voucher:
        raise HTTPException(404, detail="Voucher not found.")
    if LOYALTY["points"] < voucher["cost"]:
        raise HTTPException(400, detail="Insufficient points.")
    LOYALTY["points"] -= voucher["cost"]
    LOYALTY["history"].insert(0, {
        "desc": f"Voucher Redeemed – {voucher['title']}",
        "points": -voucher["cost"],
        "date": datetime.now().strftime("%Y-%m-%d"),
    })
    for v in LOYALTY["vouchers"]:
        v["active"] = LOYALTY["points"] >= v["cost"]
    return {"points": LOYALTY["points"], "voucher": voucher}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
