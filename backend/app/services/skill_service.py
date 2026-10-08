from __future__ import annotations

from typing import Any, List, Optional
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.models.skill import Skill, SkillPrerequisite
from app.models.curriculum import Topic, Subject
from app.models.assessment import StudentSkill


def list_skills(
    db: Session,
    topic_id: Optional[int] = None,
    college_id: Optional[int] = None,
) -> List[Skill]:
    query = select(Skill).where(Skill.is_active == True)
    if topic_id is not None:
        query = query.where(Skill.topic_id == topic_id)
    if college_id is not None:
        query = query.where(or_(Skill.college_id == college_id, Skill.college_id.is_(None)))
    return db.execute(query.order_by(Skill.order_index.asc(), Skill.name.asc())).scalars().all()


def get_skill_by_id(db: Session, skill_id: int) -> Optional[Skill]:
    return db.get(Skill, skill_id)


def create_skill(
    db: Session,
    name: str,
    topic_id: int,
    college_id: Optional[int] = None,
    description: Optional[str] = None,
    order_index: Optional[int] = None,
) -> Skill:
    skill = Skill(
        name=name.strip(),
        topic_id=topic_id,
        college_id=college_id,
        description=description,
        order_index=order_index or 0,
        is_active=True,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


def add_prerequisite(
    db: Session,
    skill_id: int,
    prerequisite_skill_id: int,
) -> SkillPrerequisite:
    existing = db.execute(
        select(SkillPrerequisite).where(
            SkillPrerequisite.skill_id == skill_id,
            SkillPrerequisite.prerequisite_skill_id == prerequisite_skill_id,
        )
    ).scalar_one_or_none()

    if existing:
        return existing

    link = SkillPrerequisite(
        skill_id=skill_id,
        prerequisite_skill_id=prerequisite_skill_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def compute_skill_gaps(
    db: Session,
    user_id: int,
    topic_name: str,
    subject_name: Optional[str] = None,
    college_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Computes a student's skill gaps and prerequisite analysis.
    Checks structured Skill entities where available, and falls back to
    curriculum learning objectives and student skill records.
    """
    # 1. Fetch user's current assessed skills
    user_skills_list = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == user_id)
    ).scalars().all()
    user_skills_map: dict[str, float] = {
        s.skill_category.lower(): s.score for s in user_skills_list
    }

    # 2. Find matching topic
    topic_clean = topic_name.strip()
    topic = db.execute(
        select(Topic).where(Topic.name.ilike(f"%{topic_clean}%"))
    ).scalars().first()

    skills_for_topic: List[Skill] = []
    if topic:
        skills_for_topic = list_skills(db, topic_id=topic.id, college_id=college_id)

    required_skills: list[str] = []
    prerequisite_skills: list[str] = []

    if skills_for_topic:
        for sk in skills_for_topic:
            required_skills.append(sk.name)
            # Find prerequisites
            for prereq_rel in sk.prerequisites:
                if prereq_rel.prerequisite:
                    prerequisite_skills.append(prereq_rel.prerequisite.name)
    else:
        # Default topic-derived skill requirements
        required_skills = [
            f"{topic_clean} Fundamentals",
            f"{topic_clean} Practical Application",
            f"{topic_clean} Advanced Principles",
        ]
        if subject_name:
            prerequisite_skills = [f"{subject_name.strip()} Basics", "Core Programming & Syntax"]
        else:
            prerequisite_skills = ["Foundational Syntax & Logic", "Core Problem Solving"]

    # Deduplicate
    required_skills = list(dict.fromkeys(required_skills))
    prerequisite_skills = list(dict.fromkeys(prerequisite_skills))

    known_skills: list[str] = []
    weak_skills: list[str] = []
    missing_skills: list[str] = []
    priority_order: list[str] = []

    all_target_skills = prerequisite_skills + required_skills

    for skill_name in all_target_skills:
        skill_key = skill_name.lower()
        score = user_skills_map.get(skill_key)

        # Also check partial/fuzzy match in user skills
        if score is None:
            for k, sc in user_skills_map.items():
                if k in skill_key or skill_key in k:
                    score = sc
                    break

        if score is not None:
            if score >= 70.0:
                known_skills.append(f"{skill_name} ({int(score)}%)")
            elif score > 0:
                weak_skills.append(f"{skill_name} ({int(score)}%)")
                priority_order.append(skill_name)
            else:
                missing_skills.append(f"{skill_name} (0%)")
                priority_order.append(skill_name)
        else:
            missing_skills.append(f"{skill_name} (Unassessed)")
            priority_order.append(skill_name)

    return {
        "required_skills": required_skills,
        "prerequisites": prerequisite_skills,
        "known_skills": known_skills if known_skills else ["General Conceptual Understanding"],
        "weak_skills": weak_skills,
        "missing_skills": missing_skills,
        "priority_order": priority_order if priority_order else required_skills,
    }
