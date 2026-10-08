"""
Materials API — Adaptive Learning MVP

Students can optionally upload learning materials (PDF, DOCX, TXT, MD) to provide
context for AI plan generation.  College/institution scoping has been removed —
materials are associated with the student's own profile.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.material import MaterialDocumentRead, MaterialDocumentDetail, MaterialSearchRequest
from app.services.material_service import (
    list_material_documents,
    search_material_documents,
    upload_material_document,
    get_material_document_detail,
    delete_material_document,
)

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialDocumentRead])
async def materials_list(
    current_user: User = Depends(get_current_user),
) -> list[MaterialDocumentRead]:
    """List all materials accessible to the current student."""
    return await list_material_documents(
        college_id=None,
        college=current_user.learning_subject or "General",
        semester=current_user.semester,
        regulation=current_user.regulation,
    )


@router.post("", response_model=MaterialDocumentRead, status_code=status.HTTP_201_CREATED)
async def material_upload(
    college: str = Form(default="", max_length=255),
    subject: str = Form(default="", max_length=255),
    semester: str = Form(default="1", max_length=50),
    regulation: str = Form(default="General", max_length=100),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> MaterialDocumentRead:
    """
    Upload a learning material document.

    The document is indexed for vector search and can be used as context
    for AI learning plan generation.  Upload is optional — plans work
    without materials using general domain knowledge.
    """
    effective_subject = college or subject or current_user.learning_subject or "General"
    return await upload_material_document(
        file=file,
        college=effective_subject,
        semester=semester,
        regulation=regulation,
        college_id=None,
    )


@router.post("/search", response_model=dict[str, list[list[Any]]])
async def material_search(
    payload: MaterialSearchRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, list[list[Any]]]:
    """Search material chunks by relevance to a query."""
    return await search_material_documents(payload)


@router.get("/{material_id}", response_model=MaterialDocumentDetail)
async def get_material_detail(
    material_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get full details of a material document including its chunks."""
    return await get_material_document_detail(material_id)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
):
    """Delete a material document."""
    from fastapi import Response
    await delete_material_document(material_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
