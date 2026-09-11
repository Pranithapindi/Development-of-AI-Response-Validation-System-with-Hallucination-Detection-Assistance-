"""
confidence_scorer.py
────────────────────
Computes confidence scores and classifies claim hallucination status.

Formula (weighted composite):
   Confidence = semantic_similarity   × 0.50
              + evidence_availability × 0.30
              + consistency_score     × 0.20

Classification thresholds (matching architecture flowchart labels):
   contradictory  → "Hallucinated"
   unsupported    → "Partially Hallucinated"
   uncertain      → "Partially Hallucinated"
   supported      → "Factual"
"""

import logging

logger = logging.getLogger(__name__)


def score_confidence(
    similarity_score: float,
    contradiction_score: float,
    has_reference: bool,
) -> dict:
    """
    Compute a weighted confidence percentage for a single claim.

    Args:
        similarity_score: Cosine similarity from nlp_validator (0–1)
        contradiction_score: From hallucination_detector (0–1)
        has_reference: Whether the user provided reference context

    Returns:
        {"confidence": float, "pct": int}
    """
    semantic_similarity   = similarity_score
    evidence_availability = 1.0 if has_reference else 0.3
    consistency_score     = 1.0 - contradiction_score

    raw = (
        semantic_similarity   * 0.50 +
        evidence_availability * 0.30 +
        consistency_score     * 0.20
    )

    confidence = max(0.0, min(1.0, raw))
    pct = round(confidence * 100)

    return {"confidence": confidence, "pct": pct}


def classify_status(
    similarity_score: float,
    contradiction_score: float,
    has_reference: bool,
) -> str:
    """
    Classify a claim's hallucination status.

    Priority order:
      1. No reference → unsupported
      2. contradiction_score > 0.50 → contradictory (Hallucinated)
      3. similarity_score > 0.60   → supported (Factual)
      4. similarity_score > 0.30   → uncertain (Partially Hallucinated)
      5. else                       → unsupported (Partially Hallucinated)

    Returns:
        'supported' | 'unsupported' | 'uncertain' | 'contradictory'
    """
    if not has_reference:
        return "unsupported"
    if contradiction_score > 0.50:
        return "contradictory"
    if similarity_score > 0.60:
        return "supported"
    if similarity_score > 0.30:
        return "uncertain"
    return "unsupported"


def generate_explanation(
    status: str,
    pct: int,
    has_reference: bool,
) -> str:
    """
    Generate a human-readable explanation for the classification.

    Args:
        status: One of supported/unsupported/uncertain/contradictory
        pct: Confidence percentage
        has_reference: Whether reference was provided

    Returns:
        Explanation string for display in the UI and PDF report.
    """
    if not has_reference:
        return (
            "No reference context was provided. The claim cannot be verified "
            "against trusted sources. Manual verification is recommended."
        )

    explanations = {
        "supported": (
            f"The reference context contains evidence that semantically aligns "
            f"with this claim (confidence {pct}%). The key facts and entities "
            f"in the claim match the trusted source material based on "
            f"SentenceTransformer embedding similarity."
        ),
        "contradictory": (
            f"The reference context appears to contradict this claim "
            f"(confidence {pct}%). Negation signals and topic mismatch were "
            f"detected between the claim and the reference. This claim is a "
            f"potential hallucination — the AI may have generated an incorrect "
            f"or misleading statement."
        ),
        "uncertain": (
            f"The reference context is partially related but does not "
            f"conclusively verify this claim (confidence {pct}%). The semantic "
            f"similarity is moderate. Additional trusted sources should be "
            f"consulted before relying on this statement."
        ),
        "unsupported": (
            f"No matching evidence was found in the provided reference context "
            f"(confidence {pct}%). The claim may be accurate but cannot be "
            f"verified against the available sources. This does not necessarily "
            f"mean the claim is false — only that it is unverified."
        ),
    }

    return explanations.get(status, "Classification could not be determined.")


def compute_overall_score(results: list[dict]) -> int:
    """
    Aggregate individual claim results into an overall reliability score (0–100).

    Weights:
      supported     → 100% of confidence value
      uncertain     → 50%  of confidence value
      unsupported   → 25%  of confidence value
      contradictory → 0    (penalises the score)

    Args:
        results: List of processed claim dicts

    Returns:
        Overall reliability score 0–100
    """
    if not results:
        return 0

    weights = {
        "supported":    1.00,
        "uncertain":    0.50,
        "unsupported":  0.25,
        "contradictory": 0.00,
    }

    weighted_sum = sum(
        r["confidence_pct"] * weights.get(r["status"], 0)
        for r in results
    )

    return round(weighted_sum / len(results))


def get_label(overall_score: int) -> str:
    """
    Map overall reliability score to the architecture flowchart label.

    Labels:
      ≥ 80  → Factual
      ≥ 50  → Partially Hallucinated
      < 50  → Hallucinated
    """
    if overall_score >= 80:
        return "Factual"
    if overall_score >= 50:
        return "Partially Hallucinated"
    return "Hallucinated"


def generate_summary(results: list[dict], score: int) -> str:
    """Build a concise human-readable validation summary paragraph."""
    total        = len(results)
    supported    = sum(1 for r in results if r["status"] == "supported")
    unsupported  = sum(1 for r in results if r["status"] == "unsupported")
    contradictory = sum(1 for r in results if r["status"] == "contradictory")
    uncertain    = sum(1 for r in results if r["status"] == "uncertain")
    label        = get_label(score)

    parts = [f"The AI response contains {total} factual claim{'s' if total != 1 else ''}."]

    if supported:
        parts.append(
            f"{supported} claim{'s are' if supported != 1 else ' is'} "
            f"supported by the available evidence."
        )
    if unsupported:
        parts.append(
            f"{unsupported} claim{'s lack' if unsupported != 1 else ' lacks'} "
            f"sufficient evidence for verification."
        )
    if contradictory:
        parts.append(
            f"{contradictory} claim{'s appear' if contradictory != 1 else ' appears'} "
            f"to contradict trusted reference information and may represent hallucinations."
        )
    if uncertain:
        parts.append(
            f"{uncertain} claim{'s are' if uncertain != 1 else ' is'} flagged "
            f"as uncertain due to ambiguous or insufficient evidence."
        )

    parts.append(
        f"Overall reliability score: {score}/100 — classified as '{label}'."
    )

    if contradictory or unsupported:
        parts.append(
            "Manual verification is recommended before relying on this response."
        )

    return " ".join(parts)
