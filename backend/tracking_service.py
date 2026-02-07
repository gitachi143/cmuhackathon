"""
Price tracking service with active user gating.

Periodically checks prices for watchlist items and past purchases.
Stops tracking if user hasn't been active for 24 hours.
"""

import asyncio
import random
from datetime import datetime, timedelta
from typing import Callable, Optional

# ── Configuration ────────────────────────────────────────
INACTIVE_THRESHOLD = timedelta(hours=24)
WATCHLIST_CHECK_INTERVAL = 5 * 60  # 5 minutes
PURCHASE_CHECK_INTERVAL = 30 * 60  # 30 minutes

# ── State ────────────────────────────────────────────────
last_active: datetime = datetime.now()
tracking_running: bool = False
tracking_log: list[dict] = []
purchase_price_alerts: list[dict] = []

# Track current market prices for past purchases (product_id -> latest price)
purchase_market_prices: dict[str, float] = {}


def update_activity():
    """Call on any user interaction to keep tracking alive."""
    global last_active
    last_active = datetime.now()


def is_user_active() -> bool:
    """Check if user has been active within the threshold."""
    return (datetime.now() - last_active) < INACTIVE_THRESHOLD


def _simulate_price_check(current_price: float) -> float:
    """Simulate a price check with small random fluctuation."""
    roll = random.random()
    if roll < 0.65:
        return current_price
    elif roll < 0.88:
        # Price drop: 1-8%
        drop = random.uniform(0.01, 0.08)
        return round(current_price * (1 - drop), 2)
    else:
        # Price rise: 1-4%
        rise = random.uniform(0.01, 0.04)
        return round(current_price * (1 + rise), 2)


def _log(entry: dict):
    """Append to tracking log, keep last 100 entries."""
    global tracking_log
    tracking_log.append(entry)
    if len(tracking_log) > 100:
        tracking_log = tracking_log[-100:]


async def watchlist_tracking_loop(
    get_watchlist: Callable,
    update_watchlist_price: Callable,
):
    """Background loop checking watchlist prices every few minutes."""
    global tracking_running
    while True:
        await asyncio.sleep(WATCHLIST_CHECK_INTERVAL)
        if not is_user_active():
            tracking_running = False
            _log({
                "type": "watchlist_paused",
                "reason": "User inactive for 24+ hours",
                "timestamp": datetime.now().isoformat(),
            })
            continue

        tracking_running = True
        watchlist = get_watchlist()
        for item in watchlist:
            old_price = item.price
            new_price = _simulate_price_check(old_price)
            if new_price != old_price:
                update_watchlist_price(item.product_id, new_price)
                _log({
                    "type": "watchlist_price_update",
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "old_price": old_price,
                    "new_price": new_price,
                    "change": round(new_price - old_price, 2),
                    "timestamp": datetime.now().isoformat(),
                })
            else:
                _log({
                    "type": "watchlist_checked",
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "price": old_price,
                    "timestamp": datetime.now().isoformat(),
                })


async def purchase_tracking_loop(
    get_purchases: Callable,
):
    """Background loop rechecking past purchase prices every 30 minutes."""
    global purchase_price_alerts
    while True:
        await asyncio.sleep(PURCHASE_CHECK_INTERVAL)
        if not is_user_active():
            _log({
                "type": "purchase_paused",
                "reason": "User inactive for 24+ hours",
                "timestamp": datetime.now().isoformat(),
            })
            continue

        purchases = get_purchases()
        for purchase in purchases:
            pid = purchase.product_id
            # Initialize market price from purchase price if not tracked yet
            current_market = purchase_market_prices.get(pid, purchase.price)
            new_market = _simulate_price_check(current_market)
            purchase_market_prices[pid] = new_market

            if new_market < purchase.price:
                # Price dropped below what user paid
                drop_amt = round(purchase.price - new_market, 2)
                drop_pct = round((drop_amt / purchase.price) * 100, 1)
                alert = {
                    "product_id": pid,
                    "product_name": purchase.product_name,
                    "purchased_price": purchase.price,
                    "current_market_price": new_market,
                    "savings": drop_amt,
                    "drop_percent": drop_pct,
                    "timestamp": datetime.now().isoformat(),
                }
                # Update or add alert
                existing = next((a for a in purchase_price_alerts if a["product_id"] == pid), None)
                if existing:
                    existing.update(alert)
                else:
                    purchase_price_alerts.append(alert)

                _log({
                    "type": "purchase_price_drop",
                    "product_id": pid,
                    "product_name": purchase.product_name,
                    "purchased_at": purchase.price,
                    "current_market_price": new_market,
                    "savings": drop_amt,
                    "timestamp": datetime.now().isoformat(),
                })
            else:
                _log({
                    "type": "purchase_checked",
                    "product_id": pid,
                    "product_name": purchase.product_name,
                    "purchased_at": purchase.price,
                    "current_market_price": new_market,
                    "timestamp": datetime.now().isoformat(),
                })


def get_tracking_status() -> dict:
    """Get the current tracking status."""
    active = is_user_active()
    time_left = max(0, (INACTIVE_THRESHOLD - (datetime.now() - last_active)).total_seconds())
    return {
        "user_active": active,
        "tracking_running": tracking_running and active,
        "last_active": last_active.isoformat(),
        "inactive_threshold_hours": 24,
        "hours_until_pause": round(time_left / 3600, 1) if active else 0,
        "watchlist_interval_minutes": WATCHLIST_CHECK_INTERVAL / 60,
        "purchase_interval_minutes": PURCHASE_CHECK_INTERVAL / 60,
        "recent_activity": tracking_log[-20:] if tracking_log else [],
        "purchase_alerts": purchase_price_alerts,
    }


def get_purchase_alerts() -> list[dict]:
    """Get price drop alerts for past purchases."""
    return purchase_price_alerts


def clear_purchase_alert(product_id: str):
    """Dismiss a purchase price alert."""
    global purchase_price_alerts
    purchase_price_alerts = [a for a in purchase_price_alerts if a["product_id"] != product_id]
