"""
validate.py (router)
────────────────────
FastAPI router for validation endpoints.

Endpoints:
  POST /api/validate          → Run full validation pipeline
  GET  /api/validate/pdf/{id} → Download PDF report
"""

import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import Response

from models.schemas       import (
    ValidationRequest, ValidationResponse,
    RelevanceEvaluationResult, AccuracyEvaluationResult,
    HallucinationEvaluationResult, CompletenessEvaluationResult,
    VerdictEvaluationResult, BenchmarkSummary
)
from services.validation_engine import run_validation
from services.relevance_judge   import evaluate_relevance
from services.accuracy_judge    import evaluate_accuracy
from services.hallucination_judge import evaluate_hallucinations
from services.completeness_judge import evaluate_completeness
from services.verdict_judge import evaluate_verdict
from services.benchmark_runner  import run_benchmark_suite
from services.pdf_generator     import generate_pdf_report
from database.db          import save_validation, get_validation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/validate", tags=["Validation"])


@router.post("", response_model=ValidationResponse)
async def validate_response(request: ValidationRequest):
    """
    Run the complete hallucination detection pipeline on the given AI response.
    """
    if not request.ai_response or not request.ai_response.strip():
        raise HTTPException(status_code=400, detail="ai_response cannot be empty")

    try:
        # Run the full pipeline
        result = run_validation(
            query=request.query,
            ai_response=request.ai_response,
            reference=request.reference or "",
        )

        # Persist to database
        save_validation(result)

        return result

    except Exception as e:
        logger.exception("Validation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@router.post("/relevance", response_model=RelevanceEvaluationResult)
async def evaluate_relevance_endpoint(request: ValidationRequest):
    """
    Run the Relevance Judge Agent (M2.1) on query & AI response.
    """
    try:
        return evaluate_relevance(request.query, request.ai_response)
    except Exception as e:
        logger.exception("Relevance evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Relevance evaluation error: {str(e)}")


@router.post("/accuracy", response_model=AccuracyEvaluationResult)
async def evaluate_accuracy_endpoint(request: ValidationRequest):
    """
    Run the Accuracy Judge Agent (M2.2) on query, AI response & reference.
    """
    try:
        return evaluate_accuracy(request.query, request.ai_response, request.reference or "")
    except Exception as e:
        logger.exception("Accuracy evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Accuracy evaluation error: {str(e)}")


@router.post("/hallucination", response_model=HallucinationEvaluationResult)
async def evaluate_hallucination_endpoint(request: ValidationRequest):
    """
    Run the Hallucination Detection Agent (M2.3) on AI response & reference.
    """
    try:
        return evaluate_hallucinations(request.ai_response, request.reference or "")
    except Exception as e:
        logger.exception("Hallucination evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Hallucination evaluation error: {str(e)}")


@router.post("/completeness", response_model=CompletenessEvaluationResult)
async def evaluate_completeness_endpoint(request: ValidationRequest):
    """
    Run the Completeness Judge Agent (M3.1) on query, AI response & reference.
    """
    try:
        return evaluate_completeness(request.query, request.ai_response, request.reference or "")
    except Exception as e:
        logger.exception("Completeness evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Completeness evaluation error: {str(e)}")


@router.post("/verdict", response_model=VerdictEvaluationResult)
async def evaluate_verdict_endpoint(request: ValidationRequest):
    """
    Run the Verdict Agent (M3.2) to calculate overall verdict across all 4 dimensions.
    """
    try:
        rel = evaluate_relevance(request.query, request.ai_response)
        acc = evaluate_accuracy(request.query, request.ai_response, request.reference or "")
        hall = evaluate_hallucinations(request.ai_response, request.reference or "")
        comp = evaluate_completeness(request.query, request.ai_response, request.reference or "")
        return evaluate_verdict(rel, acc, hall, comp)
    except Exception as e:
        logger.exception("Verdict evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Verdict evaluation error: {str(e)}")


@router.post("/benchmark", response_model=BenchmarkSummary)
async def run_benchmark_endpoint():
    """
    Run the M2.4 Agent Consistency Validation Suite on benchmark datasets (TruthfulQA, SQuAD, etc.).
    """
    try:
        return run_benchmark_suite()
    except Exception as e:
        logger.exception("Benchmark suite execution failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Benchmark execution error: {str(e)}")


@router.get("/pdf/{record_id}")
async def download_pdf_report(record_id: str):
    """
    Generate and download a PDF validation report for a given record ID.
    """
    # Retrieve from DB
    record = get_validation(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Validation record not found")

    try:
        pdf_bytes = generate_pdf_report(record)
    except Exception as e:
        logger.exception("PDF generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="validation-{record_id[:8]}.pdf"'
        },
    )

