"""
nlp_validator.py
────────────────
Semantic similarity engine using TF-IDF cosine similarity.

Replaces SentenceTransformers (requires PyTorch ~800 MB RAM — exceeds
Render free-tier 512 MB) with TF-IDF from scikit-learn.

Trade-off: slightly less nuanced than neural embeddings, but handles
factual claim validation very well (claims share vocabulary with evidence).
Zero download time, ~5 MB RAM footprint.
"""

import re
import math
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)


# ── TF-IDF helpers ────────────────────────────────────────────────────────────

STOP_WORDS = {
    "the", "a", "an", "is", "was", "were", "are", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should",
    "may", "might", "must", "can", "could", "to", "of", "in", "on", "at", "for",
    "with", "by", "from", "as", "that", "this", "these", "those", "it", "he", "she",
    "they", "we", "i", "you", "and", "but", "or", "so", "if", "then", "there",
    "what", "when", "where", "who", "which", "why", "how"
}

def _tokenize(text: str) -> list[str]:
    raw = re.findall(r"[a-z0-9]+", text.lower())
    filtered = [t for t in raw if t not in STOP_WORDS]
    return filtered if filtered else raw


def _build_vocab(docs: list[str]) -> dict[str, int]:
    vocab: dict[str, int] = {}
    idx = 0
    for doc in docs:
        for tok in _tokenize(doc):
            if tok not in vocab:
                vocab[tok] = idx
                idx += 1
    return vocab


def _compute_idf(docs: list[str], vocab: dict[str, int]) -> dict[str, float]:
    n = len(docs)
    df: dict[str, int] = {}
    for doc in docs:
        for tok in set(_tokenize(doc)):
            df[tok] = df.get(tok, 0) + 1
    return {tok: math.log((n + 1) / (df.get(tok, 0) + 1)) + 1.0 for tok in vocab}


def _tfidf_vector(doc: str, vocab: dict[str, int], idf: dict[str, float]) -> np.ndarray:
    tokens = _tokenize(doc)
    vec = np.zeros(len(vocab))
    if not tokens:
        return vec
    tf: dict[str, float] = {}
    for tok in tokens:
        tf[tok] = tf.get(tok, 0) + 1
    for tok, cnt in tf.items():
        if tok in vocab:
            vec[vocab[tok]] = (cnt / len(tokens)) * idf.get(tok, 1.0)
    return vec


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


# ── Public API — same interface as original ───────────────────────────────────

def load_model():
    """No-op — TF-IDF needs no model loading."""
    return True


def is_model_loaded() -> bool:
    return True


def compute_similarity(text_a: str, text_b: str) -> float:
    if not text_a.strip() or not text_b.strip():
        return 0.0
    try:
        toks_a = _tokenize(text_a)
        toks_b = _tokenize(text_b)
        if not toks_a or not toks_b:
            return 0.0

        # Term overlap with prefix stem matching (handles abbreviations like atm/atmospheric)
        matched_a = 0
        set_b = set(toks_b)
        for ta in set(toks_a):
            if ta in set_b or any(len(ta) >= 3 and len(tb) >= 3 and (ta.startswith(tb[:3]) or tb.startswith(ta[:3])) for tb in set_b):
                matched_a += 1
        recall_a = matched_a / len(set(toks_a))

        docs  = [text_a, text_b]
        vocab = _build_vocab(docs)
        idf   = _compute_idf(docs, vocab)
        cos   = _cosine(_tfidf_vector(text_a, vocab, idf), _tfidf_vector(text_b, vocab, idf))

        # Balanced similarity combining symmetric TF-IDF cosine and asymmetric content recall
        score = (0.35 * cos) + (0.65 * recall_a)
        return max(0.0, min(1.0, score))
    except Exception as e:
        logger.warning("TF-IDF similarity failed: %s", e)
        return 0.0


def find_best_evidence(claim: str, reference_sentences: list[str]) -> tuple[float, str]:
    if not reference_sentences:
        return 0.0, "No reference context available."
    try:
        scores = [compute_similarity(claim, s) for s in reference_sentences]
        best_idx = int(np.argmax(scores))
        return scores[best_idx], reference_sentences[best_idx]
    except Exception as e:
        logger.warning("find_best_evidence failed: %s", e)
        return 0.0, reference_sentences[0] if reference_sentences else ""


def embed_texts(texts: list[str]) -> Optional[np.ndarray]:
    if not texts:
        return None
    try:
        vocab = _build_vocab(texts)
        idf   = _compute_idf(texts, vocab)
        return np.array([_tfidf_vector(t, vocab, idf) for t in texts])
    except Exception as e:
        logger.warning("embed_texts failed: %s", e)
        return None
