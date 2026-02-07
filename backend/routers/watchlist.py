from datetime import datetime

from fastapi import APIRouter

from models import WatchlistItem
import storage

router = APIRouter(prefix="/api", tags=["watchlist"])


@router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem):
    """Add a product to the watchlist — tracking starts automatically."""
    if not item.price_history:
        item.price_history = [{"price": item.price, "date": datetime.now().isoformat()}]
    storage.watchlist.append(item)
    return {"status": "success", "watchlist": [w.model_dump() for w in storage.watchlist]}


@router.get("/watchlist")
async def get_watchlist():
    return {"watchlist": [w.model_dump() for w in storage.watchlist]}


@router.delete("/watchlist/{product_id}")
async def remove_from_watchlist(product_id: str):
    storage.watchlist = [item for item in storage.watchlist if item.product_id != product_id]
    return {"status": "success", "watchlist": [w.model_dump() for w in storage.watchlist]}


@router.get("/price-drops")
async def price_drops():
    """Detect price drops for watchlist items."""
    drops = []
    for item in storage.watchlist:
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
        "watchlist_size": len(storage.watchlist),
    }
