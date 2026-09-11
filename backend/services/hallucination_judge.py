"""
hallucination_judge.py
──────────────────────
M2.3 — Hallucination Detection Agent

Identifies unsupported, fabricated, or contradicted claims in an AI response
by cross-referencing individual claims against retrieved source content.

Key Functions:
  - Deconstructs response into individual factual claims
  - Cross-references claims against RAG evidence chunks
  - Flags specific statement level hallucinations with explanations
  - Outputs structured hallucination status and evidence
"""

import logging
from typing import List, Dict, Any, Optional

from services.claim_extractor import extract_claims
from services.rag_pipeline import RAGPipeline
from services.nlp_validator import compute_similarity
from services.hallucination_detector import detect_contradiction
from models.schemas import HallucinationEvaluationResult, HallucinatedClaim

logger = logging.getLogger(__name__)


def evaluate_hallucinations(
    ai_response: str,
    reference_text: str = "",
    rag_pipeline: Optional[RAGPipeline] = None
) -> HallucinationEvaluationResult:
    """
    Evaluate hallucination risks in ai_response.

    Args:
        ai_response: AI response text to evaluate
        reference_text: Optional reference context text
        rag_pipeline: Optional RAGPipeline instance

    Returns:
        HallucinationEvaluationResult object
    """
    if not ai_response or not ai_response.strip():
        return HallucinationEvaluationResult(
            is_hallucinated=False,
            hallucination_score=0,
            hallucination_label="No Hallucination",
            total_claims_analyzed=0,
            flagged_claims_count=0,
            flagged_claims=[],
            supporting_evidence=[],
            reasoning="Empty AI response provided."
        )

    created_rag = False
    if rag_pipeline is None:
        rag_pipeline = RAGPipeline(reference_text)
        created_rag = True

    try:
        raw_claims = extract_claims(ai_response)
        if not raw_claims:
            raw_claims = [{"id": 1, "text": ai_response.strip(), "type": "factual"}]

        flagged_claims: List[HallucinatedClaim] = []
        supporting_evidence: List[str] = []
        ref_context = rag_pipeline.reference_text or reference_text
        has_reference = bool(ref_context and ref_context.strip())

        total_claims = len(raw_claims)
        contradictory_count = 0
        unsupported_count = 0

        for claim in raw_claims:
            claim_id = claim["id"]
            claim_text = claim["text"]

            sim_score, evidence = rag_pipeline.retrieve_evidence(claim_text)
            contra_res = detect_contradiction(claim_text, ref_context, sim_score)
            contra_score = contra_res["contradiction_score"]

            if evidence and evidence != "No reference context available." and evidence not in supporting_evidence:
                supporting_evidence.append(evidence)

            # Determine hallucination issue type per claim
            if contra_score > 0.50:
                contradictory_count += 1
                flagged_claims.append(
                    HallucinatedClaim(
                        claim_id=claim_id,
                        claim_text=claim_text,
                        issue_type="contradictory",
                        explanation=(
                            f"Claim directly contradicts trusted reference context (contradiction score: {int(contra_score*100)}%). "
                            f"Negation or entity conflict detected."
                        ),
                        conflicting_evidence=evidence if evidence != "No reference context available." else None
                    )
                )
            elif has_reference and sim_score < 0.30:
                unsupported_count += 1
                flagged_claims.append(
                    HallucinatedClaim(
                        claim_id=claim_id,
                        claim_text=claim_text,
                        issue_type="unsupported",
                        explanation=(
                            f"Claim is unsupported by available reference sources (semantic similarity: {int(sim_score*100)}%). "
                            f"No matching evidence found."
                        ),
                        conflicting_evidence=None
                    )
                )
            elif not has_reference:
                # Without reference context, unverified claims are flagged as potentially unsupported
                unsupported_count += 1
                flagged_claims.append(
                    HallucinatedClaim(
                        claim_id=claim_id,
                        claim_text=claim_text,
                        issue_type="unsupported",
                        explanation="No reference context provided to verify claim validity.",
                        conflicting_evidence=None
                    )
                )

        flagged_count = len(flagged_claims)
        
        # Calculate Hallucination Risk Score (0-100%)
        # Contradictions contribute 100% weight, unsupported 50% weight
        if total_claims > 0:
            weighted_flagged = (contradictory_count * 1.0) + (unsupported_count * 0.5)
            hallucination_score = int(min(100, round((weighted_flagged / total_claims) * 100)))
        else:
            hallucination_score = 0

        is_hallucinated = flagged_count > 0

        if hallucination_score >= 50 or contradictory_count > 0:
            hallucination_label = "Severe Hallucination"
        elif hallucination_score > 0:
            hallucination_label = "Minor Hallucination"
        else:
            hallucination_label = "No Hallucination"

        # Generate summary reasoning
        if not is_hallucinated:
            reasoning = (
                f"All {total_claims} factual claim{'s' if total_claims!=1 else ''} in the AI response "
                f"were verified against reference sources with high confidence. No hallucinations detected."
            )
        else:
            reasoning = (
                f"Detected {flagged_count} potential hallucination(s) out of {total_claims} claim(s). "
                f"({contradictory_count} contradictory, {unsupported_count} unsupported). "
                f"Overall hallucination risk level is classified as '{hallucination_label}' ({hallucination_score}% risk)."
            )

        logger.info(
            "Hallucination evaluation complete: is_hallucinated=%s score=%d label=%s flagged=%d",
            is_hallucinated, hallucination_score, hallucination_label, flagged_count
        )

        return HallucinationEvaluationResult(
            is_hallucinated=is_hallucinated,
            hallucination_score=hallucination_score,
            hallucination_label=hallucination_label,
            total_claims_analyzed=total_claims,
            flagged_claims_count=flagged_count,
            flagged_claims=flagged_claims,
            supporting_evidence=supporting_evidence[:5],
            reasoning=reasoning
        )

    finally:
        if created_rag:
            rag_pipeline.cleanup()
