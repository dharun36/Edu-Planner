import pytest
from app.models.user import User
from app.services.auth_service import issue_token
from app.db.database import get_session_factory


@pytest.fixture
def teacher_token(client):
    factory = get_session_factory()
    with factory() as db:
        teacher = User(
            email="testteacher_cls@example.com",
            full_name="Test Teacher",
            role="teacher",
            hashed_password="hashed_pwd"
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        token = issue_token(teacher)
        t_id = teacher.id
    return token, t_id


@pytest.fixture
def student_token(client):
    factory = get_session_factory()
    with factory() as db:
        student = User(
            email="teststudent_cls@example.com",
            full_name="Test Student",
            role="student",
            hashed_password="hashed_pwd"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        token = issue_token(student)
        s_id = student.id
    return token, s_id


def test_create_class_teacher(client, teacher_token):
    token, _ = teacher_token
    payload = {
        "name": "Web Development 101",
        "college": "Kongu Engineering College",
        "year": "4",
        "semester": "7",
        "regulation": "2022",
        "section": "A"
    }
    response = client.post(
        "/api/classes",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Web Development 101"
    assert len(data["code"]) == 6
    assert data["code"].isupper()


def test_create_class_student_forbidden(client, student_token):
    token, _ = student_token
    payload = {"name": "Hacking Class"}
    response = client.post(
        "/api/classes",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_teacher_get_classes(client, teacher_token):
    token, _ = teacher_token
    client.post("/api/classes", json={"name": "Class 1"}, headers={"Authorization": f"Bearer {token}"})
    client.post("/api/classes", json={"name": "Class 2"}, headers={"Authorization": f"Bearer {token}"})

    response = client.get("/api/classes/teacher", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_student_join_and_leave_class(client, teacher_token, student_token):
    t_token, _ = teacher_token
    s_token, _ = student_token

    # 1. Teacher creates class
    res = client.post("/api/classes", json={"name": "Data Structures"}, headers={"Authorization": f"Bearer {t_token}"})
    class_data = res.json()
    code = class_data["code"]
    class_id = class_data["id"]

    # 2. Student joins class with invalid code
    res_err = client.post("/api/classes/join", json={"code": "INVALID"}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_err.status_code == 404

    # 3. Student joins class with valid code
    res_join = client.post("/api/classes/join", json={"code": code}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_join.status_code == 200
    assert res_join.json()["id"] == class_id

    # 4. Student tries joining again (duplicate join)
    res_dup = client.post("/api/classes/join", json={"code": code}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_dup.status_code == 400

    # 5. Student views joined classes
    res_st_cls = client.get("/api/classes/student", headers={"Authorization": f"Bearer {s_token}"})
    assert res_st_cls.status_code == 200
    assert len(res_st_cls.json()) == 1

    # 6. Teacher views class members
    res_mem = client.get(f"/api/classes/{class_id}/members", headers={"Authorization": f"Bearer {t_token}"})
    assert res_mem.status_code == 200
    members = res_mem.json()
    assert len(members) == 1
    assert members[0]["student_email"] == "teststudent_cls@example.com"

    # 7. Student leaves class
    res_leave = client.delete(f"/api/classes/{class_id}/leave", headers={"Authorization": f"Bearer {s_token}"})
    assert res_leave.status_code == 200

    # Verify student joined classes is now empty
    res_after = client.get("/api/classes/student", headers={"Authorization": f"Bearer {s_token}"})
    assert len(res_after.json()) == 0


def test_classroom_features_and_authorization(client, teacher_token, student_token):
    t_token, _ = teacher_token
    s_token, _ = student_token

    # Another student (not joined)
    factory = get_session_factory()
    with factory() as db:
        other_student = User(
            email="other_student@example.com",
            full_name="Other Student",
            role="student",
            hashed_password="hashed_pwd"
        )
        db.add(other_student)
        db.commit()
        db.refresh(other_student)
        other_token = issue_token(other_student)

    # 1. Teacher creates class
    res = client.post(
        "/api/classes",
        json={
            "name": "Machine Learning",
            "college": "Kongu Engineering College",
            "year": "4",
            "semester": "7",
            "regulation": "2022",
            "section": "B"
        },
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert res.status_code == 201
    class_data = res.json()
    class_id = class_data["id"]
    code = class_data["code"]

    # 2. Unenrolled student tries to access class details or overview -> 403 Forbidden
    res_unauth = client.get(f"/api/classes/{class_id}", headers={"Authorization": f"Bearer {other_token}"})
    assert res_unauth.status_code == 403

    res_unauth_ov = client.get(f"/api/classes/{class_id}/overview", headers={"Authorization": f"Bearer {other_token}"})
    assert res_unauth_ov.status_code == 403

    # 3. Student joins class
    res_join = client.post("/api/classes/join", json={"code": code}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_join.status_code == 200

    # 4. Student accesses class details
    res_details = client.get(f"/api/classes/{class_id}", headers={"Authorization": f"Bearer {s_token}"})
    assert res_details.status_code == 200
    assert res_details.json()["name"] == "Machine Learning"

    # 5. Student accesses classroom overview
    res_ov = client.get(f"/api/classes/{class_id}/overview", headers={"Authorization": f"Bearer {s_token}"})
    assert res_ov.status_code == 200
    ov_data = res_ov.json()
    assert ov_data["classroom"]["id"] == class_id
    assert "progress" in ov_data
    assert "required_skills" in ov_data

    # 6. Student accesses classroom materials
    res_mat = client.get(f"/api/classes/{class_id}/materials", headers={"Authorization": f"Bearer {s_token}"})
    assert res_mat.status_code == 200
    assert isinstance(res_mat.json(), list)

    # 7. Student accesses classroom skills
    res_sk = client.get(f"/api/classes/{class_id}/skills", headers={"Authorization": f"Bearer {s_token}"})
    assert res_sk.status_code == 200
    assert "required_skills" in res_sk.json()
    assert "skills" in res_sk.json()

    # 8. Student accesses classroom curriculum
    res_cur = client.get(f"/api/classes/{class_id}/curriculum", headers={"Authorization": f"Bearer {s_token}"})
    assert res_cur.status_code == 200
    assert "units" in res_cur.json()
    assert len(res_cur.json()["units"]) > 0

    # 9. Student accesses classroom learning plans
    res_lp = client.get(f"/api/classes/{class_id}/learning-plans", headers={"Authorization": f"Bearer {s_token}"})
    assert res_lp.status_code == 200
    assert isinstance(res_lp.json(), list)

    # 10. Student accesses classroom progress
    res_prog = client.get(f"/api/classes/{class_id}/progress", headers={"Authorization": f"Bearer {s_token}"})
    assert res_prog.status_code == 200
    assert res_prog.json()["class_id"] == class_id
    assert "overall_progress_percent" in res_prog.json()

    # 11. Student asks AI a question
    res_ask = client.post(
        f"/api/classes/{class_id}/ask-ai",
        json={"question": "What are the core supervised learning algorithms?"},
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert res_ask.status_code == 200
    ask_data = res_ask.json()
    assert "answer" in ask_data
    assert len(ask_data["answer"]) > 0
    assert "sources" in ask_data

