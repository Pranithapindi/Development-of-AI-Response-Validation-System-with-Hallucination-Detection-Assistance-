"""
batch.py (router)
─────────────────
FastAPI router for Batch Evaluation endpoints.

Endpoints:
  POST /api/batch/upload     → Upload CSV and execute batch evaluation
  GET  /api/batch/sample-csv → Download sample CSV template
"""

import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response

from models.schemas import BatchSummaryResult
from services.batch_evaluator import process_batch_evaluation, generate_sample_csv

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/batch", tags=["Batch Evaluation"])


@router.post("/upload", response_model=BatchSummaryResult)
async def upload_batch_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file containing question-answer pairs for batch evaluation.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .csv file.")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        summary = process_batch_evaluation(content)
        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Batch CSV evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Batch evaluation error: {str(e)}")


@router.get("/sample-csv")
async def download_sample_csv():
    """
    Download a template CSV file for batch evaluation.
    """
    csv_str = generate_sample_csv()
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="sample_batch_evaluation.csv"'}
    )
