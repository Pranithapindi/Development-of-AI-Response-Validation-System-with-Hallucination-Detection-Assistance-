"""
api/index.py
─────────────
Vercel serverless entry point for the FastAPI backend.

Mangum wraps the ASGI FastAPI app into an AWS Lambda / Vercel handler.
All /api/* routes are forwarded here by vercel.json rewrites.
"""

import sys
import os

# Make sure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from backend.main import app  # noqa: E402
from mangum import Mangum

handler = Mangum(app, lifespan="off")
