from datetime import datetime

from fastapi import APIRouter

from models import PurchaseRequest, PurchaseRecord
from storage import purchase_history

router = APIRouter(prefix="/api", tags=["purchases"])


@router.post("/purchase")
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


@router.get("/purchases")
async def get_purchases():
    """Get purchase history."""
    return {"purchases": [p.model_dump() for p in purchase_history]}
