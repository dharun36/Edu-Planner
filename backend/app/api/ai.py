"""
AI Learning Plan API — Adaptive Learning MVP

Generates a personalized learning plan using the multi-agent pipeline:
  Analyst → Optimizer → Evaluator

Key MVP changes:
- Removed college/institution scoping from inputs and RAG
- AI plan now persists rich task content (learning_objective, content, practice_activity)
- Stores each lesson as a LearningTask with full instructional workspace data
- Reads student's persistent learning goal from profile if not overridden in request
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.user import User
from app.models.assessment import StudentSkill
from app.models.curriculum import Subject, Topic, LearningObjective
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.dependencies.auth import require_role
from app.schemas.ai import LearningPlanRequest, LearningPlanResponse
from app.ai.state import AgentState, SkillScores
from app.ai.graph import build_learning_graph
from app.ai.exceptions import LLMConfigurationError, LLMAPIError
from app.ai.rag import retrieve_rag_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


@router.post("/learning-plan", response_model=LearningPlanResponse)
async def generate_learning_plan(
    request: LearningPlanRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Generate a personalized adaptive learning plan.

    Uses the student's stored learning goal from profile if request fields are empty.
    The AI receives the full persistent learner model and skill gap analysis.
    """
    # 1. Resolve goal context — prefer request params, fall back to stored profile
    subject = request.subject or current_user.learning_subject or ""
    topic = request.topic or current_user.learning_topic or ""
    learning_goal = request.learning_goal or current_user.learning_goal or ""

    if not subject or not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject and topic are required. Set them in your learning goal or provide them in the request."
        )

    # 2. Load persistent learner model
    skills = db.execute(select(StudentSkill).where(StudentSkill.user_id == current_user.id)).scalars().all()

    skill_kwargs = {}
    academic_skills = {}

    category_map = {
        "numerical calculation": "numerical_calculation",
        "abstract thinking": "abstract_thinking",
        "logical reasoning": "logical_reasoning",
        "association & analogy": "association_analogy",
        "association and analogy": "association_analogy",
        "spatial imagination": "spatial_imagination",
    }

    for skill in skills:
        cat_key = skill.skill_category.lower().strip()
        field_name = category_map.get(cat_key)
        if not field_name:
            field_name = cat_key.replace("&", "").replace("  ", " ").replace(" ", "_").replace("/", "_").replace("__", "_")
        if field_name in SkillScores.model_fields:
            skill_kwargs[field_name] = skill.score
        academic_skills[skill.skill_category] = skill.score

    ai_skills = SkillScores(**skill_kwargs)

    # 3. Compute skill gaps (deterministic backend logic — no LLM involvement)
    from app.services.skill_service import compute_skill_gaps
    skill_gaps = compute_skill_gaps(
        db=db,
        user_id=current_user.id,
        topic_name=topic,
        subject_name=subject,
        college_id=None,  # MVP: no college scoping
    )

    logger.info(
        f"[AI Plan] User {current_user.id} | Subject: {subject} | Topic: {topic} | "
        f"Gaps: {len(skill_gaps.get('weak_skills', []))} weak, {len(skill_gaps.get('missing_skills', []))} missing"
    )

    # 4. Curriculum context from DB (lightweight — no tenant scoping)
    curriculum_parts = []
    subject_model = db.execute(
        select(Subject).where(Subject.name.ilike(f"%{subject}%"))
    ).scalars().first()

    if subject_model:
        curriculum_parts.append(f"Subject: {subject_model.name}")
        if subject_model.description:
            curriculum_parts.append(f"Description: {subject_model.description}")

    topic_model = db.execute(
        select(Topic).where(Topic.name.ilike(f"%{topic}%"))
    ).scalars().first()

    if topic_model:
        curriculum_parts.append(f"Topic: {topic_model.name}")
        if topic_model.description:
            curriculum_parts.append(f"Topic Description: {topic_model.description}")

        objectives = db.execute(
            select(LearningObjective).where(LearningObjective.topic_id == topic_model.id)
        ).scalars().all()
        if objectives:
            obj_list = "\n".join(f"- {obj.name}" for obj in objectives)
            curriculum_parts.append(f"Learning Objectives:\n{obj_list}")

    curriculum_context_str = "\n\n".join(curriculum_parts)

    # 5. RAG context (optional — falls back gracefully when no materials uploaded)
    rag_context_str = ""
    retrieved_chunk_count = 0
    rag_retrieval_status = "No materials uploaded — plan based on general domain knowledge."

    try:
        rag_context_str, retrieved_chunk_count = await retrieve_rag_context(
            subject=subject,
            topic=topic,
            college=current_user.college or "General",
            year=current_user.year_of_study or "",
            semester=current_user.semester or "",
            regulation=current_user.regulation or "",
            n_results=5
        )

        if retrieved_chunk_count > 0:
            rag_retrieval_status = f"Retrieved {retrieved_chunk_count} relevant material chunks."
        else:
            rag_retrieval_status = "No uploaded materials matched — plan uses general domain knowledge."

    except Exception as e:
        logger.warning(f"RAG retrieval error (non-fatal): {e}")
        rag_retrieval_status = "RAG unavailable — plan uses general domain knowledge."

    logger.info(f"[RAG] {rag_retrieval_status}")

    # 6. Build initial agent state
    initial_state: AgentState = {
        "student_id": current_user.id,
        "college_id": None,
        "subject": subject,
        "topic": topic,
        "learning_goal": learning_goal or f"Learn {topic} in {subject}",
        "skill_scores": ai_skills,
        "academic_skills": academic_skills,
        "skill_gaps": skill_gaps,
        "rag_chunks_retrieved": retrieved_chunk_count,
    }

    if curriculum_context_str:
        initial_state["curriculum_context"] = curriculum_context_str
    if rag_context_str:
        initial_state["rag_context"] = rag_context_str

    # 7. Execute Multi-Agent Graph (Analyst → Optimizer → Evaluator)
    try:
        graph = build_learning_graph()
    except RuntimeError as e:
        logger.error(f"AI workflow setup error: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    try:
        final_state = await graph.ainvoke(initial_state)
    except LLMConfigurationError as e:
        logger.error(f"LLM config error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Provider configuration error. Please check backend settings."
        )
    except LLMAPIError as e:
        error_msg = str(e)
        if "401" in error_msg or "403" in error_msg:
            detail = "AI Provider authentication failed. Please check the API key."
        elif "429" in error_msg or "quota" in error_msg.lower():
            detail = "AI Provider rate limit exceeded. Please try again later."
        elif "timeout" in error_msg.lower():
            detail = "AI Provider timed out. Please try again."
        else:
            detail = "AI Provider error. Please try again."
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    except Exception:
        logger.exception("Unexpected AI workflow error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during AI plan generation."
        )

    # 8. Parse final output
    if "final_output" not in final_state:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workflow completed without generating output."
        )

    try:
        final_data = json.loads(final_state["final_output"])
    except json.JSONDecodeError:
        logger.error("Failed to parse final_output JSON from AI graph.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI produced invalid output format."
        )

    # 9. Persist Learning Plan with rich task content
    try:
        # Archive previous active plan for this user+topic
        previous_plans = db.execute(
            select(LearningPlan).where(
                LearningPlan.user_id == current_user.id,
                LearningPlan.status == "active",
            )
        ).scalars().all()
        for old_plan in previous_plans:
            old_plan.status = "archived"

        db_plan = LearningPlan(
            user_id=current_user.id,
            subject=subject,
            topic=topic,
            learning_goal=learning_goal or f"Learn {topic} in {subject}",
            status="active"
        )
        db.add(db_plan)
        db.flush()

        plan_content = final_data.get("plan", {})
        lesson_seq = plan_content.get("lesson_sequence", [])
        practice_activities = plan_content.get("practice_activities", [])
        learning_objectives = plan_content.get("learning_objectives", [])

        # Each lesson becomes its own LearningModule with one LearningTask (lesson)
        # The AI optimizer result contains rich content we store in task fields
        optimizer_result = final_state.get("optimizer_result")

        module_order = 0
        for idx, lesson in enumerate(lesson_seq):
            # Build module title from lesson
            mod_title = lesson[:250] if len(lesson) <= 250 else lesson[:247] + "..."

            # Build learning objective for this lesson
            lesson_objective = ""
            if learning_objectives and idx < len(learning_objectives):
                lesson_objective = learning_objectives[idx]
            elif learning_objectives:
                lesson_objective = learning_objectives[-1]

            # Build task content (explanation) — derived from lesson title + optimizer context
            lesson_content = _build_lesson_content(lesson, subject, topic, optimizer_result)

            # Build practice activity for this lesson
            lesson_practice = ""
            if practice_activities and idx < len(practice_activities):
                lesson_practice = practice_activities[idx]
            elif practice_activities:
                lesson_practice = practice_activities[0]

            db_mod = LearningModule(
                learning_plan_id=db_plan.id,
                title=mod_title,
                description=lesson_objective or f"Module {idx + 1} of the {topic} learning path.",
                order_index=module_order,
                status="pending"
            )
            db.add(db_mod)
            db.flush()

            db_task = LearningTask(
                module_id=db_mod.id,
                title=f"Study: {lesson[:200]}",
                description=lesson_objective,
                task_type="lesson",
                order_index=0,
                learning_objective=lesson_objective,
                content=lesson_content,
                practice_activity=lesson_practice,
                difficulty=_estimate_difficulty(idx, len(lesson_seq)),
                estimated_duration_minutes=20,
            )
            db.add(db_task)
            module_order += 1

        # Add a final "Verify & Practice" module
        if practice_activities:
            verify_mod = LearningModule(
                learning_plan_id=db_plan.id,
                title="Practice & Verification",
                description="Apply what you've learned with hands-on practice activities, then take the verification test.",
                order_index=module_order,
                status="pending"
            )
            db.add(verify_mod)
            db.flush()

            for prac_idx, practice in enumerate(practice_activities):
                db.add(LearningTask(
                    module_id=verify_mod.id,
                    title=practice[:250],
                    description="Hands-on practice activity",
                    task_type="practice",
                    order_index=prac_idx,
                    content=practice,
                    practice_activity=practice,
                    estimated_duration_minutes=15,
                ))

        db.commit()
        logger.info(f"[Plan Saved] Plan ID: {db_plan.id} | Modules: {module_order} | User: {current_user.id}")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist learning plan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save the learning plan. Please try again."
        )

    return LearningPlanResponse(
        status=final_data.get("status", "OK"),
        score=final_data.get("score", 0),
        plan=final_data.get("plan", {}),
        evaluator_feedback=final_data.get("evaluator_feedback", ""),
        issues=final_data.get("issues", []),
        iteration_count=final_state.get("iteration_count", 0),
        skill_gaps=skill_gaps,
        rag_retrieval_status=rag_retrieval_status,
        rag_chunks_retrieved=retrieved_chunk_count
    )


def _build_lesson_content(lesson: str, subject: str, topic: str, optimizer_result) -> str:
    """Build instructional content for a lesson task."""
    base = (
        f"## {lesson}\n\n"
        f"**Subject:** {subject}  |  **Topic:** {topic}\n\n"
        f"### What You'll Learn\n"
        f"This lesson covers **{lesson}**. Study the core concepts, understand the principles, "
        f"and work through the examples carefully before attempting the practice activity.\n\n"
        f"### Key Concepts\n"
        f"- Understand the definition and purpose of {lesson.lower()}\n"
        f"- Learn how {lesson.lower()} relates to the broader topic of {topic}\n"
        f"- Identify common patterns and when to apply this knowledge\n\n"
        f"### Study Tips\n"
        f"1. Read through the concept carefully, taking notes on key terms.\n"
        f"2. Draw diagrams or trace through examples by hand.\n"
        f"3. Attempt the practice activity before checking your answers.\n"
        f"4. When ready, complete the task and move to verification.\n"
    )

    if optimizer_result:
        try:
            notes = getattr(optimizer_result, "personalization_notes", "")
            strategy = getattr(optimizer_result, "difficulty_progression", "")
            if notes:
                base += f"\n### Personalization Note\n{notes}\n"
            if strategy:
                base += f"\n### Difficulty Progression\n{strategy}\n"
        except Exception:
            pass

    return base


def _estimate_difficulty(index: int, total: int) -> str:
    """Estimate task difficulty based on position in the lesson sequence."""
    ratio = index / max(total - 1, 1)
    if ratio < 0.33:
        return "Easy"
    elif ratio < 0.67:
        return "Medium"
    else:
        return "Hard"
