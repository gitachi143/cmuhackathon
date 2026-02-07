from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List
import asyncio

from models import (
    SearchRequest,
    SearchResponse,
    PurchaseRequest,
    PurchaseRecord,
    UserProfile,
    WatchlistItem,
)
from ai_service import interpret_query_with_gemini
from tracking_service import (
    update_activity,
    get_tracking_status,
    get_purchase_alerts,
    clear_purchase_alert,
    watchlist_tracking_loop,
    purchase_tracking_loop,
)


# ── Background task management ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background tracking loops
    wl_task = asyncio.create_task(
        watchlist_tracking_loop(
            get_watchlist=lambda: list(watchlist),
            update_watchlist_price=_update_watchlist_price,
        )
    )
    pl_task = asyncio.create_task(
        purchase_tracking_loop(
            get_purchases=lambda: list(purchase_history),
        )
    )
    yield
    wl_task.cancel()
    pl_task.cancel()


app = FastAPI(title="Cliq — AI Shopping Agent", version="2.0.0", lifespan=lifespan)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Activity tracking middleware ─────────────────────────
@app.middleware("http")
async def track_activity(request: Request, call_next):
    update_activity()
    response = await call_next(request)
    return response


# ── In-memory storage ────────────────────────────────────
user_profile = UserProfile()
purchase_history: List[PurchaseRecord] = []
watchlist: List[WatchlistItem] = []


def _update_watchlist_price(product_id: str, new_price: float):
    """Update a watchlist item's price (called by background tracker)."""
    for item in watchlist:
        if item.product_id == product_id:
            item.price_history.append({
                "price": new_price,
                "date": datetime.now().isoformat(),
            })
            item.price = new_price
            break


# ── Endpoints ────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "Cliq AI Shopping Agent API",
        "version": "2.0.0",
        "endpoints": {
            "search": "POST /api/search",
            "purchase": "POST /api/purchase",
            "purchases": "GET /api/purchases",
            "profile": "GET|POST /api/profile",
            "watchlist": "GET|POST|DELETE /api/watchlist",
            "coupons": "GET /api/coupons/{product_id}",
            "spending": "GET /api/spending",
            "tracking_status": "GET /api/tracking/status",
            "tracking_heartbeat": "POST /api/tracking/heartbeat",
            "purchase_alerts": "GET /api/tracking/purchase-alerts",
        },
    }


@app.post("/api/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Main search endpoint — interprets natural language queries via AI."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

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
    return user_profile.model_dump()


@app.post("/api/profile")
async def update_profile(profile: UserProfile):
    global user_profile
    user_profile = profile
    return {"status": "success", "profile": user_profile.model_dump()}


# ── Watchlist ────────────────────────────────────────────

@app.post("/api/watchlist")
async def add_to_watchlist(item: WatchlistItem):
    """Add a product to the watchlist — tracking starts automatically."""
    if not item.price_history:
        item.price_history = [{"price": item.price, "date": datetime.now().isoformat()}]
    watchlist.append(item)
    return {"status": "success", "watchlist": [w.model_dump() for w in watchlist]}


@app.get("/api/watchlist")
async def get_watchlist():
    return {"watchlist": [w.model_dump() for w in watchlist]}


@app.delete("/api/watchlist/{product_id}")
async def remove_from_watchlist(product_id: str):
    global watchlist
    watchlist = [item for item in watchlist if item.product_id != product_id]
    return {"status": "success", "watchlist": [w.model_dump() for w in watchlist]}


# ── Coupons ──────────────────────────────────────────────

@app.get("/api/coupons/{product_id}")
async def get_coupons(product_id: str):
    mock_coupons = {
        "wj-001": [{"code": "WINTER20", "discount": "20% off", "source": "RetailMeNot"}],
        "wj-002": [
            {"code": "SAVE15", "discount": "15% off", "source": "Honey"},
            {"code": "FREESHIP", "discount": "Free shipping", "source": "Deal Finder"},
        ],
        "mon-001": [{"code": "TECH10", "discount": "$10 off", "source": "Honey"}],
        "hp-003": [{"code": "AUDIO20", "discount": "20% off", "source": "RetailMeNot"}],
    }
    return {"product_id": product_id, "coupons": mock_coupons.get(product_id, [])}


# ── Spending (app purchases only) ────────────────────────

@app.get("/api/spending")
async def get_spending():
    """Spending overview from in-app purchase history."""
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


# ── Price Tracking Endpoints ─────────────────────────────

@app.get("/api/tracking/status")
async def tracking_status():
    """Get live tracking status — is it running? when was user last active?"""
    status = get_tracking_status()
    status["watchlist_count"] = len(watchlist)
    status["purchase_count"] = len(purchase_history)
    return status


@app.post("/api/tracking/heartbeat")
async def tracking_heartbeat():
    """Frontend heartbeat to keep tracking alive."""
    update_activity()
    status = get_tracking_status()
    return {
        "status": "alive",
        "tracking": status["tracking_running"],
        "last_active": status["last_active"],
    }


@app.get("/api/tracking/purchase-alerts")
async def purchase_alerts():
    """Get price drop alerts for past purchases."""
    alerts = get_purchase_alerts()
    return {
        "alerts": alerts,
        "count": len(alerts),
        "total_potential_savings": round(sum(a["savings"] for a in alerts), 2),
    }


@app.delete("/api/tracking/purchase-alerts/{product_id}")
async def dismiss_purchase_alert(product_id: str):
    """Dismiss a purchase price alert."""
    clear_purchase_alert(product_id)
    return {"status": "dismissed", "product_id": product_id}


# ── Price Drops (watchlist) ──────────────────────────────

@app.get("/api/price-drops")
async def price_drops():
    """Detect price drops for watchlist items."""
    drops = []
    for item in watchlist:
        if len(item.price_history) < 2:
            continue
        current = item.price_history[-1]["price"]
        previous = item.price_history[-2]["price"]
        original = item.price_history[0]["price"]
        target = item.target_price

        if current < previous:
            drop_amt = previous - current
            drop_pct = (drop_amt / previous) * 100 if previous > 0 else 0
            total_savings = original - current if current < original else 0
            hit_target = target is not None and current <= target

            drops.append({
                "product_id": item.product_id,
                "product_name": item.product_name,
                "current_price": current,
                "previous_price": previous,
                "original_price": original,
                "drop_amount": round(drop_amt, 2),
                "drop_percent": round(drop_pct, 1),
                "total_savings": round(total_savings, 2),
                "target_price": target,
                "hit_target": hit_target,
                "brand": item.brand,
                "category": item.category,
                "alert_level": "high" if drop_pct >= 15 or hit_target else "medium" if drop_pct >= 5 else "low",
            })

    drops.sort(key=lambda x: x["drop_percent"], reverse=True)
    return {
        "drops": drops,
        "total_potential_savings": round(sum(d["drop_amount"] for d in drops), 2),
        "items_with_drops": len(drops),
        "watchlist_size": len(watchlist),
    }
