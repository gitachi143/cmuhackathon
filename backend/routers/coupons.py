from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["coupons"])


@router.get("/coupons/{product_id}")
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
