import pytest
from app.db.database import get_session_factory
from app.models.college import College, StudentRegistry, TeacherInvitation
from app.models.assessment import StudentSkill
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.models.user import User


@pytest.fixture
def setup_colleges(client):
    """Seed two colleges with student registry and teacher invitations."""
    factory = get_session_factory()
    with factory() as session:
        # College A
        col_a = College(name="Apex Institute of Technology", code="AIT", is_active=True)
        session.add(col_a)
        session.flush()

        # College B
        col_b = College(name="Beacon College of Engineering", code="BCE", is_active=True)
        session.add(col_b)
        session.flush()

        # Authorized student in College A
        reg_a = StudentRegistry(
            college_id=col_a.id,
            student_identifier="23CS001",
            official_email="student01@ait.edu",
            full_name="Alice AIT",
            status="active",
        )
        session.add(reg_a)

        # Authorized student in College B
        reg_b = StudentRegistry(
            college_id=col_b.id,
            student_identifier="23EC001",
            official_email="student01@bce.edu",
            full_name="Bob BCE",
            status="active",
        )
        session.add(reg_b)

        # Teacher invite for College A
        from datetime import datetime, timezone, timedelta
        invite_a = TeacherInvitation(
            college_id=col_a.id,
            email="prof.alice@ait.edu",
            invitation_token="VALID_TOKEN_AIT_12345",
            is_used=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        session.add(invite_a)

        session.commit()
        return {
            "col_a_id": col_a.id,
            "col_b_id": col_b.id,
        }


def test_student_registry_registration_gate(client, setup_colleges):
    """Verify students cannot register without matching college registry record."""
    # 1. Attempt with invalid student identifier
    resp = client.post("/auth/register/student", json={
        "college_code": "AIT",
        "student_identifier": "NON_EXISTENT_ID",
        "official_email": "student01@ait.edu",
        "full_name": "Alice AIT",
        "password": "Password123!",
    })
    assert resp.status_code == 404
    assert "Student ID not found" in resp.json()["detail"]

    # 2. Attempt with mismatched official email
    resp = client.post("/auth/register/student", json={
        "college_code": "AIT",
        "student_identifier": "23CS001",
        "official_email": "wrong_email@gmail.com",
        "full_name": "Alice AIT",
        "password": "Password123!",
    })
    assert resp.status_code == 400
    assert "Official email does not match" in resp.json()["detail"]

    # 3. Successful registration with matching registry details
    resp = client.post("/auth/register/student", json={
        "college_code": "AIT",
        "student_identifier": "23CS001",
        "official_email": "student01@ait.edu",
        "full_name": "Alice AIT",
        "password": "Password123!",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"
    assert data["user"]["college_id"] == setup_colleges["col_a_id"]

    # 4. Attempt duplicate registration fails
    resp_dup = client.post("/auth/register/student", json={
        "college_code": "AIT",
        "student_identifier": "23CS001",
        "official_email": "student01@ait.edu",
        "full_name": "Alice AIT",
        "password": "Password123!",
    })
    assert resp_dup.status_code in (400, 409)


def test_teacher_invitation_acceptance(client, setup_colleges):
    """Verify teachers register only via valid college invitation tokens."""
    # 1. Invalid token fails
    resp = client.post("/auth/invitations/accept", json={
        "invitation_token": "INVALID_TOKEN",
        "full_name": "Prof Alice",
        "password": "Password123!",
    })
    assert resp.status_code == 404

    # 2. Valid token succeeds
    resp = client.post("/auth/invitations/accept", json={
        "invitation_token": "VALID_TOKEN_AIT_12345",
        "full_name": "Prof Alice",
        "password": "Password123!",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["role"] == "teacher"
    assert data["user"]["college_id"] == setup_colleges["col_a_id"]

    # 3. Reusing used token fails
    resp_reuse = client.post("/auth/invitations/accept", json={
        "invitation_token": "VALID_TOKEN_AIT_12345",
        "full_name": "Prof Alice",
        "password": "Password123!",
    })
    assert resp_reuse.status_code in (400, 409)


def test_multitenant_teacher_student_isolation(client, setup_colleges):
    """Verify teachers only see students from their own college."""
    # Register Alice at College A
    client.post("/auth/register/student", json={
        "college_code": "AIT",
        "student_identifier": "23CS001",
        "official_email": "student01@ait.edu",
        "full_name": "Alice AIT",
        "password": "Password123!",
    })
    # Register Bob at College B
    client.post("/auth/register/student", json={
        "college_code": "BCE",
        "student_identifier": "23EC001",
        "official_email": "student01@bce.edu",
        "full_name": "Bob BCE",
        "password": "Password123!",
    })
    # Accept Teacher Alice at College A
    resp_t = client.post("/auth/invitations/accept", json={
        "invitation_token": "VALID_TOKEN_AIT_12345",
        "full_name": "Prof Alice",
        "password": "Password123!",
    })
    teacher_token = resp_t.json()["access_token"]
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # Fetch students visible to College A teacher
    resp_students = client.get("/teacher/students", headers=headers)
    assert resp_students.status_code == 200
    students_list = resp_students.json()

    # Must only contain Alice AIT, never Bob BCE
    emails = [s["user"]["email"] for s in students_list]
    assert "student01@ait.edu" in emails
    assert "student01@bce.edu" not in emails


def test_persistent_verification_and_learner_model_update(client, setup_colleges):
    """
    Test the complete learning verification loop:
    1. Student has a plan.
    2. Student requests 5-MCQ verification questions (stored in DB).
    3. Student submits answers.
    4. Learner model is deterministically updated and saved in DB.
    """
    resp_s = client.post("/auth/register/student", json={
        "college_code": "AIT",
        "student_identifier": "23CS001",
        "official_email": "student01@ait.edu",
        "full_name": "Alice AIT",
        "password": "Password123!",
    })
    token = resp_s.json()["access_token"]
    user_id = resp_s.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Seed a LearningPlan for Alice
    factory = get_session_factory()
    with factory() as session:
        plan = LearningPlan(
            user_id=user_id,
            subject="Computer Science",
            topic="Recursion",
            learning_goal="Master recursive algorithms",
            status="active",
        )
        session.add(plan)
        session.flush()

        mod = LearningModule(learning_plan_id=plan.id, title="Recursion Basics", order_index=0)
        session.add(mod)
        session.flush()

        task = LearningTask(module_id=mod.id, title="Factorial function", task_type="lesson", is_completed=False)
        session.add(task)

        # Initial student skill: Recursion = 30%
        sk = StudentSkill(user_id=user_id, skill_category="Recursion", score=30.0)
        session.add(sk)

        session.commit()
        plan_id = plan.id

    # 1. Fetch verification questions (generates & persists to Verification table)
    q_resp = client.get(f"/learning-plans/{plan_id}/verification-questions", headers=headers)
    assert q_resp.status_code == 200
    questions = q_resp.json()
    assert len(questions) >= 5

    # 2. Check Verification DB row exists
    with factory() as session:
        from app.models.evidence import Verification
        from sqlalchemy import select
        v_row = session.execute(select(Verification).where(Verification.plan_id == plan_id)).scalar_one_or_none()
        assert v_row is not None
        assert len(v_row.questions) >= 5
        # Pick the correct answers from the stored test
        correct_answers = {q["id"]: q["correct_answer"] for q in v_row.questions}

    # 3. Submit verification test with 5/5 correct answers
    submit_answers = [{"question_id": q["id"], "selected_option": correct_answers[q["id"]]} for q in questions]
    sub_resp = client.post(
        f"/learning-plans/{plan_id}/verify-submit",
        json={"answers": submit_answers},
        headers=headers,
    )
    assert sub_resp.status_code == 200
    result = sub_resp.json()
    assert result["passed"] is True
    assert result["score_percent"] == 100.0

    # 4. Verify StudentSkill was updated deterministically
    # prev = 30.0, verification = 100.0 -> 0.4*30 + 0.6*100 = 12 + 60 = 72.0%
    with factory() as session:
        updated_skill = session.execute(
            select(StudentSkill).where(StudentSkill.user_id == user_id, StudentSkill.skill_category == "Recursion")
        ).scalar_one()
        assert updated_skill.score == 72.0
        assert updated_skill.mastery_level in ("Proficient", "Mastered")
