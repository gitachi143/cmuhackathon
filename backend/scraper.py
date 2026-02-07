"""
Image scraper service.

Attempts to fetch real product images from retailer source URLs by looking for:
  1. Open Graph image meta tags (og:image)
  2. Twitter card image meta tags (twitter:image)
  3. Product-specific meta/structured data
  4. Large <img> elements with product-related attributes

Falls back to the existing image_url (Unsplash) if scraping fails.
"""

import asyncio
import re
from typing import Optional
from urllib.parse import urljoin

import httpx

# Shared async client – reused across scrape calls
_client: Optional[httpx.AsyncClient] = None

# In-memory cache: source_url -> scraped image URL (or None on failure)
_cache: dict[str, Optional[str]] = {}

# ── Curated fallback images (verified-working Unsplash URLs) ──────────
# Used when the AI generates bad URLs and scraping fails.
_FALLBACK_IMAGES: dict[str, list[str]] = {
    "winter_jackets": [
        "https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1483664852023-7f44e5484aee?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=400&h=300&fit=crop",
    ],
    "jackets": [
        "https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1483664852023-7f44e5484aee?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=400&h=300&fit=crop",
    ],
    "monitors": [
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1548611716-ad11f5a04b69?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=400&h=300&fit=crop",
    ],
    "headphones": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=300&fit=crop",
    ],
    "laptops": [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop",
    ],
    "running_shoes": [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=300&fit=crop",
    ],
    "shoes": [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=300&fit=crop",
    ],
    "luggage": [
        "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1553531384-411a247ccd73?w=400&h=300&fit=crop",
    ],
}

# General fallback for any unrecognized category
_GENERAL_FALLBACK = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop",
]


def _get_fallback_image(category: str, index: int) -> str:
    """Pick a fallback image URL from the curated pool for a category."""
    cat = category.lower().replace(" ", "_")
    # Try exact match first, then fuzzy keyword match
    pool = _FALLBACK_IMAGES.get(cat)
    if not pool:
        for key, imgs in _FALLBACK_IMAGES.items():
            if key in cat or cat in key:
                pool = imgs
                break
    if not pool:
        pool = _GENERAL_FALLBACK
    return pool[index % len(pool)]

# Common browser-like headers to reduce bot-blocking
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=httpx.Timeout(8.0, connect=5.0),
        )
    return _client


async def close_client() -> None:
    """Close the shared HTTP client. Call on app shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _extract_image_from_html(html: str, base_url: str) -> Optional[str]:
    """Extract the best product image URL from raw HTML using regex.

    We avoid requiring BeautifulSoup by using targeted regex patterns,
    keeping dependencies minimal.
    """

    # 1. Open Graph image (most reliable for product pages)
    og_match = re.search(
        r'<meta[^>]+property\s*=\s*["\']og:image["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not og_match:
        # Some sites put content before property
        og_match = re.search(
            r'<meta[^>]+content\s*=\s*["\']([^"\']+)["\'][^>]+property\s*=\s*["\']og:image["\']',
            html,
            re.IGNORECASE,
        )
    if og_match:
        url = og_match.group(1).strip()
        if url and _is_valid_image_url(url):
            return _resolve_url(url, base_url)

    # 2. Twitter card image
    tw_match = re.search(
        r'<meta[^>]+name\s*=\s*["\']twitter:image["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not tw_match:
        tw_match = re.search(
            r'<meta[^>]+content\s*=\s*["\']([^"\']+)["\'][^>]+name\s*=\s*["\']twitter:image["\']',
            html,
            re.IGNORECASE,
        )
    if tw_match:
        url = tw_match.group(1).strip()
        if url and _is_valid_image_url(url):
            return _resolve_url(url, base_url)

    # 3. JSON-LD structured data image
    jsonld_match = re.search(
        r'"image"\s*:\s*"(https?://[^"]+)"',
        html,
    )
    if jsonld_match:
        url = jsonld_match.group(1).strip()
        if _is_valid_image_url(url):
            return url

    # 4. Large product images – look for img tags with product-related class/id
    product_img = re.search(
        r'<img[^>]+(?:class|id)\s*=\s*["\'][^"\']*(?:product|hero|main|primary|featured)[^"\']*["\'][^>]+src\s*=\s*["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not product_img:
        # Try reversed attribute order
        product_img = re.search(
            r'<img[^>]+src\s*=\s*["\']([^"\']+)["\'][^>]+(?:class|id)\s*=\s*["\'][^"\']*(?:product|hero|main|primary|featured)[^"\']*["\']',
            html,
            re.IGNORECASE,
        )
    if product_img:
        url = product_img.group(1).strip()
        if _is_valid_image_url(url):
            return _resolve_url(url, base_url)

    return None


def _is_valid_image_url(url: str) -> bool:
    """Basic check that a URL looks like a real image."""
    if not url or len(url) < 10:
        return False
    # Skip tiny icons, tracking pixels, SVGs
    skip_patterns = [
        "1x1", "pixel", "spacer", "blank", "tracking",
        ".svg", ".gif", "data:image", "base64",
    ]
    url_lower = url.lower()
    return not any(p in url_lower for p in skip_patterns)


def _resolve_url(url: str, base_url: str) -> str:
    """Resolve relative URLs against the base URL."""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("//"):
        return "https:" + url
    return urljoin(base_url, url)


async def scrape_product_image(source_url: str) -> Optional[str]:
    """Attempt to scrape a product image from the given URL.

    Returns the image URL string, or None if scraping fails.
    Results are cached in memory.
    """
    if source_url in _cache:
        return _cache[source_url]

    try:
        client = _get_client()
        resp = await client.get(source_url)
        if resp.status_code != 200:
            _cache[source_url] = None
            return None

        html = resp.text
        image_url = _extract_image_from_html(html, str(resp.url))
        _cache[source_url] = image_url
        return image_url

    except Exception:
        _cache[source_url] = None
        return None


async def enrich_products_with_images(products: list) -> list:
    """Try to scrape real images for a list of Product objects.

    Strategy per product:
      1. Try scraping the source URL for a real product image.
      2. If scraping fails and the product has no image_url, assign a
         curated fallback image for the category.
      3. If the product already has an image_url (e.g. from mock data),
         keep it — the frontend handles broken images with an emoji fallback.
    """
    if not products:
        return products

    async def _enrich_one(product, index: int):
        # Try scraping first
        scraped = await scrape_product_image(product.source_url)
        if scraped:
            product.image_url = scraped
            return

        # If no image_url at all, assign a curated fallback
        if not product.image_url:
            product.image_url = _get_fallback_image(product.category, index)

    await asyncio.gather(*[_enrich_one(p, i) for i, p in enumerate(products)])
    return products
