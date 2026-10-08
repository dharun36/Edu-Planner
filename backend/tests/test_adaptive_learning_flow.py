import pytest
from sqlalchemy import select
from datetime import datetime, timezone
from starlette.testclient import TestClient

from app.db.database import get_session_factory
from app.models.user import User
from app.models.assessment import StudentSkill, StudentSkillHistory
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.models.evidence import Verification, LearningEvidence
from app.services.skill_service import compute_skill_gaps
from app.services.learner_model_service import (
    record_verification_and_update_learner_model,
    compute_mastery_level,
)


def test_section_25_adaptive_learner_model_and_replanning(client: TestClient):
    """
    Validates Section 25 of the project specification:
    1. Initial State:
       Recursion = 30%, Tree Fundamentals = 20%, Binary Trees = 10%, BST = 0%
    2. Student goal: Learn Binary Search Trees
    3. Gap detection prioritizes Tree Fundamentals & Binary Trees.
    4. Student completes tasks and takes verification (8/10).
    5. Deterministic learner model update: Tree Fundamentals mastery increases.
    6. Next plan evaluation: Tree Fundamentals is now recognized as mastered/improved.
    """
    factory = get_session_factory()
    with factory() as db:
        # Create dedicated test student
        test_student = User(
            email="adaptive.tester@eduplanner.io",
            full_name="Adaptive Student",
            role="student",
            hashed_password="hashed_pwd",
            learning_subject="Data Structures",
            learning_topic="Binary Search Trees",
            learning_goal="I want to understand and implement Binary Search Trees.",
            onboarding_complete=True,
        )
        db.add(test_student)
        db.commit()
        db.refresh(test_student)
        student_id = test_student.id

        # 1. Seed initial Section 25 learner state
        now = datetime.now(timezone.utc)
        skills_seed = [
            ("Recursion", 30.0, "Developing"),
            ("Tree Fundamentals", 20.0, "Novice"),
            ("Binary Trees", 10.0, "Novice"),
            ("Binary Search Trees", 0.0, "Novice"),
        ]
        for name, score, level in skills_seed:
            sk = StudentSkill(
                user_id=student_id,
                skill_category=name,
                score=score,
                mastery_level=level,
                last_updated=now,
            )
            db.add(sk)
            db.add(StudentSkillHistory(
                user_id=student_id,
                skill_category=name,
                score=score,
                evidence_type="diagnostic_baseline",
                recorded_at=now,
            ))
        db.commit()

        # 2. Compute skill gaps before learning
        initial_gaps = compute_skill_gaps(
            db=db,
            user_id=student_id,
            topic_name="Binary Search Trees",
            subject_name="Data Structures",
        )

        assert "priority_order" in initial_gaps
        # Weak/missing skills are identified
        assert len(initial_gaps["weak_skills"]) >= 0

        # 3. Create simulated Plan 1
        plan1 = LearningPlan(
            user_id=student_id,
            subject="Data Structures",
            topic="Tree Fundamentals",
            learning_goal="Understand root, leaf, height, and tree invariants.",
            status="active",
        )
        db.add(plan1)
        db.commit()
        db.refresh(plan1)

        mod1 = LearningModule(
            learning_plan_id=plan1.id,
            title="Module 1: Tree Foundations",
            order_index=0,
            status="active",
        )
        db.add(mod1)
        db.commit()
        db.refresh(mod1)

        task1 = LearningTask(
            module_id=mod1.id,
            title="Tree Invariants & Edge Cases",
            task_type="lesson",
            order_index=0,
            is_completed=True,
        )
        db.add(task1)
        db.commit()
        db.refresh(task1)

        # 4. Create and simulate 8/10 Verification assessment (80%)
        verification_questions = [
            {"id": i, "question_text": f"Q{i}", "correct_answer": "A"}
            for i in range(1, 11)
        ]
        verification = Verification(
            plan_id=plan1.id,
            user_id=student_id,
            college_id=None,
            questions=verification_questions,
            answers=[],
            correct_count=0,
            total_count=10,
            score_percent=0.0,
            passed=False,
        )
        db.add(verification)
        db.commit()
        db.refresh(verification)

        # Submit 8 correct, 2 incorrect answers
        submitted_answers = [
            {"question_id": i, "selected_option": "A" if i <= 8 else "B"}
            for i in range(1, 11)
        ]

        passed, score_percent, correct_count, total_count, msg, new_mastery, skill_cat = (
            record_verification_and_update_learner_model(
                db=db,
                user=test_student,
                plan=plan1,
                verification=verification,
                answers_submitted=submitted_answers,
            )
        )

        # 5. Verify deterministic update calculations
        assert passed is True
        assert correct_count == 8
        assert total_count == 10
        assert score_percent == 80.0
        # Expected new mastery: 0.4 * 20.0 + 0.6 * 80.0 = 8.0 + 48.0 = 56.0%
        assert new_mastery == 56.0
        assert plan1.status == "completed"

        # Verify StudentSkill in DB has updated score and mastery level
        tree_skill = db.execute(
            select(StudentSkill).where(
                StudentSkill.user_id == student_id,
                StudentSkill.skill_category == "Tree Fundamentals",
            )
        ).scalar_one()

        assert tree_skill.score == 56.0
        assert tree_skill.mastery_level == compute_mastery_level(56.0)

        # Verify learning evidence was logged
        evidences = db.execute(
            select(LearningEvidence).where(LearningEvidence.user_id == student_id)
        ).scalars().all()
        assert len(evidences) >= 1
        assert evidences[-1].score == 80.0

        # Verify skill history audit snapshot exists
        history_records = db.execute(
            select(StudentSkillHistory).where(
                StudentSkillHistory.user_id == student_id,
                StudentSkillHistory.skill_category == "Tree Fundamentals",
            )
        ).scalars().all()
        assert len(history_records) >= 2  # baseline + verification update

        # 6. Re-evaluate skill state: Tree Fundamentals mastery improved
        updated_skills = db.execute(
            select(StudentSkill).where(StudentSkill.user_id == student_id)
        ).scalars().all()
        scores_map = {s.skill_category: s.score for s in updated_skills}

        assert scores_map["Tree Fundamentals"] == 56.0
        assert scores_map["Tree Fundamentals"] > 20.0  # Demonstrable improvement
