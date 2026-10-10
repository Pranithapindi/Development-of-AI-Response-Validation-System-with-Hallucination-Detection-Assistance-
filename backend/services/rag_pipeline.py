"""
rag_pipeline.py
───────────────
RAG pipeline — LangChain-free version.

Replaces LangChain RecursiveCharacterTextSplitter (~80 MB) with a
pure-regex sentence splitter (same underlying logic, zero deps).
"""

import re
import logging

from services.nlp_validator import find_best_evidence
from services.vector_store  import VectorStore

logger = logging.getLogger(__name__)


def _split_reference_sentences(reference_text: str) -> list[str]:
    """Split reference into sentences using regex — no LangChain needed."""
    sentences = re.split(r"(?<=[.!?])\s+", reference_text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
    if len(sentences) <= 1:
        sentences = [s.strip() for s in reference_text.split("\n") if len(s.strip()) > 10]
    if len(sentences) <= 1 and len(reference_text) > 100:
        sentences = [reference_text[i:i + 200].strip()
                     for i in range(0, len(reference_text), 200) if reference_text[i:i + 200].strip()]
    return sentences


class RAGPipeline:
    def __init__(self, reference_text: str):
        self.reference_text      = reference_text
        self.reference_sentences = _split_reference_sentences(reference_text) if reference_text else []
        self.vector_store        = VectorStore()
        self._vs_ready           = False

        if reference_text and reference_text.strip():
            self._vs_ready = self.vector_store.build_from_reference(reference_text)
            if self._vs_ready:
                logger.info("RAG pipeline ready with in-memory vector store")
            else:
                logger.warning("Vector store unavailable, using direct sentence comparison")

    def retrieve_evidence(self, claim_text: str) -> tuple[float, str]:
        if not self.reference_sentences:
            return 0.0, "No reference context provided."
        if self._vs_ready:
            top_chunks = self.vector_store.query(claim_text, n_results=3)
            if top_chunks:
                return find_best_evidence(claim_text, top_chunks)
        return find_best_evidence(claim_text, self.reference_sentences)

    def cleanup(self):
        self.vector_store.cleanup()
