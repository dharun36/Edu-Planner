from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DiagnosticQuestionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    options: list[str]
    skill_category: str
    difficulty: str


class AssessmentStartResponse(BaseModel):
    assessment_id: int


class AssessmentSubmitAnswer(BaseModel):
    question_id: int
    selected_answer: str


class AssessmentSubmitRequest(BaseModel):
    answers: list[AssessmentSubmitAnswer]


class SkillScore(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_category: str
    score: float
    last_updated: datetime


class AddCustomSkillRequest(BaseModel):
    skill_category: str
    initial_score: float = 0.0



class UpdateSkillScoreRequest(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0)
