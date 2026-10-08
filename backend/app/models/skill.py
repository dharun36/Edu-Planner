from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, UniqueConstraint
from sqlalchemy.orm import mapped_column, relationship, Mapped
from app.db.database import Base

class Skill(Base):
    __tablename__ = 'skills'
    id = mapped_column(Integer, primary_key=True, index=True)
    topic_id = mapped_column(ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, index=True)
    college_id = mapped_column(ForeignKey('colleges.id', ondelete='SET NULL'), nullable=True, index=True)
    name = mapped_column(String(255), nullable=False)
    description = mapped_column(Text, nullable=True)
    order_index = mapped_column(Integer, nullable=True)
    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    prerequisites = relationship('SkillPrerequisite', foreign_keys='SkillPrerequisite.skill_id', back_populates='skill', cascade='all, delete-orphan')

class SkillPrerequisite(Base):
    __tablename__ = 'skill_prerequisites'
    __table_args__ = (UniqueConstraint('skill_id', 'prerequisite_skill_id'),)
    
    id = mapped_column(Integer, primary_key=True, index=True)
    skill_id = mapped_column(ForeignKey('skills.id', ondelete='CASCADE'), nullable=False, index=True)
    prerequisite_skill_id = mapped_column(ForeignKey('skills.id', ondelete='CASCADE'), nullable=False, index=True)
    
    skill = relationship('Skill', foreign_keys=[skill_id], back_populates='prerequisites')
    prerequisite = relationship('Skill', foreign_keys=[prerequisite_skill_id])
