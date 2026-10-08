from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, JSON, Float
from sqlalchemy.orm import mapped_column, relationship, Mapped
from app.db.database import Base

class LearningEvidence(Base):
    __tablename__ = 'learning_evidences'
    
    id = mapped_column(Integer, primary_key=True, index=True)
    user_id = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    college_id = mapped_column(ForeignKey('colleges.id', ondelete='SET NULL'), nullable=True, index=True)
    task_id = mapped_column(ForeignKey('learning_tasks.id', ondelete='SET NULL'), nullable=True, index=True)
    skill_id = mapped_column(ForeignKey('skills.id', ondelete='SET NULL'), nullable=True, index=True)
    evidence_type = mapped_column(String(50), nullable=False, index=True)
    score = mapped_column(Float, nullable=False, default=0.0)
    notes = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Verification(Base):
    __tablename__ = 'verifications'
    
    id = mapped_column(Integer, primary_key=True, index=True)
    plan_id = mapped_column(ForeignKey('learning_plans.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    college_id = mapped_column(ForeignKey('colleges.id', ondelete='SET NULL'), nullable=True, index=True)
    questions = mapped_column(JSON, nullable=False)
    answers = mapped_column(JSON, nullable=True)
    correct_count = mapped_column(Integer, default=0)
    total_count = mapped_column(Integer, default=0)
    score_percent = mapped_column(Float, default=0.0)
    passed = mapped_column(Boolean, default=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
