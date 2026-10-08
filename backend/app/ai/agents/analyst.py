import json
import logging
from typing import Dict, Any

from app.ai.state import AgentState, AnalystResult
from app.ai.providers import get_llm_provider
from app.ai.exceptions import LLMConfigurationError, LLMAPIError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert learning-needs analyst.
Your job is to analyze a student's persistent learner model, domain academic skills, specific topic skill gaps, learning goals, and context to produce a structured learning-needs analysis.

You MUST follow these rules:
1. Identify skill gaps strictly based on the supplied academic skills and topic prerequisite gaps.
2. Consider both domain academic skills (e.g. Arrays, Recursion, Binary Trees) and cognitive dimensions.
3. ADAPTIVE PRINCIPLE: Skills with high mastery (>=70%) do NOT require remediation. Target weak (<70%) or missing prerequisites first, followed by core target skills.
4. Distinguish clearly between strengths/known skills and weaknesses/missing skills.
5. Respect any provided curriculum and RAG context; do NOT invent curriculum facts.
6. Recommend learning priorities and a high-level learning strategy.
7. Return ONLY valid JSON matching the exact schema below. Do not include markdown code blocks. Do not produce the final lesson plan.

JSON Schema:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "priority_skills": ["string"],
  "recommended_focus": "string",
  "prerequisite_gaps": ["string"],
  "learning_strategy": "string",
  "analysis_summary": "string"
}
"""

async def run_analyst(state: AgentState) -> Dict[str, Any]:
    """
    Analyst Agent node for the LangGraph workflow.
    Analyzes the student's current state and generates a structured AnalystResult.
    """
    # Validate required state
    required_keys = ["student_id", "subject", "topic", "learning_goal", "skill_scores"]
    for key in required_keys:
        if key not in state:
            raise LLMConfigurationError(f"Missing required state field for Analyst: {key}")

    # Build the user prompt
    prompt_lines = [
        f"Subject: {state['subject']}",
        f"Topic: {state['topic']}",
        f"Learning Goal: {state['learning_goal']}",
    ]

    if state.get("academic_skills"):
        prompt_lines.append("\nCurrent Academic Skill Mastery (Persistent Learner Model):")
        for sk_name, sk_score in state["academic_skills"].items():
            prompt_lines.append(f"- {sk_name}: {sk_score:.0f}%")

    prompt_lines.extend([
        "\nCognitive Skill Scores:",
        f"- Numerical Calculation: {state['skill_scores'].numerical_calculation}",
        f"- Abstract Thinking: {state['skill_scores'].abstract_thinking}",
        f"- Logical Reasoning: {state['skill_scores'].logical_reasoning}",
        f"- Association/Analogy: {state['skill_scores'].association_analogy}",
        f"- Spatial Imagination: {state['skill_scores'].spatial_imagination}"
    ])


    if state.get("skill_gaps"):
        gaps = state["skill_gaps"]
        prompt_lines.append("\nSpecific Skill Profile for Topic:")
        if gaps.get("known_skills"):
            prompt_lines.append(f"- Mastered/Known Skills: {', '.join(gaps['known_skills'])}")
        if gaps.get("weak_skills"):
            prompt_lines.append(f"- Weak Skills: {', '.join(gaps['weak_skills'])}")
        if gaps.get("missing_skills"):
            prompt_lines.append(f"- Missing Skills: {', '.join(gaps['missing_skills'])}")
        if gaps.get("prerequisites"):
            prompt_lines.append(f"- Prerequisite Skills: {', '.join(gaps['prerequisites'])}")

    if state.get("curriculum_context"):
        prompt_lines.append(f"\nCurriculum Context:\n{state['curriculum_context']}")
        
    if state.get("rag_context"):
        prompt_lines.append(f"\nRAG Context:\n{state['rag_context']}")

    prompt = "\n".join(prompt_lines)

    # Invoke provider
    settings = get_settings()
    
    logger.info(f"[Agent: Analyst] RAG Chunks: {state.get('rag_chunks_retrieved', 0)}")
    
    try:
        provider_name = "groq"
        model_name = settings.groq_analyst_model
        logger.info(f"[Agent: Analyst] Invoking Provider: {provider_name}, Model: {model_name}")
        provider = get_llm_provider(provider_name, model=model_name, temperature=0.7)
        raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
    except Exception as e:
        logger.warning(f"Analyst agent groq error: {e}. Falling back to openrouter provider...")
        try:
            provider_name = "openrouter"
            model_name = settings.openrouter_analyst_model
            logger.info(f"[Agent: Analyst] Invoking Provider: {provider_name}, Model: {model_name}")
            provider = get_llm_provider(provider_name, model=model_name, temperature=0.7)
            raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
        except Exception as e2:
            logger.warning(f"Analyst agent openrouter error: {e2}. Falling back to gemini provider...")
            try:
                provider_name = "gemini"
                model_name = settings.gemini_model
                logger.info(f"[Agent: Analyst] Invoking Provider: {provider_name}, Model: {model_name}")
                provider = get_llm_provider(provider_name)
                raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
            except Exception as e3:
                logger.error(f"Analyst agent provider fallback failed: {e3}")
                raise

    # Parse response safely
    try:
        # Strip potential markdown formatting that LLMs sometimes hallucinate
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
            
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
            
        data = json.loads(clean_response.strip())
        list_fields = ["strengths", "weaknesses", "priority_skills", "prerequisite_gaps"]
        for field in list_fields:
            if field in data and isinstance(data[field], str):
                data[field] = [data[field]]
        
        # Validate through Pydantic
        result = AnalystResult(**data)
        
        return {"analyst_result": result}
        
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Analyst agent parsing error: {e}. Raw response: {raw_response}")
        raise LLMAPIError(f"Failed to parse Analyst response into structured format: {e}") from e
