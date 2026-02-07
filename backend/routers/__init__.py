from .search import router as search_router
from .purchases import router as purchases_router
from .profile import router as profile_router
from .watchlist import router as watchlist_router
from .coupons import router as coupons_router
from .spending import router as spending_router
from .tracking import router as tracking_router

__all__ = [
    "search_router",
    "purchases_router",
    "profile_router",
    "watchlist_router",
    "coupons_router",
    "spending_router",
    "tracking_router",
]
