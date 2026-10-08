from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Basic profile fields
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    year_of_study: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    college: Mapped[str | None] = mapped_column(String(255), nullable=True)
    regulation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # --- MVP: Persistent Learning Goal ---
    # These fields store the student's current learning context so they never
    # have to re-enter it during adaptive replanning.
    learning_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    learning_topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    learning_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # --- Institutional fields (deferred / optional) ---
    college_id: Mapped[int | None] = mapped_column(ForeignKey('colleges.id', ondelete='SET NULL'), nullable=True, index=True)
    student_registry_id: Mapped[int | None] = mapped_column(ForeignKey('student_registry.id', ondelete='SET NULL'), nullable=True)
