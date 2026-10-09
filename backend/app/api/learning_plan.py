import logging
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.ai.providers import get_llm_provider
from app.core.config import get_settings
from app.models.user import User
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.models.evidence import LearningEvidence
from app.services.learner_model_service import (
    save_verification_questions,
    get_latest_verification_for_plan,
    record_verification_and_update_learner_model,
    update_skill_on_task_practice,
)
from app.services.lesson_content_service import (
    generate_rich_lesson_content,
    generate_task_hint_and_solution,
)
from app.dependencies.auth import require_role
from app.schemas.learning_plan import (
    LearningPlanResponse,
    LearningTaskResponse,
    VerificationQuestion,
    VerificationSubmitRequest,
    VerificationResultResponse,
    EvaluatePracticeRequest,
    EvaluatePracticeResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning-plans", tags=["learning-plans"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


@router.get("", response_model=List[LearningPlanResponse])
async def list_learning_plans(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    List all learning plans for the authenticated student.
    """
    plans = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .order_by(LearningPlan.created_at.desc())
    ).scalars().unique().all()
    
    return plans


@router.get("/active", response_model=Optional[LearningPlanResponse])
async def get_active_learning_plan(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get the student's currently active learning plan, or null if none exists.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(LearningPlan.status == "active")
        .order_by(LearningPlan.created_at.desc())
    ).scalars().unique().first()
    
    if not plan:
        # Fallback to the most recent learning plan created by this student
        plan = db.execute(
            select(LearningPlan)
            .where(LearningPlan.user_id == current_user.id)
            .order_by(LearningPlan.created_at.desc())
        ).scalars().unique().first()

    return plan


@router.get("/{plan_id}", response_model=LearningPlanResponse)
async def get_learning_plan(
    plan_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get a specific learning plan by ID. 
    Must belong to the authenticated user.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found or not authorized."
        )
        
    return plan


@router.patch("/{plan_id}/activate", response_model=LearningPlanResponse)
async def activate_learning_plan(
    plan_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Set a specific learning plan as active, archiving any other active plans for this student.
    """
    target_plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()

    if not target_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found or not authorized."
        )

    # Archive other active plans for this student
    other_plans = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(LearningPlan.id != plan_id)
        .where(LearningPlan.status == "active")
    ).scalars().all()

    for p in other_plans:
        p.status = "archived"

    target_plan.status = "active"
    db.commit()
    db.refresh(target_plan)
    return target_plan


def _get_task_hint_and_solution(task: LearningTask, subject: str = "", topic: str = "") -> tuple[str, str]:
    return generate_task_hint_and_solution(
        title=task.title,
        subject=subject,
        topic=topic,
        practice=task.practice_activity or "",
    )

    if "array" in combined:
        hint = "Remember to double the underlying buffer capacity when size equals capacity, and copy elements across."
        solution = (
            "class DynamicArray:\n"
            "    def __init__(self, capacity=2):\n"
            "        self.capacity = capacity\n"
            "        self.size = 0\n"
            "        self.data = [None] * capacity\n\n"
            "    def append(self, val):\n"
            "        if self.size == self.capacity:\n"
            "            self._resize(2 * self.capacity)\n"
            "        self.data[self.size] = val\n"
            "        self.size += 1\n\n"
            "    def _resize(self, new_cap):\n"
            "        new_data = [None] * new_cap\n"
            "        for i in range(self.size):\n"
            "            new_data[i] = self.data[i]\n"
            "        self.data = new_data\n"
            "        self.capacity = new_cap"
        )
    elif "recursion" in combined:
        hint = "Always define base cases explicitly (e.g. n <= 1) before writing the recursive step to avoid infinite stack recursion."
        solution = (
            "def fibonacci(n):\n"
            "    # Base cases\n"
            "    if n <= 0:\n"
            "        return 0\n"
            "    if n == 1:\n"
            "        return 1\n"
            "    # Recursive step\n"
            "    return fibonacci(n - 1) + fibonacci(n - 2)\n\n"
            "# Verification:\n"
            "assert fibonacci(5) == 5\n"
            "assert fibonacci(6) == 8"
        )
    elif "traversal" in combined:
        hint = "In-order traversal visits the left subtree, then current node, then right subtree. For a valid BST, this yields strictly ascending values."
        solution = (
            "def inorder_traversal(root):\n"
            "    if not root:\n"
            "        return []\n"
            "    return inorder_traversal(root.left) + [root.val] + inorder_traversal(root.right)\n\n"
            "# Iterative alternative with stack:\n"
            "def inorder_iterative(root):\n"
            "    res, stack, curr = [], [], root\n"
            "    while curr or stack:\n"
            "        while curr:\n"
            "            stack.append(curr)\n"
            "            curr = curr.left\n"
            "        curr = stack.pop()\n"
            "        res.append(curr.val)\n"
            "        curr = curr.right\n"
            "    return res"
        )
    elif "deletion" in combined or "delete" in combined:
        hint = "For nodes with two children, replace the deleted node with its in-order successor (the minimum node in the right subtree)."
        solution = (
            "def get_min(node):\n"
            "    while node.left:\n"
            "        node = node.left\n"
            "    return node\n\n"
            "def delete_node(root, key):\n"
            "    if not root:\n"
            "        return None\n"
            "    if key < root.val:\n"
            "        root.left = delete_node(root.left, key)\n"
            "    elif key > root.val:\n"
            "        root.right = delete_node(root.right, key)\n"
            "    else:\n"
            "        if not root.left:\n"
            "            return root.right\n"
            "        if not root.right:\n"
            "            return root.left\n"
            "        succ = get_min(root.right)\n"
            "        root.val = succ.val\n"
            "        root.right = delete_node(root.right, succ.val)\n"
            "    return root"
        )
    elif "insertion" in combined or "insert" in combined:
        hint = "Compare the value with the current node: recurse left if smaller, recurse right if larger. Return the root after updating links."
        solution = (
            "class BSTNode:\n"
            "    def __init__(self, val):\n"
            "        self.val = val\n"
            "        self.left = None\n"
            "        self.right = None\n\n"
            "def insert(root, val):\n"
            "    if not root:\n"
            "        return BSTNode(val)\n"
            "    if val < root.val:\n"
            "        root.left = insert(root.left, val)\n"
            "    elif val > root.val:\n"
            "        root.right = insert(root.right, val)\n"
            "    return root"
        )
    elif "search" in combined:
        hint = "In a BST, search can eliminate half the tree at each step: go left if target < node.val, go right if target > node.val."
        solution = (
            "def search_bst(root, key):\n"
            "    curr = root\n"
            "    while curr and curr.val != key:\n"
            "        if key < curr.val:\n"
            "            curr = curr.left\n"
            "        else:\n"
            "            curr = curr.right\n"
            "    return curr"
        )
    elif "application" in combined or "practical" in combined or "range" in combined:
        hint = "For range queries, prune branches: only recurse left if low < root.val, and only recurse right if high > root.val."
        solution = (
            "def range_lookup(root, low, high):\n"
            "    results = []\n"
            "    def helper(node):\n"
            "        if not node:\n"
            "            return\n"
            "        if low < node.val:\n"
            "            helper(node.left)\n"
            "        if low <= node.val <= high:\n"
            "            results.append(node.val)\n"
            "        if high > node.val:\n"
            "            helper(node.right)\n"
            "    helper(root)\n"
            "    return results"
        )
    elif "binary tree" in combined and "search" not in combined:
        hint = "Binary tree recursive functions evaluate the current node together with subtrees: `1 + max(left_depth, right_depth)`."
        solution = (
            "class TreeNode:\n"
            "    def __init__(self, val=0, left=None, right=None):\n"
            "        self.val = val\n"
            "        self.left = left\n"
            "        self.right = right\n\n"
            "def max_depth(root):\n"
            "    if not root:\n"
            "        return 0\n"
            "    return 1 + max(max_depth(root.left), max_depth(root.right))\n\n"
            "def count_leaves(root):\n"
            "    if not root:\n"
            "        return 0\n"
            "    if not root.left and not root.right:\n"
            "        return 1\n"
            "    return count_leaves(root.left) + count_leaves(root.right)"
        )
    elif "intro" in combined or "basic" in combined or "foundation" in combined:
        hint = "Create a basic node container and connect pointers between instances, asserting value assignments."
        solution = (
            "class Node:\n"
            "    def __init__(self, val):\n"
            "        self.val = val\n"
            "        self.next = None\n\n"
            "# Instantiate linked chain:\n"
            "head = Node(10)\n"
            "head.next = Node(20)\n"
            "head.next.next = Node(30)\n\n"
            "# Verify links:\n"
            "assert head.val == 10\n"
            "assert head.next.val == 20\n"
            "assert head.next.next.val == 30"
        )
    else:
        hint = "Validate invariants and edge conditions (empty inputs, single elements) before implementing the main logic."
        solution = (
            "def is_valid_bst(node, min_val=float('-inf'), max_val=float('inf')):\n"
            "    if not node:\n"
            "        return True\n"
            "    if not (min_val < node.val < max_val):\n"
            "        return False\n"
            "    return is_valid_bst(node.left, min_val, node.val) and is_valid_bst(node.right, node.val, max_val)"
        )

    return hint, solution


@router.get("/tasks/{task_id}", response_model=LearningTaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get full learning workspace data for a specific task.
    Returns title, learning_objective, content (explanation), practice_activity, hint, and model_solution.
    """
    task = db.execute(
        select(LearningTask)
        .join(LearningModule, LearningTask.module_id == LearningModule.id)
        .join(LearningPlan, LearningModule.learning_plan_id == LearningPlan.id)
        .where(LearningTask.id == task_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or not authorized."
        )

    # Fetch parent module and plan for accurate domain context
    module = db.execute(select(LearningModule).where(LearningModule.id == task.module_id)).scalars().first()
    plan = db.execute(select(LearningPlan).where(LearningPlan.id == module.learning_plan_id)).scalars().first() if module else None
    subject_name = plan.subject if plan else ""
    topic_name = plan.topic if plan else (module.title if module else "")

    # Auto-enrich task content if it contains the old unhelpful syllabus dump or boilerplate placeholder
    is_old_boilerplate = (
        not task.content
        or len(task.content.strip()) < 300
        or "### 📋 Official College Syllabus & Curriculum Context" in task.content
        or "Foundational Definition: Theoretical context and core terminology of" in task.content
        or "### 🎯 Core Conceptual Focus" in task.content
    )
    if is_old_boilerplate and task.task_type == "lesson":
        try:
            rich_content = await generate_rich_lesson_content(
                lesson=task.title,
                subject=subject_name or "Computer Science",
                topic=topic_name or "Core Principles",
                learning_objective=task.learning_objective or "",
            )
            if rich_content and len(rich_content) > 300:
                task.content = rich_content
                db.commit()
                db.refresh(task)
        except Exception as e:
            logger.warning(f"Failed to auto-enrich task {task.id} content: {e}")

    hint, solution = _get_task_hint_and_solution(task, subject=subject_name, topic=topic_name)
    evidence = db.execute(
        select(LearningEvidence)
        .where(LearningEvidence.task_id == task_id)
        .where(LearningEvidence.user_id == current_user.id)
        .where(LearningEvidence.evidence_type == "practice_evaluation")
        .order_by(LearningEvidence.id.desc())
    ).scalars().first()

    return LearningTaskResponse(
        id=task.id,
        module_id=task.module_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        order_index=task.order_index,
        is_completed=task.is_completed,
        learning_objective=task.learning_objective,
        content=task.content,
        practice_activity=task.practice_activity,
        estimated_duration_minutes=task.estimated_duration_minutes,
        difficulty=task.difficulty,
        hint=hint,
        model_solution=solution,
        latest_score=evidence.score if evidence else None,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.post("/tasks/{task_id}/evaluate-practice", response_model=EvaluatePracticeResponse)
async def evaluate_task_practice(
    task_id: int,
    payload: EvaluatePracticeRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Evaluates the student's submitted solution for a task's practice activity.
    Only marks the task as completed if the student achieves a score >= 50%.
    """
    task = db.execute(
        select(LearningTask)
        .join(LearningModule, LearningTask.module_id == LearningModule.id)
        .join(LearningPlan, LearningModule.learning_plan_id == LearningPlan.id)
        .where(LearningTask.id == task_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or not authorized."
        )

    solution = payload.solution.strip()
    if not solution or len(solution) < 15:
        return EvaluatePracticeResponse(
            score=20.0,
            passed=False,
            feedback="Your submission is too brief to evaluate. Please provide a substantive code implementation or analysis answering the practice prompt.",
            strengths=[],
            improvements=[
                "Write a complete function or algorithm covering the required mechanics.",
                "Verify edge cases and output invariants."
            ],
            is_completed=task.is_completed,
        )

    score: Optional[float] = None
    feedback = ""
    strengths: List[str] = []
    improvements: List[str] = []

    prompt = f"""You are an educational code reviewer and computer science grader.
Evaluate the student's solution for the following practice activity:

Lesson Title: {task.title}
Objective: {task.learning_objective or 'Understand core computer science concepts'}
Practice Challenge: {task.practice_activity or 'Implement the described component'}

Student Submission:
{solution}

Evaluate the solution objectively.
Passing threshold is 50/100:
- Give >= 50 (e.g. 60-95) if the student made a genuine, mostly correct or logical effort demonstrating understanding of the core concept.
- Give < 50 (e.g. 15-45) if the answer is completely off-topic, superficial gibberish, or fails to address the practice requirements.

Return valid JSON ONLY in this format:
{{
  "score": <number between 0 and 100>,
  "feedback": "<2-3 sentences evaluating the approach, correctness, and reasoning>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}}"""

    for prov in ["gemini", "groq", "openrouter"]:
        try:
            p = get_llm_provider(prov)
            raw = await p.generate(prompt=prompt)
            clean = raw.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            elif clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            parsed = json.loads(clean.strip())
            score = float(parsed.get("score", 70.0))
            feedback = parsed.get("feedback", "Good effort on this practice exercise.")
            strengths = parsed.get("strengths", ["Addressed core task problem"])
            improvements = parsed.get("improvements", [])
            break
        except Exception as e:
            logger.warning(f"Provider {prov} evaluation failed: {e}")
            continue

    # Heuristic fallback if LLM is unavailable
    if score is None:
        sol_lower = solution.lower()
        code_indicators = ["def ", "class ", "return ", "if ", "for ", "while ", "=", "(", ")", "{", "}"]
        has_code = sum(1 for ind in code_indicators if ind in sol_lower) >= 3
        words = len(solution.split())
        
        keywords = set(w.lower() for w in (task.title + " " + (task.practice_activity or "")).split() if len(w) > 4)
        matched_kw = sum(1 for kw in keywords if kw in sol_lower)
        
        if has_code and (words >= 15 or matched_kw >= 2):
            score = min(88.0, 55.0 + (matched_kw * 7.0) + min(20.0, words * 0.3))
            feedback = f"Good effort! Your implementation demonstrates the required logic for '{task.title}' with appropriate control structures."
            strengths = [
                f"Implemented relevant logic aligned with {task.title}",
                "Structured code with proper syntax and control flow"
            ]
            improvements = [
                "Consider testing additional boundary cases and performance optimizations.",
                "Ensure edge cases like empty inputs or extreme values are validated."
            ]
        elif words >= 25 and matched_kw >= 1:
            score = 60.0
            feedback = f"Your solution outlines the conceptual approach for '{task.title}'. Adding a fully runnable code implementation would make it even stronger."
            strengths = ["Identified foundational principles"]
            improvements = ["Provide a more complete, executable code snippet."]
        else:
            score = 35.0
            feedback = f"The submission does not sufficiently address the specific requirements for '{task.title}'. Please provide a more complete code implementation or detailed step-by-step logic."
            strengths = ["Started writing initial notes"]
            improvements = [
                f"Directly address the practice instructions for {task.title}.",
                "Include concrete code blocks, invariants, and edge case handling."
            ]

    passed = score > 50.0

    skill_update = None
    try:
        # Determine plan topic for Knowledge Domain update
        parent_plan = db.execute(
            select(LearningPlan)
            .join(LearningModule, LearningModule.learning_plan_id == LearningPlan.id)
            .where(LearningModule.id == task.module_id)
        ).scalars().first()
        topic_to_update = (parent_plan.topic if parent_plan else None) or task.title
        skill_update = update_skill_on_task_practice(
            db=db,
            user=current_user,
            plan_topic=topic_to_update,
            score=score,
            passed=passed,
        )
    except Exception as exc:
        logger.warning(f"Failed to update skill model on practice evaluation: {exc}")

    if passed:
        task.is_completed = True
        evidence = LearningEvidence(
            user_id=current_user.id,
            college_id=None,
            task_id=task.id,
            evidence_type="practice_evaluation",
            score=score,
            notes=f"Passed practice activity with score {score:.1f}%",
        )
        db.add(evidence)
        db.commit()
        db.refresh(task)
    else:
        # Task must remain incomplete if score is not strictly greater than 50%
        task.is_completed = False
        evidence = LearningEvidence(
            user_id=current_user.id,
            college_id=None,
            task_id=task.id,
            evidence_type="practice_evaluation",
            score=score,
            notes=f"Attempted practice activity with score {score:.1f}% (Needs > 50%)",
        )
        db.add(evidence)
        db.commit()
        db.refresh(task)

    return EvaluatePracticeResponse(
        score=round(score, 1),
        passed=passed,
        feedback=feedback,
        strengths=strengths,
        improvements=improvements,
        is_completed=task.is_completed,
        skill_update=skill_update,
    )


@router.patch("/tasks/{task_id}/complete", response_model=LearningTaskResponse)
async def complete_task(
    task_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Mark a learning task as completed.
    Validates that the task belongs to the authenticated user's plan.
    Requires that the student has passed with > 50% score.
    """
    task = db.execute(
        select(LearningTask)
        .join(LearningModule, LearningTask.module_id == LearningModule.id)
        .join(LearningPlan, LearningModule.learning_plan_id == LearningPlan.id)
        .where(LearningTask.id == task_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or not authorized."
        )

    # Check for passing practice evidence (> 50%)
    passing_evidence = db.execute(
        select(LearningEvidence)
        .where(LearningEvidence.task_id == task.id)
        .where(LearningEvidence.user_id == current_user.id)
        .where(LearningEvidence.evidence_type == "practice_evaluation")
        .where(LearningEvidence.score > 50.0)
        .order_by(LearningEvidence.id.desc())
    ).scalars().first()

    if not passing_evidence:
        task.is_completed = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must score more than 50% on this task's practice evaluation before marking it as complete."
        )

    task.is_completed = True
    db.commit()
    db.refresh(task)

    hint, solution = _get_task_hint_and_solution(task)
    score_val = getattr(passing_evidence, "score", None) if passing_evidence else None
    return LearningTaskResponse(
        id=task.id,
        module_id=task.module_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        order_index=task.order_index,
        is_completed=task.is_completed,
        learning_objective=task.learning_objective,
        content=task.content,
        practice_activity=task.practice_activity,
        estimated_duration_minutes=task.estimated_duration_minutes,
        difficulty=task.difficulty,
        hint=hint,
        model_solution=solution,
        latest_score=score_val,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )




@router.get("/{plan_id}/verification-questions", response_model=List[VerificationQuestion])
async def get_verification_questions(
    plan_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Generates a 5-MCQ test to verify the student's mastery of the learning path.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found."
        )

    topic = plan.topic or "Course Content"
    subject = plan.subject or "General Knowledge"

    # Extract module titles to give context to the LLM
    module_titles = [m.title for m in plan.modules] if plan.modules else []
    modules_context = "\n".join(f"- {title}" for title in module_titles)

    system_prompt = """You are an expert educational assessor.
Generate exactly 5 multiple-choice questions to test a student's mastery of their learning plan content.
The questions must cover the provided modules, topic, and subject.
Each question must have exactly 4 options labeled A, B, C, D.
Return ONLY valid JSON matching this exact schema, with no markdown code blocks or extra text:
[
  {
    "id": 1,
    "question_text": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A. ..."
  }
]"""

    prompt = f"Subject: {subject}\nTopic: {topic}\nModules:\n{modules_context}"

    settings = get_settings()
    questions_data = None

    try:
        provider_name = "openrouter"
        model_name = settings.openrouter_analyst_model
        provider = get_llm_provider(provider_name, model=model_name, temperature=0.7)
        raw_response = await provider.generate(prompt=prompt, system_prompt=system_prompt)
        
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
            
        questions_data = json.loads(clean_response.strip())
    except Exception as e:
        logger.warning(f"OpenRouter verification questions failed: {e}. Falling back to gemini...")
        try:
            provider_name = "gemini"
            model_name = settings.gemini_model
            provider = get_llm_provider(provider_name)
            raw_response = await provider.generate(prompt=prompt, system_prompt=system_prompt)
            
            clean_response = raw_response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            elif clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
                
            questions_data = json.loads(clean_response.strip())
        except Exception as e2:
            logger.error(f"Gemini fallback failed: {e2}. Using hardcoded templates.")
            questions_data = None

    if not questions_data or not isinstance(questions_data, list) or len(questions_data) < 5:
        questions_data = [
            {
                "id": 1,
                "question_text": f"What is the primary core concept taught in {topic} ({subject})?",
                "options": [
                    f"A. Fundamental theories and operational principles of {topic}",
                    f"B. Arbitrary ungrounded calculations",
                    f"C. Historical non-technical trivia",
                    f"D. None of the above",
                ],
                "correct_answer": f"A. Fundamental theories and operational principles of {topic}",
            },
            {
                "id": 2,
                "question_text": f"Which methodology is key to applying {topic} effectively?",
                "options": [
                    f"A. Random guesswork",
                    f"B. Systematic analysis and structured problem-solving in {topic}",
                    f"C. Ignoring foundational prerequisites",
                    f"D. Manual brute-force without validation",
                ],
                "correct_answer": f"B. Systematic analysis and structured problem-solving in {topic}",
            },
            {
                "id": 3,
                "question_text": f"What is a major advantage of mastering {topic}?",
                "options": [
                    f"A. Decreased efficiency in subject application",
                    f"B. Higher analytical clarity and accurate domain execution",
                    f"C. Complete elimination of all logical reasoning",
                    f"D. No practical benefit",
                ],
                "correct_answer": f"B. Higher analytical clarity and accurate domain execution",
            },
            {
                "id": 4,
                "question_text": f"When evaluating a complex scenario in {subject}, what step should be taken first?",
                "options": [
                    f"A. Jump directly to final output without verification",
                    f"B. Define core constraints and inspect input domain principles",
                    f"C. Disregard topic boundaries",
                    f"D. Rely entirely on intuition",
                ],
                "correct_answer": f"B. Define core constraints and inspect input domain principles",
            },
            {
                "id": 5,
                "question_text": f"How do the components of {topic} interact within {subject}?",
                "options": [
                    f"A. Through integrated pathways that optimize learning outcomes",
                    f"B. Independently with zero correlation",
                    f"C. Exclusively in isolated theoretical environments",
                    f"D. In an unpredictable random manner",
                ],
                "correct_answer": f"A. Through integrated pathways that optimize learning outcomes",
            },
        ]

    # Persist verification questions into DB
    save_verification_questions(
        db=db,
        plan_id=plan.id,
        user_id=current_user.id,
        college_id=current_user.college_id,
        questions=questions_data,
    )

    return [
        VerificationQuestion(
            id=q["id"],
            question_text=q["question_text"],
            options=q["options"]
        ) for q in questions_data
    ]


@router.post("/{plan_id}/verify-submit", response_model=VerificationResultResponse)
async def submit_verification_test(
    plan_id: int,
    payload: VerificationSubmitRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Submits the 5-MCQ verification test.
    Deterministically updates the persistent learner model in PostgreSQL/SQLite.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found."
        )

    verification = get_latest_verification_for_plan(db, plan_id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification test found for this plan. Please generate questions first."
        )

    answers_payload = [
        {"question_id": a.question_id, "selected_option": a.selected_option}
        for a in payload.answers
    ]

    passed, score_percent, correct_count, total_count, msg, new_mastery, skill_cat = (
        record_verification_and_update_learner_model(
            db=db,
            user=current_user,
            plan=plan,
            verification=verification,
            answers_submitted=answers_payload,
        )
    )

    return VerificationResultResponse(
        passed=passed,
        score_percent=score_percent,
        correct_count=correct_count,
        total_count=total_count,
        message=msg,
        new_mastery=new_mastery,
        skill_category=skill_cat,
    )

