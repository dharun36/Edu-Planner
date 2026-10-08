from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import StudentSkill, StudentSkillHistory
from app.models.evidence import LearningEvidence, Verification
from app.models.learning_plan import LearningPlan
from app.models.user import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def compute_mastery_level(score: float) -> str:
    if score >= 80.0:
        return "Mastered"
    elif score >= 60.0:
        return "Proficient"
    elif score >= 40.0:
        return "Developing"
    else:
        return "Novice"


def save_verification_questions(
    db: Session,
    plan_id: int,
    user_id: int,
    college_id: Optional[int],
    questions: list[dict[str, Any]],
) -> Verification:
    """Persists verification questions to the database for this plan."""
    verification = Verification(
        plan_id=plan_id,
        user_id=user_id,
        college_id=college_id,
        questions=questions,
        answers=[],
        correct_count=0,
        total_count=len(questions),
        score_percent=0.0,
        passed=False,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)
    return verification


def get_latest_verification_for_plan(db: Session, plan_id: int) -> Optional[Verification]:
    return db.execute(
        select(Verification)
        .where(Verification.plan_id == plan_id)
        .order_by(Verification.created_at.desc())
    ).scalars().first()


def record_verification_and_update_learner_model(
    db: Session,
    user: User,
    plan: LearningPlan,
    verification: Verification,
    answers_submitted: list[dict[str, Any]],
) -> tuple[bool, float, int, int, str, float, str]:
    """
    Evaluates verification answers, persists result, and deterministically
    updates the persistent learner model.
    Returns: (passed, score_percent, correct_count, total_count, message, new_mastery, skill_category)
    """
    questions = verification.questions or []
    total_count = len(questions) if len(questions) > 0 else 5
    correct_count = 0

    # Build question answer lookup
    expected_map = {q.get("id"): q.get("correct_answer") for q in questions}

    for user_ans in answers_submitted:
        qid = user_ans.get("question_id")
        selected = user_ans.get("selected_option")
        expected = expected_map.get(qid)
        if expected and selected and str(selected).strip() == str(expected).strip():
            correct_count += 1

    score_percent = round((correct_count / max(total_count, 1)) * 100.0, 1)
    passed = score_percent >= 60.0

    # 1. Update Verification DB record
    verification.answers = answers_submitted
    verification.correct_count = correct_count
    verification.total_count = total_count
    verification.score_percent = score_percent
    verification.passed = passed

    # 2. Update Learning Plan status
    if passed:
        plan.status = "completed"

    # 3. Deterministically update StudentSkill
    # Topic is the primary subject-matter skill
    skill_category = plan.topic.strip()
    student_skill = db.execute(
        select(StudentSkill).where(
            StudentSkill.user_id == user.id,
            StudentSkill.skill_category.ilike(skill_category),
        )
    ).scalars().first()

    now = utc_now()
    if student_skill:
        prev_score = student_skill.score
        # Weighted update: 40% previous score, 60% verification performance
        new_score = round(0.4 * prev_score + 0.6 * score_percent, 1)
        new_score = max(0.0, min(100.0, new_score))

        # Record history before mutating
        history = StudentSkillHistory(
            user_id=user.id,
            skill_category=student_skill.skill_category,
            score=student_skill.score,
            evidence_type="verification",
            recorded_at=now,
        )
        db.add(history)

        student_skill.score = new_score
        student_skill.mastery_level = compute_mastery_level(new_score)
        student_skill.last_updated = now
    else:
        new_score = score_percent
        student_skill = StudentSkill(
            user_id=user.id,
            college_id=user.college_id,
            skill_category=skill_category,
            score=new_score,
            mastery_level=compute_mastery_level(new_score),
            last_updated=now,
        )
        db.add(student_skill)

    # 4. Record Learning Evidence
    evidence = LearningEvidence(
        user_id=user.id,
        college_id=None,  # MVP: no college scoping
        evidence_type="verification_test",
        score=score_percent,
        notes=f"Verification for '{plan.topic}' scored {correct_count}/{total_count} ({score_percent}%)",
        created_at=now,
    )
    db.add(evidence)

    db.commit()
    db.refresh(verification)
    db.refresh(plan)
    db.refresh(student_skill)

    if passed:
        msg = f"Congratulations! You scored {score_percent:.0f}% ({correct_count}/{total_count}). Your mastery of {plan.topic} increased to {new_score:.0f}%! Plan completed ★"
    else:
        msg = f"You scored {score_percent:.0f}% ({correct_count}/{total_count}). Mastery adjusted to {new_score:.0f}%. Score at least 60% to complete the plan."

    return passed, score_percent, correct_count, total_count, msg, new_score, skill_category
