from typing import Literal, Optional

from pydantic import BaseModel, Field

EMAIL_PATTERN = r"^[^\@\s]+@[^\@\s]+\.[^\@\s]+$"

class RegisterRequest(BaseModel):
    """Internal account provisioning request for non-student test/admin flows."""
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_PATTERN)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str

class StudentRegisterRequest(BaseModel):
    """College-authorized student registration validated against StudentRegistry."""
    college_code: str = Field(min_length=1, max_length=50)
    student_identifier: str = Field(min_length=1, max_length=100)
    official_email: str = Field(min_length=5, max_length=255, pattern=EMAIL_PATTERN)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class TeacherAcceptInvitationRequest(BaseModel):
    """Teacher registration validated against a college-issued invitation."""
    invitation_token: str = Field(min_length=10, max_length=255)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class CollegeAdminCreateRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_PATTERN)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    college_id: int


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_PATTERN)
    password: str


class UserPublic(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    phone: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    college_id: Optional[int] = None
    student_registry_id: Optional[int] = None
    regulation: Optional[str] = None
    semester: Optional[str] = None
    # MVP: Persistent learning goal fields
    learning_subject: Optional[str] = None
    learning_topic: Optional[str] = None
    learning_goal: Optional[str] = None
    onboarding_complete: bool = False

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    """Fields a user may update on their own profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    department: Optional[str] = Field(None, max_length=100)
    year_of_study: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = Field(None, max_length=1000)
    college: Optional[str] = Field(None, max_length=255)
    regulation: Optional[str] = Field(None, max_length=50)
    semester: Optional[str] = Field(None, max_length=20)
    # MVP: Allow updating persistent learning goal
    learning_subject: Optional[str] = Field(None, max_length=255)
    learning_topic: Optional[str] = Field(None, max_length=255)
    learning_goal: Optional[str] = Field(None, max_length=2000)
    onboarding_complete: Optional[bool] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserPublic
