"""
vector_store.py
───────────────
ChromaDB vector database integration.

Acts as the Knowledge Base in the architecture:
  - Reference text is chunked and embedded into ChromaDB
  - Claims are queried against the vector store for semantic retrieval
  - Each validation session uses an ephemeral in-memory collection

ChromaDB uses the SentenceTransformer embeddings from nlp_validator.py
so all embedding computation is consistent across the system.
"""

import os
import uuid
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./data/chroma_db")


def _split_into_chunks(text: str, chunk_size: int = 200, overlap: int = 40) -> list[str]:
    """
    Split reference text into overlapping chunks for vector storage.
    Uses sentence boundaries where possible, then falls back to character splits.
    """
    # First split by sentences
    sentences = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks = []
    current = ""

    for sent in sentences:
        if len(current) + len(sent) + 1 <= chunk_size:
            current = (current + " " + sent).strip()
        else:
            if current:
                chunks.append(current)
            # Handle very long single sentences
            if len(sent) > chunk_size:
                for i in range(0, len(sent), chunk_size - overlap):
                    chunks.append(sent[i:i + chunk_size])
            else:
                current = sent

    if current:
        chunks.append(current)

    return chunks if chunks else [text[:chunk_size]]


class VectorStore:
    """
    Manages a ChromaDB collection for one validation session.
    Each session creates a fresh ephemeral collection.
    """

    def __init__(self):
        self._client     = None
        self._collection = None
        self._session_id = str(uuid.uuid4())[:8]

    def _get_client(self):
        if self._client is None:
            try:
                import chromadb
                # Use ephemeral (in-memory) client for per-session isolation
                self._client = chromadb.EphemeralClient()
                logger.info("ChromaDB ephemeral client created")
            except Exception as e:
                logger.error("ChromaDB init failed: %s", e)
        return self._client

    def build_from_reference(self, reference_text: str) -> bool:
        """
        Chunk and embed the reference text into the vector store.

        Args:
            reference_text: The trusted reference / context document

        Returns:
            True if successful, False otherwise
        """
        if not reference_text or not reference_text.strip():
            return False

        client = self._get_client()
        if client is None:
            return False

        try:
            from services.nlp_validator import embed_texts

            chunks = _split_into_chunks(reference_text)
            logger.info("Building vector store with %d chunks", len(chunks))

            embeddings = embed_texts(chunks)
            if embeddings is None:
                return False

            # Create collection
            collection_name = f"ref_{self._session_id}"
            self._collection = client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"},
            )

            # Add chunks with embeddings
            self._collection.add(
                documents=chunks,
                embeddings=embeddings.tolist(),
                ids=[f"chunk_{i}" for i in range(len(chunks))],
            )

            logger.info("Vector store built with %d chunks", len(chunks))
            return True

        except Exception as e:
            logger.error("Failed to build vector store: %s", e)
            return False

    def query(self, query_text: str, n_results: int = 3) -> list[str]:
        """
        Retrieve the top-n most semantically relevant reference chunks
        for a given query (claim).

        Args:
            query_text: The claim text to search for
            n_results: Number of top chunks to return

        Returns:
            List of relevant reference text chunks
        """
        if self._collection is None:
            return []

        try:
            from services.nlp_validator import embed_texts

            query_embedding = embed_texts([query_text])
            if query_embedding is None:
                return []

            results = self._collection.query(
                query_embeddings=query_embedding.tolist(),
                n_results=min(n_results, self._collection.count()),
            )

            return results.get("documents", [[]])[0]

        except Exception as e:
            logger.warning("Vector store query failed: %s", e)
            return []

    def cleanup(self):
        """Release the ephemeral collection."""
        try:
            if self._client and self._collection:
                self._client.delete_collection(self._collection.name)
        except Exception:
            pass
