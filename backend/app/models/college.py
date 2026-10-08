from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, UniqueConstraint
from sqlalchemy.orm import mapped_column, relationship, Mapped
from app.db.database import Base

class College(Base):
    __tablename__ = 'colleges'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class StudentRegistry(Base):
    __tablename__ = 'student_registry'
    __table_args__ = (
        UniqueConstraint('college_id', 'student_identifier'),
        UniqueConstraint('college_id', 'official_email'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    college_id: Mapped[int] = mapped_column(ForeignKey('colleges.id', ondelete='CASCADE'), nullable=False, index=True)
    student_identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    official_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey('departments.id', ondelete='SET NULL'), nullable=True, index=True)
    program_id: Mapped[int | None] = mapped_column(ForeignKey('programs.id', ondelete='SET NULL'), nullable=True, index=True)
    batch_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    current_semester: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='active', nullable=False, index=True)
    registered_user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True, unique=True, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    college = relationship('College')

class TeacherInvitation(Base):
    __tablename__ = 'teacher_invitations'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    college_id: Mapped[int] = mapped_column(ForeignKey('colleges.id', ondelete='CASCADE'), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    invitation_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    invited_by_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
