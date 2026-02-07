from fastapi import APIRouter

from tracking_service import (
    update_activity,
    get_tracking_status,
    get_purchase_alerts,
    clear_purchase_alert,
)
from storage import watchlist, purchase_history

router = APIRouter(prefix="/api", tags=["tracking"])


@router.get("/tracking/status")
async def tracking_status():
    """Get live tracking status — is it running? when was user last active?"""
    status = get_tracking_status()
    status["watchlist_count"] = len(watchlist)
    status["purchase_count"] = len(purchase_history)
    return status


@router.post("/tracking/heartbeat")
async def tracking_heartbeat():
    """Frontend heartbeat to keep tracking alive."""
    update_activity()
    status = get_tracking_status()
    return {
        "status": "alive",
        "tracking": status["tracking_running"],
        "last_active": status["last_active"],
    }


@router.get("/tracking/purchase-alerts")
async def purchase_alerts():
    """Get price drop alerts for past purchases."""
    alerts = get_purchase_alerts()
    return {
        "alerts": alerts,
        "count": len(alerts),
        "total_potential_savings": round(sum(a["savings"] for a in alerts), 2),
    }


@router.delete("/tracking/purchase-alerts/{product_id}")
async def dismiss_purchase_alert(product_id: str):
    """Dismiss a purchase price alert."""
    clear_purchase_alert(product_id)
    return {"status": "dismissed", "product_id": product_id}
