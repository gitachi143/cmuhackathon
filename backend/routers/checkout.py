"""
/api/auto-checkout — SSE endpoint that drives the Playwright Amazon checkout
and streams live status updates to the frontend.
"""

import json
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from automation_service import run_amazon_checkout

router = APIRouter(prefix="/api", tags=["checkout"])


class AutoCheckoutRequest(BaseModel):
    product_name: str
    personal_info: dict  # {name, email}
    shipping_address: dict  # {address_line, city, state, zip}


# Track active automation so we don't spawn duplicates
_active_task: Optional[asyncio.Task] = None
_status_queue: Optional[asyncio.Queue] = None


@router.post("/auto-checkout")
async def auto_checkout(req: AutoCheckoutRequest):
    """
    Starts the Amazon automation and returns an SSE stream of status updates.
    """
    global _active_task, _status_queue

    # Cancel any previous run
    if _active_task and not _active_task.done():
        _active_task.cancel()
        await asyncio.sleep(0.5)

    _status_queue = asyncio.Queue()

    async def _run():
        try:
            async for status in run_amazon_checkout(
                product_name=req.product_name,
                personal_info=req.personal_info,
                shipping_address=req.shipping_address,
            ):
                await _status_queue.put(status)
        except asyncio.CancelledError:
            await _status_queue.put({"step": "cancelled", "message": "Automation cancelled."})
        except Exception as e:
            await _status_queue.put({"step": "error", "message": str(e)})
        finally:
            await _status_queue.put(None)  # Sentinel

    _active_task = asyncio.create_task(_run())

    async def event_stream():
        while True:
            item = await _status_queue.get()
            if item is None:
                # Send final event
                yield f"data: {json.dumps({'step': 'stream_end', 'message': 'Stream ended'})}\n\n"
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/auto-checkout/cancel")
async def cancel_checkout():
    """Cancel a running automation."""
    global _active_task
    if _active_task and not _active_task.done():
        _active_task.cancel()
        return {"status": "cancelled"}
    return {"status": "no_active_task"}
