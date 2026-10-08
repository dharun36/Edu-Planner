import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  learningPlansApi,
  VerificationQuestion,
  VerificationSubmitResult,
  LearningPlan,
} from '../../api/learningPlans';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  BrainCircuit,
} from 'lucide-react';

export default function VerificationTest() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [questions, setQuestions] = useState<VerificationQuestion[]>([]);
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load verification assessment.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;

    // Check that at least one question answered
    if (Object.keys(selectedAnswers).length < questions.length) {
      const confirmUnanswered = window.confirm(
        `You have answered ${Object.keys(selectedAnswers).length} of ${questions.length} questions. Unanswered questions will be counted as incorrect. Submit now?`
      );
      if (!confirmUnanswered) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = Object.entries(selectedAnswers).map(([qId, option]) => ({
        question_id: Number(qId),
        selected_option: option,
      }));

      const res = await learningPlansApi.submitVerificationTest(Number(planId), payload);
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit verification test.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-gray-400 text-sm">Generating verification assessment for your learning plan...</p>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Result Screen
  if (result) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Card className="border-white/10 bg-surface/90 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div
              className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-3 shadow-xl ${
                result.passed
                  ? 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
                  : 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
              }`}
            >
              {result.passed ? (
                <Award className="w-10 h-10 text-neutral-300" />
              ) : (
                <RotateCcw className="w-10 h-10" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {result.passed ? 'Verification Completed!' : 'Verification Attempt Recorded'}
            </CardTitle>
            <p className="text-gray-400 text-sm max-w-md mx-auto mt-1">
              {result.message}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 uppercase font-semibold">Score</span>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {Math.round(result.score_percent)}%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 uppercase font-semibold">Correct Answers</span>
                <p className="text-2xl font-extrabold text-neutral-400 mt-1">
                  {result.correct_count} / {result.total_count}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 uppercase font-semibold">Status</span>
                <p
                  className={`text-lg font-bold mt-1.5 ${
                    result.passed ? 'text-neutral-400' : 'text-neutral-400'
                  }`}
                >
                  {result.passed ? 'PASSED (≥60%)' : 'NEEDS PRACTICE'}
                </p>
              </div>
            </div>

            {/* Learner Model Update Callout */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
              <BrainCircuit className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-white">
                  Persistent Learner Model Updated
                </h4>
                <p className="text-xs text-gray-300">
                  Your performance was evaluated deterministically. Learning evidence has been recorded, your mastery rating has been updated, and this data is ready to feed your next adaptive replanning cycle.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate('/student/generate')}
                className="flex-1 py-3 font-semibold gap-2 shadow-lg shadow-primary/20"
              >
                <Sparkles className="w-4 h-4" />
                Generate Next Adaptive Plan (Plan 2)
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/student/skill-tree')}
                className="flex-1 gap-2"
              >
                <TrendingUp className="w-4 h-4 text-neutral-400" />
                View Updated Skill Tree
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/student/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs text-primary font-semibold uppercase tracking-wider">
          <Award className="w-4 h-4 text-neutral-300" />
          Plan Verification
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-surface border border-white/10 space-y-2">
        <h1 className="text-2xl font-extrabold text-white">
          Knowledge Verification Assessment
        </h1>
        {plan && (
          <p className="text-gray-400 text-sm">
            Evaluating mastery for <strong className="text-white">{plan.topic}</strong> ({plan.subject}). Passing score is 60%.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id} className="border-white/10 bg-surface/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{q.question_text}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[q.id] === opt;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(q.id, opt)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white font-medium shadow-md'
                          : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <span>{opt}</span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-gray-500'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="pt-2 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Answered {Object.keys(selectedAnswers).length} of {questions.length} questions
          </span>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="px-8 py-3 font-semibold gap-2 shadow-lg shadow-primary/20"
          >
            Submit Verification
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
