"""
history.py (router)
───────────────────
FastAPI router for validation history endpoints.

Endpoints:
  GET    /api/history       → List all validation records
  GET    /api/history/{id}  → Get a single record
  DELETE /api/history/{id}  → Delete a record
  DELETE /api/history       → Clear all records
"""

import logging
from fastapi import APIRouter, HTTPException
from database.db import get_all_history, get_validation, delete_validation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("")
async def list_history():
    """Return all validation history records, newest first."""
    try:
        records = get_all_history()
        # Return lightweight summary records (no full claims list for performance)
        summary = []
        for r in records:
            summary.append({
                "id":           r.get("id"),
                "timestamp":    r.get("timestamp"),
                "query":        r.get("query",""),
                "claims_count": len(r.get("claims", [])) or r.get("claims_count", 0),
                "overall_score":r.get("overall_score", 0),
                "label":        r.get("label", "Unknown"),
                "stats":        r.get("stats", {}),
                "summary":      r.get("summary",""),
            })
        return {"records": summary, "total": len(summary)}
    except Exception as e:
        logger.exception("Failed to list history: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{record_id}")
async def get_history_record(record_id: str):
    """Return the full validation record including all claims."""
    record = get_validation(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.delete("/{record_id}")
async def delete_history_record(record_id: str):
    """Delete a single validation record."""
    success = delete_validation(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True, "id": record_id}


@router.delete("")
async def clear_all_history():
    """Clear all validation history."""
    try:
        records = get_all_history()
        for r in records:
            delete_validation(r.get("id") or r.get("timestamp",""))
        return {"deleted": True, "count": len(records)}
    except Exception as e:
        logger.exception("Failed to clear history: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
