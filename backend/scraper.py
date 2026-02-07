"""
Image scraper service.

Uses multiple strategies to find real product images:
  1. Bing Image Search — searches for product by name + brand
  2. Source URL scraping — tries og:image, twitter:image, JSON-LD, product <img> tags
  3. Category-based fallback — curated working image URLs per product category

Falls back to the existing image_url if all strategies fail.
"""

import asyncio
import re
from typing import Optional
from urllib.parse import urljoin, quote_plus

import httpx

# Shared async client – reused across scrape calls
_client: Optional[httpx.AsyncClient] = None

# In-memory cache: cache_key -> scraped image URL (or None on failure)
_cache: dict[str, Optional[str]] = {}

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

# Category-based fallback images — real, working Unsplash photo URLs.
# Multiple aliases per category so AI-generated category strings get matched.
_JACKET_IMAGES = [
    "https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1483664852023-7f44e5484aee?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=400&h=300&fit=crop",
]
_MONITOR_IMAGES = [
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1548611716-ad11f5a04b69?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=400&h=300&fit=crop",
]
_HEADPHONE_IMAGES = [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=300&fit=crop",
]
_LAPTOP_IMAGES = [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop",
]
_SHOE_IMAGES = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=300&fit=crop",
]
_LUGGAGE_IMAGES = [
    "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1553531384-411a247ccd73?w=400&h=300&fit=crop",
]
_GENERIC_IMAGES = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop",
]

_CATEGORY_FALLBACKS: dict[str, list[str]] = {
    # Jackets / outerwear
    "winter_jackets": _JACKET_IMAGES,
    "jackets": _JACKET_IMAGES,
    "jacket": _JACKET_IMAGES,
    "coats": _JACKET_IMAGES,
    "outerwear": _JACKET_IMAGES,
    "parka": _JACKET_IMAGES,
    "winter_clothing": _JACKET_IMAGES,
    "winter clothing": _JACKET_IMAGES,
    "winter": _JACKET_IMAGES,
    # Monitors / displays
    "monitors": _MONITOR_IMAGES,
    "monitor": _MONITOR_IMAGES,
    "displays": _MONITOR_IMAGES,
    "display": _MONITOR_IMAGES,
    "screens": _MONITOR_IMAGES,
    # Headphones / audio
    "headphones": _HEADPHONE_IMAGES,
    "headphone": _HEADPHONE_IMAGES,
    "earphones": _HEADPHONE_IMAGES,
    "earbuds": _HEADPHONE_IMAGES,
    "audio": _HEADPHONE_IMAGES,
    # Laptops / computers
    "laptops": _LAPTOP_IMAGES,
    "laptop": _LAPTOP_IMAGES,
    "computers": _LAPTOP_IMAGES,
    "computer": _LAPTOP_IMAGES,
    "notebooks": _LAPTOP_IMAGES,
    # Shoes / footwear
    "running_shoes": _SHOE_IMAGES,
    "shoes": _SHOE_IMAGES,
    "shoe": _SHOE_IMAGES,
    "footwear": _SHOE_IMAGES,
    "sneakers": _SHOE_IMAGES,
    "running": _SHOE_IMAGES,
    # Luggage / travel
    "luggage": _LUGGAGE_IMAGES,
    "suitcase": _LUGGAGE_IMAGES,
    "travel": _LUGGAGE_IMAGES,
    "bags": _LUGGAGE_IMAGES,
    # Generic fallback
    "general": _GENERIC_IMAGES,
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


# ---------------------------------------------------------------------------
# Strategy 1: Bing Image Search
# ---------------------------------------------------------------------------

async def _search_image_bing(query: str) -> Optional[str]:
    """Search Bing Images for a product image and return the first good result."""
    cache_key = f"bing:{query}"
    if cache_key in _cache:
        return _cache[cache_key]

    search_url = f"https://www.bing.com/images/search?q={quote_plus(query)}&first=1&count=10&qft=+filterui:imagesize-medium"
    try:
        client = _get_client()
        resp = await client.get(search_url)
        if resp.status_code != 200:
            _cache[cache_key] = None
            return None

        # Bing embeds image metadata with "murl" (media URL) in the HTML
        urls = re.findall(r'"murl"\s*:\s*"(https?://[^"]+)"', resp.text)
        for url in urls:
            # Unescape any JSON-escaped characters
            url = url.replace("\\u0026", "&").replace("\\/", "/")
            if _is_valid_image_url(url):
                _cache[cache_key] = url
                return url

        _cache[cache_key] = None
        return None

    except Exception:
        _cache[cache_key] = None
        return None


# ---------------------------------------------------------------------------
# Strategy 2: Source URL scraping (og:image, twitter:image, JSON-LD, etc.)
# ---------------------------------------------------------------------------

def _extract_image_from_html(html: str, base_url: str) -> Optional[str]:
    """Extract the best product image URL from raw HTML using regex."""

    # 1. Open Graph image (most reliable for product pages)
    og_match = re.search(
        r'<meta[^>]+property\s*=\s*["\']og:image["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not og_match:
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
    """Basic check that a URL looks like a real product image."""
    if not url or len(url) < 10:
        return False
    # Skip tiny icons, tracking pixels, SVGs, data URIs
    skip_patterns = [
        "1x1", "pixel", "spacer", "blank", "tracking",
        ".svg", ".gif", "data:image", "base64",
        "logo", "icon", "favicon", "badge", "sprite",
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
    """Attempt to scrape a product image from the given URL."""
    cache_key = f"scrape:{source_url}"
    if cache_key in _cache:
        return _cache[cache_key]

    try:
        client = _get_client()
        resp = await client.get(source_url)
        if resp.status_code != 200:
            _cache[cache_key] = None
            return None

        html = resp.text
        image_url = _extract_image_from_html(html, str(resp.url))
        _cache[cache_key] = image_url
        return image_url

    except Exception:
        _cache[cache_key] = None
        return None


# ---------------------------------------------------------------------------
# Strategy 3: Category-based fallback
# ---------------------------------------------------------------------------

def _get_category_fallback(category: str, product_name: str) -> str:
    """Return a deterministic fallback image URL based on category and product name.

    Always returns a valid URL — uses generic product images as last resort.
    """
    cat_lower = category.lower().strip()
    name_lower = product_name.lower()

    # 1. Direct category match
    images = _CATEGORY_FALLBACKS.get(cat_lower)

    # 2. Partial category match
    if not images:
        for key, imgs in _CATEGORY_FALLBACKS.items():
            if key in cat_lower or cat_lower in key:
                images = imgs
                break

    # 3. Keyword match against product name
    if not images:
        keyword_map = {
            "jacket": _JACKET_IMAGES, "coat": _JACKET_IMAGES, "parka": _JACKET_IMAGES,
            "puffer": _JACKET_IMAGES, "fleece": _JACKET_IMAGES, "vest": _JACKET_IMAGES,
            "monitor": _MONITOR_IMAGES, "display": _MONITOR_IMAGES, "screen": _MONITOR_IMAGES,
            "headphone": _HEADPHONE_IMAGES, "earbud": _HEADPHONE_IMAGES, "airpod": _HEADPHONE_IMAGES,
            "laptop": _LAPTOP_IMAGES, "macbook": _LAPTOP_IMAGES, "chromebook": _LAPTOP_IMAGES,
            "notebook": _LAPTOP_IMAGES,
            "shoe": _SHOE_IMAGES, "sneaker": _SHOE_IMAGES, "runner": _SHOE_IMAGES,
            "boot": _SHOE_IMAGES,
            "luggage": _LUGGAGE_IMAGES, "suitcase": _LUGGAGE_IMAGES, "carry-on": _LUGGAGE_IMAGES,
        }
        for kw, imgs in keyword_map.items():
            if kw in name_lower or kw in cat_lower:
                images = imgs
                break

    # 4. Generic fallback — always return something
    if not images:
        images = _GENERIC_IMAGES

    # Use hash of product name to pick a consistent image for the same product
    index = hash(product_name) % len(images)
    return images[index]


# ---------------------------------------------------------------------------
# Main enrichment pipeline
# ---------------------------------------------------------------------------

async def enrich_products_with_images(products: list) -> list:
    """Try to find real images for a list of Product objects.

    For each product, tries in order:
      1. Bing Image Search for "{brand} {product name}"
      2. Scraping the source_url for og:image / meta tags
      3. Category-based fallback image

    If all fail, the existing image_url is kept unchanged.
    """
    if not products:
        return products

    async def _enrich_one(product):
        # 1. Search Bing Images for the product
        query = f"{product.brand} {product.name} product photo"
        searched = await _search_image_bing(query)
        if searched:
            product.image_url = searched
            return

        # 2. Try scraping the source URL
        scraped = await scrape_product_image(product.source_url)
        if scraped:
            product.image_url = scraped
            return

        # 3. Use category-based fallback (always returns a valid URL)
        product.image_url = _get_category_fallback(product.category, product.name)

    await asyncio.gather(*[_enrich_one(p) for p in products])
    return products
