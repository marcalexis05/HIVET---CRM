import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

app = FastAPI(title="Hi-Vet CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory "database"
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
# Routes – Reservations
# ---------------------------------------------------------------------------

@app.get("/api/reservations")
async def get_reservations():
    return {"reservations": RESERVATIONS}

@app.post("/api/reservations", status_code=201)
async def create_reservation(body: ReservationCreate):
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
    return {"reservation": new_res}

@app.patch("/api/reservations/{reservation_id}/cancel")
async def cancel_reservation(reservation_id: str):
    for res in RESERVATIONS:
        if res["id"] == reservation_id:
            if res["status"] in ("Completed", "Cancelled"):
                raise HTTPException(400, detail="Cannot cancel a completed or already cancelled reservation.")
            res["status"] = "Cancelled"
            return {"reservation": res}
    raise HTTPException(404, detail="Reservation not found.")

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
    # Recompute active status for all vouchers
    for v in LOYALTY["vouchers"]:
        v["active"] = LOYALTY["points"] >= v["cost"]
    return {"points": LOYALTY["points"], "voucher": voucher}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
