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
import asyncio
import json
import logging
import re
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
from app.services.lesson_content_service import (
    generate_rich_lesson_content,
    _build_structured_fallback_lesson,
)

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
            user_id=current_user.id,
            college=current_user.college or "General",
            college_id=current_user.college_id,
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

        # Gather objectives for each lesson
        lesson_objectives_list = []
        for idx in range(len(lesson_seq)):
            if learning_objectives and idx < len(learning_objectives):
                lesson_objectives_list.append(learning_objectives[idx])
            elif learning_objectives:
                lesson_objectives_list.append(learning_objectives[-1])
            else:
                lesson_objectives_list.append("")

        # Concurrently generate rich educational textbook-grade content for all lessons
        generated_contents = await asyncio.gather(
            *[
                generate_rich_lesson_content(
                    lesson=lesson,
                    subject=subject,
                    topic=topic,
                    learning_objective=lesson_objectives_list[idx],
                    syllabus_context=rag_context_str,
                )
                for idx, lesson in enumerate(lesson_seq)
            ],
            return_exceptions=True
        )

        module_order = 0
        for idx, lesson in enumerate(lesson_seq):
            # Build module title from lesson
            mod_title = lesson[:250] if len(lesson) <= 250 else lesson[:247] + "..."
            lesson_objective = lesson_objectives_list[idx]

            # Use rich generated content with safe structured fallback
            gen_content = generated_contents[idx] if idx < len(generated_contents) else None
            if gen_content and not isinstance(gen_content, Exception) and len(str(gen_content).strip()) > 300:
                lesson_content = str(gen_content).strip()
            else:
                lesson_content = _build_structured_fallback_lesson(
                    lesson, subject, topic, lesson_objective, rag_context_str
                )

            # Build practice activity for this lesson
            lesson_practice = _build_lesson_practice(lesson, subject, topic, idx, practice_activities)

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


def _build_lesson_content(lesson: str, subject: str, topic: str, optimizer_result, rag_context: str = "") -> str:
    """Build instructional content for a lesson task, incorporating official syllabus and RAG context."""
    syllabus_snippet = ""
    materials_cited = ""
    if rag_context:
        # Extract textbook / reference sections if present in RAG text
        tb_matches = re.findall(r"(?:Textbook|Reference|Books?|Sutton|Barto|Edition)[\s\S]*?(?=\n\n|$)", rag_context, re.IGNORECASE)
        if tb_matches:
            materials_cited = tb_matches[0].strip()

        # Find matching syllabus lines or units mentioning key terms of this lesson
        lesson_words = [w.lower() for w in re.findall(r"\b\w{3,}\b", lesson)]
        relevant_lines = []
        for line in rag_context.split("\n"):
            line_str = line.strip()
            if not line_str or line_str.startswith("---") or line_str.startswith("["):
                continue
            if any(w in line_str.lower() for w in lesson_words):
                relevant_lines.append(line_str)
        if relevant_lines:
            syllabus_snippet = "\n> ".join(relevant_lines[:4])

    base = [
        f"## {lesson}",
        f"**Subject:** {subject}  |  **Topic:** {topic}",
    ]

    if syllabus_snippet:
        base.extend([
            "### 📋 Official College Syllabus & Curriculum Context",
            f"> {syllabus_snippet}",
        ])

    base.extend([
        "### 🎯 Core Conceptual Focus",
        f"This lesson specifically covers **{lesson}** as prescribed in the academic syllabus for {subject}. "
        f"Master the foundational principles, theoretical underpinnings, and practical formulations of this concept.",
        "### 🔍 Detailed Topics & Key Formulations",
        f"- **Foundational Definition:** Theoretical context and core terminology of {lesson.lower()}.",
        f"- **System Dynamics & Formulation:** How {lesson.lower()} connects to {topic} and the broader subject.",
        f"- **Applications & Trade-offs:** Algorithmic considerations, convergence, and edge cases.",
    ])

    if materials_cited:
        base.extend([
            "### 📚 Prescribed Course Reading & Textbooks",
            f"{materials_cited}",
        ])

    base.extend([
        "### 📝 Guided Study Checklist",
        "1. Read through the syllabus unit topics and make detailed structured notes.",
        "2. Formulate the mathematics, state representations, or pseudo-code on paper.",
        "3. Attempt the hands-on practice challenge below to solidify understanding.",
        "4. Once confident, mark the lesson as completed to unlock verification.",
    ])

    if optimizer_result:
        try:
            notes = getattr(optimizer_result, "personalization_notes", "")
            strategy = getattr(optimizer_result, "difficulty_progression", "")
            if notes:
                base.append(f"### 💡 Adaptive Guidance Note\n{notes}")
            if strategy:
                base.append(f"### 📈 Curriculum Progression\n{strategy}")
        except Exception:
            pass

    return "\n\n".join(base)


def _estimate_difficulty(index: int, total: int) -> str:
    """Estimate task difficulty based on position in the lesson sequence."""
    ratio = index / max(total - 1, 1)
    if ratio < 0.33:
        return "Easy"
    elif ratio < 0.67:
        return "Medium"
    else:
        return "Hard"


def _build_lesson_practice(lesson: str, subject: str, topic: str, idx: int, practice_activities: list[str]) -> str:
    """Build a distinct, lesson-specific practice challenge."""
    # Use distinct optimizer practice activity if available
    if practice_activities and idx < len(practice_activities):
        candidate = practice_activities[idx].strip()
        # If candidate is distinct and not just a single generic line repeated everywhere
        if candidate and (len(practice_activities) > 1 and candidate != practice_activities[0] or idx == 0):
            return candidate

    # Smart generator based on lesson and subject keywords
    lesson_lower = lesson.lower()
    subject_lower = subject.lower()
    if any(k in lesson_lower or k in subject_lower for k in ["cloud", "deployment", "virtualization", "infrastructure", "saas", "paas", "iaas"]):
        return (
            f"**Hands-on Practice: Cloud Architecture & Deployment Analysis**\n\n"
            f"1. **Scenario Evaluation:** An enterprise banking system requires low-latency frontend user scaling while safeguarding sensitive financial records under regulatory compliance.\n"
            f"2. **Trade-Off Assessment:** Contrast Public, Private, and Hybrid models for {lesson} across CapEx/OpEx, tenancy isolation, and data sovereignty.\n"
            f"3. **Architectural Recommendation:** Formulate your recommended infrastructure topology and justify your design choices."
        )
    elif any(k in lesson_lower or k in subject_lower for k in ["reinforcement", "bandit", "mdp", "q-learning", "sarsa"]):
        return (
            f"**Hands-on Practice: Reinforcement Learning Formulation**\n\n"
            f"1. Define the formal MDP tuple $(S, A, P, R, \\gamma)$ for an agent learning {lesson}.\n"
            f"2. Write Python pseudo-code demonstrating the value update equation or policy update rule.\n"
            f"3. Analyze how the agent balances exploration versus exploitation in this scenario."
        )
    elif "array" in lesson_lower:
        return (
            f"**Hands-on Practice: Array Operations & Invariants**\n\n"
            f"1. Implement dynamic array resizing from scratch and test boundary cases (insert at index 0, append beyond capacity).\n"
            f"2. Measure and verify the amortized O(1) insertion runtime vs O(n) reallocation cost.\n"
            f"3. Write test cases covering boundary indices and empty inputs."
        )
    elif "recursion" in lesson_lower:
        return (
            f"**Hands-on Practice: Recursion Mechanics**\n\n"
            f"1. Write a recursive function related to {topic} with explicit base cases and recursive steps.\n"
            f"2. Trace the execution call stack on paper for a small input of size 4 to visualize stack frames.\n"
            f"3. Calculate the maximum recursion depth and memory overhead."
        )
    elif "insertion" in lesson_lower or "insert" in lesson_lower:
        return (
            f"**Hands-on Practice: Insertion & Invariant Maintenance**\n\n"
            f"1. Implement the `insert(value)` operation step-by-step for {topic}.\n"
            f"2. Verify that the structural invariants hold true after inserting duplicates and ordered keys.\n"
            f"3. Trace the sequence `[50, 30, 70, 20, 40, 60, 80]` through your function."
        )
    elif "traversal" in lesson_lower:
        return (
            f"**Hands-on Practice: Tree Traversals**\n\n"
            f"1. Implement in-order, pre-order, and post-order traversals for {topic}.\n"
            f"2. Validate that in-order traversal of a valid BST produces an ascending sorted list.\n"
            f"3. Write an iterative traversal using an explicit stack or queue."
        )
    elif "deletion" in lesson_lower or "delete" in lesson_lower:
        return (
            f"**Hands-on Practice: Node Deletion Edge Cases**\n\n"
            f"1. Code the 3 deletion cases for {topic}: leaf node, single child node, and two children nodes.\n"
            f"2. Implement in-order successor or predecessor replacement for nodes with two children.\n"
            f"3. Test deleting the root node and assert tree invariants remain intact."
        )
    elif "search" in lesson_lower:
        return (
            f"**Hands-on Practice: Search Operation & Complexity**\n\n"
            f"1. Implement iterative and recursive `search(key)` methods for {topic}.\n"
            f"2. Count the exact number of pointer dereferences required to locate an existing vs missing key.\n"
            f"3. Demonstrate the worst-case un-balanced tree scenario vs the optimal O(log n) balanced search."
        )
    elif "application" in lesson_lower or "practical" in lesson_lower:
        return (
            f"**Hands-on Practice: Real-World Application**\n\n"
            f"1. Build a mini lookup index or autocomplete dictionary utilizing {topic}.\n"
            f"2. Implement range queries (e.g. `find_between(low, high)`) and benchmark its efficiency.\n"
            f"3. Document when {topic} outperforms a hash map or linear list."
        )
    elif "basic" in lesson_lower or "intro" in lesson_lower or "foundation" in lesson_lower:
        return (
            f"**Hands-on Practice: Core Foundations**\n\n"
            f"1. Define the fundamental data structure class/struct representing {lesson}.\n"
            f"2. Instantiate a 3-element structure manually in code and verify memory pointers/references.\n"
            f"3. Write assertions confirming that each element satisfies the foundational definitions."
        )
    else:
        return (
            f"**Hands-on Practice: {lesson}**\n\n"
            f"1. Write a minimal code implementation that directly demonstrates {lesson}.\n"
            f"2. Test with at least 3 edge cases (empty input, single element, extreme values).\n"
            f"3. Document the runtime and space complexity invariants for this component."
        )

