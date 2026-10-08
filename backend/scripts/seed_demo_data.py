"""
Seed Demo Accounts and Multi-Tenant College Environment.
Run with:
    python scripts/seed_demo_data.py
"""
import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.db.database import get_session_factory, init_db
from app.models.user import User
from app.models.college import College, StudentRegistry, TeacherInvitation
from app.models.curriculum import Department
from app.models.program import Program
from app.models.assessment import StudentSkill, StudentSkillHistory
from app.core.security import hash_password


def seed_demo_data():
    import asyncio
    asyncio.run(init_db())
    session = get_session_factory()()
    try:
        print("[1/5] Checking / Creating Platform Admin...")
        platform_admin = session.query(User).filter_by(email="platform.admin@eduplanner.io").first()
        if not platform_admin:
            platform_admin = User(
                email="platform.admin@eduplanner.io",
                hashed_password=hash_password("Admin123!"),
                full_name="Platform Super Admin",
                role="platform_admin",
                is_active=True,
            )
            session.add(platform_admin)
            session.flush()
            print("  -> Created Platform Admin: platform.admin@eduplanner.io / Admin123!")
        else:
            print("  -> Platform Admin already exists.")

        print("[2/5] Checking / Creating College Tenant...")
        college = session.query(College).filter_by(code="KEC").first()
        if not college:
            college = College(
                name="Kongu Engineering College",
                code="KEC",
                domain="kongu.edu",
                description="Autonomous Engineering Institution",
                is_active=True,
            )
            session.add(college)
            session.flush()
            print(f"  -> Created College: {college.name} (Code: {college.code}, ID: {college.id})")
        else:
            print(f"  -> College already exists (ID: {college.id})")

        print("[3/5] Checking / Creating College Admin...")
        college_admin = session.query(User).filter_by(email="college.admin@kec.edu").first()
        if not college_admin:
            college_admin = User(
                email="college.admin@kec.edu",
                hashed_password=hash_password("Admin123!"),
                full_name="Dr. S. K. Raman (College Admin)",
                role="college_admin",
                college_id=college.id,
                college=college.name,
                is_active=True,
            )
            session.add(college_admin)
            session.flush()
            print("  -> Created College Admin: college.admin@kec.edu / Admin123!")
        else:
            print("  -> College Admin already exists.")

        print("[4/5] Checking / Creating Academic Structure...")
        dept = session.query(Department).filter_by(name="Computer Science & Engineering", college_id=college.id).first()
        if not dept:
            dept = Department(
                name="Computer Science & Engineering",
                code="CSE",
                description="Department of Computer Science & Engineering",
                college_id=college.id,
                is_active=True,
            )
            session.add(dept)
            session.flush()

        program = session.query(Program).filter_by(name="B.E. Computer Science", department_id=dept.id).first()
        if not program:
            program = Program(
                name="B.E. Computer Science",
                code="BE-CSE",
                description="4-year Undergraduate Degree",
                department_id=dept.id,
                is_active=True,
            )
            session.add(program)
            session.flush()
            print("  -> Created Department (CSE) and Program (B.E. Computer Science)")

        print("[5/5] Checking / Creating Student Registry Entry and Teacher Invite...")
        reg_student = session.query(StudentRegistry).filter_by(
            college_id=college.id,
            student_identifier="21CS042"
        ).first()
        if not reg_student:
            reg_student = StudentRegistry(
                college_id=college.id,
                student_identifier="21CS042",
                official_email="student@kec.edu",
                full_name="Arun Kumar",
                department_id=dept.id,
                program_id=program.id,
                batch_year="2021-2025",
                current_semester="7",
                status="active",
            )
            session.add(reg_student)
            print("  -> Enrolled Student in Registry: Roll: 21CS042 | Email: student@kec.edu")

        # Create sample teacher invitation token if none active
        invite = session.query(TeacherInvitation).filter_by(
            college_id=college.id,
            email="prof.sharma@kec.edu",
            is_used=False
        ).first()
        if not invite:
            invite = TeacherInvitation(
                college_id=college.id,
                email="prof.sharma@kec.edu",
                invitation_token="kec-teacher-invite-demo-2026",
                department_id=dept.id,
                is_used=False,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                invited_by_id=college_admin.id,
            )
            session.add(invite)
            print("  -> Created Teacher Invitation Token: kec-teacher-invite-demo-2026 (for prof.sharma@kec.edu)")

        print("[6/6] Checking / Creating Core Adaptive MVP Demo Student...")
        demo_student = session.query(User).filter_by(email="student@eduplanner.io").first()
        if not demo_student:
            demo_student = User(
                email="student@eduplanner.io",
                hashed_password=hash_password("Student123!"),
                full_name="Alex Morgan",
                role="student",
                is_active=True,
                department="Computer Science",
                year_of_study="Year 2",
                learning_subject="Data Structures",
                learning_topic="Binary Search Trees",
                learning_goal="I want to understand and implement Binary Search Trees.",
                onboarding_complete=True,
                college_id=college.id,
                student_registry_id=reg_student.id,
            )
            session.add(demo_student)
            session.flush()

            # Seed the exact Section 25 initial learner state:
            # Recursion = 30%, Tree Fundamentals = 20%, Binary Trees = 10%, BST = 0%
            initial_skills = [
                ("Recursion", 30.0, "Developing"),
                ("Tree Fundamentals", 20.0, "Novice"),
                ("Binary Trees", 10.0, "Novice"),
                ("Binary Search Trees", 0.0, "Novice"),
            ]
            for skill_cat, score, level in initial_skills:
                sk = StudentSkill(
                    user_id=demo_student.id,
                    skill_category=skill_cat,
                    score=score,
                    mastery_level=level,
                    last_updated=datetime.now(timezone.utc),
                )
                session.add(sk)
                session.add(StudentSkillHistory(
                    user_id=demo_student.id,
                    skill_category=skill_cat,
                    score=score,
                    evidence_type="initial_baseline",
                    recorded_at=datetime.now(timezone.utc),
                ))
            print("  -> Created Adaptive MVP Demo Student: student@eduplanner.io / Student123!")
            print("     Initial Learner State: Recursion: 30%, Tree Fundamentals: 20%, Binary Trees: 10%, BST: 0%")
        else:
            print("  -> Adaptive MVP Demo Student already exists.")

        session.commit()
        print("\nDemo seed completed successfully!")
        print("-" * 60)
        print("CORE ADAPTIVE MVP STUDENT LOGIN (SECTION 25 DEMO):")
        print("  URL:      http://127.0.0.1:5173/login")
        print("  Email:    student@eduplanner.io")
        print("  Password: Student123!")
        print("  Redirect: /student/dashboard")
        print("  State:    Recursion: 30%, Tree Fundamentals: 20%, Binary Trees: 10%, BST: 0%")
        print("  Goal:     Binary Search Trees")
        print("-" * 60)
        print("PLATFORM ADMIN LOGIN:")
        print("  URL:      http://127.0.0.1:5173/login")
        print("  Email:    platform.admin@eduplanner.io")
        print("  Password: Admin123!")
        print("  Redirect: /platform-admin/dashboard")
        print("-" * 60)
        print("COLLEGE ADMIN LOGIN:")
        print("  URL:      http://127.0.0.1:5173/login")
        print("  Email:    college.admin@kec.edu")
        print("  Password: Admin123!")
        print("  Redirect: /college-admin/dashboard")
        print("-" * 60)
        print("STUDENT REGISTRATION TEST:")
        print("  URL:      http://127.0.0.1:5173/register")
        print("  College:  KEC")
        print("  Roll No:  21CS042")
        print("  Email:    student@kec.edu")
        print("-" * 60)
        print("TEACHER INVITATION ACCEPTANCE TEST:")
        print("  URL:      http://127.0.0.1:5173/register?tab=teacher&token=kec-teacher-invite-demo-2026")
        print("  Token:    kec-teacher-invite-demo-2026")
        print("-" * 60)

    except Exception as e:
        session.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_demo_data()
