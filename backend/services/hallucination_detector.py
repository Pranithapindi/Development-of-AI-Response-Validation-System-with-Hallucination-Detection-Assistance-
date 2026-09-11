"""
hallucination_detector.py
─────────────────────────
Detects whether a claim contradicts the reference context.

Algorithm:
  1. Negation detection — finds negation words near claim keywords in reference
  2. Semantic contradiction — high similarity + negation = contradiction
  3. Topic mismatch — claim-specific terms missing from reference

This is the "NLP Hallucination Detector" in the architecture flowchart.
"""

import re
import logging

logger = logging.getLogger(__name__)

# Negation words that invert the meaning of nearby content
NEGATION_WORDS = {
    "not", "no", "never", "neither", "nor", "without", "incorrectly",
    "wasn't", "isn't", "weren't", "aren't", "didn't", "doesn't",
    "hadn't", "hasn't", "haven't", "false", "wrong", "incorrect",
    "mistakenly", "erroneously", "falsely", "inaccurately",
}

# Common stop words to ignore in keyword extraction
STOP_WORDS = {
    "the", "a", "an", "is", "was", "were", "are", "be", "been",
    "have", "has", "had", "do", "does", "did", "to", "of", "in",
    "on", "at", "for", "with", "by", "from", "as", "that", "this",
    "and", "but", "or", "it", "he", "she", "they", "we", "i", "you",
    "his", "her", "its", "their", "our", "my", "which", "who", "also",
    "both", "will", "would", "shall", "should", "may", "might", "can",
    "could", "must", "about", "through", "during", "before", "after",
}


def _extract_keywords(text: str) -> set[str]:
    """Extract meaningful content keywords from text (no stop words)."""
    words = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower()).split()
    return {w for w in words if len(w) > 3 and w not in STOP_WORDS}


def _negation_score(claim_keywords: set[str], reference_text: str) -> float:
    """
    Check if the reference contains negation near claim keywords.
    Returns a contradiction signal in [0, 0.6].
    """
    sentences = re.split(r"(?<=[.!?])\s+", reference_text)
    total_neg = 0.0

    for sent in sentences:
        lower = sent.lower()
        # Does this sentence discuss topics from the claim?
        has_claim_topic = any(kw in lower for kw in claim_keywords)
        if not has_claim_topic:
            continue
        # Does it contain negation?
        has_negation = any(neg in lower.split() for neg in NEGATION_WORDS)
        if has_negation:
            total_neg += 0.35

    return min(0.6, total_neg)


def _topic_mismatch_score(claim_keywords: set[str], ref_keywords: set[str]) -> float:
    """
    Measure how many meaningful claim terms are absent from the reference.
    High mismatch (>60% missing) suggests potential hallucination or unsupported claim.
    Returns score in [0, 0.5].
    """
    if not claim_keywords:
        return 0.0

    # Only consider substantive terms (longer words carry more meaning)
    substantive = {kw for kw in claim_keywords if len(kw) > 4}
    if not substantive:
        return 0.0

    missing = substantive - ref_keywords
    missing_ratio = len(missing) / len(substantive)

    # Only flag if more than 60% of substantive terms are missing
    return missing_ratio * 0.5 if missing_ratio > 0.6 else 0.0


NUMBER_WORDS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
    "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100
}


def _extract_numbers(text: str) -> set[int]:
    """Extract integer values from digits and written number words."""
    found = set()
    for match in re.findall(r"\b\d+\b", text):
        found.add(int(match))
    for word in re.sub(r"[^a-zA-Z\s]", " ", text.lower()).split():
        if word in NUMBER_WORDS:
            found.add(NUMBER_WORDS[word])
    return found


def _number_conflict_score(claim_text: str, reference_text: str) -> float:
    """Detect numerical contradictions between claim and reference."""
    claim_nums = _extract_numbers(claim_text)
    ref_nums = _extract_numbers(reference_text)

    if not claim_nums or not ref_nums:
        return 0.0

    # If claim has numbers that are absent from reference when reference has numbers
    diff = claim_nums - ref_nums
    if diff:
        return 0.8  # Strong numerical contradiction
    return 0.0


def detect_contradiction(
    claim_text: str,
    reference_text: str,
    similarity_score: float,
) -> dict:
    """
    Detect whether the reference text contradicts the claim.

    Args:
        claim_text: The factual claim
        reference_text: Trusted reference context
        similarity_score: Cosine similarity from nlp_validator (0–1)

    Returns:
        {"contradiction_score": float}  — score in [0, 1]
    """
    if not reference_text or not reference_text.strip():
        return {"contradiction_score": 0.0}

    claim_kw = _extract_keywords(claim_text)
    ref_kw   = _extract_keywords(reference_text)

    neg_factor = _negation_score(claim_kw, reference_text)
    mismatch   = _topic_mismatch_score(claim_kw, ref_kw)
    num_conflict = _number_conflict_score(claim_text, reference_text)

    # Composite contradiction score
    if num_conflict > 0:
        score = max(num_conflict, neg_factor * 0.9 + 0.3)
    elif similarity_score >= 0.55:
        score = max(neg_factor * 0.9, mismatch * 0.5)
    elif similarity_score >= 0.25:
        score = neg_factor * 0.6 + mismatch * 0.4
    else:
        score = mismatch * 0.3

    return {"contradiction_score": min(1.0, score)}

