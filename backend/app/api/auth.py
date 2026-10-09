from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    StudentRegisterRequest,
    TeacherAcceptInvitationRequest,
    UpdateProfileRequest,
    UserPublic,
)
from app.services.auth_service import (
    authenticate_user,
    get_current_user_from_token,
    issue_token,
    update_user_profile,
    register_student_from_registry,
    accept_teacher_invitation,
    create_user,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def _to_public_user(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        phone=user.phone,
        department=user.department,
        year_of_study=user.year_of_study,
        bio=user.bio,
        college=user.college,
        college_id=user.college_id,
        student_registry_id=user.student_registry_id,
        regulation=user.regulation,
        semester=user.semester,
        learning_subject=user.learning_subject,
        learning_topic=user.learning_topic,
        learning_goal=user.learning_goal,
        onboarding_complete=user.onboarding_complete,
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> AuthResponse:
    """Internal account provisioning and testing endpoint."""
    user = await create_user(payload.email, payload.full_name, payload.password, payload.role)
    token = issue_token(user)
    return AuthResponse(access_token=token, user=_to_public_user(user))

@router.post("/register/student", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_student(payload: StudentRegisterRequest) -> AuthResponse:
    """College-authorized student registration gate validated against StudentRegistry."""
    user = await register_student_from_registry(
        college_code=payload.college_code,
        student_identifier=payload.student_identifier,
        official_email=payload.official_email,
        full_name=payload.full_name,
        password=payload.password,
    )
    token = issue_token(user)
    return AuthResponse(access_token=token, user=_to_public_user(user))


@router.post("/invitations/accept", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def accept_invitation(payload: TeacherAcceptInvitationRequest) -> AuthResponse:
    """Accept college-issued teacher invitation token and activate teacher account."""
    user = await accept_teacher_invitation(
        token=payload.invitation_token,
        full_name=payload.full_name,
        password=payload.password,
    )
    token = issue_token(user)
    return AuthResponse(access_token=token, user=_to_public_user(user))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    user = await authenticate_user(payload.email, payload.password)
    token = issue_token(user)
    return AuthResponse(access_token=token, user=_to_public_user(user))


@router.get("/me", response_model=UserPublic)
async def me(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> UserPublic:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    user = await get_current_user_from_token(credentials.credentials)
    return _to_public_user(user)


@router.patch("/profile", response_model=UserPublic)
async def update_profile(
    payload: UpdateProfileRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserPublic:
    """Update the authenticated user's profile details."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    user = await get_current_user_from_token(credentials.credentials)
    updated_user = await update_user_profile(user.id, payload)
    return _to_public_user(updated_user)
