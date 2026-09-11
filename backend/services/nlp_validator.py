"""
nlp_validator.py
────────────────
Semantic similarity engine using SentenceTransformers.

Replaces the simple Jaccard overlap from the frontend with real
neural-network-based semantic similarity (cosine similarity between
dense sentence embeddings).

Model: all-MiniLM-L6-v2  (~80 MB, downloads once and is cached)
  - Fast inference
  - Strong semantic understanding
  - Runs on CPU without GPU
"""

import os
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

# Global model singleton — loaded once at startup
_model = None
_model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


def load_model():
    """
    Load the SentenceTransformer model into memory.
    Called once at application startup — subsequent calls are no-ops.
    """
    global _model
    if _model is not None:
        return _model

    try:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading SentenceTransformer model: %s ...", _model_name)
        _model = SentenceTransformer(_model_name)
        logger.info("✅ Model loaded successfully")
    except Exception as e:
        logger.error("Failed to load SentenceTransformer: %s", e)
        _model = None

    return _model


def is_model_loaded() -> bool:
    return _model is not None


def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Compute cosine similarity between two embedding vectors."""
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


def compute_similarity(text_a: str, text_b: str) -> float:
    """
    Compute semantic similarity between two texts using SentenceTransformers.

    Args:
        text_a: First text (e.g., a claim)
        text_b: Second text (e.g., reference evidence)

    Returns:
        Cosine similarity score in [0, 1].
        Falls back to 0.0 if model is not loaded.
    """
    model = load_model()
    if model is None or not text_a.strip() or not text_b.strip():
        return 0.0

    try:
        embeddings = model.encode([text_a, text_b], convert_to_numpy=True)
        score = _cosine_similarity(embeddings[0], embeddings[1])
        # Cosine similarity can be slightly negative — clamp to [0,1]
        return max(0.0, min(1.0, score))
    except Exception as e:
        logger.warning("Similarity computation failed: %s", e)
        return 0.0


def find_best_evidence(claim: str, reference_sentences: list[str]) -> tuple[float, str]:
    """
    Find the reference sentence most semantically similar to the claim.

    Args:
        claim: The factual claim to validate
        reference_sentences: List of sentences from the reference context

    Returns:
        (best_similarity_score, best_evidence_sentence)
    """
    model = load_model()
    if model is None or not reference_sentences:
        return 0.0, "No reference context available."

    try:
        # Encode all at once for efficiency (batched)
        all_texts  = [claim] + reference_sentences
        embeddings = model.encode(all_texts, convert_to_numpy=True)

        claim_emb = embeddings[0]
        ref_embs  = embeddings[1:]

        # Compute cosine similarity between claim and each reference sentence
        scores = [
            _cosine_similarity(claim_emb, ref_emb)
            for ref_emb in ref_embs
        ]

        best_idx   = int(np.argmax(scores))
        best_score = max(0.0, min(1.0, scores[best_idx]))
        best_sent  = reference_sentences[best_idx]

        return best_score, best_sent

    except Exception as e:
        logger.warning("find_best_evidence failed: %s", e)
        return 0.0, reference_sentences[0] if reference_sentences else ""


def embed_texts(texts: list[str]) -> Optional[np.ndarray]:
    """Encode a list of texts into embedding vectors."""
    model = load_model()
    if model is None:
        return None
    try:
        return model.encode(texts, convert_to_numpy=True)
    except Exception as e:
        logger.warning("embed_texts failed: %s", e)
        return None
