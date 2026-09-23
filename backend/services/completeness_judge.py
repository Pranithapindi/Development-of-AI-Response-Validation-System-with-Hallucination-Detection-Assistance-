"""
completeness_judge.py
──────────────────────
M3.1 — Completeness Judge Agent

Evaluates whether an AI-generated response sufficiently addresses all relevant aspects,
sub-questions, and expected information within the submitted question.

Scoring Scale:
  90 - 100 : Fully Complete — All requirements, sub-questions, and expected details are answered.
  70 - 89  : Substantially Complete — Core question is answered, minor sub-questions or details omitted.
  40 - 69  : Partially Complete — Addresses some aspects, but major sub-questions or explanations are missing.
   0 - 39  : Incomplete — Fails to address core aspects of the submitted question.
"""

import re
import logging
from typing import List, Dict, Any, Optional

from services.nlp_validator import compute_similarity
from services.rag_pipeline import RAGPipeline
from models.schemas import CompletenessEvaluationResult

logger = logging.getLogger(__name__)


def _extract_question_aspects(query: str) -> List[str]:
    """
    Deconstruct query into individual sub-questions, clauses, or key requirements.
    """
    if not query or not query.strip():
        return []

    # Split by question marks, 'and', 'also', 'as well as', 'by explaining', semicolons
    cleaned = re.sub(r"\s+", " ", query.strip())

    # Split on major sentence/clause breaks, commas, or question indicators
    raw_clauses = re.split(r"\?|\;|\,|\.\s+|\s+and\s+|\s+as well as\s+|\s+including\s+", cleaned, flags=re.IGNORECASE)

    aspects = []
    for clause in raw_clauses:
        clause_clean = clause.strip()
        if len(clause_clean) > 8:
            aspects.append(clause_clean)

    # Fallback if splitting produced nothing
    if not aspects:
        aspects = [query.strip()]

    return aspects


def evaluate_completeness(
    query: str,
    ai_response: str,
    reference_text: str = "",
    rag_pipeline: Optional[RAGPipeline] = None
) -> CompletenessEvaluationResult:
    """
    Evaluate completeness of ai_response against query requirements and reference/RAG evidence.

    Args:
        query: User prompt or multi-part question
        ai_response: Generated response to evaluate
        reference_text: Optional reference answer
        rag_pipeline: Optional active RAG pipeline

    Returns:
        CompletenessEvaluationResult object
    """
    if not query or not query.strip():
        return CompletenessEvaluationResult(
            completeness_score=100,
            completeness_label="Fully Complete",
            reasoning="No query provided to evaluate completeness against.",
            addressed_aspects=["Default"],
            partially_addressed_aspects=[],
            missing_aspects=[],
            expected_info_sources=["Default"]
        )

    if not ai_response or not ai_response.strip():
        return CompletenessEvaluationResult(
            completeness_score=0,
            completeness_label="Incomplete",
            reasoning="AI response is empty.",
            addressed_aspects=[],
            partially_addressed_aspects=[],
            missing_aspects=["Entire Question"],
            expected_info_sources=[]
        )

    clean_query = query.strip()
    clean_resp = ai_response.strip()

    # Step 1: Deconstruct question into sub-aspects/requirements
    aspects = _extract_question_aspects(clean_query)

    # Step 2: Determine expected info sources (Reference Answer vs RAG pipeline)
    expected_sources = []
    has_reference = bool(reference_text and reference_text.strip())

    created_rag = False
    if rag_pipeline is None:
        rag_pipeline = RAGPipeline(reference_text)
        created_rag = True

    try:
        if has_reference:
            expected_sources.append("Direct Reference Answer")
        elif rag_pipeline.reference_sentences:
            expected_sources.append("Reference Knowledge Base (RAG)")
        else:
            expected_sources.append("Query Intent Requirements")

        # Step 3: Assess coverage for each identified requirement/aspect
        addressed = []
        partially_addressed = []
        missing = []

        resp_lower = clean_resp.lower()

        for aspect in aspects:
            # Check direct semantic similarity between this aspect requirement and the response
            sim_score = compute_similarity(aspect, clean_resp)

            # Check if reference contains this aspect and if response covers what reference says
            ref_evidence = ""
            if has_reference or rag_pipeline:
                _, ref_evidence = rag_pipeline.retrieve_evidence(aspect)
                if ref_evidence and ref_evidence != "No reference context available.":
                    expected_sources.append(f"Evidence: {ref_evidence[:50]}...")

            # Keyword overlap fallback check for short sub-questions
            aspect_words = [w.lower() for w in re.sub(r"[^a-zA-Z0-9\s]", "", aspect).split() if len(w) > 3]
            kw_match_count = sum(1 for w in aspect_words if w in resp_lower)
            kw_ratio = kw_match_count / max(1, len(aspect_words))

            # Composite coverage score for this specific requirement
            combined_aspect_score = max(sim_score, kw_ratio * 0.8)

            if combined_aspect_score >= 0.55 or (kw_ratio >= 0.6 and len(aspect_words) > 0):
                addressed.append(aspect)
            elif combined_aspect_score >= 0.30 or kw_ratio > 0.3:
                partially_addressed.append(aspect)
            else:
                missing.append(aspect)

        # Step 4: Calculate overall completeness score (0-100)
        total_aspects = len(aspects)
        if total_aspects > 0:
            weighted_coverage = len(addressed) + (0.5 * len(partially_addressed))
            raw_score = (weighted_coverage / total_aspects) * 100
        else:
            raw_score = 100.0

        completeness_score = int(max(0, min(100, round(raw_score))))

        # Step 5: Assign Label & Detailed Reasoning
        if completeness_score >= 90:
            completeness_label = "Fully Complete"
            reasoning = (
                f"The AI response thoroughly addresses all {total_aspects} sub-questions and requirements "
                f"contained in the prompt. No significant omissions were detected."
            )
        elif completeness_score >= 70:
            completeness_label = "Substantially Complete"
            reasoning = (
                f"The response addresses the core question and most key requirements ({len(addressed)}/{total_aspects} fully covered). "
                f"However, minor details or sub-questions regarding '{missing[0] if missing else partially_addressed[0] if partially_addressed else 'secondary details'}' were omitted."
            )
        elif completeness_score >= 40:
            completeness_label = "Partially Complete"
            missing_str = ", ".join([f"'{m}'" for m in missing[:2]])
            reasoning = (
                f"The response only partially answers the prompt. It addresses some aspects ({len(addressed)} covered), "
                f"but fails to cover key requirements: {missing_str if missing_str else 'several expected details'}."
            )
        else:
            completeness_label = "Incomplete"
            reasoning = (
                f"The response is substantially incomplete. Out of {total_aspects} requirement(s), "
                f"it missed or failed to adequately answer {len(missing)} aspect(s)."
            )

        logger.info("Completeness evaluation complete: score=%d label=%s", completeness_score, completeness_label)

        # Unique expected sources
        unique_sources = []
        for src in expected_sources:
            if src not in unique_sources:
                unique_sources.append(src)

        return CompletenessEvaluationResult(
            completeness_score=completeness_score,
            completeness_label=completeness_label,
            reasoning=reasoning,
            addressed_aspects=addressed,
            partially_addressed_aspects=partially_addressed,
            missing_aspects=missing,
            expected_info_sources=unique_sources[:5]
        )

    finally:
        if created_rag:
            rag_pipeline.cleanup()
