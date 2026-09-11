"""
accuracy_judge.py
─────────────────
M2.2 — Accuracy Judge Agent

Evaluates the factual correctness of an AI-generated response against either:
1. Provided reference answer / context
2. Source chunks retrieved from Reference Knowledge Base via RAG pipeline

Scoring Scale:
  80 - 100 : Correct — Response facts match reference material cleanly.
  50 - 79  : Partially Correct — Core statements match, but minor factual errors or omissions exist.
  20 - 49  : Incorrect — Factual inaccuracies or unverified claims dominate.
   0 - 19  : Contradictory — Direct contradictions with trusted reference evidence.
"""

import logging
from typing import List, Dict, Any, Optional

from services.claim_extractor import extract_claims
from services.rag_pipeline import RAGPipeline
from services.nlp_validator import compute_similarity
from services.hallucination_detector import detect_contradiction
from models.schemas import AccuracyEvaluationResult

logger = logging.getLogger(__name__)


def evaluate_accuracy(
    query: str,
    ai_response: str,
    reference_text: str = "",
    rag_pipeline: Optional[RAGPipeline] = None
) -> AccuracyEvaluationResult:
    """
    Evaluate factual accuracy of ai_response against reference or RAG pipeline.

    Args:
        query: User question
        ai_response: AI generated response
        reference_text: Optional reference text provided directly
        rag_pipeline: Optional active RAG pipeline instance

    Returns:
        AccuracyEvaluationResult object
    """
    if not ai_response or not ai_response.strip():
        return AccuracyEvaluationResult(
            accuracy_score=0,
            accuracy_label="Incorrect",
            reasoning="AI response was empty.",
            correct_claims_count=0,
            partially_correct_claims_count=0,
            incorrect_claims_count=0,
            contradictory_claims_count=0,
            supporting_evidence=[]
        )

    # If no RAG pipeline passed, instantiate temporary one
    created_rag = False
    if rag_pipeline is None:
        rag_pipeline = RAGPipeline(reference_text)
        created_rag = True

    try:
        # Extract factual claims
        raw_claims = extract_claims(ai_response)
        if not raw_claims:
            # Fallback if no claims extracted
            raw_claims = [{"id": 1, "text": ai_response.strip(), "type": "factual"}]

        correct_count = 0
        partially_correct_count = 0
        incorrect_count = 0
        contradictory_count = 0

        supporting_evidence: List[str] = []
        claim_scores: List[float] = []

        has_reference = bool((reference_text and reference_text.strip()) or rag_pipeline.reference_sentences)

        for claim in raw_claims:
            claim_text = claim["text"]
            sim_score, evidence = rag_pipeline.retrieve_evidence(claim_text)
            
            ref_context = rag_pipeline.reference_text or reference_text
            contra_res = detect_contradiction(claim_text, ref_context, sim_score)
            contra_score = contra_res["contradiction_score"]

            if evidence and evidence != "No reference context available." and evidence not in supporting_evidence:
                supporting_evidence.append(evidence)

            # Claim level accuracy classification
            if contra_score > 0.50:
                contradictory_count += 1
                claim_scores.append(0.0)
            elif sim_score >= 0.65:
                correct_count += 1
                claim_scores.append(1.0)
            elif sim_score >= 0.35:
                partially_correct_count += 1
                claim_scores.append(0.5)
            elif has_reference:
                incorrect_count += 1
                claim_scores.append(0.2)
            else:
                # No reference context provided to verify
                partially_correct_count += 1
                claim_scores.append(0.5)

        # Aggregate accuracy score (0-100)
        if claim_scores:
            avg_score = sum(claim_scores) / len(claim_scores)
            accuracy_score = int(round(avg_score * 100))
        else:
            accuracy_score = 50

        # Adjust score for contradictions
        if contradictory_count > 0:
            penalty = (contradictory_count / len(raw_claims)) * 40
            accuracy_score = int(max(0, accuracy_score - penalty))

        # Assign label
        if accuracy_score >= 80:
            accuracy_label = "Correct"
        elif accuracy_score >= 50:
            accuracy_label = "Partially Correct"
        elif accuracy_score >= 20:
            accuracy_label = "Incorrect"
        else:
            accuracy_label = "Contradictory"

        # Generate reasoning explanation
        total_claims = len(raw_claims)
        if not has_reference:
            reasoning = (
                f"No reference context or knowledge base documents were available for direct verification. "
                f"Analyzed {total_claims} factual claims. Accuracy score reflects default baseline ({accuracy_score}/100)."
            )
        else:
            reasoning = (
                f"Out of {total_claims} factual claim{'s' if total_claims!=1 else ''} evaluated: "
                f"{correct_count} fully correct, {partially_correct_count} partially correct, "
                f"{incorrect_count} unverified/incorrect, and {contradictory_count} contradictory. "
                f"Overall accuracy is classified as '{accuracy_label}' ({accuracy_score}/100)."
            )

        logger.info("Accuracy evaluation complete: score=%d label=%s", accuracy_score, accuracy_label)

        return AccuracyEvaluationResult(
            accuracy_score=accuracy_score,
            accuracy_label=accuracy_label,
            reasoning=reasoning,
            correct_claims_count=correct_count,
            partially_correct_claims_count=partially_correct_count,
            incorrect_claims_count=incorrect_count,
            contradictory_claims_count=contradictory_count,
            supporting_evidence=supporting_evidence[:5]
        )

    finally:
        if created_rag:
            rag_pipeline.cleanup()
