from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.database import get_session_factory
from app.models.college import College, StudentRegistry, TeacherInvitation
from app.models.user import User


@lru_cache(maxsize=1)
def _get_session_factory():
    session_factory = get_session_factory()
    if session_factory is None:
        raise RuntimeError("DATABASE_URL is not configured")
    return session_factory


async def get_user_by_email(email: str) -> User | None:
    def query() -> User | None:
        session_factory = _get_session_factory()
        with session_factory() as session:
            statement = select(User).where(User.email == email.lower())
            return session.scalar(statement)

    return await asyncio.to_thread(query)


async def get_user_by_id(user_id: int) -> User | None:
    def query() -> User | None:
        session_factory = _get_session_factory()
        with session_factory() as session:
            return session.get(User, user_id)

    return await asyncio.to_thread(query)

async def create_user(email: str, full_name: str, password: str, role: str) -> User:
    existing_user = await get_user_by_email(email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    def insert_user() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            user = User(
                email=email.lower().strip(),
                full_name=full_name.strip(),
                role=role,
                hashed_password=hash_password(password),
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(insert_user)


async def create_college_admin(email: str, full_name: str, password: str, college_id: int) -> User:
    existing_user = await get_user_by_email(email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    def insert_admin() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            college = session.get(College, college_id)
            if not college:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="College not found")

            user = User(
                email=email.lower().strip(),
                full_name=full_name.strip(),
                role="college_admin",
                college_id=college_id,
                college=college.name,
                hashed_password=hash_password(password),
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(insert_admin)


async def register_student_from_registry(
    college_code: str,
    student_identifier: str,
    official_email: str,
    full_name: str,
    password: str,
) -> User:
    existing_user = await get_user_by_email(official_email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account with this email already exists")

    def _register() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            # 1. Validate College
            college = session.execute(
                select(College).where(College.code == college_code.strip().upper())
            ).scalar_one_or_none()
            if not college:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"College code '{college_code.strip()}' not found",
                )
            if not college.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This college is currently inactive in the platform",
                )

            # 2. Validate Student Registry
            registry = session.execute(
                select(StudentRegistry).where(
                    StudentRegistry.college_id == college.id,
                    StudentRegistry.student_identifier == student_identifier.strip(),
                )
            ).scalar_one_or_none()
            if not registry:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student ID not found in college registry. Please contact your college administrator.",
                )

            if registry.official_email.lower().strip() != official_email.lower().strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Official email does not match college registry for this student ID.",
                )

            if registry.status != "active":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Student registry record is {registry.status}. Only active students may register.",
                )

            if registry.registered_user_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This student account has already been registered. Please log in.",
                )

            # 3. Create User Account
            user = User(
                email=registry.official_email.lower().strip(),
                full_name=full_name.strip() or registry.full_name,
                role="student",
                college_id=college.id,
                college=college.name,
                student_registry_id=registry.id,
                semester=registry.current_semester,
                year_of_study=registry.batch_year,
                hashed_password=hash_password(password),
                is_active=True,
            )
            session.add(user)
            session.flush()

            # 4. Link back to registry
            registry.registered_user_id = user.id
            registry.status = "registered"
            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(_register)


async def accept_teacher_invitation(
    token: str,
    full_name: str,
    password: str,
) -> User:
    def _accept() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            invitation = session.execute(
                select(TeacherInvitation).where(TeacherInvitation.invitation_token == token.strip())
            ).scalar_one_or_none()

            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invalid or expired invitation token",
                )

            if invitation.is_used:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This invitation token has already been used",
                )

            now_utc = datetime.now(timezone.utc)
            invite_expiry = invitation.expires_at
            if invite_expiry.tzinfo is None:
                invite_expiry = invite_expiry.replace(tzinfo=timezone.utc)

            if invite_expiry < now_utc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This teacher invitation has expired",
                )

            existing_user = session.execute(
                select(User).where(User.email == invitation.email.lower().strip())
            ).scalar_one_or_none()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists",
                )

            college = session.get(College, invitation.college_id)

            user = User(
                email=invitation.email.lower().strip(),
                full_name=full_name.strip(),
                role="teacher",
                college_id=invitation.college_id,
                college=college.name if college else None,
                hashed_password=hash_password(password),
                is_active=True,
            )
            session.add(user)
            invitation.is_used = True
            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(_accept)


async def authenticate_user(email: str, password: str) -> User:
    user = await get_user_by_email(email)
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    if user.role == "student" and user.student_registry_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access requires an active college registry record",
        )
    return user


def issue_token(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        role=user.role,
        college_id=user.college_id,
    )


async def get_current_user_from_token(token: str) -> User:
    payload = decode_access_token(token)
    user_id = int(payload["sub"])
    user = await get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    return user


async def update_user_profile(user_id: int, payload) -> User:
    """Update mutable profile fields for a user. Only non-None fields are updated."""
    def _update() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            user = session.get(User, user_id)
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            update_data = payload.model_dump(exclude_none=True)
            for field, value in update_data.items():
                if hasattr(user, field):
                    setattr(user, field, value)

            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(_update)
