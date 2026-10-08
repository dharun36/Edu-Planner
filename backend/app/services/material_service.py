from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, delete

from app.db.database import get_session_factory
from app.models.material import MaterialChunk, MaterialDocument
from app.schemas.material import MaterialDocumentRead, MaterialSearchRequest
from app.services.material_indexing import file_content_hash, index_chunks, parse_material_file, search_chunks

SUPPORTED_MATERIAL_SUFFIXES = {".txt", ".md", ".rst", ".pdf", ".docx"}


def _document_scope_filters(
    college_id: int | None = None,
    college: str | None = None,
    semester: str | None = None,
    regulation: str | None = None,
):
    query = select(MaterialDocument)
    if college_id is not None:
        query = query.where(MaterialDocument.college_id == college_id)
    elif college is not None:
        query = query.where(MaterialDocument.college == college)
    if semester is not None:
        query = query.where(MaterialDocument.semester == semester)
    if regulation is not None:
        query = query.where(MaterialDocument.regulation == regulation)
    return query


async def list_material_documents(
    *,
    college_id: int | None = None,
    college: str | None = None,
    semester: str | None = None,
    regulation: str | None = None,
) -> list[MaterialDocumentRead]:
    session_factory = get_session_factory()
    if session_factory is None:
        return []

    with session_factory() as session:
        documents = session.execute(
            _document_scope_filters(college_id, college, semester, regulation)
        ).scalars().all()
    return [MaterialDocumentRead.model_validate(document) for document in documents]


async def upload_material_document(
    *,
    file: UploadFile,
    college: str,
    semester: str,
    regulation: str,
    college_id: int | None = None,
) -> MaterialDocumentRead:

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file is required")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_MATERIAL_SUFFIXES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file type: {suffix or 'unknown'}")

    session_factory = get_session_factory()
    if session_factory is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured")

    upload_dir = Path("app/uploads/materials")
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_path = upload_dir / f"temp_{Path(file.filename).name}"

    try:
        with open(temp_path, "wb") as f_out:
            while True:
                chunk = await file.read(1024 * 64)
                if not chunk:
                    break
                f_out.write(chunk)

        content_hash = file_content_hash(temp_path)
        chunks = parse_material_file(temp_path)
        if not chunks:
            if temp_path.exists():
                temp_path.unlink()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file did not contain readable text")

        with session_factory() as session:
            existing = session.execute(
                select(MaterialDocument).where(MaterialDocument.content_hash == content_hash)
            ).scalar_one_or_none()
            if existing is not None:
                if temp_path.exists():
                    temp_path.unlink()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This file has already been indexed")

            # Move temp file to persistent hash named file
            persistent_path = upload_dir / f"{content_hash}{suffix}"
            if persistent_path.exists():
                persistent_path.unlink()
            temp_path.rename(persistent_path)

            document = MaterialDocument(
                college=college,
                college_id=college_id,
                semester=semester,
                regulation=regulation,
                file_name=file.filename,
                file_path=str(persistent_path),
                mime_type=file.content_type,
                content_hash=content_hash,
                embedding_model="local-text",
                chunk_count=len(chunks),
            )
            session.add(document)
            session.flush()

            embedding_model = "all-MiniLM-L6-v2"
            try:
                ids = index_chunks(
                    chunks,
                    college=college,
                    semester=semester,
                    regulation=regulation,
                    document_id=document.id,
                    content_hash=content_hash,
                )
            except RuntimeError:
                # Keep local uploads usable when optional vector-indexing packages
                # are not installed. The stored chunks remain available locally.
                embedding_model = "local-text"
                ids = [f"local:{content_hash}:{index}" for index in range(len(chunks))]

            document.embedding_model = embedding_model

            for index, chunk in enumerate(chunks):
                session.add(
                    MaterialChunk(
                        document_id=document.id,
                        chunk_index=index,
                        content=chunk.content,
                        page_number=chunk.page_number,
                        chroma_id=ids[index],
                        college=college,
                        college_ref_id=college_id,
                        semester=semester,
                        regulation=regulation,
                    )
                )


            session.commit()
            session.refresh(document)

        return MaterialDocumentRead.model_validate(document)
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc



async def search_material_documents(payload: MaterialSearchRequest) -> dict[str, list[list[object]]]:
    try:
        return search_chunks(
            payload.query,
            college=payload.college,
            semester=payload.semester,
            regulation=payload.regulation,
            limit=payload.limit,
        )
    except RuntimeError as exc:
        session_factory = get_session_factory()
        if session_factory is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured") from exc

        terms = payload.query.lower().split()
        with session_factory() as session:
            query = select(MaterialChunk).where(
                MaterialChunk.college == payload.college,
                MaterialChunk.semester == payload.semester,
                MaterialChunk.regulation == payload.regulation,
            )
            chunks = session.execute(query).scalars().all()

        ranked = sorted(
            chunks,
            key=lambda chunk: sum(term in chunk.content.lower() for term in terms),
            reverse=True,
        )[:payload.limit]
        return {
            "documents": [[chunk.content for chunk in ranked]],
            "metadatas": [[{
                "college": chunk.college,
                "semester": chunk.semester,
                "regulation": chunk.regulation,
                "document_id": chunk.document_id,
                "page_number": chunk.page_number,
            } for chunk in ranked]],
            "distances": [[0.0 for _ in ranked]],
        }


async def get_material_document_detail(material_id: int):
    session_factory = get_session_factory()
    if session_factory is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured")

    with session_factory() as session:
        document = session.get(MaterialDocument, material_id)
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material document not found")

        chunks = session.execute(
            select(MaterialChunk)
            .where(MaterialChunk.document_id == material_id)
            .order_by(MaterialChunk.chunk_index.asc())
        ).scalars().all()

        return {
            "id": document.id,
            "college": document.college,
            "semester": document.semester,
            "regulation": document.regulation,
            "file_name": document.file_name,
            "file_path": document.file_path,
            "mime_type": document.mime_type,
            "content_hash": document.content_hash,
            "embedding_model": document.embedding_model,
            "chunk_count": document.chunk_count,
            "created_at": document.created_at,
            "updated_at": document.updated_at,
            "chunks": [
                {
                    "id": c.id,
                    "chunk_index": c.chunk_index,
                    "content": c.content,
                    "page_number": c.page_number,
                }
                for c in chunks
            ]
        }


async def delete_material_document(material_id: int):
    session_factory = get_session_factory()
    if session_factory is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured")

    with session_factory() as session:
        document = session.get(MaterialDocument, material_id)
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material document not found")

        # Delete from chroma
        try:
            from app.services.material_indexing import get_chroma_collection
            get_chroma_collection().delete(where={"document_id": material_id})
        except (ImportError, RuntimeError):
            pass

        if document.file_path and Path(document.file_path).exists():
            Path(document.file_path).unlink()

        session.execute(delete(MaterialChunk).where(MaterialChunk.document_id == material_id))
        session.delete(document)
        session.commit()
