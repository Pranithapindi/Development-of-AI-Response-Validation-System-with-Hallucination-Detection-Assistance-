"""
claim_extractor.py
──────────────────
Extracts factual claims from AI responses — NLTK-free version.

Replaces NLTK's Punkt tokenizer (requires runtime data download which
fails in read-only Render environments) with a robust regex sentence
splitter that handles the same edge cases.
"""

import re
import logging

logger = logging.getLogger(__name__)

OPINION_MARKERS = {
    "i think", "i believe", "in my opinion", "it seems", "perhaps",
    "maybe", "possibly", "some people say", "it is said", "allegedly",
    "it could be", "it might be", "i feel", "arguably",
}

FACTUAL_PATTERNS = [
    re.compile(r"\b\d{4}\b"),
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


def _sentence_tokenize(text: str) -> list[str]:
    """
    Regex-based sentence splitter — replaces NLTK punkt.
    Handles: abbreviations, decimals, ellipsis, quotes, and newlines.
    """
    # Protect common abbreviations from being split
    protected = re.sub(
        r"\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd|Corp|Gov|Dept|Fig|approx)\.",
        r"\1<DOT>", text
    )
    # Split on sentence-ending punctuation followed by whitespace + capital
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"\'])", protected)
    # Restore protected dots and clean up
    return [p.replace("<DOT>", ".").strip() for p in parts if p.strip()]


def _is_factual_claim(sentence: str) -> bool:
    if len(sentence.split()) < 5:
        return False
    if sentence.strip().endswith("?"):
        return False
    lower = sentence.lower()
    if any(marker in lower for marker in OPINION_MARKERS):
        return False
    return any(pat.search(sentence) for pat in FACTUAL_PATTERNS)


def extract_claims(response_text: str) -> list[dict]:
    if not response_text or not response_text.strip():
        return []

    sentences = _sentence_tokenize(response_text)
    sentences = [s.strip() for s in sentences if s.strip()]

    claims = []
    claim_id = 1
    for sent in sentences:
        if _is_factual_claim(sent):
            claims.append({"id": claim_id, "text": sent, "type": "factual"})
            claim_id += 1

    # Fallback: return all sufficiently long sentences
    if not claims:
        for i, sent in enumerate(sentences):
            if len(sent.split()) >= 5:
                claims.append({"id": i + 1, "text": sent, "type": "potential"})

    return claims
