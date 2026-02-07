from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

from models import (
    SearchRequest,
    SearchResponse,
    PurchaseRequest,
    PurchaseRecord,
    UserProfile,
    WatchlistItem,
)
from ai_service import interpret_query_with_gemini

app = FastAPI(title="Cliq — AI Shopping Agent", version="1.0.0")

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------
# In-memory storage (replace with DB in production)
# ------------------------------------------------
user_profile = UserProfile()
purchase_history: List[PurchaseRecord] = []
watchlist: List[WatchlistItem] = []


# ------------------------------------------------
# Endpoints
# ------------------------------------------------


@app.get("/")
async def root():
    return {
        "message": "Cliq AI Shopping Agent API",
        "version": "1.0.0",
        "endpoints": {
            "search": "POST /api/search",
            "purchase": "POST /api/purchase",
            "purchases": "GET /api/purchases",
            "profile": "GET|POST /api/profile",
            "watchlist": "GET|POST|DELETE /api/watchlist",
            "coupons": "GET /api/coupons/{product_id}",
            "spending": "GET /api/spending",
        },
    }


@app.post("/api/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Main search endpoint. Interprets natural language queries
    using AI and returns product recommendations.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Use user profile from request or default
    if request.user_profile is None:
        request.user_profile = user_profile

    response = await interpret_query_with_gemini(request)
    return response


@app.post("/api/purchase")
async def purchase(request: PurchaseRequest):
    """Record a simulated purchase."""
    record = PurchaseRecord(
        product_id=request.product_id,
        product_name=request.product_name,
        price=request.price,
        brand=request.brand,
        category=request.category,
        card_nickname=request.card_nickname,
        timestamp=datetime.now().isoformat(),
    )
    purchase_history.append(record)
    return {
        "status": "success",
        "message": f"Purchase of {request.product_name} confirmed!",
        "record": record,
    }


@app.get("/api/purchases")
async def get_purchases():
    """Get purchase history."""
    return {"purchases": [p.model_dump() for p in purchase_history]}


@app.get("/api/profile")
async def get_profile():
    """Get user profile/preferences."""
    return user_profile.model_dump()


@app.post("/api/profile")
async def update_profile(profile: UserProfile):
    """Update user profile/preferences."""
    global user_profile
    user_profile = profile
    return {"status": "success", "profile": user_profile.model_dump()}


@app.post("/api/watchlist")
async def add_to_watchlist(item: WatchlistItem):
    """Add a product to the watchlist."""
    watchlist.append(item)
    return {"status": "success", "watchlist": [w.model_dump() for w in watchlist]}


@app.get("/api/watchlist")
async def get_watchlist():
    """Get the watchlist."""
    return {"watchlist": [w.model_dump() for w in watchlist]}


@app.delete("/api/watchlist/{product_id}")
async def remove_from_watchlist(product_id: str):
    """Remove a product from the watchlist."""
    global watchlist
    watchlist = [item for item in watchlist if item.product_id != product_id]
    return {"status": "success", "watchlist": [w.model_dump() for w in watchlist]}


@app.get("/api/coupons/{product_id}")
async def get_coupons(product_id: str):
    """
    Stub endpoint for coupon/deal retrieval.
    In production, this would query deal aggregators like Honey, Capital One Shopping, etc.
    """
    mock_coupons = {
        "wj-001": [{"code": "WINTER20", "discount": "20% off", "source": "RetailMeNot"}],
        "wj-002": [
            {"code": "SAVE15", "discount": "15% off", "source": "Honey"},
            {"code": "FREESHIP", "discount": "Free shipping", "source": "Capital One Shopping"},
        ],
        "mon-001": [{"code": "TECH10", "discount": "$10 off", "source": "Honey"}],
        "hp-003": [{"code": "AUDIO20", "discount": "20% off", "source": "RetailMeNot"}],
    }
    return {"product_id": product_id, "coupons": mock_coupons.get(product_id, [])}


@app.get("/api/spending")
async def get_spending():
    """Get spending overview from purchase history."""
    total_spent = sum(p.price for p in purchase_history)
    by_category: dict[str, float] = {}
    for p in purchase_history:
        by_category[p.category] = by_category.get(p.category, 0) + p.price

    return {
        "total_spent": round(total_spent, 2),
        "purchase_count": len(purchase_history),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "watchlist_count": len(watchlist),
    }
