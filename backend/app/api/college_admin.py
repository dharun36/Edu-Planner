from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
import secrets

from app.db.database import get_session_factory
from app.models.college import College, StudentRegistry, TeacherInvitation
from app.models.user import User
from app.models.curriculum import Department
from app.models.program import Program
from app.dependencies.auth import require_role

router = APIRouter(prefix="/college-admin", tags=["college-admin"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

def get_admin_college_id(current_user: User) -> int:
    if not current_user.college_id:
        raise HTTPException(status_code=403, detail="Admin has no college assigned")
    return current_user.college_id

# --- Schemas ---
class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: Optional[str] = None
    description: Optional[str] = None

class DepartmentPublic(BaseModel):
    id: int
    name: str
    code: Optional[str]
    description: Optional[str]
    is_active: bool
    college_id: Optional[int]
    model_config = {"from_attributes": True}

class ProgramCreate(BaseModel):
    department_id: int
    name: str = Field(min_length=2, max_length=255)
    code: Optional[str] = None
    description: Optional[str] = None

class ProgramPublic(BaseModel):
    id: int
    department_id: int
    name: str
    code: Optional[str]
    description: Optional[str]
    is_active: bool
    model_config = {"from_attributes": True}

class StudentRegistryCreate(BaseModel):
    student_identifier: str = Field(min_length=1, max_length=100)
    official_email: str = Field(min_length=5, max_length=255)
    full_name: str = Field(min_length=2, max_length=255)
    department_id: Optional[int] = None
    batch_year: Optional[str] = None
    current_semester: Optional[str] = None

class StudentRegistryPublic(BaseModel):
    id: int
    college_id: int
    student_identifier: str
    official_email: str
    full_name: str
    department_id: Optional[int]
    program_id: Optional[int]
    batch_year: Optional[str]
    current_semester: Optional[str]
    status: str
    registered_user_id: Optional[int]
    created_at: datetime
    model_config = {"from_attributes": True}

class TeacherInviteRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    department_id: Optional[int] = None

class CollegeStatsResponse(BaseModel):
    total_students: int
    registered_students: int
    total_teachers: int
    total_departments: int
    total_programs: int
    students_needing_attention: int

# --- College Stats ---
@router.get("/stats", response_model=CollegeStatsResponse)
def get_college_stats(
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    
    total_students = db.execute(
        select(func.count(StudentRegistry.id)).where(StudentRegistry.college_id == college_id)
    ).scalar() or 0
    
    registered_students = db.execute(
        select(func.count(StudentRegistry.id)).where(
            StudentRegistry.college_id == college_id,
            StudentRegistry.status == 'registered'
        )
    ).scalar() or 0
    
    total_teachers = db.execute(
        select(func.count(User.id)).where(
            User.college_id == college_id,
            User.role == 'teacher'
        )
    ).scalar() or 0
    
    total_departments = db.execute(
        select(func.count(Department.id)).where(Department.college_id == college_id)
    ).scalar() or 0
    
    total_programs = db.execute(
        select(func.count(Program.id))
        .join(Department, Program.department_id == Department.id)
        .where(Department.college_id == college_id)
    ).scalar() or 0
    
    return CollegeStatsResponse(
        total_students=total_students,
        registered_students=registered_students,
        total_teachers=total_teachers,
        total_departments=total_departments,
        total_programs=total_programs,
        students_needing_attention=0,  # Will be computed later
    )

# --- Departments ---
@router.get("/departments", response_model=List[DepartmentPublic])
def list_departments(
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    depts = db.execute(
        select(Department).where(Department.college_id == college_id).order_by(Department.name)
    ).scalars().all()
    return depts

@router.post("/departments", response_model=DepartmentPublic, status_code=201)
def create_department(
    payload: DepartmentCreate,
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    dept = Department(
        name=payload.name.strip(),
        code=payload.code.strip() if payload.code else None,
        description=payload.description,
        is_active=True,
        college_id=college_id,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.patch("/departments/{dept_id}", response_model=DepartmentPublic)
def update_department(
    dept_id: int,
    payload: DepartmentCreate,
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    dept = db.get(Department, dept_id)
    if not dept or dept.college_id != college_id:
        raise HTTPException(status_code=404, detail="Department not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        if hasattr(dept, field):
            setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return dept

# --- Programs ---
@router.get("/programs", response_model=List[ProgramPublic])
def list_programs(
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    programs = db.execute(
        select(Program)
        .join(Department, Program.department_id == Department.id)
        .where(Department.college_id == college_id)
        .order_by(Program.name)
    ).scalars().all()
    return programs

@router.post("/programs", response_model=ProgramPublic, status_code=201)
def create_program(
    payload: ProgramCreate,
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    dept = db.get(Department, payload.department_id)
    if not dept or dept.college_id != college_id:
        raise HTTPException(status_code=404, detail="Department not found in your college")
    program = Program(
        department_id=payload.department_id,
        name=payload.name.strip(),
        code=payload.code,
        description=payload.description,
        is_active=True,
    )
    db.add(program)
    db.commit()
    db.refresh(program)
    return program

# --- Student Registry ---
@router.get("/students", response_model=List[StudentRegistryPublic])
def list_students(
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    students = db.execute(
        select(StudentRegistry)
        .where(StudentRegistry.college_id == college_id)
        .order_by(StudentRegistry.full_name)
    ).scalars().all()
    return students

@router.post("/students", response_model=StudentRegistryPublic, status_code=201)
def add_student_to_registry(
    payload: StudentRegistryCreate,
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    # Check uniqueness
    existing = db.execute(
        select(StudentRegistry).where(
            StudentRegistry.college_id == college_id,
            StudentRegistry.student_identifier == payload.student_identifier.strip()
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Student identifier already in registry")
    
    registry = StudentRegistry(
        college_id=college_id,
        student_identifier=payload.student_identifier.strip(),
        official_email=payload.official_email.lower().strip(),
        full_name=payload.full_name.strip(),
        department_id=payload.department_id,
        batch_year=payload.batch_year,
        current_semester=payload.current_semester,
        status='active',
    )
    db.add(registry)
    db.commit()
    db.refresh(registry)
    return registry

@router.patch("/students/{registry_id}/status")
def update_student_status(
    registry_id: int,
    status: str,  # active or inactive
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    registry = db.get(StudentRegistry, registry_id)
    if not registry or registry.college_id != college_id:
        raise HTTPException(status_code=404, detail="Student not found")
    if status not in ('active', 'inactive'):
        raise HTTPException(status_code=400, detail="Status must be active or inactive")
    registry.status = status
    db.commit()
    return {"message": f"Student status updated to {status}"}

# --- Teacher Invitations ---
@router.post("/teachers/invite", status_code=201)
def invite_teacher(
    payload: TeacherInviteRequest,
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    
    # Check if email already has an account
    existing_user = db.execute(
        select(User).where(User.email == payload.email.lower().strip())
    ).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already has an account")
    
    # Check for existing unused invitation
    existing_invite = db.execute(
        select(TeacherInvitation).where(
            TeacherInvitation.college_id == college_id,
            TeacherInvitation.email == payload.email.lower().strip(),
            TeacherInvitation.is_used == False
        )
    ).scalar_one_or_none()
    if existing_invite:
        raise HTTPException(status_code=409, detail="Active invitation already exists for this email")
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    invitation = TeacherInvitation(
        college_id=college_id,
        email=payload.email.lower().strip(),
        invitation_token=token,
        is_used=False,
        department_id=payload.department_id,
        expires_at=expires_at,
        invited_by_id=current_user.id,
    )
    db.add(invitation)
    db.commit()
    
    return {
        "message": "Teacher invitation created",
        "invitation_token": token,
        "email": payload.email,
        "expires_at": expires_at.isoformat(),
    }

@router.get("/teachers", response_model=List[dict])
def list_teachers(
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    teachers = db.execute(
        select(User).where(
            User.college_id == college_id,
            User.role == 'teacher'
        ).order_by(User.full_name)
    ).scalars().all()
    return [
        {"id": t.id, "email": t.email, "full_name": t.full_name, "is_active": t.is_active}
        for t in teachers
    ]

@router.patch("/teachers/{teacher_id}/status")
def update_teacher_status(
    teacher_id: int,
    is_active: bool,
    current_user: User = Depends(require_role("college_admin")),
    db: Session = Depends(get_db)
):
    college_id = get_admin_college_id(current_user)
    teacher = db.get(User, teacher_id)
    if not teacher or teacher.college_id != college_id or teacher.role != 'teacher':
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.is_active = is_active
    db.commit()
    return {"message": f"Teacher {'activated' if is_active else 'deactivated'}"}
