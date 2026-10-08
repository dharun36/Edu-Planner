import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { assessmentApi, Question } from '../../api/assessment';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Badge } from '../../components/common/Badge';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface SkillResult {
  skill_category: string;
  score: number;
}

interface AssessmentResult {
  message: string;
  results?: SkillResult[];
}

export default function Assessment() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'intro' | 'questions' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAssessment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await assessmentApi.start();
      setAssessmentId(response.assessment_id);
      const questionList = await assessmentApi.getQuestions(response.assessment_id);
      setQuestions(questionList);
      setCurrentStep('questions');
    } catch {
      setError('Unable to initialize diagnostic assessment. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (assessmentId === null) return;
    setIsLoading(true);
    setError(null);
    try {
      const answersList = Object.entries(answers).map(([qId, selected]) => ({
        question_id: Number(qId),
        selected_answer: selected,
      }));
      const res = await assessmentApi.submit(assessmentId, { answers: answersList });
      if (user) {
        updateUser({ ...user, onboarding_complete: true });
      }
      setResults(res as AssessmentResult);
      setCurrentStep('results');
    } catch {
      setError('Failed to submit diagnostic assessment. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── 1. INTRO SCREEN ────────────────────────────────────────── */
  if (currentStep === 'intro') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-16 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">
              Diagnostic Assessment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
            General Learning Capacity Assessment
          </h1>
          <p className="text-sm text-[#737373] leading-relaxed">
            This diagnostic measures your foundational cognitive learning capacity across 5 core dimensions.
            Your answers establish your persistent Learner Model. Course and topic selection will be completed next.
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Assessed Core Competencies
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#262626]">
            {[
              'Numerical Calculation',
              'Abstract Thinking',
              'Logical Reasoning',
              'Association & Analogy',
              'Spatial Imagination',
            ].map((skill) => (
              <div key={skill} className="flex items-center gap-2 p-2 rounded-md bg-[#F5F5F5] border border-[#E5E5E5]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
                <span className="font-medium">{skill}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3.5 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button
            id="start-assessment-btn"
            variant="primary"
            size="lg"
            onClick={startAssessment}
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            Start Diagnostic Assessment
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  /* ── 2. RESULT SCREEN (SECTION 13) ────────────────────────── */
  if (currentStep === 'results') {
    const rawSkills = results?.results || [];

    // Normalize score safely to 0-100 scale (handling both 0-1 and 0-100 inputs)
    const normalizeScore = (score: number) => {
      if (score <= 1 && score > 0) return Math.round(score * 100);
      return Math.min(100, Math.max(0, Math.round(score)));
    };

    const normalizedSkills = rawSkills.map((s) => ({
      skill_category: s.skill_category,
      score: normalizeScore(s.score),
    }));

    const avgScore =
      normalizedSkills.length > 0
        ? Math.round(normalizedSkills.reduce((acc, s) => acc + s.score, 0) / normalizedSkills.length)
        : 64;

    const strongAreas = normalizedSkills.filter((s) => s.score >= 60);
    const needsAttention = normalizedSkills.filter((s) => s.score < 60);

    // Lowest skill is recommended starting point
    const lowestSkill =
      normalizedSkills.length > 0
        ? [...normalizedSkills].sort((a, b) => a.score - b.score)[0]
        : null;

    const recommendedTopic = lowestSkill?.skill_category || 'Foundational Data Structures';

    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-12 space-y-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Assessment Result
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
            Your General Learning Capacity Profile
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            EduPlanner has established your baseline cognitive learning capacity across the 5 core dimensions.
          </p>
        </div>

        {/* Overall readiness */}
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Overall readiness
            </span>
            <Badge variant="mastered">Baseline established</Badge>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0A0A0A]">
            {avgScore}%
          </div>
          <ProgressBar value={avgScore} size="md" variant="adaptive" />
        </section>

        {/* Strong areas */}
        <section className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Strong areas
          </span>
          <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
            {strongAreas.length > 0 ? (
              strongAreas.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#0A0A0A]">{item.skill_category}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 sm:w-28 bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-[#0A0A0A] rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                    <span className="text-xs text-[#525252] font-semibold w-9 text-right">
                      {item.score}%
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A]" title="Mastered / Strong" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-[#737373]">
                Baseline in development across all areas.
              </div>
            )}
          </div>
        </section>

        {/* Needs attention */}
        <section className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Needs attention
          </span>
          <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
            {needsAttention.length > 0 ? (
              needsAttention.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#0A0A0A]">{item.skill_category}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 sm:w-28 bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-[#525252] rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                    <span className="text-xs text-[#525252] font-semibold w-9 text-right">
                      {item.score}%
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full border border-[#737373] bg-[#F5F5F5]" title="Needs Attention" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-[#737373]">
                No critical gaps detected in initial screening.
              </div>
            )}
          </div>
        </section>

        {/* Next Step: Select Course & Goal */}
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Next Step
          </span>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#0A0A0A]">
              Choose Your Course & Learning Goal
            </h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              Your cognitive capacity baseline has been recorded. Now choose the course or topic you want to master to generate your personalized learning plan.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/student/onboarding')}
              className="w-full sm:w-auto"
            >
              Choose Course & Learning Goal
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>
    );
  }

  /* ── 3. QUESTIONS SCREEN (SECTION 12) ────────────────────────── */
  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-12 space-y-8">
      {/* Top Header & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#737373]">
          <span className="font-semibold text-[#0A0A0A] uppercase tracking-wider">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span>{progressPercent}% Complete</span>
        </div>
        <ProgressBar value={progressPercent} size="sm" variant="dark" />
      </div>

      {/* Main Question Card */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">
            {currentQuestion?.skill_category}
          </span>
          <span className="text-xs text-[#737373] capitalize">
            {currentQuestion?.difficulty || 'Standard'}
          </span>
        </div>

        {/* Large Readable Question */}
        <h2 className="text-lg sm:text-xl font-semibold text-[#0A0A0A] leading-relaxed">
          {currentQuestion?.text}
        </h2>

        {/* Clear Monochromatic Options */}
        <div className="space-y-2.5 pt-2">
          {currentQuestion?.options.map((option, idx) => {
            const isSelected = answers[currentQuestion.id] === option;
            return (
              <button
                key={idx}
                id={`option-${idx}`}
                type="button"
                onClick={() => handleSelectOption(currentQuestion.id, option)}
                className={`w-full text-left p-4 rounded-lg border text-sm transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] font-medium'
                    : 'border-[#E5E5E5] bg-white text-[#262626] hover:border-[#A3A3A3] hover:bg-[#FAFAFA]'
                }`}
              >
                <span>{option}</span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'border-[#0A0A0A] bg-[#0A0A0A]'
                      : 'border-[#A3A3A3] bg-white'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
            {error}
          </div>
        )}

        {/* Navigation Controls: Previous / Next / Submit */}
        <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              id="submit-assessment-btn"
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!isAnswered || isLoading}
              isLoading={isLoading}
            >
              Submit Assessment
              <Check className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              id="next-question-btn"
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={!isAnswered}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
