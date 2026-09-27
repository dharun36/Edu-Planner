from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ClassCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Class Name")
    college: Optional[str] = None
    year: Optional[str | int] = None
    semester: Optional[str | int] = None
    regulation: Optional[str | int] = None
    section: Optional[str] = None


class ClassJoinRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20, description="Class Code")


class ClassMemberStudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    student_name: str
    student_email: str
    joined_at: datetime


class ClassroomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    name: str
    code: str
    college: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    regulation: Optional[str] = None
    section: Optional[str] = None
    is_active: bool
    member_count: int = 0
    created_at: datetime


class ClassroomAskAIRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="Question about classroom materials or subject")


class ClassroomAskAISource(BaseModel):
    file_name: str
    page_number: Optional[int] = None
    content_snippet: str


class ClassroomAskAIResponse(BaseModel):
    answer: str
    sources: List[ClassroomAskAISource] = Field(default_factory=list)
    rag_grounded: bool = False
    retrieved_chunks: int = 0


class ClassroomProgressResponse(BaseModel):
    class_id: int
    overall_progress_percent: int
    total_tasks: int
    completed_tasks: int
    plans_completed: int
    total_plans: int
    skills_assessed: int
    average_skill_score: float
    topics_completed_count: int
    assessments_completed_count: int


class ClassroomOverviewResponse(BaseModel):
    classroom: ClassroomResponse
    materials_count: int
    enrolled_count: int
    active_plan: Optional[dict] = None
    progress: ClassroomProgressResponse
    required_skills: List[str] = Field(default_factory=list)
    student_skills: List[dict] = Field(default_factory=list)
    recent_materials: List[dict] = Field(default_factory=list)

