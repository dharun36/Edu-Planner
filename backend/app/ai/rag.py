# backend/app/ai/rag.py
import logging
import re
from typing import Optional, Any
from sqlalchemy import select, or_, and_

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
    user_id: Optional[int] = None,
    college: Optional[str] = None,
    college_id: Optional[int] = None,
    year: Optional[Any] = None,
    semester: Optional[Any] = None,
    regulation: Optional[str] = None,
    n_results: int = 5,
) -> tuple[str, int]:
    """
    Fallback RAG retriever: Queries SQLite MaterialChunk & MaterialDocument tables
    by lexical and semantic keyword matching.
    Prioritizes the student's own personal materials and strictly isolates them
    from other students' materials.
    """
    factory = get_session_factory()
    if not factory:
        return "", 0

    try:
        with factory() as session:
            # Gather candidate search terms (words >= 2 chars)
            topic_terms = [re.escape(w) for w in re.findall(r"\b\w{2,}\b", topic.lower())]
            subject_terms = [re.escape(w) for w in re.findall(r"\b\w{2,}\b", subject.lower())]
            # Add subject acronym (e.g. RL for Reinforcement Learning, OS for Operating Systems)
            acronym = "".join(w[0] for w in subject.split() if w).lower()
            if len(acronym) >= 2:
                subject_terms.append(re.escape(acronym))
            all_terms = list(dict.fromkeys(topic_terms + subject_terms))

            if not all_terms:
                return "", 0

            # Query chunks joined with parent document
            query = (
                select(
                    MaterialChunk,
                    MaterialDocument.file_name,
                    MaterialDocument.user_id,
                    MaterialDocument.is_personal,
                    MaterialDocument.college_id,
                )
                .join(MaterialDocument, MaterialChunk.document_id == MaterialDocument.id)
            )

            # Strict privacy and scope filtering:
            # Student can only access:
            # 1. Their own personal materials (user_id == user_id)
            # 2. Institutional/college materials (is_personal == False)
            if user_id is not None:
                if college_id is not None:
                    query = query.where(
                        or_(
                            MaterialDocument.user_id == user_id,
                            and_(MaterialDocument.college_id == college_id, MaterialDocument.is_personal == False),
                        )
                    )
                else:
                    query = query.where(
                        or_(
                            MaterialDocument.user_id == user_id,
                            MaterialDocument.is_personal == False,
                        )
                    )
            elif college_id is not None:
                query = query.where(MaterialDocument.college_id == college_id, MaterialDocument.is_personal == False)

            results = session.execute(query).all()
            if not results:
                return "", 0

            scored: list[tuple[float, str, bool, MaterialChunk]] = []
            for chunk, file_name, doc_user_id, is_personal, doc_college_id in results:
                content_lower = chunk.content.lower()
                fname_lower = (file_name or "").lower()

                score = 0.0
                is_syllabus = any(
                    k in fname_lower or k in content_lower
                    for k in ["syllabus", "sylaabus", "curriculum", "unit -", "unit 1", "unit i", "programme &", "course plan"]
                )

                term_score = 0.0
                for t in topic_terms:
                    if t in fname_lower:
                        term_score += 12.0
                    term_score += content_lower.count(t) * 3.0

                for t in subject_terms:
                    if t in fname_lower:
                        term_score += 10.0
                    term_score += content_lower.count(t) * 2.0

                # Strict course boundary: chunks with ZERO mentions of the subject or topic
                # MUST NOT be included (prevents cross-course contamination like RL bleeding into Cloud)
                if term_score <= 0.0:
                    continue

                score = term_score

                # OFFICIAL INSTITUTIONAL SYLLABUS IS HIGHEST PRIORITY:
                if not is_personal:
                    score += 15.0
                    if is_syllabus:
                        score += 100.0  # Dominant boost for matching syllabus!
                else:
                    if user_id is not None and doc_user_id == user_id:
                        score += 5.0

                # Bonus if chunk belongs to same scope/college
                if college and chunk.college and college.lower() in chunk.college.lower():
                    score += 10.0

                if score >= 15.0:
                    scored.append((score, file_name, bool(is_personal), chunk))

            if not scored:
                return "", 0

            scored.sort(key=lambda x: x[0], reverse=True)
            top_chunks = scored[:n_results]

            formatted_chunks = []
            for _, fname, is_pers, chunk in top_chunks:
                pnum = chunk.page_number
                fname_l = (fname or "").lower()
                c_lower = chunk.content.lower()
                is_syl = not is_pers and any(
                    k in fname_l or k in c_lower
                    for k in ["syllabus", "sylaabus", "curriculum", "unit -", "programme &"]
                )
                tag = "Official College Syllabus" if is_syl else ("Course Material" if not is_pers else "Personal Note")
                src = f"{fname} (Page {pnum})" if pnum else fname
                formatted_chunks.append(f"[{tag}: {src}]\n{chunk.content}")

            rag_context = "\n\n---\n\n".join(formatted_chunks)
            logger.info(f"[RAG: LocalDB] Retrieved {len(top_chunks)} chunks for '{subject} > {topic}' (User {user_id})")
            return rag_context, len(top_chunks)

    except Exception as exc:
        logger.warning(f"[RAG: LocalDB] Database fallback error: {exc}")
        return "", 0


async def retrieve_rag_context(
    subject: str,
    topic: str,
    user_id: Optional[int] = None,
    college: Optional[str] = None,
    college_id: Optional[int] = None,
    year: Optional[Any] = None,
    semester: Optional[Any] = None,
    regulation: Optional[str] = None,
    n_results: int = 5,
) -> tuple[str, int]:
    """
    Query RAG for curriculum and personal notes relevant to the subject/topic.
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
                # Filter out personal materials belonging to OTHER students
                meta_user_id = meta.get("user_id")
                meta_is_personal = meta.get("is_personal") == "true" or meta.get("is_personal") is True
                if meta_is_personal and user_id is not None and meta_user_id != user_id:
                    continue

                # Ensure chunk is genuinely relevant to this subject
                subject_words = [w.lower() for w in re.findall(r"\b\w{3,}\b", subject)]
                doc_lower = (doc or "").lower()
                meta_str = str(meta).lower()
                if subject_words and not any(w in doc_lower or w in meta_str for w in subject_words):
                    continue

                source = meta.get("file_name", meta.get("document_info", meta.get("source", f"Document {i+1}")))
                page = meta.get("page_number")
                tag = "Personal Note" if meta_is_personal else "Course Material"
                if page:
                    source = f"{source} (Page {page})"
                formatted_chunks.append(f"[{tag}: {source}]\n{doc}")

            if formatted_chunks:
                rag_context = "\n\n---\n\n".join(formatted_chunks)
                logger.info(f"[RAG: Chroma] Retrieved {len(formatted_chunks)} chunks for '{subject} > {topic}'")
                return rag_context, len(formatted_chunks)

    except Exception as e:
        logger.info(f"[RAG] ChromaDB vector search not available or returned no results ({e}). Using persistent DB index.")

    # 2. Resilient Fallback: Retrieve from SQLite MaterialChunk index
    return retrieve_local_material_chunks(
        subject=subject,
        topic=topic,
        user_id=user_id,
        college=college,
        college_id=college_id,
        year=year,
        semester=semester,
        regulation=regulation,
        n_results=n_results,
    )