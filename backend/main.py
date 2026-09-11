"""
main.py
───────
FastAPI application entry point.

Architecture:
  User (Browser) → React.js → Axios → FastAPI (this file)
                                              ↓
                             SentenceTransformers + ChromaDB + LangChain
                                              ↓
                             MongoDB / SQLite → Results → PDF Export
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Add backend root to path so imports work
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Startup / Shutdown lifecycle ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler:
      - On startup: initialise DB, load NLP model
      - On shutdown: cleanup
    """
    logger.info("=" * 60)
    logger.info("  AI Response Validation System v2.0 — Starting up")
    logger.info("=" * 60)

    # Initialise database
    from database.db import init_db
    db_type = init_db()
    app.state.db_type = db_type
    logger.info("Database: %s", db_type)

    # Load SentenceTransformer model (downloads ~80MB on first run)
    from services.nlp_validator import load_model, is_model_loaded
    logger.info("Loading NLP model (SentenceTransformers)...")
    model = load_model()
    app.state.model_loaded = is_model_loaded()

    if app.state.model_loaded:
        logger.info("NLP model ready ✅")
    else:
        logger.warning("NLP model failed to load — validation will use fallback")

    logger.info("Backend ready at http://localhost:%s", os.getenv("PORT", "8000"))
    logger.info("=" * 60)

    yield  # Application runs here

    logger.info("Shutting down...")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Response Validation System",
    description=(
        "Detect hallucinations, validate claims, and improve trust in AI-generated content. "
        "Powered by SentenceTransformers, ChromaDB (Vector DB), LangChain (RAG), "
        "and MongoDB/SQLite for storage."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS — allow React dev server ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers.validate  import router as validate_router
from routers.history   import router as history_router
from routers.analytics import router as analytics_router

app.include_router(validate_router)
app.include_router(history_router)
app.include_router(analytics_router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Returns backend status, model loading state, and database type."""
    from services.nlp_validator import is_model_loaded
    return {
        "status":       "ok",
        "model_loaded": is_model_loaded(),
        "database":     getattr(app.state, "db_type", "unknown"),
        "version":      "2.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AI Response Validation System API v2.0",
        "docs":    "/docs",
        "health":  "/api/health",
    }


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info",
    )
