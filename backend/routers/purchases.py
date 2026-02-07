import uuid
from datetime import datetime

from fastapi import APIRouter

from models import PurchaseRequest, PurchaseRecord, ShippingStatus
from storage import purchase_history

router = APIRouter(prefix="/api", tags=["purchases"])

# Shipping status progression thresholds (seconds since purchase)
_STATUS_THRESHOLDS = [
    (300, ShippingStatus.delivered),         # 5 min+
    (210, ShippingStatus.out_for_delivery),  # 3.5 min+
    (150, ShippingStatus.in_transit),        # 2.5 min+
    (90,  ShippingStatus.shipped),           # 1.5 min+
    (40,  ShippingStatus.confirmed),         # 40s+
    (0,   ShippingStatus.processing),        # 0s+
]


def _compute_status(purchase_time: str) -> ShippingStatus:
    """Compute simulated shipping status based on elapsed time."""
    elapsed = (datetime.now() - datetime.fromisoformat(purchase_time)).total_seconds()
    for threshold, status in _STATUS_THRESHOLDS:
        if elapsed >= threshold:
            return status
    return ShippingStatus.processing


@router.post("/purchase")
async def purchase(request: PurchaseRequest):
    """Record a simulated purchase."""
    record = PurchaseRecord(
        order_id=uuid.uuid4().hex[:12].upper(),
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
        "record": record.model_dump(),
    }


@router.get("/purchases")
async def get_purchases():
    """Get purchase history."""
    return {"purchases": [p.model_dump() for p in purchase_history]}


@router.get("/purchases/shipping")
async def get_shipping_statuses():
    """Get live shipping status for all purchases (simulated progression)."""
    results = []
    for p in purchase_history:
        current_status = _compute_status(p.timestamp)
        # Update the stored status
        p.shipping_status = current_status
        results.append({
            "order_id": p.order_id,
            "product_id": p.product_id,
            "product_name": p.product_name,
            "shipping_status": current_status.value,
            "timestamp": p.timestamp,
        })
    return {"shipments": results}
