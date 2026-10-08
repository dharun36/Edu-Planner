from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import mapped_column, relationship, Mapped
from app.db.database import Base

class Program(Base):
    __tablename__ = 'programs'
    id = mapped_column(Integer, primary_key=True, index=True)
    department_id = mapped_column(ForeignKey('departments.id', ondelete='CASCADE'), nullable=False, index=True)
    name = mapped_column(String(255), nullable=False)
    code = mapped_column(String(50), nullable=True, index=True)
    description = mapped_column(Text, nullable=True)
    is_active = mapped_column(Boolean, default=True, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    department = relationship('Department', back_populates='programs')
    semesters = relationship('Semester', back_populates='program', cascade='all, delete-orphan')
