"""
Vercel serverless function entry point.

Wraps the FastAPI app from backend/ so Vercel can serve it
as a single catch-all Python serverless function at /api/*.
"""

import sys
import os

# Add the backend directory to the Python path so all imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app  # noqa: E402
