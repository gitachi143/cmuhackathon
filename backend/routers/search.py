from fastapi import APIRouter, HTTPException

from models import SearchRequest, SearchResponse
from ai_service import interpret_query_with_gemini
from scraper import enrich_products_with_images
from storage import user_profile

router = APIRouter(prefix="/api", tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Main search endpoint — interprets natural language queries via AI."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    if request.user_profile is None:
        request.user_profile = user_profile

    response = await interpret_query_with_gemini(request)

    # Try to scrape real product images from source URLs
    if response.products:
        try:
            await enrich_products_with_images(response.products)
        except Exception:
            pass  # Keep existing image_url values on failure

    return response
