"""
claim_extractor.py
──────────────────
Extracts individual, independently verifiable factual claims from
an AI-generated response using NLTK sentence tokenizer.

This is the Python equivalent of the frontend JS claim extractor,
but more robust thanks to NLTK's Punkt tokenizer.
"""

import re
import nltk
import logging

logger = logging.getLogger(__name__)

# Download NLTK data on first use
def _ensure_nltk():
    for resource in ["punkt", "punkt_tab"]:
        try:
            nltk.data.find(f"tokenizers/{resource}")
        except LookupError:
            try:
                nltk.download(resource, quiet=True)
            except Exception:
                pass

_ensure_nltk()


# Words that signal an opinion / subjective statement — not a factual claim
OPINION_MARKERS = {
    "i think", "i believe", "in my opinion", "it seems", "perhaps",
    "maybe", "possibly", "some people say", "it is said", "allegedly",
    "it could be", "it might be", "i feel", "arguably",
}

# Patterns that strongly suggest a factual / verifiable claim
FACTUAL_PATTERNS = [
    re.compile(r"\b\d{4}\b"),                                  # 4-digit year
    re.compile(r"\b\d+\s*(million|billion|thousand|percent|%)\b", re.I),
    re.compile(r"\b(is|was|were|are|has|have|had|did|does|do|"
               r"received|won|invented|discovered|founded|created|"
               r"developed|published|born|died|established|introduced|"
               r"awarded|signed|declared|launched)\b", re.I),
    re.compile(r"\b(first|second|third|last|only|largest|smallest|"
               r"fastest|oldest|newest|highest|lowest|most|least)\b", re.I),
    re.compile(r"\b[A-Z][a-z]+ (University|Institute|College|Academy|"
               r"Corporation|Company|Organization|Government|Republic|"
               r"Kingdom|Empire|Nation|City|Country|State)\b"),
]


def _is_factual_claim(sentence: str) -> bool:
    """Return True if the sentence appears to be a verifiable factual claim."""
    words = sentence.split()

    # Too short to be a meaningful claim
    if len(words) < 5:
        return False

    # Filter out questions
    if sentence.strip().endswith("?"):
        return False

    lower = sentence.lower()

    # Filter out opinion-based sentences
    if any(marker in lower for marker in OPINION_MARKERS):
        return False

    # Must match at least one factual pattern
    return any(pat.search(sentence) for pat in FACTUAL_PATTERNS)


def extract_claims(response_text: str) -> list[dict]:
    """
    Split an AI response into individual factual claims.

    Uses NLTK's sentence tokenizer (Punkt) for accurate boundary detection,
    then filters sentences by factual signal patterns.

    Args:
        response_text: Full AI-generated response string.

    Returns:
        List of claim dicts: [{id, text, type}]
    """
    if not response_text or not response_text.strip():
        return []

    try:
        sentences = nltk.sent_tokenize(response_text)
    except Exception as e:
        logger.warning("NLTK tokenize failed (%s), using regex fallback", e)
        # Regex fallback
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", response_text)

    sentences = [s.strip() for s in sentences if s.strip()]

    claims = []
    claim_id = 1

    for sent in sentences:
        if _is_factual_claim(sent):
            claims.append({
                "id":   claim_id,
                "text": sent,
                "type": "factual",
            })
            claim_id += 1

    # Fallback: if nothing extracted, return all sentences as potential claims
    if not claims:
        for i, sent in enumerate(sentences):
            if len(sent.split()) >= 5:
                claims.append({
                    "id":   i + 1,
                    "text": sent,
                    "type": "potential",
                })

    return claims
