# backend/app/ai/rag.py
import logging
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)

def get_chroma_client():
    try:
        import chromadb
    except ImportError as exc:
        raise RuntimeError("Install chromadb to use RAG retrieval") from exc
    settings = get_settings()
    return chromadb.PersistentClient(path=settings.chroma_path)

async def retrieve_rag_context(
    subject: str,
    topic: str,
    college: Optional[str] = None,
    year: Optional[int] = None,
    semester: Optional[int] = None,
    regulation: Optional[str] = None,
    n_results: int = 5
) -> tuple[str, int]:
    """
    Query ChromaDB for curriculum-scoped chunks relevant to the subject/topic.
    Returns (rag_context_string, chunks_retrieved_count).
    """
    try:
        client = get_chroma_client()
        collection = client.get_collection("college_materials")

        # Build metadata filter — only include fields that are provided
        where_conditions = {}
        if college:
            where_conditions["college"] = {"$eq": college}
        if year:
            where_conditions["year"] = {"$eq": str(year)}
        if semester:
            where_conditions["semester"] = {"$eq": str(semester)}
        if regulation:
            where_conditions["regulation"] = {"$eq": regulation}
        if subject:
            where_conditions["subject"] = {"$eq": subject}

        query_text = f"{subject} {topic}"

        # Use $and only when multiple filters exist
        where_clause = None
        if len(where_conditions) > 1:
            where_clause = {"$and": [{k: v} for k, v in where_conditions.items()]}
        elif len(where_conditions) == 1:
            where_clause = where_conditions

        kwargs = {
            "query_texts": [query_text],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"]
        }
        if where_clause:
            kwargs["where"] = where_clause

        results = collection.query(**kwargs)

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        if not documents:
            logger.warning(f"[RAG] No chunks found for subject='{subject}', topic='{topic}'")
            return "", 0

        # Format retrieved chunks with source metadata
        formatted_chunks = []
        for i, (doc, meta) in enumerate(zip(documents, metadatas)):
            source = meta.get("document_info", meta.get("source", f"Document {i+1}"))
            formatted_chunks.append(f"[Source: {source}]\n{doc}")

        rag_context = "\n\n---\n\n".join(formatted_chunks)
        logger.info(f"[RAG] Retrieved {len(documents)} chunks for '{subject} > {topic}'")
        return rag_context, len(documents)

    except Exception as e:
        logger.error(f"[RAG] ChromaDB retrieval failed: {e}")
        return "", 0