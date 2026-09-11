"""
analytics.py (router)
─────────────────────
FastAPI router for aggregated analytics data.

Endpoint:
  GET /api/analytics → Returns charts data: reliability distribution,
                        claim distribution, hallucination trends
"""

import logging
from fastapi import APIRouter, HTTPException
from database.db import get_analytics_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("")
async def get_analytics():
    """
    Aggregate all stored validation records and compute analytics metrics.

    Returns data for:
      - Reliability distribution (Factual / Partially Hallucinated / Hallucinated)
      - Claim classification breakdown
      - Hallucination trend over analyses
      - System-level metrics
    """
    try:
        data    = get_analytics_data()
        records = data.get("records", [])

        if not records:
            return _empty_analytics()

        # ── Aggregate counts ───────────────────────────────────────────────────
        total_analyses    = len(records)
        total_claims      = sum(
            len(r.get("claims", [])) or r.get("claims_count", 0)
            for r in records
        )
        total_halluc      = sum(r.get("stats", {}).get("contradictory", 0) for r in records)
        avg_reliability   = round(
            sum(r.get("overall_score", 0) for r in records) / total_analyses, 1
        )

        # ── Reliability distribution ───────────────────────────────────────────
        rel_dist = {"Factual": 0, "Partially Hallucinated": 0, "Hallucinated": 0}
        for r in records:
            label = r.get("label", "")
            if label in rel_dist:
                rel_dist[label] += 1

        # ── Claim classification ───────────────────────────────────────────────
        claim_dist = {"Supported": 0, "Unsupported": 0, "Contradictory": 0, "Uncertain": 0}
        for r in records:
            s = r.get("stats", {})
            claim_dist["Supported"]    += s.get("supported", 0)
            claim_dist["Unsupported"]  += s.get("unsupported", 0)
            claim_dist["Contradictory"] += s.get("contradictory", 0)
            claim_dist["Uncertain"]    += s.get("uncertain", 0)

        # ── Hallucination trend (last 10 analyses) ─────────────────────────────
        trend_records = sorted(records, key=lambda r: r.get("timestamp",""))[-10:]
        trend = [
            {
                "label":              f"#{i+1}",
                "reliability_score":  r.get("overall_score", 0),
                "hallucination_rate": r.get("stats", {}).get("hallucination_risk", 0),
            }
            for i, r in enumerate(trend_records)
        ]

        return {
            "total_analyses":          total_analyses,
            "total_claims":            total_claims,
            "total_hallucinations":    total_halluc,
            "avg_reliability":         avg_reliability,
            "reliability_distribution": rel_dist,
            "claim_distribution":      claim_dist,
            "recent_trend":            trend,
        }

    except Exception as e:
        logger.exception("Analytics computation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


def _empty_analytics():
    """Return empty analytics with seed data for display when no history exists."""
    return {
        "total_analyses":   0,
        "total_claims":     0,
        "total_hallucinations": 0,
        "avg_reliability":  0,
        "reliability_distribution": {"Factual": 0, "Partially Hallucinated": 0, "Hallucinated": 0},
        "claim_distribution": {"Supported": 0, "Unsupported": 0, "Contradictory": 0, "Uncertain": 0},
        "recent_trend": [],
    }
