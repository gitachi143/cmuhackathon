"""
Shared in-memory storage for the application.

All routers import state from here so they operate on the same data.
"""

from datetime import datetime
from typing import List

from models import UserProfile, PurchaseRecord, WatchlistItem


# ── In-memory storage ────────────────────────────────────
user_profile = UserProfile()
purchase_history: List[PurchaseRecord] = []
watchlist: List[WatchlistItem] = []


def update_watchlist_price(product_id: str, new_price: float):
    """Update a watchlist item's price (called by background tracker)."""
    for item in watchlist:
        if item.product_id == product_id:
            item.price_history.append({
                "price": new_price,
                "date": datetime.now().isoformat(),
            })
            item.price = new_price
            break
