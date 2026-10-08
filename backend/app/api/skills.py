from __future__ import annotations

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.user import User
from app.models.skill import Skill, SkillPrerequisite
from app.models.assessment import StudentSkill, StudentSkillHistory
from app.dependencies.auth import get_current_user, require_role
from app.services.skill_service import (
    list_skills,
    get_skill_by_id,
    create_skill,
    add_prerequisite,
    compute_skill_gaps,
)

router = APIRouter(prefix="/skills", tags=["skills"])


def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


# --- Schemas ---
class SkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    topic_id: int
    description: Optional[str] = None
    order_index: Optional[int] = 0


class SkillPrerequisiteCreate(BaseModel):
    prerequisite_skill_id: int


class SkillPublic(BaseModel):
    id: int
    name: str
    topic_id: int
    college_id: Optional[int] = None
    description: Optional[str] = None
    order_index: Optional[int] = 0
    is_active: bool
    model_config = {"from_attributes": True}


class StudentSkillPublic(BaseModel):
    id: int
    skill_category: str
    score: float
    mastery_level: Optional[str] = None
    last_updated: Any
    model_config = {"from_attributes": True}


class StudentSkillHistoryPublic(BaseModel):
    id: int
    skill_category: str
    score: float
    evidence_type: Optional[str] = None
    recorded_at: Any
    model_config = {"from_attributes": True}


# --- Endpoints ---
@router.get("", response_model=List[SkillPublic])
def get_skills_list(
    topic_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List skills, filtered by topic and scoped to current user's college."""
    return list_skills(db, topic_id=topic_id, college_id=current_user.college_id)


@router.post("", response_model=SkillPublic, status_code=status.HTTP_201_CREATED)
def create_new_skill(
    payload: SkillCreate,
    current_user: User = Depends(require_role("college_admin", "teacher", "platform_admin")),
    db: Session = Depends(get_db),
):
    """Create a new skill under a curriculum topic."""
    skill = create_skill(
        db=db,
        name=payload.name,
        topic_id=payload.topic_id,
        college_id=current_user.college_id,
        description=payload.description,
        order_index=payload.order_index,
    )
    return skill


@router.post("/{skill_id}/prerequisites", status_code=status.HTTP_201_CREATED)
def link_prerequisite_skill(
    skill_id: int,
    payload: SkillPrerequisiteCreate,
    current_user: User = Depends(require_role("college_admin", "teacher", "platform_admin")),
    db: Session = Depends(get_db),
):
    """Link a prerequisite skill to a target skill."""
    skill = get_skill_by_id(db, skill_id)
    prereq = get_skill_by_id(db, payload.prerequisite_skill_id)
    if not skill or not prereq:
        raise HTTPException(status_code=404, detail="Skill or prerequisite skill not found")
    if skill.id == prereq.id:
        raise HTTPException(status_code=400, detail="Skill cannot be a prerequisite of itself")

    link = add_prerequisite(db, skill_id=skill.id, prerequisite_skill_id=prereq.id)
    return {"message": "Prerequisite linked successfully", "id": link.id}


@router.get("/gaps")
def get_skill_gaps(
    topic: str,
    subject: Optional[str] = None,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """
    Computes real-time skill gaps and prerequisite analysis for the authenticated student
    based on their persistent learner model in PostgreSQL/SQLite.
    """
    return compute_skill_gaps(
        db=db,
        user_id=current_user.id,
        topic_name=topic,
        subject_name=subject,
        college_id=current_user.college_id,
    )


@router.get("/student", response_model=List[StudentSkillPublic])
def get_student_learner_model(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Retrieve the persistent learner model (all skills and mastery levels) for the student."""
    skills = db.execute(
        select(StudentSkill)
        .where(StudentSkill.user_id == current_user.id)
        .order_by(StudentSkill.last_updated.desc())
    ).scalars().all()
    return skills


@router.get("/student/history", response_model=List[StudentSkillHistoryPublic])
def get_student_skill_history(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Retrieve skill history progression for the student."""
    history = db.execute(
        select(StudentSkillHistory)
        .where(StudentSkillHistory.user_id == current_user.id)
        .order_by(StudentSkillHistory.recorded_at.desc())
        .limit(50)
    ).scalars().all()
    return history
