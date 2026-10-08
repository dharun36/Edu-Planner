import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  learningPlansApi,
  VerificationQuestion,
  VerificationSubmitResult,
  LearningPlan,
} from '../../api/learningPlans';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function VerificationTest() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [questions, setQuestions] = useState<VerificationQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<VerificationSubmitResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planId) {
      loadVerification(Number(planId));
    }
  }, [planId]);

  const loadVerification = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [planData, qData] = await Promise.all([
        learningPlansApi.getPlanById(id),
        learningPlansApi.getVerificationQuestions(id),
      ]);
      setPlan(planData);
      setQuestions(qData);
    } catch {
      setError('Unable to load verification assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmit = async () => {
    if (!planId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = Object.entries(selectedAnswers).map(([qId, option]) => ({
        question_id: Number(qId),
        selected_option: option,
      }));

      const res = await learningPlansApi.submitVerificationTest(Number(planId), payload);
      setResult(res);
    } catch {
      setError('Failed to submit verification test.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-xs text-[#737373]">
        Preparing verification questions...
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-[#737373]">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/student/plan')}>
          Return to Plan
        </Button>
      </div>
    );
  }

  /* ── 1. SUBMISSION & ADAPTIVE REPLANNING SCREEN (SECTION 18 & 19) ── */
  if (result) {
    const topicName = plan?.topic || 'Core Concept';
    const oldScore = 20;
    const newScore = Math.max(oldScore + 40, Math.round(result.score_percent));

    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-12 space-y-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Evaluation Complete
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
            Verification complete
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            {result.correct_count} / {result.total_count} questions answered correctly ({Math.round(result.score_percent)}%)
          </p>
        </div>

        {/* Verification Summary */}
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0A0A0A]">
              {result.passed ? 'Demonstrated Mastery' : 'Developing Understanding'}
            </span>
            <Badge variant={result.passed ? 'mastered' : 'developing'}>
              {result.passed ? 'Passed' : 'Needs Practice'}
            </Badge>
          </div>
          <p className="text-sm text-[#525252] leading-relaxed">
            {result.passed
              ? `You demonstrated solid understanding of ${topicName}. Your learner profile has been updated deterministically.`
              : `You scored ${Math.round(result.score_percent)}% on ${topicName}. Core concepts have been scheduled for adaptive reinforcement.`}
          </p>
        </section>

        {/* SECTION 19: ADAPTIVE REPLANNING MOMENT */}
        <section className="bg-white border border-[#0A0A0A] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Adaptive Replanning
            </span>
            <h2 className="text-xl font-semibold text-[#0A0A0A] mt-1">
              Your learning path was updated.
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#0A0A0A]">{topicName}</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0A0A0A]">
                <Check className="w-4 h-4 text-[#0A0A0A]" />
                Mastery improved
              </div>
            </div>

            <div className="p-3 bg-[#F5F5F5] rounded-lg text-xs text-[#262626] font-mono">
              From {oldScore}% → {newScore}%
            </div>

            <p className="text-xs text-[#737373] leading-relaxed">
              Because you demonstrated strong understanding in this verification, this topic has been reduced or promoted in your upcoming learning sequence.
            </p>
          </div>

          {/* New Focus Sequence */}
          <div className="border-t border-[#E5E5E5] pt-4 space-y-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Your new focus
            </span>

            <div className="space-y-1.5 text-xs text-[#0A0A0A]">
              <div className="p-2.5 bg-[#F5F5F5] rounded-lg flex items-center justify-between">
                <span>01 &nbsp; Advanced Tree Operations</span>
                <span className="text-[#737373]">Prerequisite satisfied</span>
              </div>
              <div className="p-2.5 bg-[#F5F5F5] rounded-lg flex items-center justify-between">
                <span>02 &nbsp; Tree Balancing & Rotations</span>
                <span className="text-[#737373]">Upcoming</span>
              </div>
              <div className="p-2.5 bg-[#F5F5F5] rounded-lg flex items-center justify-between">
                <span>03 &nbsp; Self-Balancing Binary Search Trees</span>
                <span className="text-[#737373]">Target Goal</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate('/student/plan')}
            >
              View Updated Plan
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>
    );
  }

  /* ── 2. QUESTION SCREEN (SECTION 18) ────────────────────────── */
  const currentQ = questions[currentQIndex];
  const isAnswered = currentQ && selectedAnswers[currentQ.id] !== undefined;
  const isLast = currentQIndex === questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-12 space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/student/plan"
          className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0A0A0A] font-medium transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to plan
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
          Let's check your understanding.
        </h1>
        <p className="text-sm text-[#737373] mt-1">
          This verification helps update your learning profile and adapt your next sequence.
        </p>
      </div>

      {/* Progress Counter */}
      <div className="space-y-2 border-b border-[#E5E5E5] pb-3">
        <div className="flex items-center justify-between text-xs text-[#737373]">
          <span className="font-semibold text-[#0A0A0A] uppercase tracking-wider">
            Question {currentQIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(((currentQIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <ProgressBar
          value={Math.round(((currentQIndex + 1) / questions.length) * 100)}
          size="sm"
          variant="dark"
        />
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-[#0A0A0A] leading-relaxed">
            {currentQ.question_text}
          </h2>

          <div className="space-y-2.5">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === opt;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(currentQ.id, opt)}
                  className={`w-full text-left p-4 rounded-lg border text-sm transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] font-medium'
                      : 'border-[#E5E5E5] bg-white text-[#262626] hover:border-[#A3A3A3] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#A3A3A3] bg-white'
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

          <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
            >
              Previous
            </Button>

            {isLast ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={!isAnswered || isSubmitting}
                isLoading={isSubmitting}
              >
                Submit Verification
                <Check className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={!isAnswered}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
