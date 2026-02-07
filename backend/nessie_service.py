"""
Capital One Nessie API Integration Service.

Connects to api.nessieisreal.com for mock banking data:
accounts, purchases, merchants, deposits, and withdrawals.
Falls back to local mock data when API key is unavailable.
"""

import os
import httpx
from typing import Optional
from datetime import datetime, timedelta
import random

NESSIE_API_KEY = os.getenv("NESSIE_API_KEY", "")
NESSIE_BASE_URL = "http://api.nessieisreal.com"

# ── Nessie API Client ─────────────────────────────────────


async def _nessie_get(path: str, params: Optional[dict] = None) -> dict | list | None:
    """Make a GET request to the Nessie API."""
    if not NESSIE_API_KEY:
        return None
    url = f"{NESSIE_BASE_URL}{path}"
    query = {"key": NESSIE_API_KEY}
    if params:
        query.update(params)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=query)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"Nessie API error: {e}")
    return None


async def _nessie_post(path: str, data: dict) -> dict | None:
    """Make a POST request to the Nessie API."""
    if not NESSIE_API_KEY:
        return None
    url = f"{NESSIE_BASE_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=data, params={"key": NESSIE_API_KEY})
            if resp.status_code in (200, 201):
                return resp.json()
    except Exception as e:
        print(f"Nessie API error: {e}")
    return None


# ── Customer Operations ───────────────────────────────────


async def get_or_create_customer() -> dict:
    """Get the first customer or create a demo one."""
    customers = await _nessie_get("/customers")
    if customers and isinstance(customers, list) and len(customers) > 0:
        return customers[0]

    # Create a demo customer
    new_customer = await _nessie_post("/customers", {
        "first_name": "Cliq",
        "last_name": "User",
        "address": {
            "street_number": "5032",
            "street_name": "Forbes Ave",
            "city": "Pittsburgh",
            "state": "PA",
            "zip": "15213",
        },
    })
    if new_customer and "objectCreated" in new_customer:
        return new_customer["objectCreated"]
    return _mock_customer()


# ── Account Operations ────────────────────────────────────


async def get_accounts(customer_id: Optional[str] = None) -> list[dict]:
    """Get accounts for a customer or all accounts."""
    if customer_id:
        result = await _nessie_get(f"/customers/{customer_id}/accounts")
    else:
        customer = await get_or_create_customer()
        cid = customer.get("_id", customer.get("id", ""))
        result = await _nessie_get(f"/customers/{cid}/accounts")

    if result and isinstance(result, list):
        return [_normalize_account(a) for a in result]
    return _mock_accounts()


async def get_account(account_id: str) -> dict | None:
    """Get a single account by ID."""
    result = await _nessie_get(f"/accounts/{account_id}")
    if result and isinstance(result, dict):
        return _normalize_account(result)
    return None


# ── Purchase / Transaction Operations ─────────────────────


async def get_purchases(account_id: Optional[str] = None) -> list[dict]:
    """Get purchases for an account or across all accounts."""
    if account_id:
        result = await _nessie_get(f"/accounts/{account_id}/purchases")
        if result and isinstance(result, list):
            return [_normalize_purchase(p) for p in result]

    # Try all accounts
    accounts = await get_accounts()
    all_purchases = []
    for acc in accounts:
        acc_id = acc.get("id", "")
        if acc_id:
            result = await _nessie_get(f"/accounts/{acc_id}/purchases")
            if result and isinstance(result, list):
                all_purchases.extend([_normalize_purchase(p) for p in result])

    if all_purchases:
        return sorted(all_purchases, key=lambda x: x.get("purchase_date", ""), reverse=True)
    return _mock_purchases()


async def get_merchants() -> list[dict]:
    """Get all merchants."""
    result = await _nessie_get("/merchants")
    if result and isinstance(result, list):
        return [_normalize_merchant(m) for m in result]
    return _mock_merchants()


# ── Deposit & Withdrawal Operations ──────────────────────


async def get_deposits(account_id: str) -> list[dict]:
    """Get deposits for an account."""
    result = await _nessie_get(f"/accounts/{account_id}/deposits")
    if result and isinstance(result, list):
        return result
    return []


async def get_withdrawals(account_id: str) -> list[dict]:
    """Get withdrawals for an account."""
    result = await _nessie_get(f"/accounts/{account_id}/withdrawals")
    if result and isinstance(result, list):
        return result
    return []


# ── Normalizers ───────────────────────────────────────────


def _normalize_account(raw: dict) -> dict:
    return {
        "id": raw.get("_id", raw.get("id", "")),
        "type": raw.get("type", "Unknown"),
        "nickname": raw.get("nickname", "Account"),
        "rewards": raw.get("rewards", 0),
        "balance": raw.get("balance", 0),
        "account_number": raw.get("account_number", ""),
    }


def _normalize_purchase(raw: dict) -> dict:
    return {
        "id": raw.get("_id", raw.get("id", "")),
        "merchant_id": raw.get("merchant_id", ""),
        "medium": raw.get("medium", "balance"),
        "purchase_date": raw.get("purchase_date", ""),
        "amount": raw.get("amount", 0),
        "status": raw.get("status", "completed"),
        "description": raw.get("description", ""),
        "payer_id": raw.get("payer_id", ""),
    }


def _normalize_merchant(raw: dict) -> dict:
    return {
        "id": raw.get("_id", raw.get("id", "")),
        "name": raw.get("name", "Unknown"),
        "category": raw.get("category", []),
        "address": raw.get("address", {}),
        "geocode": raw.get("geocode", {}),
    }


# ── Mock Fallback Data ───────────────────────────────────


def _mock_customer() -> dict:
    return {
        "_id": "demo_customer_001",
        "first_name": "Cliq",
        "last_name": "User",
        "address": {
            "street_number": "5032",
            "street_name": "Forbes Ave",
            "city": "Pittsburgh",
            "state": "PA",
            "zip": "15213",
        },
    }


def _mock_accounts() -> list[dict]:
    return [
        {
            "id": "cap1_checking_001",
            "type": "Checking",
            "nickname": "Everyday Checking",
            "rewards": 0,
            "balance": 4_823.56,
            "account_number": "****4521",
        },
        {
            "id": "cap1_savings_001",
            "type": "Savings",
            "nickname": "High-Yield Savings",
            "rewards": 0,
            "balance": 12_450.00,
            "account_number": "****7832",
        },
        {
            "id": "cap1_credit_001",
            "type": "Credit Card",
            "nickname": "Venture X Rewards",
            "rewards": 48_250,
            "balance": 1_245.89,
            "account_number": "****9014",
        },
        {
            "id": "cap1_credit_002",
            "type": "Credit Card",
            "nickname": "Quicksilver Cash Back",
            "rewards": 15_670,
            "balance": 387.42,
            "account_number": "****3367",
        },
    ]


def _mock_purchases() -> list[dict]:
    now = datetime.now()
    categories = [
        ("Amazon", "Shopping", [45.99, 129.00, 23.49, 67.80, 15.99, 89.99, 34.50]),
        ("Whole Foods", "Groceries", [87.32, 62.15, 45.80, 91.23, 38.67, 72.40]),
        ("Target", "Shopping", [32.99, 56.78, 124.50, 19.99, 43.20]),
        ("Spotify", "Entertainment", [10.99, 10.99, 10.99, 10.99]),
        ("Shell Gas", "Gas & Fuel", [48.50, 52.30, 45.12, 55.80]),
        ("Uber Eats", "Food & Drink", [28.45, 35.60, 22.10, 41.30, 18.90]),
        ("Best Buy", "Electronics", [299.99, 49.99, 79.99]),
        ("Netflix", "Entertainment", [15.49, 15.49, 15.49]),
        ("Starbucks", "Food & Drink", [6.50, 5.80, 7.20, 4.95, 6.10, 5.45, 7.80]),
        ("CVS Pharmacy", "Health", [12.99, 34.50, 8.99, 22.30]),
    ]

    purchases = []
    for merchant_name, category, amounts in categories:
        for i, amount in enumerate(amounts):
            days_ago = random.randint(1, 90)
            purchase_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
            purchases.append({
                "id": f"txn_{merchant_name.lower().replace(' ', '_')}_{i}",
                "merchant_id": f"merch_{merchant_name.lower().replace(' ', '_')}",
                "merchant_name": merchant_name,
                "category": category,
                "medium": "balance",
                "purchase_date": purchase_date,
                "amount": amount,
                "status": "completed",
                "description": f"{merchant_name} purchase",
                "payer_id": "cap1_checking_001",
            })

    return sorted(purchases, key=lambda x: x["purchase_date"], reverse=True)


def _mock_merchants() -> list[dict]:
    return [
        {"id": "merch_amazon", "name": "Amazon", "category": ["Shopping"], "address": {}, "geocode": {}},
        {"id": "merch_whole_foods", "name": "Whole Foods", "category": ["Groceries"], "address": {}, "geocode": {}},
        {"id": "merch_target", "name": "Target", "category": ["Shopping"], "address": {}, "geocode": {}},
        {"id": "merch_spotify", "name": "Spotify", "category": ["Entertainment"], "address": {}, "geocode": {}},
        {"id": "merch_shell_gas", "name": "Shell Gas", "category": ["Gas & Fuel"], "address": {}, "geocode": {}},
        {"id": "merch_uber_eats", "name": "Uber Eats", "category": ["Food & Drink"], "address": {}, "geocode": {}},
        {"id": "merch_best_buy", "name": "Best Buy", "category": ["Electronics"], "address": {}, "geocode": {}},
        {"id": "merch_netflix", "name": "Netflix", "category": ["Entertainment"], "address": {}, "geocode": {}},
        {"id": "merch_starbucks", "name": "Starbucks", "category": ["Food & Drink"], "address": {}, "geocode": {}},
        {"id": "merch_cvs_pharmacy", "name": "CVS Pharmacy", "category": ["Health"], "address": {}, "geocode": {}},
    ]


# ── Analytics Helpers ─────────────────────────────────────


def compute_spending_analytics(purchases: list[dict]) -> dict:
    """Compute detailed spending analytics from purchase data."""
    if not purchases:
        return {
            "total_spent": 0,
            "purchase_count": 0,
            "avg_per_purchase": 0,
            "by_category": {},
            "by_merchant": {},
            "weekly_totals": [],
            "monthly_totals": [],
            "top_merchants": [],
            "largest_purchase": None,
            "smallest_purchase": None,
            "daily_average": 0,
        }

    total = sum(p.get("amount", 0) for p in purchases)
    count = len(purchases)

    # By category
    by_category: dict[str, dict] = {}
    for p in purchases:
        cat = p.get("category", "Other")
        if cat not in by_category:
            by_category[cat] = {"amount": 0, "count": 0, "transactions": []}
        by_category[cat]["amount"] += p.get("amount", 0)
        by_category[cat]["count"] += 1

    # By merchant
    by_merchant: dict[str, dict] = {}
    for p in purchases:
        m = p.get("merchant_name", p.get("description", "Unknown"))
        if m not in by_merchant:
            by_merchant[m] = {"amount": 0, "count": 0}
        by_merchant[m]["amount"] += p.get("amount", 0)
        by_merchant[m]["count"] += 1

    # Weekly totals (last 12 weeks)
    now = datetime.now()
    weekly: dict[str, float] = {}
    for p in purchases:
        try:
            d = datetime.strptime(p.get("purchase_date", ""), "%Y-%m-%d")
            week_start = d - timedelta(days=d.weekday())
            week_key = week_start.strftime("%Y-%m-%d")
            weekly[week_key] = weekly.get(week_key, 0) + p.get("amount", 0)
        except (ValueError, TypeError):
            pass
    weekly_totals = [
        {"week": k, "amount": round(v, 2)}
        for k, v in sorted(weekly.items())[-12:]
    ]

    # Monthly totals (last 6 months)
    monthly: dict[str, float] = {}
    for p in purchases:
        try:
            d = datetime.strptime(p.get("purchase_date", ""), "%Y-%m-%d")
            month_key = d.strftime("%Y-%m")
            monthly[month_key] = monthly.get(month_key, 0) + p.get("amount", 0)
        except (ValueError, TypeError):
            pass
    monthly_totals = [
        {"month": k, "amount": round(v, 2)}
        for k, v in sorted(monthly.items())[-6:]
    ]

    # Top merchants
    top_merchants = sorted(
        [{"name": k, "amount": round(v["amount"], 2), "count": v["count"]}
         for k, v in by_merchant.items()],
        key=lambda x: x["amount"], reverse=True,
    )[:10]

    # Largest / smallest
    sorted_by_amt = sorted(purchases, key=lambda x: x.get("amount", 0))
    largest = sorted_by_amt[-1] if sorted_by_amt else None
    smallest = sorted_by_amt[0] if sorted_by_amt else None

    # Date range for daily average
    dates = []
    for p in purchases:
        try:
            dates.append(datetime.strptime(p.get("purchase_date", ""), "%Y-%m-%d"))
        except (ValueError, TypeError):
            pass
    if dates:
        date_range = (max(dates) - min(dates)).days or 1
        daily_avg = total / date_range
    else:
        daily_avg = 0

    return {
        "total_spent": round(total, 2),
        "purchase_count": count,
        "avg_per_purchase": round(total / count, 2) if count > 0 else 0,
        "by_category": {k: {"amount": round(v["amount"], 2), "count": v["count"]} for k, v in by_category.items()},
        "by_merchant": {k: {"amount": round(v["amount"], 2), "count": v["count"]} for k, v in by_merchant.items()},
        "weekly_totals": weekly_totals,
        "monthly_totals": monthly_totals,
        "top_merchants": top_merchants,
        "largest_purchase": {
            "amount": largest.get("amount", 0),
            "merchant": largest.get("merchant_name", largest.get("description", "")),
            "date": largest.get("purchase_date", ""),
        } if largest else None,
        "smallest_purchase": {
            "amount": smallest.get("amount", 0),
            "merchant": smallest.get("merchant_name", smallest.get("description", "")),
            "date": smallest.get("purchase_date", ""),
        } if smallest else None,
        "daily_average": round(daily_avg, 2),
    }


def compute_spending_habits(purchases: list[dict]) -> dict:
    """Analyze spending habits and patterns."""
    if not purchases:
        return {
            "frequency": "none",
            "busiest_day": None,
            "avg_weekly_spend": 0,
            "avg_monthly_spend": 0,
            "recurring_charges": [],
            "spending_velocity": "stable",
            "insights": [],
            "category_trends": [],
        }

    # Frequency analysis
    dates = []
    for p in purchases:
        try:
            dates.append(datetime.strptime(p.get("purchase_date", ""), "%Y-%m-%d"))
        except (ValueError, TypeError):
            pass

    if len(dates) < 2:
        avg_gap = 30
    else:
        sorted_dates = sorted(dates)
        gaps = [(sorted_dates[i + 1] - sorted_dates[i]).days for i in range(len(sorted_dates) - 1)]
        avg_gap = sum(gaps) / len(gaps) if gaps else 30

    if avg_gap <= 1:
        frequency = "daily"
    elif avg_gap <= 3:
        frequency = "every few days"
    elif avg_gap <= 7:
        frequency = "weekly"
    elif avg_gap <= 14:
        frequency = "bi-weekly"
    else:
        frequency = "monthly"

    # Busiest day of week
    day_counts: dict[str, int] = {}
    day_amounts: dict[str, float] = {}
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for d in dates:
        day = day_names[d.weekday()]
        day_counts[day] = day_counts.get(day, 0) + 1
    for p in purchases:
        try:
            d = datetime.strptime(p.get("purchase_date", ""), "%Y-%m-%d")
            day = day_names[d.weekday()]
            day_amounts[day] = day_amounts.get(day, 0) + p.get("amount", 0)
        except (ValueError, TypeError):
            pass
    busiest_day = max(day_counts, key=day_counts.get) if day_counts else None

    # Weekly/monthly averages
    total = sum(p.get("amount", 0) for p in purchases)
    if dates:
        date_range_days = (max(dates) - min(dates)).days or 1
        weeks = max(date_range_days / 7, 1)
        months = max(date_range_days / 30, 1)
        avg_weekly = total / weeks
        avg_monthly = total / months
    else:
        avg_weekly = 0
        avg_monthly = 0

    # Detect recurring charges (same merchant, similar amount, regular interval)
    merchant_purchases: dict[str, list] = {}
    for p in purchases:
        m = p.get("merchant_name", p.get("description", "Unknown"))
        if m not in merchant_purchases:
            merchant_purchases[m] = []
        merchant_purchases[m].append(p)

    recurring = []
    for merchant, mps in merchant_purchases.items():
        if len(mps) >= 3:
            amounts = [mp.get("amount", 0) for mp in mps]
            avg_amount = sum(amounts) / len(amounts)
            variance = sum((a - avg_amount) ** 2 for a in amounts) / len(amounts)
            if variance < 5:  # Very low variance = likely subscription
                recurring.append({
                    "merchant": merchant,
                    "amount": round(avg_amount, 2),
                    "frequency": f"~{len(mps)} charges",
                    "total": round(sum(amounts), 2),
                })

    # Spending velocity (comparing recent vs older spending)
    now = datetime.now()
    recent = [p for p in purchases if _days_ago(p) <= 30]
    older = [p for p in purchases if 30 < _days_ago(p) <= 60]
    recent_total = sum(p.get("amount", 0) for p in recent)
    older_total = sum(p.get("amount", 0) for p in older)

    if older_total > 0:
        velocity_pct = ((recent_total - older_total) / older_total) * 100
        if velocity_pct > 20:
            velocity = "increasing"
        elif velocity_pct < -20:
            velocity = "decreasing"
        else:
            velocity = "stable"
    else:
        velocity = "stable"

    # Smart insights
    insights = []
    if recurring:
        sub_total = sum(r["total"] for r in recurring)
        insights.append(f"You have {len(recurring)} recurring charge(s) totaling ${sub_total:.2f}")
    if busiest_day:
        insights.append(f"You spend the most on {busiest_day}s")
    if velocity == "increasing":
        insights.append(f"Your spending increased {abs(velocity_pct):.0f}% vs last month")
    elif velocity == "decreasing":
        insights.append(f"Your spending decreased {abs(velocity_pct):.0f}% vs last month")

    top_cat = max(
        ((cat, sum(p.get("amount", 0) for p in purchases if p.get("category") == cat))
         for cat in set(p.get("category", "Other") for p in purchases)),
        key=lambda x: x[1],
        default=None,
    )
    if top_cat:
        insights.append(f"Top spending category: {top_cat[0]} (${top_cat[1]:.2f})")

    # Category trends (spending per category over last 4 weeks)
    category_trends = []
    categories_seen = set(p.get("category", "Other") for p in purchases)
    for cat in categories_seen:
        weekly_data = []
        for week_offset in range(4):
            week_start = now - timedelta(weeks=week_offset + 1)
            week_end = now - timedelta(weeks=week_offset)
            week_total = sum(
                p.get("amount", 0) for p in purchases
                if p.get("category") == cat and _in_range(p, week_start, week_end)
            )
            weekly_data.append(round(week_total, 2))
        category_trends.append({
            "category": cat,
            "weekly_amounts": list(reversed(weekly_data)),
        })

    return {
        "frequency": frequency,
        "busiest_day": busiest_day,
        "avg_weekly_spend": round(avg_weekly, 2),
        "avg_monthly_spend": round(avg_monthly, 2),
        "recurring_charges": recurring,
        "spending_velocity": velocity,
        "velocity_pct": round(velocity_pct, 1) if older_total > 0 else 0,
        "insights": insights,
        "category_trends": category_trends,
        "day_breakdown": {
            day: {"count": day_counts.get(day, 0), "amount": round(day_amounts.get(day, 0), 2)}
            for day in day_names
        },
    }


def detect_price_drops(watchlist: list[dict]) -> list[dict]:
    """Detect price drops for watchlist items and generate alerts."""
    drops = []
    for item in watchlist:
        price_history = item.get("price_history", [])
        if len(price_history) < 2:
            continue

        current = price_history[-1].get("price", 0)
        previous = price_history[-2].get("price", 0)
        original = price_history[0].get("price", 0)
        target = item.get("target_price")

        if current < previous:
            drop_amt = previous - current
            drop_pct = (drop_amt / previous) * 100 if previous > 0 else 0
            total_savings = original - current if current < original else 0
            total_pct = (total_savings / original) * 100 if original > 0 else 0
            hit_target = target is not None and current <= target

            drops.append({
                "product_id": item.get("product_id", ""),
                "product_title": item.get("product_title", ""),
                "current_price": current,
                "previous_price": previous,
                "original_price": original,
                "drop_amount": round(drop_amt, 2),
                "drop_percent": round(drop_pct, 1),
                "total_savings": round(total_savings, 2),
                "total_savings_percent": round(total_pct, 1),
                "target_price": target,
                "hit_target": hit_target,
                "price_history": price_history,
                "brand": item.get("brand", ""),
                "category": item.get("category", ""),
                "alert_level": "high" if drop_pct >= 15 or hit_target else "medium" if drop_pct >= 5 else "low",
            })

    return sorted(drops, key=lambda x: x["drop_percent"], reverse=True)


def _days_ago(purchase: dict) -> int:
    try:
        d = datetime.strptime(purchase.get("purchase_date", ""), "%Y-%m-%d")
        return (datetime.now() - d).days
    except (ValueError, TypeError):
        return 999


def _in_range(purchase: dict, start: datetime, end: datetime) -> bool:
    try:
        d = datetime.strptime(purchase.get("purchase_date", ""), "%Y-%m-%d")
        return start <= d <= end
    except (ValueError, TypeError):
        return False
