"""
vector_store.py
───────────────
In-memory numpy vector store — replaces ChromaDB.

ChromaDB requires persistent disk + heavy dependencies (~50 MB install).
This pure-numpy implementation is functionally equivalent:
  - Reference is chunked and embedded (TF-IDF vectors)
  - Claims are matched via cosine similarity
  - Each session is ephemeral (same behaviour as ChromaDB's EphemeralClient)
"""

import re
import uuid
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)


def _split_into_chunks(text: str, chunk_size: int = 200, overlap: int = 40) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    chunks, current = [], ""
    for sent in sentences:
        if len(current) + len(sent) + 1 <= chunk_size:
            current = (current + " " + sent).strip()
        else:
            if current:
                chunks.append(current)
            if len(sent) > chunk_size:
                for i in range(0, len(sent), chunk_size - overlap):
                    chunks.append(sent[i: i + chunk_size])
            else:
                current = sent
    if current:
        chunks.append(current)
    return chunks if chunks else [text[:chunk_size]]


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


class VectorStore:
    def __init__(self):
        self._chunks: list[str] = []
        self._embeddings: Optional[np.ndarray] = None
        self._session_id = str(uuid.uuid4())[:8]

    def build_from_reference(self, reference_text: str) -> bool:
        if not reference_text or not reference_text.strip():
            return False
        try:
            from services.nlp_validator import embed_texts
            self._chunks = _split_into_chunks(reference_text)
            self._embeddings = embed_texts(self._chunks)
            if self._embeddings is None or self._embeddings.shape[0] == 0:
                return False
            logger.info("In-memory vector store ready (%d chunks)", len(self._chunks))
            return True
        except Exception as e:
            logger.error("Failed to build vector store: %s", e)
            return False

    def query(self, query_text: str, n_results: int = 3) -> list[str]:
        if self._embeddings is None or not self._chunks:
            return []
        try:
            from services.nlp_validator import embed_texts
            q_emb = embed_texts([query_text])
            if q_emb is None:
                return []
            q_vec  = q_emb[0]
            scores = [_cosine(q_vec, self._embeddings[i]) for i in range(len(self._chunks))]
            top    = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
            return [self._chunks[i] for i in top[:n_results]]
        except Exception as e:
            logger.warning("Vector store query failed: %s", e)
            return []

    def cleanup(self):
        self._chunks = []
        self._embeddings = None
