from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from app.db.database import get_session_factory
from app.models.college import College
from app.models.user import User
from app.dependencies.auth import require_role

router = APIRouter(prefix="/platform-admin", tags=["platform-admin"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

# --- Schemas ---
class CollegeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str = Field(min_length=1, max_length=50)
    domain: Optional[str] = None
    description: Optional[str] = None

class CollegeUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CollegePublic(BaseModel):
    id: int
    name: str
    code: Optional[str]
    domain: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class CollegeAdminCreateRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    college_id: int

class PlatformStatsResponse(BaseModel):
    total_colleges: int
    active_colleges: int
    total_users: int
    total_students: int
    total_teachers: int
    total_admins: int

# --- Endpoints ---
@router.get("/stats", response_model=PlatformStatsResponse)
def get_platform_stats(
    current_user: User = Depends(require_role("platform_admin")),
    db: Session = Depends(get_db)
):
    total_colleges = db.execute(select(func.count(College.id))).scalar() or 0
    active_colleges = db.execute(select(func.count(College.id)).where(College.is_active == True)).scalar() or 0
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_students = db.execute(select(func.count(User.id)).where(User.role == 'student')).scalar() or 0
    total_teachers = db.execute(select(func.count(User.id)).where(User.role == 'teacher')).scalar() or 0
    total_admins = db.execute(select(func.count(User.id)).where(User.role.in_(['college_admin', 'platform_admin']))).scalar() or 0
    return PlatformStatsResponse(
        total_colleges=total_colleges,
        active_colleges=active_colleges,
        total_users=total_users,
        total_students=total_students,
        total_teachers=total_teachers,
        total_admins=total_admins,
    )

@router.get("/colleges", response_model=List[CollegePublic])
def list_colleges(
    current_user: User = Depends(require_role("platform_admin")),
    db: Session = Depends(get_db)
):
    colleges = db.execute(select(College).order_by(College.name)).scalars().all()
    return colleges

@router.post("/colleges", response_model=CollegePublic, status_code=201)
def create_college(
    payload: CollegeCreate,
    current_user: User = Depends(require_role("platform_admin")),
    db: Session = Depends(get_db)
):
    existing = db.execute(select(College).where(College.code == payload.code.strip())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="College code already exists")
    college = College(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        domain=payload.domain,
        description=payload.description,
        is_active=True,
    )
    db.add(college)
    db.commit()
    db.refresh(college)
    return college

@router.patch("/colleges/{college_id}", response_model=CollegePublic)
def update_college(
    college_id: int,
    payload: CollegeUpdate,
    current_user: User = Depends(require_role("platform_admin")),
    db: Session = Depends(get_db)
):
    college = db.get(College, college_id)
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(college, field, value)
    db.commit()
    db.refresh(college)
    return college

@router.post("/colleges/{college_id}/admins", status_code=201)
async def create_college_admin_user(
    college_id: int,
    payload: CollegeAdminCreateRequest,
    current_user: User = Depends(require_role("platform_admin")),
    db: Session = Depends(get_db)
):
    from app.services.auth_service import create_college_admin
    college = db.get(College, college_id)
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    user = await create_college_admin(
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
        college_id=college_id,
    )
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "college_id": user.college_id}
