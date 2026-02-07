from fastapi import APIRouter

from storage import purchase_history, watchlist

router = APIRouter(prefix="/api", tags=["spending"])


@router.get("/spending")
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
