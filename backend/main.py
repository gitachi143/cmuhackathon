"""
Cliq — AI Shopping Agent API

Slim entry point: creates the FastAPI app, adds middleware, and includes
all feature routers. Each feature lives in its own module under routers/.
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from tracking_service import update_activity, watchlist_tracking_loop, purchase_tracking_loop
from scraper import close_client as close_scraper_client
from storage import watchlist, purchase_history, update_watchlist_price
from routers import (
    search_router,
    purchases_router,
    profile_router,
    watchlist_router,
    coupons_router,
    spending_router,
    tracking_router,
)


# ── Background task management ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    wl_task = asyncio.create_task(
        watchlist_tracking_loop(
            get_watchlist=lambda: list(watchlist),
            update_watchlist_price=update_watchlist_price,
        )
    )
    pl_task = asyncio.create_task(
        purchase_tracking_loop(
            get_purchases=lambda: list(purchase_history),
        )
    )
    yield
    wl_task.cancel()
    pl_task.cancel()
    await close_scraper_client()


app = FastAPI(title="Cliq — AI Shopping Agent", version="2.0.0", lifespan=lifespan)

# CORS — allow frontend dev servers and Vercel production/preview deployments
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Allow all Vercel preview/production URLs for this project
VERCEL_URL = os.environ.get("VERCEL_URL")
if VERCEL_URL:
    ALLOWED_ORIGINS.append(f"https://{VERCEL_URL}")

VERCEL_PROJECT_PRODUCTION_URL = os.environ.get("VERCEL_PROJECT_PRODUCTION_URL")
if VERCEL_PROJECT_PRODUCTION_URL:
    ALLOWED_ORIGINS.append(f"https://{VERCEL_PROJECT_PRODUCTION_URL}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Activity tracking middleware ─────────────────────────
@app.middleware("http")
async def track_activity(request: Request, call_next):
    update_activity()
    response = await call_next(request)
    return response


# ── Register feature routers ────────────────────────────
app.include_router(search_router)
app.include_router(purchases_router)
app.include_router(profile_router)
app.include_router(watchlist_router)
app.include_router(coupons_router)
app.include_router(spending_router)
app.include_router(tracking_router)


@app.get("/")
async def root():
    return {
        "message": "Cliq AI Shopping Agent API",
        "version": "2.0.0",
        "endpoints": {
            "search": "POST /api/search",
            "purchase": "POST /api/purchase",
            "purchases": "GET /api/purchases",
            "profile": "GET|POST /api/profile",
            "watchlist": "GET|POST|DELETE /api/watchlist",
            "coupons": "GET /api/coupons/{product_id}",
            "spending": "GET /api/spending",
            "tracking_status": "GET /api/tracking/status",
            "tracking_heartbeat": "POST /api/tracking/heartbeat",
            "purchase_alerts": "GET /api/tracking/purchase-alerts",
        },
    }
