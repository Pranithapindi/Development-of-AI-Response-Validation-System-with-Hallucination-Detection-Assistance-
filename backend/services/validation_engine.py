"""
validation_engine.py
────────────────────
Master orchestrator for the hallucination detection pipeline.

Full pipeline:
  Input
    → Claim Extraction        (NLTK)
    → RAG Retrieval           (LangChain + ChromaDB)
    → Semantic Similarity     (SentenceTransformers)
    → Contradiction Detection (negation + topic mismatch)
    → Confidence Scoring      (weighted formula)
    → Hallucination Classification
    → Validation Report

This is the "AI Evaluation Agent Layer" in the architecture diagram.
"""

import uuid
import time
import logging
from datetime import datetime, timezone

from services.claim_extractor      import extract_claims
from services.rag_pipeline         import RAGPipeline
from services.hallucination_detector import detect_contradiction
from services.confidence_scorer    import (
    score_confidence,
    classify_status,
    generate_explanation,
    compute_overall_score,
    get_label,
    generate_summary,
)
from services.relevance_judge      import evaluate_relevance
from services.accuracy_judge       import evaluate_accuracy
from services.hallucination_judge  import evaluate_hallucinations

logger = logging.getLogger(__name__)


def _process_claim(claim: dict, rag: RAGPipeline, has_reference: bool) -> dict:
    """
    Run the full validation pipeline for a single claim.

    Steps:
      1. RAG retrieval → best evidence + similarity score
      2. Contradiction detection
      3. Confidence scoring
      4. Status classification
      5. Explanation generation

    Returns enriched claim dict.
    """
    claim_text = claim["text"]

    # Step 1 — RAG evidence retrieval
    similarity_score, evidence = rag.retrieve_evidence(claim_text)

    # Step 2 — Contradiction detection
    ref_text = rag.reference_text or ""
    contradiction_result = detect_contradiction(claim_text, ref_text, similarity_score)
    contradiction_score  = contradiction_result["contradiction_score"]

    # Step 3 — Confidence scoring
    conf_result = score_confidence(similarity_score, contradiction_score, has_reference)

    # Step 4 — Classification
    status = classify_status(similarity_score, contradiction_score, has_reference)

    # Step 5 — Explanation
    explanation = generate_explanation(status, conf_result["pct"], has_reference)

    return {
        **claim,
        "status":              status,
        "confidence_pct":      conf_result["pct"],
        "similarity_score":    round(similarity_score, 3),
        "contradiction_score": round(contradiction_score, 3),
        "evidence":            evidence,
        "explanation":         explanation,
    }


def run_validation(query: str, ai_response: str, reference: str = "") -> dict:
    """
    Execute the complete validation pipeline with Judge Agents.

    Args:
        query:       The original user question
        ai_response: The AI-generated response to validate
        reference:   Optional trusted reference / context text

    Returns:
        Full validation report dict compatible with ValidationResponse schema
    """
    start_time   = time.time()
    record_id    = str(uuid.uuid4())
    has_reference = bool(reference and reference.strip())

    logger.info("Starting validation [id=%s] — has_reference=%s", record_id, has_reference)

    # ── Step 1: Extract claims ────────────────────────────────────────────────
    raw_claims = extract_claims(ai_response)
    logger.info("Extracted %d claims", len(raw_claims))

    # ── Step 2: Build RAG pipeline ───────────────────────────────────────────
    rag = RAGPipeline(reference)

    # ── Step 3: Judge Agent Evaluations ──────────────────────────────────────
    relevance_eval = evaluate_relevance(query, ai_response)
    accuracy_eval = evaluate_accuracy(query, ai_response, reference, rag)
    hallucination_eval = evaluate_hallucinations(ai_response, reference, rag)

    # ── Step 4: Process each claim ───────────────────────────────────────────
    results = []
    for claim in raw_claims:
        try:
            processed = _process_claim(claim, rag, has_reference)
            results.append(processed)
        except Exception as e:
            logger.error("Error processing claim %d: %s", claim["id"], e)
            # Include claim with default values on error
            results.append({
                **claim,
                "status":              "unsupported",
                "confidence_pct":      30,
                "similarity_score":    0.0,
                "contradiction_score": 0.0,
                "evidence":            "Processing error occurred.",
                "explanation":         "An error occurred while processing this claim.",
            })

    # ── Step 5: Cleanup resources ────────────────────────────────────────────
    rag.cleanup()

    # ── Step 6: Aggregate results ────────────────────────────────────────────
    overall_score  = compute_overall_score(results)
    label          = get_label(overall_score)
    summary        = generate_summary(results, overall_score)

    supported     = sum(1 for r in results if r["status"] == "supported")
    unsupported   = sum(1 for r in results if r["status"] == "unsupported")
    contradictory = sum(1 for r in results if r["status"] == "contradictory")
    uncertain     = sum(1 for r in results if r["status"] == "uncertain")
    hallucination_risk = hallucination_eval.hallucination_score

    elapsed_ms = round((time.time() - start_time) * 1000)

    report = {
        "id":            record_id,
        "query":         query,
        "ai_response":   ai_response,
        "reference":     reference,
        "claims":        results,
        "overall_score": overall_score,
        "summary":       summary,
        "label":         label,
        "stats": {
            "supported":         supported,
            "unsupported":       unsupported,
            "contradictory":     contradictory,
            "uncertain":         uncertain,
            "hallucination_risk": hallucination_risk,
        },
        "timestamp":          datetime.now(timezone.utc).isoformat(),
        "processing_time_ms": elapsed_ms,
        "relevance_eval":     relevance_eval.dict(),
        "accuracy_eval":      accuracy_eval.dict(),
        "hallucination_eval": hallucination_eval.dict(),
    }

    logger.info(
        "Validation complete [id=%s] score=%d label=%s elapsed=%dms",
        record_id, overall_score, label, elapsed_ms
    )

    return report

