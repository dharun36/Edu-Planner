# backend/app/ai/rag.py
import logging
import re
from typing import Optional, Any
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import get_session_factory
from app.models.material import MaterialDocument, MaterialChunk

logger = logging.getLogger(__name__)


def get_chroma_client():
    try:
        import chromadb
    except ImportError as exc:
        raise RuntimeError("Install chromadb to use RAG retrieval") from exc
    settings = get_settings()
    return chromadb.PersistentClient(path=settings.chroma_path)


def retrieve_local_material_chunks(
    subject: str,
    topic: str,
    college: Optional[str] = None,
    year: Optional[Any] = None,
    semester: Optional[Any] = None,
    regulation: Optional[str] = None,
    n_results: int = 5,
) -> tuple[str, int]:
    """
    Fallback RAG retriever: Queries SQLite MaterialChunk & MaterialDocument tables
    by lexical and semantic keyword matching when vector database is unavailable.
    """
    factory = get_session_factory()
    if not factory:
        return "", 0

    try:
        with factory() as session:
            # Gather candidate search terms (words >= 3 chars)
            topic_terms = [re.escape(w) for w in re.findall(r"\b\w{3,}\b", topic.lower())]
            subject_terms = [re.escape(w) for w in re.findall(r"\b\w{3,}\b", subject.lower())]
            all_terms = list(dict.fromkeys(topic_terms + subject_terms))

            if not all_terms:
                return "", 0

            # Query all chunks joined with their parent document
            query = (
                select(MaterialChunk, MaterialDocument.file_name)
                .join(MaterialDocument, MaterialChunk.document_id == MaterialDocument.id)
            )

            results = session.execute(query).all()
            if not results:
                return "", 0

            scored: list[tuple[float, str, MaterialChunk]] = []
            for chunk, file_name in results:
                content_lower = chunk.content.lower()
                fname_lower = (file_name or "").lower()

                score = 0.0
                # Higher weight if topic or subject appears in filename or content
                for t in topic_terms:
                    if t in fname_lower:
                        score += 5.0
                    score += content_lower.count(t) * 3.0

                for t in subject_terms:
                    if t in fname_lower:
                        score += 3.0
                    score += content_lower.count(t) * 1.0

                # Bonus if chunk belongs to same scope/college
                if college and chunk.college and college.lower() in chunk.college.lower():
                    score += 2.0

                if score > 0:
                    scored.append((score, file_name, chunk))

            if not scored:
                # If no direct term hits, but chunks exist for this subject/college, return top chunks
                scored = [
                    (1.0, fname, chunk)
                    for chunk, fname in results
                    if (college and chunk.college and college.lower() in chunk.college.lower())
                    or (subject and chunk.college and subject.lower() in chunk.college.lower())
                ]

            scored.sort(key=lambda x: x[0], reverse=True)
            top_chunks = scored[:n_results]

            if not top_chunks:
                return "", 0

            formatted_chunks = []
            for _, fname, chunk in top_chunks:
                pnum = chunk.page_number
                src = f"{fname} (Page {pnum})" if pnum else fname
                formatted_chunks.append(f"[Source: {src}]\n{chunk.content}")

            rag_context = "\n\n---\n\n".join(formatted_chunks)
            logger.info(f"[RAG: LocalDB] Retrieved {len(top_chunks)} chunks for '{subject} > {topic}'")
            return rag_context, len(top_chunks)

    except Exception as exc:
        logger.warning(f"[RAG: LocalDB] Database fallback error: {exc}")
        return "", 0


async def retrieve_rag_context(
    subject: str,
    topic: str,
    college: Optional[str] = None,
    year: Optional[Any] = None,
    semester: Optional[Any] = None,
    regulation: Optional[str] = None,
    n_results: int = 5
) -> tuple[str, int]:
    """
    Query RAG for curriculum-scoped chunks relevant to the subject/topic.
    First attempts ChromaDB vector search; automatically falls back to
    indexed database chunks if ChromaDB is unavailable or returns 0 matches.
    Returns (rag_context_string, chunks_retrieved_count).
    """
    # 1. Try ChromaDB vector retrieval
    try:
        client = get_chroma_client()
        collection = client.get_collection("college_materials")

        where_conditions = {}
        if college and college.strip() and college != "General":
            where_conditions["college"] = {"$eq": college.strip()}
        if semester and str(semester).strip():
            where_conditions["semester"] = {"$eq": str(semester).strip()}
        if regulation and regulation.strip() and regulation != "General":
            where_conditions["regulation"] = {"$eq": regulation.strip()}

        query_text = f"{subject} {topic}".strip()

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

        # If strict filter returned no docs, retry without metadata filter
        if not documents and where_clause:
            kwargs.pop("where", None)
            results = collection.query(**kwargs)
            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]

        if documents:
            formatted_chunks = []
            for i, (doc, meta) in enumerate(zip(documents, metadatas)):
                source = meta.get("file_name", meta.get("document_info", meta.get("source", f"Document {i+1}")))
                page = meta.get("page_number")
                if page:
                    source = f"{source} (Page {page})"
                formatted_chunks.append(f"[Source: {source}]\n{doc}")

            rag_context = "\n\n---\n\n".join(formatted_chunks)
            logger.info(f"[RAG: Chroma] Retrieved {len(documents)} chunks for '{subject} > {topic}'")
            return rag_context, len(documents)

    except Exception as e:
        logger.info(f"[RAG] ChromaDB vector search not available or returned no results ({e}). Using persistent DB index.")

    # 2. Resilient Fallback: Retrieve from SQLite MaterialChunk index
    return retrieve_local_material_chunks(
        subject=subject,
        topic=topic,
        college=college,
        year=year,
        semester=semester,
        regulation=regulation,
        n_results=n_results,
    )