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

    For each product, if scraping succeeds the image_url is replaced
    with the scraped URL. Otherwise the existing image_url is kept.
    """
    if not products:
        return products

    async def _enrich_one(product):
        scraped = await scrape_product_image(product.source_url)
        if scraped:
            product.image_url = scraped

    await asyncio.gather(*[_enrich_one(p) for p in products])
    return products
