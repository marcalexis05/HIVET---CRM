from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Hi-Vet CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Hi-Vet CRM API"}

@app.get("/api/stats")
async def get_stats():
    return {
        "top_selling": ["Premium Dog Food", "Luxury Cat Leash", "Multi-Vitamin"],
        "revenue_trend": [1200, 1500, 1100, 2000, 2500, 3000]
    }
