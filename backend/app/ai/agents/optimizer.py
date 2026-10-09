import json
import logging
from typing import Dict, Any

from app.ai.state import AgentState, OptimizerResult
from app.ai.providers import get_llm_provider
from app.ai.exceptions import LLMConfigurationError, LLMAPIError
from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a personalized learning-plan optimizer.
Your job is to transform the learning-needs analysis (AnalystResult), curriculum/syllabus context, and RAG materials into a personalized, syllabus-grounded lesson plan.

You MUST follow these rules:
1. MANDATORY SYLLABUS GROUNDING (HIGHEST PRIORITY):
   - When RAG Context contains course materials, syllabus, or unit outlines (tagged [Course Material:...]):
     a. The `lesson_sequence` MUST FAITHFULLY AND DIRECTLY FOLLOW the official syllabus units, subtopics, and concepts from the uploaded material!
     b. Every lesson in `lesson_sequence` must be a real topic directly from the college syllabus (e.g., if Unit 1 covers "Reinforcement Learning Examples, Elements of RL, Limitations and Scope, Tic-Tac-Toe Extended Example, History of RL", your lessons MUST directly cover these exact syllabus components).
     c. NEVER substitute syllabus subtopics with generic basic programming remediation (e.g. basic arrays, generic loops) unless the syllabus itself explicitly includes them.
     d. Cite the exact course material and syllabus in `rag_materials_used`.
2. ADAPTIVE PERSONALIZATION:
   - Adapt the difficulty, explanations, and practice activities according to the student's cognitive skills and strengths/weaknesses.
   - Address prerequisite gaps within the context of the syllabus topic (e.g. in `prerequisite_review`), NOT by hijacking the main lesson sequence.
3. If no RAG context exists, create a rigorous curriculum plan based on standard academic domain knowledge, leave `rag_materials_used` empty, and DO NOT claim the plan is RAG-grounded.
4. PRACTICE ACTIVITIES: You MUST provide a distinct, specific, hands-on practice activity for EACH lesson in `lesson_sequence` (i.e. `practice_activities` MUST have the exact same number of items as `lesson_sequence`). Do NOT provide a single repeated or generic sentence. Each activity must challenge the student specifically on that lesson's syllabus topic.
5. Return ONLY valid JSON matching the exact schema below. Do not include markdown code blocks.

JSON Schema:
{
  "learning_objectives": ["string"],
  "prerequisite_review": "string",
  "lesson_sequence": ["string"],
  "practice_activities": ["string"],
  "difficulty_progression": "string",
  "assessment_strategy": "string",
  "personalization_notes": "string",
  "rag_materials_used": ["string"],
  "expected_skills": ["string"]
}
"""

async def run_optimizer(state: AgentState) -> Dict[str, Any]:
    """
    Optimizer Agent node for the LangGraph workflow.
    Transforms AnalystResult into a personalized draft lesson plan (OptimizerResult).
    """
    required_keys = ["student_id", "subject", "topic", "learning_goal", "skill_scores", "analyst_result"]
    for key in required_keys:
        if key not in state or state[key] is None:
            raise LLMConfigurationError(f"Missing required state field for Optimizer: {key}")

    # Build the user prompt
    analyst_result = state["analyst_result"]
    skill_scores = state["skill_scores"]
    
    prompt_lines = [
        f"Subject: {state['subject']}",
        f"Topic: {state['topic']}",
        f"Learning Goal: {state['learning_goal']}",
        "\nStudent Skill Profile:",
        f"- Numerical Calculation: {skill_scores.numerical_calculation}",
        f"- Abstract Thinking: {skill_scores.abstract_thinking}",
        f"- Logical Reasoning: {skill_scores.logical_reasoning}",
        f"- Association/Analogy: {skill_scores.association_analogy}",
        f"- Spatial Imagination: {skill_scores.spatial_imagination}",
    ]

    if state.get("skill_gaps"):
        gaps = state["skill_gaps"]
        if gaps.get("weak_skills") or gaps.get("missing_skills"):
            prompt_lines.append(f"- Focus Weak/Missing Skills: {', '.join(gaps.get('weak_skills', []) + gaps.get('missing_skills', []))}")
        if gaps.get("known_skills"):
            prompt_lines.append(f"- Known/Mastered Skills (Skip or review briefly): {', '.join(gaps['known_skills'])}")

    prompt_lines.extend([
        "\nAnalyst Result:",
        f"- Identified Weaknesses: {', '.join(analyst_result.weaknesses)}",
        f"- Identified Strengths: {', '.join(analyst_result.strengths)}",
        f"- Priority Skills: {', '.join(analyst_result.priority_skills)}",
        f"- Recommended Focus: {analyst_result.recommended_focus}",
        f"- Prerequisite Gaps: {', '.join(analyst_result.prerequisite_gaps)}",
        f"- Learning Strategy: {analyst_result.learning_strategy}",
        f"- Analysis Summary: {analyst_result.analysis_summary}",
    ])

    if state.get("curriculum_context"):
        prompt_lines.append(f"\nCurriculum Context:\n{state['curriculum_context']}")
        
    if state.get("rag_context"):
        prompt_lines.append(f"\nRAG Context:\n{state['rag_context']}")
    else:
        prompt_lines.append("\nRAG Context: None available for this request.")

    if state.get("evaluator_result") and state.get("optimizer_result"):
        ev_result = state["evaluator_result"]
        prev_plan = state["optimizer_result"]
        prompt_lines.append("\n--- PREVIOUS DRAFT PLAN ---")
        prompt_lines.append(json.dumps(prev_plan.model_dump(), indent=2))
        prompt_lines.append("\n--- EVALUATOR FEEDBACK ON PREVIOUS PLAN ---")
        prompt_lines.append(f"Issues: {', '.join(ev_result.issues)}")
        prompt_lines.append(f"Missing Requirements: {', '.join(ev_result.missing_requirements)}")
        prompt_lines.append(f"Recommendations: {', '.join(ev_result.recommendations)}")
        prompt_lines.append(f"Summary: {ev_result.evaluation_summary}")
        prompt_lines.append("\nPlease improve the draft plan to address these issues.")

    prompt = "\n".join(prompt_lines)

    # Invoke provider
    settings = get_settings()
    
    try:
        provider_name = "openrouter"
        model_name = settings.openrouter_optimizer_model
        logger.info(f"[Agent: Optimizer] Invoking Provider: {provider_name}, Model: {model_name}")
        provider = get_llm_provider(provider_name, model=model_name, temperature=0.7)
        raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
    except Exception as e:
        logger.warning(f"Optimizer agent openrouter error: {e}. Falling back to gemini provider...")
        try:
            provider_name = "gemini"
            model_name = settings.gemini_model
            logger.info(f"[Agent: Optimizer] Invoking Provider: {provider_name}, Model: {model_name}")
            provider = get_llm_provider(provider_name, temperature=0.7)
            raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
        except Exception as e2:
            logger.error(f"Optimizer agent provider fallback failed: {e2}")
            raise

    # Parse response safely
    try:
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
            
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
            
        data = json.loads(clean_response.strip())
        list_fields = ["learning_objectives", "lesson_sequence", "practice_activities", "rag_materials_used", "expected_skills", "adjustments_made"]
        for field in list_fields:
            if field in data and isinstance(data[field], str):
                data[field] = [data[field]]
        result = OptimizerResult(**data)
        
        return {"optimizer_result": result}
        
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Optimizer agent parsing error: {e}. Raw response: {raw_response}")
        raise LLMAPIError(f"Failed to parse Optimizer response into structured format: {e}") from e
