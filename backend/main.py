from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Optional
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
from nessie_service import (
    get_accounts,
    get_purchases as nessie_get_purchases,
    get_merchants,
    compute_spending_analytics,
    compute_spending_habits,
    detect_price_drops,
)

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
            "spending_analytics": "GET /api/spending/analytics",
            "spending_habits": "GET /api/spending/habits",
            "price_drops": "GET /api/price-drops",
            "nessie_accounts": "GET /api/nessie/accounts",
            "nessie_purchases": "GET /api/nessie/purchases",
            "nessie_merchants": "GET /api/nessie/merchants",
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


# ─── Enhanced Spending Analytics ──────────────────────────


@app.get("/api/spending/analytics")
async def spending_analytics():
    """
    Deep spending analytics combining in-app purchases and
    Capital One Nessie bank transaction data.
    """
    # Get bank transactions from Nessie (or mock)
    bank_purchases = await nessie_get_purchases()

    # Combine with in-app purchases
    app_purchases = [
        {
            "id": p.product_id,
            "merchant_name": p.brand,
            "category": p.category.replace("_", " ").title(),
            "purchase_date": p.timestamp[:10] if "T" in p.timestamp else p.timestamp,
            "amount": p.price,
            "status": "completed",
            "description": p.product_name,
        }
        for p in purchase_history
    ]

    all_purchases = bank_purchases + app_purchases
    analytics = compute_spending_analytics(all_purchases)
    analytics["source"] = {
        "bank_transactions": len(bank_purchases),
        "app_purchases": len(app_purchases),
        "nessie_connected": bool(os.getenv("NESSIE_API_KEY")),
    }
    return analytics


@app.get("/api/spending/habits")
async def spending_habits():
    """
    Analyze spending habits, patterns, and provide smart insights.
    """
    bank_purchases = await nessie_get_purchases()
    app_purchases = [
        {
            "id": p.product_id,
            "merchant_name": p.brand,
            "category": p.category.replace("_", " ").title(),
            "purchase_date": p.timestamp[:10] if "T" in p.timestamp else p.timestamp,
            "amount": p.price,
            "status": "completed",
            "description": p.product_name,
        }
        for p in purchase_history
    ]
    all_purchases = bank_purchases + app_purchases
    return compute_spending_habits(all_purchases)


@app.get("/api/price-drops")
async def price_drops():
    """
    Detect price drops for watchlist items and return alerts.
    """
    watchlist_data = [w.model_dump() for w in watchlist]
    drops = detect_price_drops(watchlist_data)
    return {
        "drops": drops,
        "total_potential_savings": round(sum(d["drop_amount"] for d in drops), 2),
        "items_with_drops": len(drops),
        "watchlist_size": len(watchlist),
    }


# ─── Capital One Nessie API Endpoints ─────────────────────


@app.get("/api/nessie/accounts")
async def nessie_accounts():
    """Get Capital One bank accounts via Nessie API."""
    accounts = await get_accounts()
    total_balance = sum(a.get("balance", 0) for a in accounts)
    total_rewards = sum(a.get("rewards", 0) for a in accounts)
    return {
        "accounts": accounts,
        "total_balance": round(total_balance, 2),
        "total_rewards": total_rewards,
        "connected": bool(os.getenv("NESSIE_API_KEY")),
    }


@app.get("/api/nessie/purchases")
async def nessie_purchases(account_id: Optional[str] = None):
    """Get purchase/transaction history from Capital One via Nessie API."""
    purchases = await nessie_get_purchases(account_id)
    total = sum(p.get("amount", 0) for p in purchases)
    return {
        "purchases": purchases,
        "total": round(total, 2),
        "count": len(purchases),
        "connected": bool(os.getenv("NESSIE_API_KEY")),
    }


@app.get("/api/nessie/merchants")
async def nessie_merchants_endpoint():
    """Get merchant data from Capital One via Nessie API."""
    merchants_list = await get_merchants()
    return {
        "merchants": merchants_list,
        "count": len(merchants_list),
        "connected": bool(os.getenv("NESSIE_API_KEY")),
    }
