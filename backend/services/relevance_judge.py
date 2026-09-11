"""
relevance_judge.py
──────────────────
M2.1 — Relevance Judge Agent

Evaluates whether an AI-generated response directly and appropriately addresses
the submitted question.

Scoring Scale:
  80 - 100 : Fully Relevant — Directly and fully addresses the query prompt.
  50 - 79  : Partially Relevant — Addresses key parts of the question, but incomplete or contains excessive fluff.
  20 - 49  : Unrelated — Addresses a different topic or fails to address the main question.
   0 - 19  : Off-topic — Complete topic mismatch, generic refusal, or gibberish.
"""

import re
import logging
from typing import Dict, List, Any

from services.nlp_validator import compute_similarity
from models.schemas import RelevanceEvaluationResult

logger = logging.getLogger(__name__)

# Refusal and generic non-answer phrases
REFUSAL_PHRASES = [
    "i cannot answer", "i am an ai", "as an ai language model",
    "i don't know", "i do not know", "i am not sure", "no information available",
    "i'm sorry, but", "i cannot fulfill", "insufficient context"
]

# Question indicator words
QUESTION_INTENTS = {
    "what": "Factual Definition / Explanation",
    "who": "Person / Entity Identification",
    "when": "Time / Date Identification",
    "where": "Location / Place Identification",
    "why": "Reason / Cause Explanation",
    "how": "Method / Procedure Explanation",
    "which": "Selection / Option Identification",
    "is": "Yes/No Verification",
    "are": "Yes/No Verification",
    "can": "Capability / Feasibility",
    "list": "Enumeration",
    "compare": "Comparison Analysis"
}

STOP_WORDS = {
    "the", "a", "an", "is", "was", "were", "are", "be", "been",
    "have", "has", "had", "do", "does", "did", "to", "of", "in",
    "on", "at", "for", "with", "by", "from", "as", "that", "this",
    "and", "but", "or", "it", "he", "she", "they", "we", "i", "you",
    "what", "where", "when", "who", "why", "how", "which"
}


def _extract_query_keywords(query: str) -> List[str]:
    """Extract meaningful terms from question."""
    words = re.sub(r"[^a-zA-Z0-9\s]", " ", query.lower()).split()
    return [w for w in words if len(w) > 2 and w not in STOP_WORDS]


def _detect_query_intent(query: str) -> str:
    """Identify intent type from query lead words."""
    first_word = query.strip().split()[0].lower() if query.strip() else ""
    first_word_clean = re.sub(r"[^a-zA-Z]", "", first_word)
    return QUESTION_INTENTS.get(first_word_clean, "General Information Request")


def evaluate_relevance(query: str, ai_response: str) -> RelevanceEvaluationResult:
    """
    Evaluate relevance of ai_response to query.

    Args:
        query: The user prompt / question
        ai_response: The generated response to evaluate

    Returns:
        RelevanceEvaluationResult object
    """
    if not query or not query.strip():
        return RelevanceEvaluationResult(
            relevance_score=100,
            relevance_label="Fully Relevant",
            reasoning="No query provided; evaluation defaulted to relevant.",
            key_aspects_covered=["Default"],
            missing_aspects=[],
            query_intent="Unspecified"
        )

    if not ai_response or not ai_response.strip():
        return RelevanceEvaluationResult(
            relevance_score=0,
            relevance_label="Off-topic",
            reasoning="Response is empty or whitespace.",
            key_aspects_covered=[],
            missing_aspects=["Entire Question"],
            query_intent=_detect_query_intent(query)
        )

    clean_query = query.strip()
    clean_resp = ai_response.strip()
    query_intent = _detect_query_intent(clean_query)
    query_keywords = _extract_query_keywords(clean_query)

    # Step 1: Semantic Embedding Similarity between Question & Response
    semantic_score = compute_similarity(clean_query, clean_resp)

    # Step 2: Check Refusal / Non-answer
    resp_lower = clean_resp.lower()
    is_refusal = any(phrase in resp_lower for phrase in REFUSAL_PHRASES)

    # Step 3: Aspect / Keyword Coverage
    covered_aspects = []
    missing_aspects = []
    
    if query_keywords:
        for kw in query_keywords:
            if kw in resp_lower:
                covered_aspects.append(kw)
            else:
                missing_aspects.append(kw)
        coverage_ratio = len(covered_aspects) / len(query_keywords)
    else:
        coverage_ratio = 1.0

    # Step 4: Composite Relevance Score Calculation (0-100)
    if is_refusal:
        raw_score = 15
    else:
        # 60% semantic similarity + 40% keyword coverage
        raw_score = (semantic_score * 60) + (coverage_ratio * 40)

    score = int(max(0, min(100, round(raw_score))))

    # Step 5: Assign Relevance Label & Detailed Reasoning
    if is_refusal:
        label = "Off-topic"
        reasoning = (
            f"The response appears to be a generic refusal or disclaimer rather than "
            f"answering the intent '{query_intent}'. (Relevance score: {score}/100)"
        )
    elif score >= 80:
        label = "Fully Relevant"
        reasoning = (
            f"The response directly and thoroughly addresses the question intent "
            f"({query_intent}). Key question terms ({', '.join(covered_aspects[:4]) if covered_aspects else 'all key terms'}) "
            f"are prominently addressed with high semantic alignment ({int(semantic_score*100)}%)."
        )
    elif score >= 50:
        label = "Partially Relevant"
        reasoning = (
            f"The response is partially relevant to the question intent ({query_intent}). "
            f"It addresses aspects like {', '.join(covered_aspects[:3]) if covered_aspects else 'some topics'}, "
            f"but misses specific details regarding {', '.join(missing_aspects[:3]) if missing_aspects else 'other aspects'}."
        )
    elif score >= 20:
        label = "Unrelated"
        reasoning = (
            f"The response is mostly unrelated to the question asked ({clean_query[:50]}...). "
            f"Semantic similarity is low ({int(semantic_score*100)}%) and key question topics were not directly answered."
        )
    else:
        label = "Off-topic"
        reasoning = (
            f"The response is completely off-topic or fails to engage with the question intent ({query_intent}). "
            f"No meaningful query keywords were covered."
        )

    logger.info("Relevance evaluation complete: score=%d label=%s", score, label)

    return RelevanceEvaluationResult(
        relevance_score=score,
        relevance_label=label,
        reasoning=reasoning,
        key_aspects_covered=covered_aspects,
        missing_aspects=missing_aspects,
        query_intent=query_intent
    )
