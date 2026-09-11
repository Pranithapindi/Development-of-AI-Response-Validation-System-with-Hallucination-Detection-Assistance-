"""
rag_pipeline.py
───────────────
LangChain-powered RAG (Retrieval Augmented Generation) pipeline.

Orchestrates:
  1. Reference text chunking (LangChain RecursiveCharacterTextSplitter)
  2. Embedding generation (SentenceTransformers via nlp_validator)
  3. Vector retrieval (ChromaDB VectorStore)
  4. Evidence assembly for each claim

This module is the "RAG Retrieval Pipeline" box in the architecture diagram.
"""

import logging
import re
from typing import Optional

from services.nlp_validator import find_best_evidence
from services.vector_store  import VectorStore

logger = logging.getLogger(__name__)


def _split_reference_sentences(reference_text: str) -> list[str]:
    """
    Split reference into sentences using LangChain's text splitter if available,
    or a robust regex fallback.
    """
    # Try LangChain splitter first
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=250,
            chunk_overlap=50,
            separators=[". ", "! ", "? ", "\n", " "],
        )
        chunks = splitter.split_text(reference_text)
        if chunks:
            logger.debug("LangChain splitter produced %d chunks", len(chunks))
            return [c.strip() for c in chunks if c.strip()]
    except ImportError:
        logger.debug("LangChain not available, using regex splitter")
    except Exception as e:
        logger.warning("LangChain splitter failed: %s — using fallback", e)

    # Regex fallback — sentence boundary detection
    sentences = re.split(r"(?<=[.!?])\s+", reference_text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]


class RAGPipeline:
    """
    Retrieval Augmented Generation pipeline for claim validation.

    For each validation session:
      1. Build a vector store from the reference text
      2. For each claim, retrieve the most relevant evidence chunks
      3. Return evidence + similarity score for downstream classification
    """

    def __init__(self, reference_text: str):
        self.reference_text      = reference_text
        self.reference_sentences = _split_reference_sentences(reference_text) if reference_text else []
        self.vector_store        = VectorStore()
        self._vs_ready           = False

        # Build vector store if reference is available
        if reference_text and reference_text.strip():
            self._vs_ready = self.vector_store.build_from_reference(reference_text)
            if self._vs_ready:
                logger.info("RAG pipeline ready with ChromaDB vector store")
            else:
                logger.warning("ChromaDB unavailable, RAG will use direct sentence comparison")

    def retrieve_evidence(self, claim_text: str) -> tuple[float, str]:
        """
        Retrieve the best supporting evidence for a claim.

        Strategy:
          1. If ChromaDB is ready: query vector store for top-3 chunks,
             then pick the single most similar one using cosine similarity.
          2. Fallback: directly compare claim against all reference sentences.

        Args:
            claim_text: The factual claim to validate

        Returns:
            (similarity_score: float 0–1, evidence_text: str)
        """
        if not self.reference_sentences:
            return 0.0, "No reference context provided."

        if self._vs_ready:
            # ChromaDB retrieval — get top candidate chunks
            top_chunks = self.vector_store.query(claim_text, n_results=3)
            if top_chunks:
                # Among retrieved chunks, pick the one with highest semantic similarity
                score, evidence = find_best_evidence(claim_text, top_chunks)
                logger.debug("ChromaDB retrieval: score=%.3f evidence='%s...'", score, evidence[:60])
                return score, evidence

        # Direct comparison fallback
        score, evidence = find_best_evidence(claim_text, self.reference_sentences)
        logger.debug("Direct retrieval: score=%.3f evidence='%s...'", score, evidence[:60])
        return score, evidence

    def cleanup(self):
        """Release resources after validation session is complete."""
        self.vector_store.cleanup()
