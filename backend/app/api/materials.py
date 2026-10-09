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
    semester: str | None = None,
    regulation: str | None = None,
    college: str | None = None,
    current_user: User = Depends(get_current_user),
) -> list[MaterialDocumentRead]:
    """List materials accessible to the current user (personal for students, institutional for college admin/teachers)."""
    if current_user.role == "student":
        return await list_material_documents(
            user_id=current_user.id,
            is_personal=True,
        )
    if current_user.role == "college_admin":
        return await list_material_documents(
            college_id=current_user.college_id,
            college=college or current_user.college,
            semester=semester,
            regulation=regulation,
            is_personal=False,
        )
    if current_user.role == "teacher":
        return await list_material_documents(
            college_id=current_user.college_id,
            college=college or current_user.college or current_user.learning_subject or "General",
            semester=semester or current_user.semester,
            regulation=regulation or current_user.regulation,
            is_personal=False,
        )
    # platform_admin or fallback
    return await list_material_documents(
        college_id=current_user.college_id,
        college=college or current_user.college,
        semester=semester,
        regulation=regulation,
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
    Upload learning material.
    For students: saved as private personal notes separated from college material.
    For college admin / teachers / staff: indexed as institutional course material for students' RAG.
    """
    effective_subject = subject or current_user.learning_subject or "General"
    is_personal = (current_user.role == "student")

    effective_college = "Personal" if is_personal else ""
    if not is_personal:
        if college and college.strip() and college != "Personal":
            effective_college = college.strip()
        elif current_user.college:
            effective_college = current_user.college
        elif current_user.college_id:
            from app.db.database import get_session_factory
            from app.models.college import College
            sf = get_session_factory()
            if sf:
                with sf() as session:
                    c = session.get(College, current_user.college_id)
                    if c:
                        effective_college = c.name
        if not effective_college:
            effective_college = "General"

    return await upload_material_document(
        file=file,
        college=effective_college,
        semester=semester,
        regulation=regulation,
        college_id=current_user.college_id if not is_personal else None,
        user_id=current_user.id,
        is_personal=is_personal,
        subject=effective_subject,
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
    """Get full details of a material document. Enforces ownership for personal materials."""
    detail = await get_material_document_detail(material_id)
    if detail.get("is_personal") and detail.get("user_id") != current_user.id and current_user.role != "platform_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view another student's personal material."
        )
    return detail


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
):
    """Delete a material document. Allows owner, college admin of same college, or platform admin."""
    from fastapi import Response
    from app.db.database import get_session_factory
    from app.models.material import MaterialDocument

    session_factory = get_session_factory()
    if session_factory:
        with session_factory() as session:
            doc = session.get(MaterialDocument, material_id)
            if not doc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
            
            is_owner = (doc.user_id == current_user.id)
            is_college_admin = (
                current_user.role == "college_admin"
                and doc.college_id is not None
                and doc.college_id == current_user.college_id
            )
            is_platform_admin = (current_user.role == "platform_admin")

            if not (is_owner or is_college_admin or is_platform_admin):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to delete this material."
                )

    await delete_material_document(material_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
