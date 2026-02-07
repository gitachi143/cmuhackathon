"""
Amazon One-Click Checkout Automation via Playwright.

Opens a *visible* Chromium browser so the user can watch each step in real time.
Yields status dicts that the SSE endpoint streams to the frontend.
"""

import asyncio
from typing import AsyncGenerator
from playwright.async_api import async_playwright, Page, Browser


async def run_amazon_checkout(
    product_name: str,
    personal_info: dict,
    shipping_address: dict,
) -> AsyncGenerator[dict, None]:
    """
    Generator that drives the Amazon checkout flow and yields
    status updates at each step.
    """
    browser: Browser | None = None

    try:
        # ── Step 1: Launch browser ────────────────────────
        yield {"step": "launching", "message": "Launching browser..."}
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=False, slow_mo=400)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page: Page = await context.new_page()

        # ── Step 2: Navigate to Amazon ────────────────────
        yield {"step": "navigating", "message": "Opening Amazon.com..."}
        await page.goto("https://www.amazon.com", wait_until="domcontentloaded")
        await asyncio.sleep(1)

        # ── Step 3: Search for the product ────────────────
        yield {"step": "searching", "message": f"Searching for \"{product_name}\"..."}

        search_box = page.locator("#twotabsearchtextbox")
        await search_box.click()
        await search_box.fill(product_name)
        await page.keyboard.press("Enter")
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(2)

        # ── Step 4: Click the 2nd result ──────────────────
        yield {"step": "selecting", "message": "Picking the second result..."}

        results = page.locator('[data-component-type="s-search-result"]')
        count = await results.count()

        if count < 2:
            yield {"step": "error", "message": f"Only found {count} result(s). Clicking first available."}
            target_index = 0
        else:
            target_index = 1  # 0-indexed → 2nd result

        result_card = results.nth(target_index)
        title_link = result_card.locator("h2 a").first
        product_title = await title_link.inner_text()

        yield {"step": "selecting", "message": f"Selected: \"{product_title.strip()[:60]}\""}
        await title_link.click()
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(2)

        # ── Step 5: Add to cart ───────────────────────────
        yield {"step": "adding_to_cart", "message": "Adding to cart..."}

        add_to_cart = page.locator("#add-to-cart-button")
        if await add_to_cart.count() > 0:
            await add_to_cart.click()
            await asyncio.sleep(2)
            yield {"step": "added_to_cart", "message": "Item added to cart!"}
        else:
            # Some pages have a different button (e.g. "Buy Now")
            buy_now = page.locator("#buy-now-button")
            if await buy_now.count() > 0:
                yield {"step": "adding_to_cart", "message": "No 'Add to Cart' — using 'Buy Now'..."}
                await buy_now.click()
                await asyncio.sleep(2)
            else:
                yield {"step": "warning", "message": "Could not find Add to Cart button. Trying to proceed..."}

        # ── Step 6: Go to cart ────────────────────────────
        yield {"step": "going_to_cart", "message": "Opening cart..."}
        await page.goto("https://www.amazon.com/gp/cart/view.html", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        # ── Step 7: Proceed to checkout ───────────────────
        yield {"step": "checkout", "message": "Proceeding to checkout..."}

        proceed_btn = page.locator("input[name='proceedToRetailCheckout'], #sc-buy-box-ptc-button input")
        if await proceed_btn.count() > 0:
            await proceed_btn.first.click()
            await asyncio.sleep(3)
        else:
            yield {"step": "warning", "message": "Checkout button not found — Amazon may require sign-in."}

        # ── Step 8: Attempt to fill address fields ────────
        yield {"step": "filling_info", "message": "Filling in your details..."}

        # Amazon's address form field IDs (these appear on the "Add address" page)
        field_map = {
            "#address-ui-widgets-enterAddressFullName": personal_info.get("name", ""),
            "#address-ui-widgets-enterAddressLine1": shipping_address.get("address_line", ""),
            "#address-ui-widgets-enterAddressCity": shipping_address.get("city", ""),
            "#address-ui-widgets-enterAddressStateOrRegion": shipping_address.get("state", ""),
            "#address-ui-widgets-enterAddressPostalCode": shipping_address.get("zip", ""),
        }

        fields_filled = 0
        for selector, value in field_map.items():
            if not value:
                continue
            field = page.locator(selector)
            if await field.count() > 0:
                await field.click()
                await field.fill(value)
                fields_filled += 1
                await asyncio.sleep(0.3)

        if fields_filled > 0:
            yield {
                "step": "info_filled",
                "message": f"Filled {fields_filled} field(s). Review and place order manually.",
            }
        else:
            yield {
                "step": "login_required",
                "message": "Amazon requires sign-in before checkout. Cart is loaded — sign in to continue!",
            }

        # ── Done ──────────────────────────────────────────
        yield {
            "step": "done",
            "message": "Automation complete! The browser is open for you to review.",
            "product_title": product_title.strip() if product_title else product_name,
        }

        # Keep browser open for user to review / interact
        await asyncio.sleep(300)

    except Exception as e:
        yield {"step": "error", "message": f"Automation error: {str(e)}"}
    finally:
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
